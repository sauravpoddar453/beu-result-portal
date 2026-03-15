import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryRegNo = searchParams.get('regNo');
    let college = searchParams.get('college') || '';
    let branch = searchParams.get('branch') || '';
    let semester = searchParams.get('semester') || '6th Semester';

    await dbConnect();

    // If regNo is provided, try to find a matching college/branch from DB first
    if (queryRegNo && queryRegNo.length >= 7) {
        const pattern = queryRegNo.substring(0, 7); // First 7 digits define College + Branch
        const match = await Result.findOne({ regNo: { $regex: '^' + pattern } });
        if (match) {
            college = match.college || college;
            branch = match.course || branch;
            semester = match.semester || semester;
        }
    }

    // Tier 1: Try specific Branch in that College (if college and branch are known)
    let toppers: any[] = [];
    
    if (college) {
        const cleanCollege = college.trim();
        const cleanSemester = semester.trim();
        const cleanBranch = (branch || '').trim();

        let query: any = { 
            college: { $regex: cleanCollege, $options: 'i' },
            semester: { $regex: cleanSemester, $options: 'i' }
        };
        
        if (cleanBranch) {
            const escapedBranch = cleanBranch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.course = { $regex: escapedBranch, $options: 'i' };
        }

        toppers = await Result.find(query)
            .sort({ sgpa: -1 })
            .limit(5);

        // Tier 2: Fall back to College-wide if branch has no results
        if (toppers.length === 0) {
            delete query.course;
            toppers = await Result.find(query)
                .sort({ sgpa: -1 })
                .limit(5);
        }
    }

    // Tier 3: If still no results (DB is empty or college not yet detected), provide sample "Verified Toppers" for demonstration
    if (toppers.length === 0) {
        toppers = [
            { 
                name: "Aseem Raj (Sample)", 
                regNo: "22151131015", 
                sgpa: 9.85, 
                course: branch || "Computer Science", 
                isSample: true 
            },
            { 
                name: "Saurav Poddar (Sample)", 
                regNo: "22151131026", 
                sgpa: 9.72, 
                course: branch || "Computer Science", 
                isSample: true 
            },
            { 
                name: "Vikash Kumar (Sample)", 
                regNo: "22151131001", 
                sgpa: 9.58, 
                course: branch || "Computer Science", 
                isSample: true 
            }
        ];
    }

    return NextResponse.json(toppers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
