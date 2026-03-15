import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { regNo, ...updateData } = body;
    
    await Result.findOneAndUpdate(
      { regNo },
      { $set: { regNo, ...updateData, lastUpdated: new Date() } },
      { upsert: true, new: true }
    );
    
    return NextResponse.json({ message: "Result synced successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
