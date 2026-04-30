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
    
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const escalatedDocs = await db.collection("complaints").aggregate([
      {
        $match: {
          status: { $ne: "Cleared" },
          $expr: { $lt: [{ $toDate: "$timestamp" }, threeDaysAgo] }
        }
      },
      { $count: "count" }
    ]).toArray();
    const escalated = escalatedDocs.length > 0 ? escalatedDocs[0].count : 0;

    // Worker Stats
    const totalWorkers = await db.collection("workers").countDocuments();
    const activeWorkers = await db.collection("workers").countDocuments({ status: "Active" });
    
    // Average Resolution Time (Aggregation)
    const avgRes = await db.collection("complaints").aggregate([
      { $match: { status: "Cleared", cleared_timestamp: { $ne: null } } },
      {
        $project: {
          duration: { $subtract: [{ $toDate: "$cleared_timestamp" }, { $toDate: "$timestamp" }] }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" }
        }
      }
    ]).toArray();

    const avgHours = avgRes.length > 0 ? (avgRes[0].avgDuration / (1000 * 60 * 60)) : 0;

    return NextResponse.json({
      total,
      active,
      cleared,
      escalated,
      workers: {
        total: totalWorkers,
        active: activeWorkers,
        avgResponseHours: avgHours.toFixed(1),
        avgResponseDays: avgHours >= 24 ? (avgHours / 24).toFixed(1) : null
      }
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
