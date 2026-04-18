import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");
    const vehicles = await db.collection("vehicles").find({}).toArray();
    return NextResponse.json(vehicles);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plate_number, vehicle_type, ward } = body;

    if (!plate_number || !vehicle_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("swach_db");

    // Check if vehicle already exists
    const existing = await db.collection("vehicles").findOne({ plate_number });
    if (existing) {
      return NextResponse.json({ error: "Vehicle with this plate number already exists" }, { status: 400 });
    }

    const result = await db.collection("vehicles").insertOne({
      plate_number,
      vehicle_type,
      ward: ward || "General",
      status: "Available",
      created_at: new Date()
    });

    return NextResponse.json({ status: "SUCCESS", id: result.insertedId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 });
  }
}
