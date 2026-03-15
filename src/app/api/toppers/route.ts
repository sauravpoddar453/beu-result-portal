import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const college = searchParams.get('college');
    const branch = searchParams.get('branch');
    const semester = searchParams.get('semester');

    if (!college || !semester) {
      return NextResponse.json({ error: 'College and Semester are required' }, { status: 400 });
    }

    await dbConnect();

    // Query for top students by SGPA
    // We use regex for college to handle minor spacing/casing differences
    let query: any = { 
        college: { $regex: college.trim(), $options: 'i' },
        semester: semester.trim() 
    };
    
    // If branch is provided, we try to match it in the 'course' field
    if (branch) {
      // Escape special characters and use a more flexible match
      const escapedBranch = branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.course = { $regex: escapedBranch, $options: 'i' };
    }

    const toppers = await Result.find(query)
      .sort({ sgpa: -1 })
      .limit(3);

    return NextResponse.json(toppers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
