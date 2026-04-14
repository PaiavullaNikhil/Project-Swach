import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db("swach_db");

    const messages = await db.collection("chat_messages")
      .find({ complaint_id: id })
      .sort({ timestamp: 1 })
      .toArray();

    return NextResponse.json(messages);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const msg = await request.json();

    const client = await clientPromise;
    const db = client.db("swach_db");

    const newMessage = {
      ...msg,
      complaint_id: id,
      timestamp: new Date()
    };

    await db.collection("chat_messages").insertOne(newMessage);

    return NextResponse.json({ status: "SUCCESS" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
