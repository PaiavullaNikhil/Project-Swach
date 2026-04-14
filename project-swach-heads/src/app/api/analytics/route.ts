import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");

    // Aggregate Ward Performance
    const wardPerformance = await db.collection("complaints").aggregate([
      {
        $group: {
          _id: "$ward",
          total: { $sum: 1 },
          cleared: { $sum: { $cond: [{ $eq: ["$status", "Cleared"] }, 1, 0] } }
        }
      },
      {
        $project: {
          name: "$_id",
          total: 1,
          cleared: 1,
          active: { $subtract: ["$total", "$cleared"] }
        }
      }
    ]).toArray();

    return NextResponse.json({
      wardPerformance
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
