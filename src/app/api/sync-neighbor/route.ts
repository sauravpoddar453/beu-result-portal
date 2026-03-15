import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { regNo, semId } = await request.json();
    
    const res = await fetch(`https://beu-bih.ac.in/backend/v1/result/get-result?regNo=${regNo}&semId=${semId}`);
    const data = await res.json();
    
    if (data && data.name) {
      // Return the data to the client to be saved via /api/add-result
      // or we can save it directly here. Direct save is better.
      const sgpa = Array.isArray(data.sgpa) ? (data.sgpa[semId - 1] || '0') : (data.sgpa || '0');
      
      const response = await fetch(`${new URL(request.url).origin}/api/add-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            regNo: data.regNo || regNo,
            name: data.name,
            college: data.college_name,
            semester: `${semId}th Semester`,
            sgpa: parseFloat(sgpa) || 0,
            cgpa: parseFloat(data.cgpa) || 0,
            status: data.fail_any || 'PASSED',
            course: data.course
        })
      });
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
