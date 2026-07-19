# TrustTim — Kịch bản Demo trực tiếp (Tiếng Việt, ~5 phút)

Kịch bản quay video demo cho VAIC 2026, dự án **TrustTim** của **Team BananaPhil**. Mở đầu bằng
khoảnh khắc "wow" (cấp cứu), ngắn gọn, và bao phủ đủ các tiêu chí chấm điểm. Mỗi phân đoạn gồm: lời
dẫn + câu cần gõ + điều cần chỉ trên màn hình.

Ứng dụng chạy trực tuyến: https://trusttim-by-bananaphil.vercel.app/

## Chuẩn bị trước khi quay
- Mở sẵn trang web, mạng ổn định, phóng to trình duyệt để chữ dễ đọc.
- Chuẩn bị sẵn các câu hỏi để dán (copy-paste) cho nhanh và không gõ sai.
- Lưu ý: hiệu ứng chữ hiện dần là ở phía giao diện; câu cấp cứu sẽ tạo một "ca hỗ trợ" mô phỏng.
- Thứ tự: cấp cứu → cùng từ khóa nhưng thông thường → trả lời có căn cứ → đa ý định → ngoài phạm vi
  → đặt lịch → kết. Nếu quá giờ: bỏ Beat 5 trước, rồi Beat 4.

---

## Mở đầu (~15s)

> "Xin chào ban giám khảo. Đây là TrustTim — trợ lý AI cho Bệnh viện Tim Hà Nội. Tôi xin bắt đầu
> ngay bằng điều quan trọng nhất ở một bệnh viện tim: khi nào AI phải NGỪNG trả lời và chuyển sang
> cấp cứu."

---

## Beat 1 — Cấp cứu (wow trước tiên) · *(An toàn)*

**Gõ:** `Tôi đang đau ngực dữ dội và khó thở, phải làm sao?`

> "TrustTim không trò chuyện, không chẩn đoán. Nó lập tức hiện cảnh báo cấp cứu màu đỏ, nút 'Gọi 115
> ngay', và tạo một ca hỗ trợ khẩn. Logic này do chính bác sĩ tim mạch trong đội thiết kế — đây là
> sai lầm mà một bệnh viện tim không được phép mắc."

**Chỉ:** thẻ đỏ, tiêu đề "⚠ Cảnh báo cấp cứu", nút "Gọi 115 ngay".

---

## Beat 2 — Cùng từ "đau ngực", mức độ khác · *(An toàn, UX)*

**Gõ:** `Đau ngực là triệu chứng của bệnh gì?`

> "Lần này chỉ là câu hỏi thông thường. TrustTim KHÔNG chẩn đoán — nó lịch sự từ chối và hướng người
> dùng đặt lịch khám. Cùng một từ khóa, nhưng mức độ nghiêm trọng được phân loại chính xác."

**Chỉ:** thẻ màu vàng, lời hướng dẫn đặt lịch, kèm nút đặt lịch.

---

## Beat 3 — Trả lời có căn cứ + trích dẫn · *(Kỹ thuật, An toàn)*

**Gõ:** `Thẻ BHYT mức hưởng 80% khi khám ngoại trú tự đến được thanh toán bao nhiêu?`

> "Câu trả lời hiển thị dưới dạng bảng rõ ràng, và quan trọng nhất — có dòng 'Nguồn' dẫn tới đúng
> trang của bệnh viện. Mọi thông tin đều bắt nguồn từ kho tri thức của chính bệnh viện, không bịa ra."

**Chỉ:** bảng được hiển thị đẹp, và chip "Nguồn: …" ở chân câu trả lời.

---

## Beat 4 — Một câu, hai ý định · *(AI-Native, UX)*

**Gõ:** `Có gói khám tim mạch tổng quát theo yêu cầu không, và tôi muốn đặt lịch luôn?`

> "Vừa hỏi thông tin, vừa muốn đặt lịch. TrustTim trả lời phần thông tin kèm trích dẫn, đồng thời
> hiện luôn nút đặt lịch bên dưới — không ý định nào che mất ý định kia."

**Chỉ:** câu trả lời có trích dẫn, VÀ bảng đặt lịch (CS1/CS2) ngay bên dưới.

---

## Beat 5 — Ngoài phạm vi · *(An toàn)*

**Gõ:** `Bạn giúp tôi giải bài tập toán lớp 5 nhé?`

> "Ngoài phạm vi bệnh viện, TrustTim từ chối rõ ràng và hướng về tổng đài. Nó không lan man, không
> trả lời bừa."

**Chỉ:** thẻ màu xám, lời từ chối và hướng về tổng đài 1900 1082.

---

## Beat 6 — Hành động thật, không phải ngõ cụt · *(Kinh doanh, UX)*

**Gõ:** `Tôi muốn đặt lịch khám vào tuần sau`

> "Đây là hành động thật: TrustTim đưa ra hai kênh đặt lịch — Cơ sở 1 qua Zalo, Cơ sở 2 qua website,
> kèm tổng đài 19001082. Một quy trình có hành động, không phải ngõ cụt trò chuyện."

**Chỉ:** thẻ màu xanh, hai nút "Đặt lịch khám ngay" (CS1 → Zalo, CS2 → website), và số tổng đài.

---

## Kết (~15s) · *(Thuyết trình)*

> "Tóm lại: an toàn trước tiên, trả lời có căn cứ và trích dẫn, sẵn sàng triển khai — và đã chạy trực
> tuyến ngay hôm nay. Với vai trò là một bác sĩ, tôi sẵn sàng đưa TrustTim đến với bệnh nhân của
> mình. Xin cảm ơn."
