# TrustTim Knowledge Base — Source Content (refined)

> **What this is:** the doctor's raw, hand-written FAQ/policy content for Hanoi Heart Hospital —
> the primary source material for TrustTim's knowledge base. This pass only **refines structure
> and clarity** (fixes Google-Docs export artifacts, adds section headers mapped to the taxonomy,
> transcribes the 5 embedded table screenshots into real text/tables). **Every fact is preserved
> verbatim from the original** — nothing paraphrased away, nothing invented.
>
> **What this is not:** the built KB itself. See [`hackathon_docs/kb/`](../kb/) for the actual
> chunked `.md`/`.json` artifacts derived from this content, ready to drop into the product repo's
> `data/kb/` (per `TrustTim_Architecture-and-Implementation-Guide.md` §7).
>
> **Two things flagged for doctor confirmation, not silently resolved:**
> - §2 gives the hotline as "1900 1029," but §1, §3, and the doctor-schedule notes (§5) all say
>   "19001082" — almost certainly a typo. Treat "19001082" as correct unless told otherwise.
> - §5's Facility 1 (Cơ sở 1) schedule table (source screenshot, "image3") was too low-resolution
>   to transcribe reliably at the doctor-name level, even after 3–5x upscaling — see §5 for exactly
>   what could and couldn't be read, rather than guessing at names.

---

## 1. Appointment Booking (`booking`)

**Câu hỏi:**
1. Tôi có thể đặt lịch khám online không?
2. Tôi muốn đặt lịch khám tim mạch vào ngày mai, còn khung giờ nào trống không?
3. Làm sao để đặt lịch khám với bác sĩ chuyên về tăng huyết áp?
4. Tôi muốn đặt lịch tái khám
5. Tôi muốn đổi hoặc hủy lịch khám tim mạch sang ngày khác thì làm sao?

**Trả lời:**
Quý vị có thể đặt lịch khám tại Bệnh viện Tim Hà Nội. Quý vị vui lòng đặt hẹn trước ít nhất 24h so với giờ dự định khám. Việc đặt hẹn chỉ có giá trị sau khi Bệnh viện xác nhận cuộc hẹn.

Để được hỗ trợ nhanh nhất, Quý vị vui lòng liên hệ qua tổng đài: 19001082.

Ngoài ra, Quý vị có thể đăng kí khám online. Vui lòng lựa chọn một trong hai cơ sở dưới đây để đăng ký khám online:
- 👉 Cơ sở 1: Số 92 Trần Hưng Đạo, phường Cửa Nam, Hà Nội
- 👉 Cơ sở 2: Số 695 Lạc Long Quân, phường Tây Hồ, Hà Nội (chỉ có thể đặt lịch online đối với khám tự nguyện) — [Đặt lịch khám - Bệnh viện Tim Hà Nội](https://benhvientimhanoi.vn/he-thong/hen-kham/index.html)

Nếu không đặt lịch trước, Quý vị vui lòng đến lấy số trực tiếp tại cây lấy số tự động tại Khoa Khám bệnh của Bệnh viện Tim Hà Nội.

---

## 2. Examination Procedure — Quy trình khám (`procedures`)

> Complements (does not duplicate) the full internal SOP:
> [`PROCEDURE_FOR_PATIENT_RECEPTION_OUTPATIENT_EXAMINATION_TREATMENT.md`](../problem_statement/PROCEDURE_FOR_PATIENT_RECEPTION_OUTPATIENT_EXAMINATION_TREATMENT.md).
> This is the shorter, patient-facing version of the same flow.

Quy trình khám bệnh gồm các bước sau:

1️⃣ **Đăng ký khám:** Bệnh nhân đã đặt lịch đến quầy tư vấn để được làm thủ tục đăng kí khám. Bệnh nhân chưa đặt lịch lấy số thứ tự tại cây lấy số tự động.

2️⃣ **Tiếp nhận thông tin:** Bệnh nhân xuất trình giấy tờ cần thiết (CCCD, BHYT, ứng dụng Vss-ID, giấy chuyển viện, giấy hẹn khám lại,... nếu có). Bệnh nhân thuộc đối tượng ưu tiên theo quy định được đóng dấu ưu tiên.

3️⃣ **Thanh toán:** Bệnh nhân đến quầy kế toán nộp phí khám (và phần chênh lệch BHYT nếu có).

4️⃣ **Đo sinh hiệu:** Bệnh nhân được đo dấu hiệu sinh tồn, chiều cao, cân nặng. Nếu bất thường, được báo bác sĩ hoặc chuyển cấp cứu.

5️⃣ **Khám bệnh & làm cận lâm sàng:** Bệnh nhân được vào khám bác sĩ → đi làm các chỉ định cận lâm sàng → nhận kết quả.

6️⃣ **Kết luận & hướng điều trị:** Bác sĩ giải thích, kết luận bệnh, kê đơn, cho bệnh nhân lịch hẹn tái khám / nhập viện / chuyển tuyến.

7️⃣ **Sau khám:**
- Nội trú: làm thủ tục nhập viện
- Ngoại trú: nhận hướng dẫn tái khám
- BN có BHYT: thanh toán chi phí chênh lệch của BHYT (nếu có)
- BN khám dịch vụ: thanh toán đơn thuốc dịch vụ

8️⃣ **Nhận thuốc tại quầy → hoàn tất khám bệnh**

Hãy liên hệ ngay với chúng tôi qua số điện thoại ~~1900 1029~~ **19001082** để được hỗ trợ. *(Source doc originally said "1900 1029" here — inconsistent with the "19001082" used everywhere else in this doc and confirmed again in the Facility 2 schedule notes, §5. Flagged for doctor confirmation; treating as a typo.)*

---

## 3. BHYT Coverage & Service Pricing (`bhyt_pricing`)

Bệnh nhân có thẻ BHYT và giấy chuyển viện đúng tuyến được hưởng các quyền lợi theo quy định của BHYT trong quá trình khám và điều trị tại bệnh viện.

Các bệnh nhân khám bệnh tại khoa Khám bệnh tự nguyện khi vào viện cũng được ưu tiên khi điều trị nội trú.

Về chế độ BHYT khi điều trị nội trú: đối với bệnh nhân trong diện cấp cứu thì được hưởng BHYT cấp cứu, đối với các trường hợp khác vào viện không trong diện cấp cứu thì cần xin chuyển tuyến theo quy định của BHYT.

Quyền lợi và mức hưởng BHYT ([(3) Bệnh Viện Tim Hà Nội | Facebook](https://www.facebook.com/profile/100063675078947/search/?q=c%E1%BA%A5p%20c%E1%BB%A9u))

Đối với người bệnh khám, chữa bệnh ngoại trú tự đến, Quỹ BHYT thanh toán 50% mức hưởng theo quyền lợi của thẻ BHYT, cụ thể:
- Thẻ hưởng 100% (mã 1, 2, 5): Quỹ BHYT thanh toán 50% chi phí thuộc phạm vi được hưởng.
- Thẻ hưởng 95% (mã 3): Quỹ BHYT thanh toán 47,5% chi phí thuộc phạm vi được hưởng.
- Thẻ hưởng 80% (mã 4): Quỹ BHYT thanh toán 40% chi phí thuộc phạm vi được hưởng.

**Lưu ý:** Đối với các trường hợp khám, chữa bệnh đúng tuyến; có giấy chuyển cơ sở khám, chữa bệnh; có giấy hẹn khám lại; cấp cứu; hoặc thuộc các trường hợp được hưởng theo quy định của Bộ Y tế, người bệnh vẫn được hưởng đầy đủ quyền lợi BHYT theo mức hưởng ghi trên thẻ.

### Bảng giá danh mục khám bệnh theo yêu cầu (đơn vị: VNĐ)

*(Transcribed from the source doc's embedded screenshot "image1" — legible after upscaling.)*

| STT | Chi chú | Danh mục khám bệnh | Giá dịch vụ y tế | Giá khám bệnh | Giá dịch vụ theo yêu cầu |
|---|---|---|---|---|---|
| 1 | Cơ sở 1 | Khám theo yêu cầu (mức 1) | 500,000 | 200,000 | 300,000 |
| 1 | Cơ sở 1 | Khám theo yêu cầu (mức 2) | 300,000 | 100,000 | 200,000 |
| 2 | Cơ sở 2 | Khám theo yêu cầu (mức 1) | 500,000 | 200,000 | 300,000 |
| 2 | Cơ sở 2 | Khám theo yêu cầu (mức 2) | 300,000 | 100,000 | 200,000 |
| 4 | Khoa DTBN | Dịch vụ chăm sóc y tế dưới 4 giờ/ngày (Phòng 3 giường) | 300,000 | — | 300,000 |
| 4 | Khoa DTBN | Dịch vụ chăm sóc y tế trên 4 giờ/ngày (Phòng 3 giường) | 500,000 | — | 500,000 |
| 4 | Khoa DTBN | Dịch vụ chăm sóc y tế dưới 4 giờ/ngày (Phòng 13 giường) | 150,000 | — | 150,000 |
| 4 | Khoa DTBN | Dịch vụ chăm sóc y tế trên 4 giờ/ngày (Phòng 13 giường) | 200,000 | — | 200,000 |

*(Note: no "STT 3" row appears in the source screenshot — the table jumps from STT 2 to STT 4 as transcribed. "Khoa DTBN" abbreviation left as-is in the source; expansion not confirmed, flag for doctor if it needs spelling out.)*

### Bảng giá bảo hiểm y tế — khám bệnh và ngày giường điều trị (đơn vị: VNĐ)

*(Transcribed from the source doc's embedded screenshot "image2" — fully legible.)*

| STT | Dịch vụ kỹ thuật | Giá BHYT chi trả tối đa |
|---|---|---|
| 1 | Khám bệnh | 42,100 |
| 2 | Giường Nội khoa | 255,300 |
| 3 | Giường Hồi sức cấp cứu | 474,700 |
| 4 | Giường Hồi sức tích cực | 786,300 |
| 5 | Giường Ngoại khoa loại 1 | 339,000 |
| 6 | Giường Ngoại khoa loại 2 | 308,500 |
| 7 | Giường Ngoại khoa loại 3 | 270,500 |
| 8 | Giường Ngoại khoa loại 4 | 242,100 |

Đối với câu hỏi liên quan đến dịch vụ, kĩ thuật cụ thể: để biết thông tin chi tiết và chính xác nhất về chi phí dịch vụ này, Quý vị hãy liên hệ ngay với Bệnh viện Tim Hà Nội qua số điện thoại 19001082 để được hỗ trợ chi tiết hơn.

---

## 4. Hospital Information (`hospital_info`)

- [Chi tiết - Giới thiệu chung](https://benhvientimhanoi.vn/vn/cong/thong-tin/gioi-thieu-chung)
- [Chi tiết - Ban lãnh đạo bệnh viện](https://benhvientimhanoi.vn/vn/cong/thong-tin/ban-lanh-dao)

**Đối tượng phục vụ:** Chúng tôi phục vụ tất cả các đối tượng bệnh nhân, bao gồm:
- Bệnh nhân mắc bệnh tim mạch – chuyển hóa, bệnh nhân sau can thiệp hoặc phẫu thuật tim mạch.
- Bệnh nhân các chuyên khoa khác cần kiểm tra tình trạng tim mạch trước khi thực hiện các bước điều trị chuyên khoa (phẫu thuật, xạ trị, hóa chất, sinh con…)
- Các khách hàng có nhu cầu kiểm tra sức khỏe tổng quát, định kỳ mỗi 6 tháng/1 năm.
- Chúng tôi phục vụ mọi lứa tuổi từ sơ sinh đến người cao tuổi có nhu cầu khám tim mạch từ cơ bản đến chuyên sâu.
- Các sản phụ nằm trong đối tượng có nguy cơ như trên (mục "khám chuyên khoa" bên dưới) nên thực hiện siêu âm tim thai từ tuần thai thứ 18.

Với đội ngũ nhân lực có trình độ chuyên môn cao và phong cách phục vụ thân thiện, thuận tiện, thanh lịch, khoa Khám bệnh Tự nguyện mong muốn mang đến cho bệnh nhân dịch vụ khám chữa bệnh chất lượng và chuyên nghiệp nhất.

**Các xét nghiệm hiện chúng tôi có thể phục vụ bệnh nhân:**

**a. Đối với khám sức khỏe thông thường:** điện tim đồ, X quang tim phổi, siêu âm – Doppler tim thường quy, xét nghiệm cơ bản (công thức máu, đông máu cơ bản, chức năng gan thận, đường máu, mỡ máu, acid uric, tổng phân tích nước tiểu…), siêu âm ổ bụng.

**b. Đối với các yêu cầu có tính chất chuyên khoa hơn**, tùy theo tính chất bệnh, chúng tôi có thể thực hiện:
- Nghiệm pháp gắng sức để sàng lọc bệnh động mạch vành và một số bệnh lý khác.
- Siêu âm tim Dobutamine để sàng lọc bệnh động mạch vành.
- Holter huyết áp 24h để đánh giá tình trạng huyết áp.
- Holter Điện tim đồ 24h đánh giá các rối loạn nhịp tim.
- Siêu âm tim qua thực quản để phục vụ cho việc chẩn đoán và một số bệnh lý cần can thiệp tim mạch.
- Siêu âm tim 4D cho chẩn đoán chính xác các bệnh lý tim, đặc biệt là các bệnh cần can thiệp hoặc phẫu thuật tim.
- Siêu âm – Doppler mạch máu: chẩn đoán các bệnh lý mạch máu toàn thân (hẹp ĐM cảnh, suy tĩnh mạch chi dưới, hẹp ĐM thận…)
- Đo chỉ số ABI: sàng lọc bệnh xơ vữa động mạch, đánh giá nguy cơ bệnh tim mạch.
- Các xét nghiệm máu chuyên sâu: hs Troponin, pro BNP, hs CRP, sàng lọc sớm ung thư…
- Chụp cộng hưởng từ toàn thân.
- Chụp cắt lớp động mạch vành 128 dãy hoặc 256 dãy và chụp CT các bộ phận khác trong cơ thể.
- Siêu âm tim thai: nhằm chẩn đoán sàng lọc trước sinh các vấn đề về tim thai, đặc biệt với một số đối tượng có nguy cơ cao (mẹ mắc đái tháo đường, mẹ sử dụng thuốc có thể ảnh hưởng đến thai, nhiễm virut, tia xạ, mẹ mắc các bệnh tự miễn, thụ tinh trong ống nghiệm, gia đình có người mắc bệnh có tính chất bẩm sinh/di truyền hoặc có con/thai trước mắc bệnh tim bẩm sinh, có các yếu tố nguy cơ của thai như song sinh 1 bánh rau, 1 động mạch rốn, có dị tật ở các cơ quan khác, phù thai, rối loạn nhịp tim thai hoặc siêu âm thai nghi ngờ bệnh tim thai). Siêu âm tim thai có thể bắt đầu từ lúc 18 tuần.

**Additional contact numbers found while transcribing the schedule tables (§5), relevant here too:**
- Tư vấn khám, chữa bệnh trong giờ hành chính (Cơ sở 2, khu khám tự nguyện): 02439427791
- Tư vấn khám, chữa bệnh 24/24h (Cơ sở 2, khu khám tự nguyện): 0969655335
- Liên hệ Phòng khám Đa khoa (Cơ sở 2), giờ hành chính thứ 2 – thứ 6: 0961.972.997
- Website: benhvientimhanoi.vn — Fanpage: facebook.com/BenhvienTimHaNoi.vn

---

## 5. Doctor Schedule (`doctor_schedule`)

> **Important — these are weekly, rotating schedules, not permanent facts.** The source screenshots
> are dated "Tuần từ ngày 13/07/2026 đến ngày 19/07/2026" (week of 13–19 Jul 2026). Treat everything
> below as a **snapshot for that week only** — in production this needs a live feed or a routine
> manual refresh, not a one-time static KB chunk. This is a *time-bound freshness* issue, not the
> "synthetic/fabricated data" concern the architecture guide originally flagged for this topic.

### 5.1 Cơ sở 1 — 92 Trần Hưng Đạo (cardiology exam rooms — partially legible only)

*(Transcribed from "image3." Column structure is legible; individual doctor names in the day-by-day
cells were not reliably legible even after 3–5x upscaling — the source screenshot is lower-resolution
than images 4–5 below. Flagging rather than guessing at names.)*

- Table structure: rows = Phòng khám số 1 through Phòng khám số 7 (cardiology exam rooms), split
  into two groups ("Cơ sở 1 — Từ ngày [1]" and a second group below a note row); columns = Thời
  gian (time slot) × Thứ 2–Thứ 7, Chủ nhật (Mon–Sun).
- A red-highlighted note row between the two room groups appears to reference a phone number and a
  booking-related instruction, but was not legible enough to transcribe with confidence.
- **Action needed:** request a text-based export (not a screenshot) of the Cơ sở 1 schedule from
  the hospital before this table can populate the KB reliably.

### 5.2 Cơ sở 2 — 695 Lạc Long Quân, Tây Hồ (khu khám bệnh tự nguyện — on-demand exam rooms)

*(Transcribed from "image4" — fully legible. Week of 13/07/2026–19/07/2026, all rooms 7:30–16:30.)*

| Phòng khám | Thứ 2–Thứ 6 | Thứ 7 | Chủ nhật |
|---|---|---|---|
| Phòng khám số 505 | BS.CKII Lê Thị Hoài Thu | — | Nghỉ |
| Phòng khám số 507 | ThS.BS Nguyễn Duy Chinh | — | — |
| Phòng khám số 509 | TS.BS Trần Thị Linh Tú | BS. Lê Thanh Nam | Nghỉ |
| Phòng khám số 511 | TC *(label unclear in source — not a name; flag to confirm)* | — | — |
| Phòng khám số 513 | ThS.BS Lê Thúy Ngọc | — | — |

**Contact notes (from the same screenshot, clearly legible):**
- Để đặt lịch khám qua tổng đài vui lòng gọi số: 19001082
- Tư vấn khám, chữa bệnh trong giờ hành chính: 02439427791
- Tư vấn khám, chữa bệnh 24/24h: 0969655335
- Website: benhvientimhanoi.vn — Fanpage: facebook.com/BenhvienTimHaNoi.vn

### 5.3 Cơ sở 2 — Phòng khám Đa khoa (multi-specialty clinic)

*(Transcribed from "image5" — fully legible. Week of 13/07/2026–19/07/2026, all rooms 7:30–16:30.)*

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
| PK.NIM-NT (P405.C) | BS.TMCH *(abbreviation unclear — flag to confirm)* | BS.TMCH | BS.TMCH | BS.TMCH | BS.TMCH | Nghỉ | Nghỉ |
| Mắt (P405.D) | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | BSCKI Nguyễn Thị Huyền | Nghỉ | Nghỉ |

**Contact note (from the same screenshot):**
- Số điện thoại liên hệ: 0961.972.997 (giờ hành chính các ngày trong tuần từ thứ 2 đến thứ 6)
- Lãnh đạo khoa: TS.Bs Trần Thị Linh Tú

---

## 6. Normal Symptom (`normal` severity — feeds the guardrail's fixed redirect copy, §6.1 of the Architecture guide)

**Câu hỏi:**
- "Tôi thỉnh thoảng thấy tim đập nhanh, có cần đi khám không?"
- "Tôi bị hồi hộp, đánh trống ngực nhẹ, có nguy hiểm không?"
- "Đôi lúc tôi thấy tức ngực nhẹ, có phải vấn đề tim mạch không?"
- "Tôi dễ mệt khi leo cầu thang, có cần kiểm tra tim không?"
- "Tôi bị chóng mặt nhẹ thoáng qua, có liên quan đến tim không?"

**Trả lời (doctor-authored — use verbatim as the `normal`-severity redirect copy):**
> Triệu chứng bạn đang gặp có thể liên quan đến vấn đề tim mạch và nên được kiểm tra sớm.
> 👉 Bạn nên đặt lịch khám tim mạch trong thời gian gần nhất để bác sĩ đánh giá và tư vấn phù hợp.
> 👉 Nếu cần, tôi có thể giúp bạn đặt lịch ngay.

---

## 7. Emergency (`serious` severity — feeds the guardrail's fixed escalation copy, §6.1 of the Architecture guide)

**Câu hỏi:**
- "Tôi rất đau ngực, có thể đặt lịch khám sớm nhất khi nào?"
- "Tôi thấy như bị bóp nghẹt ở ngực"
- "Tôi đau ngực dữ dội, đau lan lên vai và cánh tay trái"
- "Tôi thấy khó thở"
- "Tôi cảm thấy choáng váng"
- "Tôi muốn ngất"
- "Người nhà của tôi mất ý thức"
- "Người nhà của tôi ngừng thở, không bắt mạch được…"

**Trả lời (doctor-authored — use verbatim as the `serious`-severity escalation copy, filling in the situation placeholder):**
> Tình trạng [...] có thể là một cấp cứu nguy hiểm. Vui lòng gọi cấp cứu 115 hoặc đến cơ sở y tế gần nhất ngay lập tức để được hướng dẫn và hỗ trợ kịp thời.
>
> Nếu thuận tiện, Quý vị có thể đến trực tiếp Khoa Cấp cứu của Bệnh viện Tim Hà Nội:
> 1. Cơ sở 1: 92 Trần Hưng Đạo, phường Cửa Nam, Hà Nội
> 2. Cơ sở 2: 695 Lạc Long Quân, phường Tây Hồ, Hà Nội
>
> Để được hỗ trợ nhanh, vui lòng gọi tổng đài Bệnh viện Tim Hà Nội: 19001082.
>
> Các trường hợp cấp cứu tại bệnh viện sẽ được ưu tiên xử trí trong thời gian sớm nhất.
