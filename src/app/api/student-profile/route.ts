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
    const regNo = searchParams.get('regNo') || searchParams.get('redg_no') || '';

    if (!regNo) {
      return NextResponse.json({ error: 'Registration number is required' }, { status: 400 });
    }

    await dbConnect();

    // Query all records for this student across all semesters
    const records = await Result.find({ regNo }).sort({ semester: 1 }).lean();

    if (!records || records.length === 0) {
      return NextResponse.json({
        status: 404,
        message: 'No student records found in database for this registration number.'
      }, { status: 404 });
    }

    // Sort semesters numerically 1 to 8
    const sortedRecords = [...records].sort((a: any, b: any) => {
      const semA = parseInt(a.semester?.toString().replace(/\D/g, '') || '0', 10);
      const semB = parseInt(b.semester?.toString().replace(/\D/g, '') || '0', 10);
      return semA - semB;
    });

    const primary = sortedRecords[sortedRecords.length - 1]; // Latest record for profile details

    // Process each semester
    const semesters = sortedRecords.map((rec: any, idx: number) => {
      const semNum = parseInt(rec.semester?.toString().replace(/\D/g, '') || '1', 10);
      
      let semSgpa = rec.sgpa;
      if (Array.isArray(rec.allSgpa) && rec.allSgpa.length >= semNum) {
        semSgpa = rec.allSgpa[semNum - 1] || rec.sgpa;
      }

      const numSgpa = parseNum(semSgpa);
      const numCgpa = parseNum(rec.cgpa);

      const subjects = rec.subjects || [ ...(rec.theorySubjects || []), ...(rec.practicalSubjects || []) ];
      const failedSubjects = subjects.filter((s: any) => {
        const grade = (s.grade || '').toUpperCase();
        return grade === 'F' || grade === 'FAIL';
      });

      const isSupp = Boolean(rec.isSupplementary || (rec.examName && rec.examName.toLowerCase().includes('special')));

      return {
        id: rec._id ? rec._id.toString() : `sem-${semNum}-${idx}`,
        semester: semNum,
        isSupplementary: isSupp,
        semesterLabel: isSupp ? `Semester ${semNum} (Special/Backlog)` : `Semester ${semNum}`,
        examName: rec.examName || `B.Tech Semester ${semNum} Examination`,
        examHeld: rec.examHeld || '',
        sgpa: semSgpa !== null && semSgpa !== undefined ? semSgpa.toString() : 'N/A',
        cgpa: rec.cgpa !== null && rec.cgpa !== undefined ? rec.cgpa.toString() : 'N/A',
        numericSgpa: numSgpa,
        numericCgpa: numCgpa,
        status: (rec.status || 'PASSED').toUpperCase(),
        totalSubjects: subjects.length,
        backlogsCount: failedSubjects.length,
        failedSubjects: failedSubjects.map((s: any) => ({ code: s.code, name: s.name, grade: s.grade })),
        subjects: subjects.map((s: any) => ({
          code: s.code,
          name: s.name,
          grade: s.grade,
          credit: s.credit,
          total: s.total || s.point || 'N/A'
        }))
      };
    });

    // Calculate progression metrics
    const validSgpas = semesters
      .map(s => s.numericSgpa)
      .filter((n): n is number => n !== null && n > 0);

    const avgSgpa = validSgpas.length > 0
      ? (validSgpas.reduce((a, b) => a + b, 0) / validSgpas.length).toFixed(2)
      : 'N/A';

    const latestCgpa = semesters[semesters.length - 1]?.cgpa || 'N/A';

    const totalBacklogs = semesters.reduce((acc, sem) => acc + sem.backlogsCount, 0);

    return NextResponse.json({
      status: 200,
      student: {
        regNo: primary.regNo,
        name: primary.name,
        fatherName: primary.fatherName || 'N/A',
        motherName: primary.motherName || 'N/A',
        college: primary.college,
        course: primary.course,
        totalSemestersAppeared: semesters.length,
        avgSgpa,
        latestCgpa,
        totalBacklogs
      },
      semesters
    });

  } catch (error: any) {
    console.error('Student Profile API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
