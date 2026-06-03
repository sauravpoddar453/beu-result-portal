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
      query.semester = semesterNum.toString();
    }

    const result = await Result.findOne(query);
    if (!result) {
      return NextResponse.json({ message: 'Result not found in database' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
