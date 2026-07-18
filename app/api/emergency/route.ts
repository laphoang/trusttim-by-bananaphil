import { NextResponse } from "next/server";
import { raiseEmergencyCase } from "@/lib/emergency/case";

export const runtime = "nodejs";

/** Standalone endpoint to raise a mocked emergency support case (also called internally by the chat pipeline). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message : "";
  const matchedSignals = Array.isArray(body?.matchedSignals) ? body.matchedSignals : [];

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const emergencyCase = raiseEmergencyCase(message, matchedSignals);
  return NextResponse.json({ simulated: true, emergencyCase });
}
