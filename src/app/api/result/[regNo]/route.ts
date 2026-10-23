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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ regNo: string }> }
) {
  try {
    const { regNo } = await params;
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get('semester');

    await dbConnect();

    let query: any = { regNo };
    if (semester) {
      const semesterNum = romanToNum(semester);
      const normalizedSemester = semesterNum.toString();
      query.$or = [
        { semester: normalizedSemester },
        { semester: `${normalizedSemester}th Semester` },
        { semester: `${normalizedSemester}st Semester` },
        { semester: `${normalizedSemester}nd Semester` },
        { semester: `${normalizedSemester}rd Semester` },
        { semester: new RegExp(`(^|\\b)${normalizedSemester}(\\b|th|st|nd|rd)`, 'i') }
      ];
    }

    let result = await Result.findOne(query);
    if (!result && !semester) {
      result = await Result.findOne({ regNo });
    }

    if (!result) {
      return NextResponse.json({ message: 'Result not found in database' }, { status: 404 });
    }

    const doc = result.toObject ? result.toObject() : result;
    if ((!doc.theorySubjects || doc.theorySubjects.length === 0) && doc.subjects && doc.subjects.length > 0) {
      doc.theorySubjects = doc.subjects
        .filter((s: any) => !s.code?.endsWith('P'))
        .map((s: any) => ({
          code: s.code,
          name: s.name,
          ese: s.ese || 'N/A',
          ia: s.ia || 'N/A',
          total: s.point !== undefined ? s.point.toString() : (s.total || 'N/A'),
          grade: s.grade,
          credit: s.credit
        }));
      doc.practicalSubjects = doc.subjects
        .filter((s: any) => s.code?.endsWith('P'))
        .map((s: any) => ({
          code: s.code,
          name: s.name,
          ese: s.ese || 'N/A',
          ia: s.ia || 'N/A',
          total: s.point !== undefined ? s.point.toString() : (s.total || 'N/A'),
          grade: s.grade,
          credit: s.credit
        }));
    }

    return NextResponse.json(doc);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
