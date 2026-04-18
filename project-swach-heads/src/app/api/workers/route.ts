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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, worker_id, phone, ward, assigned_vehicle_id } = body;

    if (!name || !worker_id || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("swach_db");

    // Check if worker already exists
    const existing = await db.collection("workers").findOne({ worker_id });
    if (existing) {
      return NextResponse.json({ error: "Worker ID already exists" }, { status: 400 });
    }

    const result = await db.collection("workers").insertOne({
      name,
      worker_id,
      phone,
      ward: ward || "General",
      status: "Idle",
      tasks_completed: 0,
      rating: 5.0,
      assigned_vehicle_id: assigned_vehicle_id || null,
      created_at: new Date()
    });

    return NextResponse.json({ status: "SUCCESS", id: result.insertedId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}
