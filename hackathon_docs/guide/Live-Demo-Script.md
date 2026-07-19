# TrustTim — Kịch bản Demo trực tiếp (Tiếng Việt, ~5 phút)

Kịch bản quay video demo cho VAIC 2026, dự án **TrustTim** của **Team BananaPhil**. Mở đầu bằng khả
năng trả lời câu hỏi thật của bệnh nhân trên đủ các chủ đề, sau đó chuyển sang điểm khác biệt lớn
nhất: biết dừng lại đúng lúc khi có cấp cứu. Mỗi chủ đề/ý định có **2 câu hỏi** — câu đầu được diễn
giải đầy đủ, câu thứ hai chỉ điểm nhanh (1 câu) để giữ tổng thời lượng gần 5 phút.

Ứng dụng chạy trực tuyến: https://trusttim-by-bananaphil.vercel.app/

## Chuẩn bị trước khi quay
- Mở sẵn trang web, mạng ổn định, phóng to trình duyệt để chữ dễ đọc.
- Chuẩn bị sẵn các câu hỏi để dán (copy-paste) cho nhanh và không gõ sai.
- Lưu ý: hiệu ứng chữ hiện dần là ở phía giao diện; câu cấp cứu sẽ tạo một "ca hỗ trợ" mô phỏng.
- Thứ tự: 5 chủ đề tra cứu (đặt lịch, BHYT, quy trình, thông tin bệnh viện, lịch bác sĩ) → 1 câu
  bonus đa ý định → chuyển cảnh → 2 chủ đề an toàn (triệu chứng thường, cấp cứu) → 1 câu ngoài phạm
  vi → kết.
- **Nếu quá giờ, cắt theo thứ tự:** bỏ Q2 của Beat 4 → bỏ Beat 9 (ngoài phạm vi) → bỏ Q2 của Beat 3
  → bỏ Beat 6 (bonus đa ý định).

---

## Mở đầu (~15s)

> "Xin chào ban giám khảo. Đây là TrustTim — trợ lý AI cho Bệnh viện Tim Hà Nội. Tôi sẽ cho các anh
> chị thấy nó trả lời được bao nhiêu loại câu hỏi thật của bệnh nhân — và sau đó, điều quan trọng
> nhất nó biết làm khi có chuyện không bình thường."

---

## Beat 1 — Đặt lịch khám (booking)

**Q1 — Gõ:** `Tôi muốn đặt lịch khám vào tuần sau`

> "Một hành động thật — không phải ngõ cụt trò chuyện."

**Chỉ:** thẻ màu xanh, hai nút "Đặt lịch khám ngay" (CS1 → Zalo, CS2 → website), số tổng đài.

**Q2 (nhanh) — Gõ:** `Tôi muốn hủy lịch khám đã đặt`
> "Và cả đổi/hủy lịch cũng được hướng dẫn ngay."

---

## Beat 2 — BHYT / Giá dịch vụ (bhyt_pricing)

**Q1 — Gõ:** `Thẻ BHYT mức hưởng 80% khi khám ngoại trú tự đến được thanh toán bao nhiêu?`

> "Trả lời có bảng rõ ràng, và quan trọng nhất — có dòng 'Nguồn' dẫn tới đúng trang của bệnh viện."

**Chỉ:** bảng được hiển thị đẹp, chip "Nguồn: …" ở chân câu trả lời.

**Q2 (nhanh) — Gõ:** `Giá khám theo yêu cầu mức 1 ở cơ sở 1 là bao nhiêu?`
> "Một bảng giá khác, cùng cơ chế trích dẫn."

---

## Beat 3 — Quy trình khám (procedures)

**Q1 — Gõ:** `Quy trình khám bệnh ngoại trú gồm những bước nào?`

> "Câu trả lời đi từng bước, đúng theo quy trình thật của bệnh viện, kèm trích dẫn."

**Chỉ:** câu trả lời liệt kê từng bước + chip nguồn.

**Q2 (nhanh) — Gõ:** `Đến khám thì cần mang giấy tờ gì và đăng ký ở đâu?`
> "Câu hỏi thực tế hơn, vẫn đúng nguồn."

---

## Beat 4 — Thông tin bệnh viện (hospital_info)

**Q1 — Gõ:** `Bệnh viện Tim Hà Nội có mấy cơ sở, ở đâu?`

> "Thông tin cơ bản nhưng chính xác, có trích dẫn."

**Chỉ:** câu trả lời + chip nguồn.

**Q2 (nhanh) — Gõ:** `Số điện thoại tổng đài của bệnh viện là gì?`
> "Thông tin liên hệ chính xác, không bịa số."

---

## Beat 5 — Lịch khám bác sĩ (doctor_schedule)

**Q1 — Gõ:** `Bác sĩ Lê Thị Hoài Thu khám vào ngày nào trong tuần?`

> "Ngay cả lịch khám theo tuần cũng được tra cứu có căn cứ."

**Chỉ:** câu trả lời + chip nguồn (có thể kèm nhãn "minh hoạ" nếu dữ liệu là ví dụ).

**Q2 (nhanh) — Gõ:** `Phòng khám Tai Mũi Họng ở cơ sở 2 do bác sĩ nào phụ trách?`
> "Một phòng khám khác, vẫn đúng dữ liệu."

---

## Beat 6 (bonus) — Một câu, hai ý định · *(AI-Native, UX)*

**Gõ:** `Có gói khám tim mạch tổng quát theo yêu cầu không, và tôi muốn đặt lịch luôn?`

> "Vừa hỏi thông tin, vừa muốn đặt lịch — TrustTim trả lời phần thông tin kèm trích dẫn, đồng thời
> hiện luôn nút đặt lịch bên dưới. Không ý định nào che mất ý định kia."

**Chỉ:** câu trả lời có trích dẫn VÀ bảng đặt lịch cùng lúc.

---

## Chuyển cảnh (~8s)

> "Đó là những gì TrustTim trả lời được. Nhưng điều quan trọng nhất ở một bệnh viện tim là biết khi
> nào KHÔNG được chỉ trả lời."

---

## Beat 7 — Triệu chứng thông thường (normal_symptom) · *(An toàn, UX)*

**Q1 — Gõ:** `Đau ngực là triệu chứng của bệnh gì?`

> "TrustTim KHÔNG chẩn đoán — nó lịch sự từ chối và hướng người dùng đặt lịch khám."

**Chỉ:** thẻ màu vàng, lời từ chối chẩn đoán, nút đặt lịch.

**Q2 (nhanh) — Gõ:** `Dạo này tôi thường thấy mệt khi leo cầu thang, có phải dấu hiệu tim yếu?`
> "Vẫn không chẩn đoán — vẫn hướng đặt lịch."

---

## Beat 8 — Cấp cứu (serious/emergency) · *(An toàn — cao trào)*

**Q1 — Gõ:** `Tôi đang đau ngực dữ dội và khó thở, phải làm sao?`

> "TrustTim lập tức hiện cảnh báo cấp cứu màu đỏ, nút 'Gọi 115 ngay', và tạo một ca hỗ trợ khẩn.
> Logic này do chính bác sĩ tim mạch trong đội thiết kế — đây là sai lầm mà một bệnh viện tim không
> được phép mắc."

**Chỉ:** thẻ đỏ, tiêu đề "⚠ Cảnh báo cấp cứu", nút "Gọi 115 ngay".

**Q2 (nhanh) — Gõ:** `Chồng tôi vừa ngã ra, bất tỉnh, không thở được`
> "Một tình huống hoàn toàn khác — vẫn được nhận diện ngay."

---

## Beat 9 — Ngoài phạm vi (out-of-scope)

**Gõ:** `Bạn có thể giúp tôi làm bài tập toán lớp 5 không?`

> "Ngoài phạm vi bệnh viện, TrustTim từ chối rõ ràng và hướng về tổng đài. Nó không lan man, không
> trả lời bừa."

**Chỉ:** thẻ màu xám, lời từ chối và hướng về tổng đài 1900 1082.

---

## Kết (~15s)

> "Tóm lại: trả lời được nhiều, trả lời có căn cứ — và biết dừng lại đúng lúc. Với vai trò một bác
> sĩ, tôi sẵn sàng đưa TrustTim đến với bệnh nhân của mình. Xin cảm ơn."
