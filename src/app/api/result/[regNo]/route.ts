import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ regNo: string }> }
) {
  try {
    const { regNo } = await params;
    await dbConnect();
    const result = await Result.findOne({ regNo });
    if (!result) {
      return NextResponse.json({ message: 'Result not found in database' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
