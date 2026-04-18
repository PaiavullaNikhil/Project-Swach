import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ward = searchParams.get('ward');

    const client = await clientPromise;
    const db = client.db("swach_db");

    const query: { status?: string; ward?: string } = {};
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { complaint_id, worker_id, worker_name, vehicle_number, vehicle_type } = body;

    if (!complaint_id || !worker_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { ObjectId } = require('mongodb');
    const client = await clientPromise;
    const db = client.db("swach_db");

    const result = await db.collection("complaints").updateOne(
      { _id: new ObjectId(complaint_id) },
      { 
        $set: { 
          worker_id,
          worker_name,
          vehicle_number,
          vehicle_type,
          status: "Assigned",
          worker_status: "Assigned",
          assigned_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "SUCCESS" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to assign complaint" }, { status: 500 });
  }
}
