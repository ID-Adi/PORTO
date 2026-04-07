import { getDatabaseStatus } from "@porto/backend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const database = await getDatabaseStatus();

  return NextResponse.json({
    service: "porto-api",
    status: "ok",
    database,
    timestamp: new Date().toISOString(),
  });
}
