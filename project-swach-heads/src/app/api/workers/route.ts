import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");

    const workers = await db.collection("workers").find({}).toArray();

    return NextResponse.json(workers);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch workers" }, { status: 500 });
  }
}
