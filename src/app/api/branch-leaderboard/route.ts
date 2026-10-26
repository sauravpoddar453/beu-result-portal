import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

const romanToNum = (roman: string): number => {
  if (!roman) return 1;
  const map: { [key: string]: number } = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8
  };
  return map[roman.trim().toUpperCase()] || parseInt(roman) || 1;
};

function parseNum(val: any): number | null {
  if (val === null || val === undefined || val === 'N/A' || val === '-' || val === '') return null;
  if (Array.isArray(val)) {
    const last = val[val.length - 1];
    const n = parseFloat(last);
    return isNaN(n) ? null : n;
  }
  const n = parseFloat(val.toString().trim());
  return isNaN(n) ? null : n;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get('regNo') || searchParams.get('redg_no') || '';
    const rawSemester = searchParams.get('semester') || '1';

    if (!regNo) {
      return NextResponse.json({ error: 'Registration number is required' }, { status: 400 });
    }

    const semNum = romanToNum(rawSemester);
    const semClean = semNum.toString();

    await dbConnect();

    // 1. Identify branch prefix from registration number (e.g., "22151131" from "22151131001")
    const prefix = regNo.length >= 8 ? regNo.slice(0, 8) : regNo;

    const semesterFilter = {
      $or: [
        { semester: semClean },
        { semester: `${semClean}th Semester` },
        { semester: `${semClean}st Semester` },
        { semester: `${semClean}nd Semester` },
        { semester: `${semClean}rd Semester` },
        { semester: new RegExp(`(^|\\b)${semClean}(\\b|th|st|nd|rd)`, 'i') }
      ]
    };

    // Query all students in the branch and college for this semester
    let students = await Result.find({
      regNo: new RegExp(`^${prefix}`),
      ...semesterFilter
    }, {
      regNo: 1,
      name: 1,
      course: 1,
      college: 1,
      semester: 1,
      sgpa: 1,
      allSgpa: 1,
      cgpa: 1,
      status: 1
    }).lean();

    // Fallback: If not enough students matched via prefix, try matching via searched student's college & course
    if (students.length <= 1) {
      const searchedStudent = await Result.findOne({ regNo, ...semesterFilter }).lean();
      if (searchedStudent && searchedStudent.college && searchedStudent.course) {
        const batchPrefix = regNo.slice(0, 2);
        students = await Result.find({
          regNo: new RegExp(`^${batchPrefix}`),
          college: searchedStudent.college,
          course: searchedStudent.course,
          ...semesterFilter
        }, {
          regNo: 1,
          name: 1,
          course: 1,
          college: 1,
          semester: 1,
          sgpa: 1,
          allSgpa: 1,
          cgpa: 1,
          status: 1
        }).lean();
      }
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        status: 404,
        message: 'No classmates found for this branch and semester in the database records.',
        students: []
      });
    }

    // Process and normalize student records
    const processed = students.map((s: any) => {
      // Find current semester SGPA
      let studentSgpaVal = s.sgpa;
      if (Array.isArray(s.allSgpa) && s.allSgpa.length >= semNum) {
        studentSgpaVal = s.allSgpa[semNum - 1] || s.sgpa;
      }
      const numSgpa = parseNum(studentSgpaVal);
      const numCgpa = parseNum(s.cgpa);

      return {
        regNo: s.regNo,
        name: s.name || 'Student',
        course: s.course || 'B.Tech',
        college: s.college || '',
        semester: semClean,
        sgpa: studentSgpaVal ? studentSgpaVal.toString() : 'N/A',
        cgpa: s.cgpa ? s.cgpa.toString() : 'N/A',
        status: s.status || 'PASSED',
        numericSgpa: numSgpa,
        numericCgpa: numCgpa
      };
    });

    // Deduplicate students by regNo (keep highest SGPA record)
    const uniqueMap = new Map<string, typeof processed[0]>();
    for (const item of processed) {
      if (!uniqueMap.has(item.regNo)) {
        uniqueMap.set(item.regNo, item);
      } else {
        const existing = uniqueMap.get(item.regNo)!;
        if ((item.numericSgpa || 0) > (existing.numericSgpa || 0)) {
          uniqueMap.set(item.regNo, item);
        }
      }
    }
    const deduped = Array.from(uniqueMap.values());

    // Sort descending: highest SGPA first, tie-break by CGPA
    deduped.sort((a, b) => {
      if (a.numericSgpa !== null && b.numericSgpa !== null) {
        if (b.numericSgpa !== a.numericSgpa) {
          return b.numericSgpa - a.numericSgpa;
        }
        return (b.numericCgpa || 0) - (a.numericCgpa || 0);
      }
      if (a.numericSgpa !== null) return -1;
      if (b.numericSgpa !== null) return 1;
      return (b.numericCgpa || 0) - (a.numericCgpa || 0);
    });

    // Assign rank
    const rankedStudents = deduped.map((student, idx) => ({
      rank: idx + 1,
      ...student
    }));

    // Calculate metrics
    const validSgpas = rankedStudents
      .map(s => s.numericSgpa)
      .filter((n): n is number => n !== null && n > 0);

    const validCgpas = rankedStudents
      .map(s => s.numericCgpa)
      .filter((n): n is number => n !== null && n > 0);

    const highestSgpa = validSgpas.length > 0 ? Math.max(...validSgpas) : null;
    const lowestSgpa = validSgpas.length > 0 ? Math.min(...validSgpas) : null;
    const highestCgpa = validCgpas.length > 0 ? Math.max(...validCgpas) : null;
    const lowestCgpa = validCgpas.length > 0 ? Math.min(...validCgpas) : null;

    const avgSgpa = validSgpas.length > 0
      ? (validSgpas.reduce((a, b) => a + b, 0) / validSgpas.length).toFixed(2)
      : 'N/A';

    const passedCount = rankedStudents.filter(s => {
      const st = (s.status || '').toUpperCase();
      return st === 'PASSED' || st === 'PASS';
    }).length;

    // Toppers list (Top 3 ranks)
    const toppers = rankedStudents.slice(0, 3);

    // Lowest scorers list (Bottom 3 with valid scores)
    const validScorers = rankedStudents.filter(s => s.numericSgpa !== null);
    const lowest = validScorers.slice(-3).reverse();

    // Current student's placement
    const currentStudentRank = rankedStudents.find(s => s.regNo === regNo) || null;

    const sample = rankedStudents[0];

    return NextResponse.json({
      status: 200,
      branchInfo: {
        college: sample?.college || 'Engineering College',
        course: sample?.course || 'Engineering',
        semester: semClean,
        totalStudents: rankedStudents.length,
        passedCount,
        failedCount: rankedStudents.length - passedCount,
        passPercentage: ((passedCount / rankedStudents.length) * 100).toFixed(1),
        avgSgpa,
        highestSgpa: highestSgpa !== null ? highestSgpa.toFixed(2) : 'N/A',
        lowestSgpa: lowestSgpa !== null ? lowestSgpa.toFixed(2) : 'N/A',
        highestCgpa: highestCgpa !== null ? highestCgpa.toFixed(2) : 'N/A',
        lowestCgpa: lowestCgpa !== null ? lowestCgpa.toFixed(2) : 'N/A'
      },
      currentStudent: currentStudentRank ? {
        regNo: currentStudentRank.regNo,
        name: currentStudentRank.name,
        rank: currentStudentRank.rank,
        total: rankedStudents.length,
        sgpa: currentStudentRank.sgpa,
        cgpa: currentStudentRank.cgpa,
        status: currentStudentRank.status
      } : null,
      toppers,
      lowest,
      students: rankedStudents
    });

  } catch (error: any) {
    console.error('Error fetching branch leaderboard:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
