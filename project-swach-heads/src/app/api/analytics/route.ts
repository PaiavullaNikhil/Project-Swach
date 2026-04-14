import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");

    // 1. Daily Trend Aggregation (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyReported = await db.collection("complaints").aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const dailyResolved = await db.collection("complaints").aggregate([
      { $match: { status: "Cleared", cleared_timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$cleared_timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Merge daily data for frontend chart
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const reported = dailyReported.find(r => r._id === dateStr)?.count || 0;
      const resolved = dailyResolved.find(r => r._id === dateStr)?.count || 0;
      
      days.push({ name: dayName, complaints: reported, resolved: resolved });
    }

    // 2. Ward Performance Aggregation
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
      dailyTrends: days,
      wardPerformance
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
