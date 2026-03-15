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

    // Clean inputs
    const cleanCollege = college.trim();
    const cleanSemester = semester.trim();
    const cleanBranch = (branch || '').trim();

    // Tier 1: Try specific Branch in that College
    let query: any = { 
        college: { $regex: cleanCollege, $options: 'i' },
        semester: { $regex: cleanSemester, $options: 'i' }
    };
    
    if (cleanBranch) {
      const escapedBranch = cleanBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.course = { $regex: escapedBranch, $options: 'i' };
    }

    let toppers = await Result.find(query)
      .sort({ sgpa: -1 })
      .limit(5);

    // Tier 3: If still no results (DB is empty), provide sample "Verified Toppers" for demonstration
    if (toppers.length === 0) {
        toppers = [
            { 
                name: "Aseem Raj (Sample)", 
                regNo: "22151131015", 
                sgpa: 9.85, 
                course: cleanBranch || "Computer Science", 
                isSample: true 
            },
            { 
                name: "Saurav Poddar (Sample)", 
                regNo: "22151131026", 
                sgpa: 9.72, 
                course: cleanBranch || "Computer Science", 
                isSample: true 
            },
            { 
                name: "Vikash Kumar (Sample)", 
                regNo: "22151131001", 
                sgpa: 9.58, 
                course: cleanBranch || "Computer Science", 
                isSample: true 
            }
        ];
    }

    return NextResponse.json(toppers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
