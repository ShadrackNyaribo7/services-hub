import { NextResponse } from "next/server";

export async function GET() {
  // Simple health check without database connection
  // to avoid triggering PostgreSQL errors from Railway infrastructure
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "not_checked",
    },
    { status: 200 }
  );
}
