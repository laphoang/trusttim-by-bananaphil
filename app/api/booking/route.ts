import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { BOOKING_CONTACT, generateMockSlots } from "@/lib/booking/mock-data";

/** Mocked schedule + handoff (Architecture guide §4 comp. 6). Clearly labelled as simulated. */
export async function GET() {
  return NextResponse.json({
    simulated: true,
    contact: BOOKING_CONTACT,
    slots: generateMockSlots(),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.doctorId || !body?.date) {
    return NextResponse.json({ error: "doctorId and date are required" }, { status: 400 });
  }
  return NextResponse.json({
    simulated: true,
    confirmation: {
      bookingId: randomUUID(),
      doctorId: body.doctorId,
      date: body.date,
      status: "pending_hospital_confirmation",
      note: "Việc đặt hẹn chỉ có giá trị sau khi Bệnh viện xác nhận cuộc hẹn.",
    },
    contact: BOOKING_CONTACT,
  });
}
