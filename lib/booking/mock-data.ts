/**
 * Seed doctors/slots for the mocked booking handoff (Architecture guide §4 comp. 6). Sourced from
 * hackathon_docs/kb/doctor_schedule.md's CS2 voluntary-exam-room table (week snapshot) — clearly
 * simulated scheduling, not a live feed.
 */

export interface MockDoctor {
  id: string;
  name: string;
  room: string;
  facility: string;
  availableDays: string[]; // Vietnamese day names, e.g. "Thứ 2"
}

export const MOCK_DOCTORS: MockDoctor[] = [
  { id: "bs-hoai-thu", name: "BS.CKII Lê Thị Hoài Thu", room: "Phòng khám số 505", facility: "Cơ sở 2", availableDays: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"] },
  { id: "bs-duy-chinh", name: "ThS.BS Nguyễn Duy Chinh", room: "Phòng khám số 507", facility: "Cơ sở 2", availableDays: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"] },
  { id: "bs-linh-tu", name: "TS.BS Trần Thị Linh Tú", room: "Phòng khám số 509", facility: "Cơ sở 2", availableDays: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"] },
  { id: "bs-thuy-ngoc", name: "ThS.BS Lê Thúy Ngọc", room: "Phòng khám số 513", facility: "Cơ sở 2", availableDays: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"] },
];

export const BOOKING_CONTACT = {
  hotline: "19001082",
  bookingUrl: "https://benhvientimhanoi.vn/he-thong/hen-kham/index.html",
  zalo: "Bệnh viện Tim Hà Nội (Zalo OA)",
  minHoursInAdvance: 24,
};

const VI_WEEKDAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export interface MockSlot {
  doctorId: string;
  doctorName: string;
  room: string;
  date: string; // ISO date
  weekday: string;
}

/** Generates the next 7 days of mocked availability per doctor, honoring their working days. */
export function generateMockSlots(fromDate: Date = new Date()): MockSlot[] {
  const slots: MockSlot[] = [];
  for (let offset = 1; offset <= 7; offset++) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + offset);
    const weekday = VI_WEEKDAYS[date.getDay()];
    for (const doctor of MOCK_DOCTORS) {
      if (doctor.availableDays.includes(weekday)) {
        slots.push({
          doctorId: doctor.id,
          doctorName: doctor.name,
          room: doctor.room,
          date: date.toISOString().slice(0, 10),
          weekday,
        });
      }
    }
  }
  return slots;
}
