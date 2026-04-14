import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ward = searchParams.get('ward');

    const client = await clientPromise;
    const db = client.db("swach_db");

    let query: any = {};
    if (status) query.status = status;
    if (ward) query.ward = ward;

    const complaints = await db.collection("complaints").find(query).toArray();

    // Priority calculation logic: Score = Upvotes + (Age in hours * 2)
    const now = new Date().getTime();
    const scoredComplaints = complaints.map(c => {
      const ageHours = (now - new Date(c.timestamp).getTime()) / (1000 * 60 * 60);
      const priorityScore = (c.upvotes || 0) + (ageHours * 2);
      return { ...c, priorityScore };
    });

    // Sort by priorityScore descending
    scoredComplaints.sort((a, b) => b.priorityScore - a.priorityScore);

    return NextResponse.json(scoredComplaints);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
  }
}
