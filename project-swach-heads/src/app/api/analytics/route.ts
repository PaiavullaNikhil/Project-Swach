import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");

    // 1. Daily Trend Aggregation (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrends = await db.collection("complaints").aggregate([
      {
        $addFields: {
          tsDate: { $toDate: "$timestamp" }
        }
      },
      { $match: { tsDate: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$tsDate" } },
          complaints: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "Cleared"] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          name: "$_id",
          complaints: 1,
          resolved: 1
        }
      }
    ]).toArray();

    // 2. Hourly Volume (Reports by hour of the day)
    const hourlyStats = await db.collection("complaints").aggregate([
      {
        $addFields: {
          tsDate: { $toDate: "$timestamp" }
        }
      },
      {
        $group: {
          _id: { $hour: "$tsDate" },
          volume: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // 3. Status Distribution
    const statusStats = await db.collection("complaints").aggregate([
      {
        $group: {
          _id: "$status",
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$_id", "Unknown"] },
          value: 1
        }
      }
    ]).toArray();

    // 4. Ward Performance & Resolution Time
    const wardPerformance = await db.collection("complaints").aggregate([
      {
        $addFields: {
          tsDate: { $toDate: "$timestamp" },
          clearedDate: { $cond: [{ $ne: ["$cleared_timestamp", null] }, { $toDate: "$cleared_timestamp" }, null] }
        }
      },
      {
        $group: {
          _id: "$ward",
          total: { $sum: 1 },
          cleared: { $sum: { $cond: [{ $eq: ["$status", "Cleared"] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ["$status", "Cleared"] }, { $ne: ["$clearedDate", null] }] },
                { $divide: [{ $subtract: ["$clearedDate", "$tsDate"] }, 3600000] }, // In hours
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$_id", "Unknown"] },
          cleared: 1,
          total: 1,
          active: { $subtract: ["$total", "$cleared"] },
          avgResolutionTime: 1
        }
      }
    ]).toArray();

    // 5. Ward-wise Best Workers
    const bestWorkers = await db.collection("complaints").aggregate([
      { $match: { status: "Cleared", worker_id: { $ne: null } } },
      {
        $group: {
          _id: { ward: "$ward", worker_id: "$worker_id", worker_name: "$worker_name" },
          completions: { $sum: 1 }
        }
      },
      { $sort: { completions: -1 } },
      {
        $group: {
          _id: "$_id.ward",
          bestWorker: { $first: "$$ROOT" }
        }
      },
      {
        $project: {
          ward: "$_id",
          name: "$bestWorker._id.worker_name",
          reports: "$bestWorker.completions",
          rating: { $literal: "99%" } // Placeholder for rating if not available
        }
      }
    ]).toArray();

    // 6. Category Distribution
    const categoryStats = await db.collection("complaints").aggregate([
      {
        $group: {
          _id: "$category",
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$_id", "Uncategorized"] },
          value: 1
        }
      },
      { $sort: { value: -1 } }
    ]).toArray();

    return NextResponse.json({
      dailyTrends,
      hourlyStats,
      statusStats,
      categoryStats,
      wardPerformance,
      bestWorkers
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
