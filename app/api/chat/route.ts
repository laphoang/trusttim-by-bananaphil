import { NextResponse } from "next/server";
import { runChatPipeline } from "@/lib/chat/pipeline";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const result = await runChatPipeline(message);

  // Structured turn log (Architecture guide §8) — query, severity/intent verdicts, sources, latency.
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      message,
      responseType: result.responseType,
      citations: result.citations.map((c) => ({ title: c.title, sourceUrl: c.sourceUrl })),
      ...result.debug,
    }),
  );

  return NextResponse.json(result);
}
