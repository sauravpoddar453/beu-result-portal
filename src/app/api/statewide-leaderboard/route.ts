import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

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
    const batch = searchParams.get('batch') || 'all'; // '22', '23', etc.
    const semester = searchParams.get('semester') || 'all'; // '1', '2', etc.
    const course = searchParams.get('course') || 'all';
    const college = searchParams.get('college') || 'all';
    const metric = searchParams.get('metric') || 'sgpa'; // 'sgpa' or 'cgpa'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);

    await dbConnect();

    // Build Mongo match query
    const match: any = {};

    if (batch && batch !== 'all') {
      match.regNo = new RegExp(`^${batch}`);
    }

    if (semester && semester !== 'all') {
      match.$or = [
        { semester: semester },
        { semester: `${semester}th Semester` },
        { semester: `${semester}st Semester` },
        { semester: `${semester}nd Semester` },
        { semester: `${semester}rd Semester` }
      ];
    }

    if (course && course !== 'all') {
      match.course = new RegExp(`^${course}$`, 'i');
    }

    if (college && college !== 'all') {
      match.college = new RegExp(college, 'i');
    }

    // Only get records with actual subjects
    match['subjects.0'] = { $exists: true };

    // Fetch matching students for statewide ranking
    const rawResults = await Result.find(match, {
      regNo: 1,
      name: 1,
      fatherName: 1,
      college: 1,
      course: 1,
      semester: 1,
      sgpa: 1,
      cgpa: 1,
      status: 1,
      allSgpa: 1,
      examName: 1
    }).lean();

    // Process & calculate metrics
    const processed = rawResults.map((doc: any) => {
      let semNum = parseInt(doc.semester?.toString().replace(/\D/g, '') || '1', 10);
      let sSgpa = doc.sgpa;
      if (Array.isArray(doc.allSgpa) && doc.allSgpa.length >= semNum) {
        sSgpa = doc.allSgpa[semNum - 1] || doc.sgpa;
      }
      const numSgpa = parseNum(sSgpa);
      const numCgpa = parseNum(doc.cgpa);
      const score = metric === 'cgpa' ? (numCgpa ?? numSgpa) : (numSgpa ?? numCgpa);

      return {
        regNo: doc.regNo,
        name: doc.name || 'Unknown',
        college: doc.college || 'BEU Engineering College',
        course: doc.course || 'Engineering',
        semester: semNum.toString(),
        sgpa: sSgpa !== null && sSgpa !== undefined ? sSgpa.toString() : 'N/A',
        cgpa: doc.cgpa !== null && doc.cgpa !== undefined ? doc.cgpa.toString() : 'N/A',
        status: (doc.status || 'PASSED').toUpperCase(),
        numericSgpa: numSgpa,
        numericCgpa: numCgpa,
        rankingScore: score,
        examName: doc.examName
      };
    });

    // Deduplicate by regNo (keep highest rankingScore)
    const dedupedMap = new Map<string, typeof processed[0]>();
    for (const item of processed) {
      if (item.rankingScore === null || isNaN(item.rankingScore)) continue;
      if (!dedupedMap.has(item.regNo)) {
        dedupedMap.set(item.regNo, item);
      } else {
        const existing = dedupedMap.get(item.regNo)!;
        if ((item.rankingScore || 0) > (existing.rankingScore || 0)) {
          dedupedMap.set(item.regNo, item);
        }
      }
    }

    const validStudents = Array.from(dedupedMap.values());

    // Sort descending by score
    validStudents.sort((a, b) => {
      const scoreA = a.rankingScore || 0;
      const scoreB = b.rankingScore || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Secondary tie breaker
      return (b.numericCgpa || 0) - (a.numericCgpa || 0);
    });

    // Assign statewide ranks (handle ties cleanly)
    let currentRank = 1;
    const rankedToppers = validStudents.slice(0, limit).map((student, idx, arr) => {
      if (idx > 0 && student.rankingScore === arr[idx - 1].rankingScore) {
        // Tied with previous
      } else {
        currentRank = idx + 1;
      }
      return {
        rank: currentRank,
        ...student
      };
    });

    // College Aggregation
    const collegeMap = new Map<string, {
      college: string;
      totalStudents: number;
      passedCount: number;
      sgpaSum: number;
      sgpaCount: number;
      highestSgpa: number;
      topStudent: { name: string; regNo: string; sgpa: string; course: string } | null;
    }>();

    for (const student of validStudents) {
      const colName = student.college.trim();
      if (!collegeMap.has(colName)) {
        collegeMap.set(colName, {
          college: colName,
          totalStudents: 0,
          passedCount: 0,
          sgpaSum: 0,
          sgpaCount: 0,
          highestSgpa: 0,
          topStudent: null
        });
      }

      const entry = collegeMap.get(colName)!;
      entry.totalStudents++;

      const st = student.status;
      if (st === 'PASS' || st === 'PASSED') {
        entry.passedCount++;
      }

      if (student.numericSgpa !== null && student.numericSgpa > 0) {
        entry.sgpaSum += student.numericSgpa;
        entry.sgpaCount++;
        if (student.numericSgpa > entry.highestSgpa) {
          entry.highestSgpa = student.numericSgpa;
          entry.topStudent = {
            name: student.name,
            regNo: student.regNo,
            sgpa: student.sgpa,
            course: student.course
          };
        }
      }
    }

    // Convert collegeMap to sorted array
    const collegeRankings = Array.from(collegeMap.values())
      .filter(c => c.totalStudents >= 5) // At least 5 students for meaningful stats
      .map(c => {
        const avg = c.sgpaCount > 0 ? (c.sgpaSum / c.sgpaCount) : 0;
        const passRate = c.totalStudents > 0 ? ((c.passedCount / c.totalStudents) * 100) : 0;
        return {
          college: c.college,
          totalStudents: c.totalStudents,
          passedCount: c.passedCount,
          passPercentage: parseFloat(passRate.toFixed(1)),
          avgSgpa: parseFloat(avg.toFixed(2)),
          highestSgpa: parseFloat(c.highestSgpa.toFixed(2)),
          topStudent: c.topStudent
        };
      });

    // Sort colleges by Avg SGPA descending
    collegeRankings.sort((a, b) => b.avgSgpa - a.avgSgpa);
    const rankedColleges = collegeRankings.map((c, i) => ({
      rank: i + 1,
      ...c
    }));

    // Overall State Overview
    const allValidSgpas = validStudents
      .map(s => s.numericSgpa)
      .filter((n): n is number => n !== null && n > 0);

    const stateAvgSgpa = allValidSgpas.length > 0
      ? (allValidSgpas.reduce((a, b) => a + b, 0) / allValidSgpas.length).toFixed(2)
      : 'N/A';

    const statePassedCount = validStudents.filter(s => s.status === 'PASS' || s.status === 'PASSED').length;
    const statePassRate = validStudents.length > 0
      ? ((statePassedCount / validStudents.length) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      status: 200,
      totalMatched: validStudents.length,
      overview: {
        totalStudents: validStudents.length,
        totalColleges: collegeMap.size,
        avgSgpa: stateAvgSgpa,
        passPercentage: statePassRate,
        highestScore: validStudents[0]?.rankingScore || 'N/A'
      },
      toppers: rankedToppers,
      collegeRankings: rankedColleges
    });

  } catch (error: any) {
    console.error('Statewide Leaderboard API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
