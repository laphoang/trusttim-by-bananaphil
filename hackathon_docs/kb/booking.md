<!--
Source: trusttim_by_bananaphil_knowledge_base.md §1
Retrieval note: booking is an ACTION (fixed CTA), not a KB topic (Architecture guide §5.2/§6.2).
This chunk's actual retrieval `topic` is `hospital_info` — it answers informational "how do I
book" questions. The booking CTA itself is separate, fixed template copy in
TrustTim_Implementation-Spec.md §4.4, attached whenever `booking` is in the classifier's intents[].
-->

```json
{
  "id": "booking-policy-and-channels",
  "topic": "hospital_info",
  "title": "Chính sách và kênh đặt lịch khám",
  "keywords": ["đặt lịch khám", "đặt hẹn", "đặt lịch online", "hủy lịch", "đổi lịch", "tái khám", "hotline đặt lịch"],
  "source_url": "https://benhvientimhanoi.vn/he-thong/hen-kham/index.html",
  "last_reviewed": "2026-07-18",
  "is_synthetic": false
}
```

Quý vị có thể đặt lịch khám tại Bệnh viện Tim Hà Nội. Quý vị vui lòng đặt hẹn trước ít nhất 24h so với giờ dự định khám. Việc đặt hẹn chỉ có giá trị sau khi Bệnh viện xác nhận cuộc hẹn.

Để được hỗ trợ nhanh nhất, Quý vị vui lòng liên hệ qua tổng đài: 19001082.

Có thể đăng kí khám online tại một trong hai cơ sở:
- Cơ sở 1: Số 92 Trần Hưng Đạo, phường Cửa Nam, Hà Nội
- Cơ sở 2: Số 695 Lạc Long Quân, phường Tây Hồ, Hà Nội (chỉ có thể đặt lịch online đối với khám tự nguyện)

Nếu không đặt lịch trước, có thể đến lấy số trực tiếp tại cây lấy số tự động tại Khoa Khám bệnh của Bệnh viện Tim Hà Nội. Đổi/hủy lịch khám: liên hệ tổng đài 19001082.
