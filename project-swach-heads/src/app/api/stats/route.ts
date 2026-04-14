import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");

    const total = await db.collection("complaints").countDocuments();
    const active = await db.collection("complaints").countDocuments({ status: { $ne: "Cleared" } });
    const cleared = await db.collection("complaints").countDocuments({ status: "Cleared" });
    
    // Escalated: older than 24 hours and not cleared
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const escalated = await db.collection("complaints").countDocuments({
      status: { $ne: "Cleared" },
      timestamp: { $lt: oneDayAgo }
    });

    return NextResponse.json({
      total,
      active,
      cleared,
      escalated
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
