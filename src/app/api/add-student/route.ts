import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const student = new Student(body);
    await student.save();
    return NextResponse.json({ message: "Student added successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
