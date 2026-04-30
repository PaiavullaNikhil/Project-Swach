import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("swach_db");

    // 1. Daily Trend Aggregation (Complaints by Report Date)
    const complaintTrend = await db.collection("complaints").aggregate([
      {
        $addFields: {
          tsDate: { $toDate: "$timestamp" }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$tsDate" } },
          complaints: { $sum: 1 }
        }
      }
    ]).toArray();

    // 2. Daily Trend Aggregation (Resolutions by Cleared Date)
    const resolutionTrend = await db.collection("complaints").aggregate([
      { $match: { status: "Cleared", cleared_timestamp: { $ne: null } } },
      {
        $addFields: {
          clDate: { $toDate: "$cleared_timestamp" }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$clDate" } },
          resolved: { $sum: 1 }
        }
      }
    ]).toArray();

    // 3. Merge Trends by Date
    const trendMap: Record<string, { name: string, complaints: number, resolved: number }> = {};
    
    complaintTrend.forEach(item => {
      trendMap[item._id] = { name: item._id, complaints: item.complaints, resolved: 0 };
    });
    
    resolutionTrend.forEach(item => {
      if (trendMap[item._id]) {
        trendMap[item._id].resolved = item.resolved;
      } else {
        trendMap[item._id] = { name: item._id, complaints: 0, resolved: item.resolved };
      }
    });

    const dailyTrends = Object.values(trendMap).sort((a, b) => a.name.localeCompare(b.name));

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
      { $match: { status: "Cleared", worker_id: { $ne: null }, cleared_timestamp: { $ne: null } } },
      {
        $addFields: {
          tsDate: { $toDate: "$timestamp" },
          clearedDate: { $toDate: "$cleared_timestamp" }
        }
      },
      {
        $group: {
          _id: { ward: "$ward", worker_id: "$worker_id", worker_name: "$worker_name" },
          completions: { $sum: 1 },
          totalTime: { $sum: { $subtract: ["$clearedDate", "$tsDate"] } }
        }
      },
      {
        $project: {
          ward: "$_id.ward",
          name: "$_id.worker_name",
          reports: "$completions",
          avgTime: { $divide: ["$totalTime", { $multiply: ["$completions", 3600000] }] }, // Avg in hours
          rating: { $literal: "99%" }
        }
      },
      { $sort: { reports: -1 } },
      {
        $group: {
          _id: "$ward",
          bestWorker: { $first: "$$ROOT" }
        }
      },
      {
        $project: {
          _id: 0,
          ward: "$_id",
          name: "$bestWorker.name",
          reports: "$bestWorker.reports",
          avgTime: "$bestWorker.avgTime",
          rating: "$bestWorker.rating"
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
