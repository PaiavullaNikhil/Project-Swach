import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const revalidate = 0;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");

    // Complaint Stats
    const total = await db.collection("complaints").countDocuments();
    const active = await db.collection("complaints").countDocuments({ status: { $ne: "Cleared" } });
    const cleared = await db.collection("complaints").countDocuments({ status: "Cleared" });
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const escalated = await db.collection("complaints").countDocuments({
      status: { $ne: "Cleared" },
      timestamp: { $lt: oneDayAgo }
    });

    // Worker Stats
    const totalWorkers = await db.collection("workers").countDocuments();
    const activeWorkers = await db.collection("workers").countDocuments({ status: "Active" });
    
    // Average Resolution Time (Aggregation)
    const avgRes = await db.collection("complaints").aggregate([
      { $match: { status: "Cleared", cleared_timestamp: { $ne: null } } },
      {
        $project: {
          duration: { $subtract: ["$cleared_timestamp", "$timestamp"] }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" }
        }
      }
    ]).toArray();

    const avgMinutes = avgRes.length > 0 ? Math.round(avgRes[0].avgDuration / (1000 * 60)) : 0;

    return NextResponse.json({
      total,
      active,
      cleared,
      escalated,
      workers: {
        total: totalWorkers,
        active: activeWorkers,
        avgResponse: `${avgMinutes}m`
      }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
