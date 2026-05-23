import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Call FastAPI Worker backend running on port 8001
    const fastApiUrl = process.env.NEXT_PUBLIC_WORKER_BACKEND_URL || "http://localhost:8001";
    
    console.log(`[Heads API Router] Proxying AI request to worker backend: ${fastApiUrl}/api/ai/query`);
    
    const response = await fetch(`${fastApiUrl}/api/ai/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `FastAPI error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[Heads API Router] Error proxying semantic query:", error);
    return NextResponse.json({ error: error.message || "Internal server error during proxying" }, { status: 500 });
  }
}
