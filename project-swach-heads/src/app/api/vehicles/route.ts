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

export async function PUT(request: Request) {
  try {
    const { plate_number, ...updates } = await request.json();

    if (!plate_number) {
      return NextResponse.json({ error: "Plate number is required for updates" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("swach_db");

    const result = await db.collection("vehicles").updateOne(
      { plate_number },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "SUCCESS" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 });
  }
}
