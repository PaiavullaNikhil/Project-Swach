import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { complaint_id, worker_id } = await request.json();

    if (!complaint_id || !worker_id) {
      return NextResponse.json({ error: "Missing complaint_id or worker_id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("swach_db");

    // Fetch Worker Info
    const worker = await db.collection("workers").findOne({ worker_id: worker_id });
    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Fetch Vehicle Info (if assigned)
    let vehicle = null;
    if (worker.assigned_vehicle_id) {
       vehicle = await db.collection("vehicles").findOne({ plate_number: worker.assigned_vehicle_id });
    }

    // Update Complaint with Snapshots
    const complaintResult = await db.collection("complaints").updateOne(
      { _id: new ObjectId(complaint_id) },
      { 
        $set: { 
          worker_id: worker_id, 
          worker_name: worker.name,
          vehicle_number: vehicle?.plate_number || "Awaiting Vehicle",
          vehicle_type: vehicle?.vehicle_type || "N/A",
          status: "Assigned",
          worker_status: "Assigned"
        } 
      }
    );

    // Update Worker Status
    await db.collection("workers").updateOne(
      { worker_id: worker_id },
      { $set: { status: "Active" } }
    );

    if (complaintResult.matchedCount === 0) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "SUCCESS" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to assign worker" }, { status: 500 });
  }
}
