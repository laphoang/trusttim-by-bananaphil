<!--
Source: trusttim_by_bananaphil_knowledge_base.md §5, transcribed from 3 embedded screenshots.

IMPORTANT — freshness, not fabrication: these are weekly, rotating schedules, dated
"Tuần từ ngày 13/07/2026 đến ngày 19/07/2026" in the source screenshots. This is a SNAPSHOT for
that week only. Unlike the architecture guide's original assumption, this content is NOT
synthetic/fabricated — it's a real internal schedule — but it WILL go stale. Production needs a
live feed or a routine manual refresh; do not treat these rows as permanent facts. `is_synthetic`
is set false below because the content is genuine, but see `freshness` for the staleness caveat.
-->

```json
{
  "id": "doctor-schedule-cs2-voluntary-exam-rooms",
  "topic": "doctor_schedule",
  "title": "Lịch khám BS — Cơ sở 2, khu khám bệnh tự nguyện (505–513)",
  "keywords": ["lịch khám bác sĩ", "phòng khám 505", "phòng khám 507", "phòng khám 509", "phòng khám 511", "phòng khám 513", "cơ sở 2"],
  "source_url": null,
  "last_reviewed": "2026-07-18",
  "is_synthetic": false,
  "freshness": "snapshot for week of 2026-07-13 to 2026-07-19 — reconfirm before reuse"
}
```

Cơ sở 2 — 695 Lạc Long Quân, Tây Hồ, Hà Nội. Giờ: 7:30–16:30, tất cả các phòng.

| Phòng khám | Thứ 2–Thứ 6 | Thứ 7 | Chủ nhật |
|---|---|---|---|
| Phòng khám số 505 | BS.CKII Lê Thị Hoài Thu | — | Nghỉ |
| Phòng khám số 507 | ThS.BS Nguyễn Duy Chinh | — | — |
| Phòng khám số 509 | TS.BS Trần Thị Linh Tú | BS. Lê Thanh Nam | Nghỉ |
| Phòng khám số 511 | (nhãn "TC" trong nguồn — không rõ, cần xác nhận) | — | — |
| Phòng khám số 513 | ThS.BS Lê Thúy Ngọc | — | — |

Đặt lịch qua tổng đài: 19001082. Tư vấn giờ hành chính: 02439427791. Tư vấn 24/24h: 0969655335.

---

```json
{
  "id": "doctor-schedule-cs2-multi-specialty",
  "topic": "doctor_schedule",
  "title": "Lịch khám BS — Phòng khám Đa khoa, Cơ sở 2",
  "keywords": ["lịch khám bác sĩ", "phòng khám đa khoa", "răng hàm mặt", "tai mũi họng", "nhi", "da liễu", "sản phụ khoa", "mắt", "y học cổ truyền"],
  "source_url": null,
  "last_reviewed": "2026-07-18",
  "is_synthetic": false,
  "freshness": "snapshot for week of 2026-07-13 to 2026-07-19 — reconfirm before reuse"
}
```

Cơ sở 2 — 695 Lạc Long Quân, Tây Hồ, Hà Nội. Giờ: 7:30–16:30, tất cả các phòng.

| Phòng | Thứ 2 | Thứ 3 | Thứ 4 | Thứ 5 | Thứ 6 | Thứ 7 | Chủ nhật |
|---|---|---|---|---|---|---|---|
| RHM (P401) | BS Nguyễn Thanh Trà | BS Nguyễn Thanh Trà (khám tại CS1, 15h) | BS Nguyễn Thanh Trà | BS Nguyễn Thanh Trà | BS Nguyễn Thanh Trà | Nghỉ | Nghỉ |
| PHCN (P401) | BSNT. Trần Thị Quỳnh Nga | BSNT. Trần Thị Quỳnh Nga | BSNT. Trần Thị Quỳnh Nga | BSNT. Trần Thị Quỳnh Nga | Sáng: BSNT. Trần Thị Quỳnh Nga / Chiều: nghỉ | Nghỉ | Nghỉ |
| TMH (P402) | ThS.Bs Linh Thế Cường | ThS.Bs Linh Thế Cường | ThS.Bs Linh Thế Cường | ThS.Bs Linh Thế Cường | ThS.Bs Linh Thế Cường | Nghỉ | Nghỉ |
| PK.Nhi (P402) | ThS.Bs Dương Thị Thùy Nga | ThS.Bs Dương Thị Thùy Nga | ThS.Bs Dương Thị Thùy Nga | ThS.Bs Dương Thị Thùy Nga | ThS.Bs Dương Thị Thùy Nga | Nghỉ | Nghỉ |
| Da liễu (P403) | ThS.Bs Nguyễn Thị Minh Hoa | ThS.Bs Nguyễn Thị Minh Hoa | ThS.Bs Nguyễn Thị Minh Hoa | ThS.Bs Nguyễn Thị Minh Hoa | ThS.Bs Nguyễn Thị Minh Hoa | Nghỉ | Nghỉ |
| Sản-phụ khoa (P405) | Sáng: BSCK II Nguyễn Thị Tuyết Mai / Chiều: nghỉ | Sáng: BSCK II Nguyễn Thị Tuyết Mai / Chiều: nghỉ | Sáng: BSCK II Nguyễn Thị Tuyết Mai / Chiều: nghỉ | Sáng: BSCK II Nguyễn Thị Tuyết Mai / Chiều: nghỉ | Nghỉ | Nghỉ | Nghỉ |
| YHCT (P404) | BSNT. Nguyễn Thị Thuận | BSNT. Nguyễn Thị Thuận | BSNT. Nguyễn Thị Thuận | BSNT. Nguyễn Thị Thuận | BSNT. Nguyễn Thị Thuận | Nghỉ | Nghỉ |
| Nội chung - Hô hấp (P405.A) | ThS.BS Lại Thị Bạch Yến | ThS.BS Lại Thị Bạch Yến | ThS.BS Lại Thị Bạch Yến | ThS.BS Lại Thị Bạch Yến | ThS.BS Lại Thị Bạch Yến | Nghỉ | Nghỉ |
| Nội chung - CXK (P405.B) | ThS.BSNT Phạm Thị Oanh | ThS.BSNT Phạm Thị Oanh | ThS.BSNT Phạm Thị Oanh | ThS.BSNT Phạm Thị Oanh | ThS.BSNT Phạm Thị Oanh | Nghỉ | Nghỉ |
| PK.NIM-NT (P405.C) | BS.TMCH (viết tắt chưa rõ, cần xác nhận) | BS.TMCH | BS.TMCH | BS.TMCH | BS.TMCH | Nghỉ | Nghỉ |
| Mắt (P405.D) | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | Nghỉ | Nghỉ |

Liên hệ: 0961.972.997 (giờ hành chính, thứ 2 – thứ 6). Lãnh đạo khoa: TS.Bs Trần Thị Linh Tú.

---

```json
{
  "id": "doctor-schedule-cs1-cardiology-incomplete",
  "topic": "doctor_schedule",
  "title": "Lịch khám BS — Cơ sở 1, phòng khám tim mạch (KHÔNG ĐẦY ĐỦ)",
  "keywords": ["lịch khám bác sĩ", "cơ sở 1", "phòng khám tim mạch"],
  "source_url": null,
  "last_reviewed": "2026-07-18",
  "is_synthetic": false,
  "freshness": "incomplete — source screenshot too low-resolution to transcribe doctor names reliably; do not ingest until re-sourced"
}
```

Cơ sở 1 — 92 Trần Hưng Đạo, Cửa Nam, Hà Nội. 7 phòng khám tim mạch (Phòng khám số 1–7), cùng cấu
trúc thời gian × Thứ 2–Chủ nhật như hai bảng trên, nhưng **tên bác sĩ theo từng ô không đọc được rõ
ràng** từ ảnh chụp màn hình nguồn, kể cả sau khi phóng to 3–5 lần. Cần bản xuất dạng văn bản (không
phải ảnh chụp) từ bệnh viện trước khi đưa nội dung chi tiết vào knowledge base. **Không dùng chunk
này để trả lời câu hỏi cụ thể về tên bác sĩ tại Cơ sở 1 cho đến khi có nguồn rõ ràng hơn.**
