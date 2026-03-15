import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const result = new Result(body);
    await result.save();
    return NextResponse.json({ message: "Result added successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
