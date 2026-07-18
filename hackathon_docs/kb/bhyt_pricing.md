<!--
Source: trusttim_by_bananaphil_knowledge_base.md §3.
The card-code coverage percentages below are also encoded as structured rules in rules.json —
retrieval can hit either the prose chunk or the rule directly.
-->

```json
{
  "id": "bhyt-coverage-outpatient-policy",
  "topic": "bhyt_pricing",
  "title": "Chính sách BHYT khi khám, chữa bệnh ngoại trú",
  "keywords": ["BHYT", "bảo hiểm y tế", "mức hưởng", "đúng tuyến", "trái tuyến", "giấy chuyển viện", "cấp cứu BHYT"],
  "source_url": "https://www.facebook.com/profile/100063675078947/search/?q=c%E1%BA%A5p%20c%E1%BB%A9u",
  "last_reviewed": "2026-07-18",
  "is_synthetic": false
}
```

Bệnh nhân có thẻ BHYT và giấy chuyển viện đúng tuyến được hưởng các quyền lợi theo quy định của BHYT trong quá trình khám và điều trị tại bệnh viện.

Các bệnh nhân khám bệnh tại khoa Khám bệnh tự nguyện khi vào viện cũng được ưu tiên khi điều trị nội trú.

Về chế độ BHYT khi điều trị nội trú: bệnh nhân trong diện cấp cứu được hưởng BHYT cấp cứu; các trường hợp khác không trong diện cấp cứu cần xin chuyển tuyến theo quy định của BHYT.

Đối với người bệnh khám, chữa bệnh ngoại trú tự đến (không đúng tuyến), Quỹ BHYT thanh toán 50% mức hưởng theo quyền lợi của thẻ BHYT:
- Thẻ hưởng 100% (mã 1, 2, 5): Quỹ BHYT thanh toán 50% chi phí thuộc phạm vi được hưởng.
- Thẻ hưởng 95% (mã 3): Quỹ BHYT thanh toán 47,5% chi phí thuộc phạm vi được hưởng.
- Thẻ hưởng 80% (mã 4): Quỹ BHYT thanh toán 40% chi phí thuộc phạm vi được hưởng.

**Lưu ý:** đúng tuyến, có giấy chuyển cơ sở khám chữa bệnh, có giấy hẹn khám lại, cấp cứu, hoặc thuộc các trường hợp Bộ Y tế quy định → hưởng đầy đủ quyền lợi BHYT theo mức ghi trên thẻ (không bị giảm còn 50%/47,5%/40%).

---

```json
{
  "id": "on-demand-exam-pricing-table",
  "topic": "bhyt_pricing",
  "title": "Bảng giá khám bệnh theo yêu cầu",
  "keywords": ["giá khám theo yêu cầu", "khám dịch vụ", "bảng giá", "chăm sóc y tế", "phòng bệnh"],
  "source_url": null,
  "last_reviewed": "2026-07-18",
  "is_synthetic": false
}
```

Bảng giá danh mục khám bệnh theo yêu cầu (đơn vị: VNĐ) — transcribed from an embedded screenshot in the source doc; no "STT 3" row appears in the original:

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

*("Khoa DTBN" abbreviation kept as-is from the source; expansion unconfirmed.)*

---

```json
{
  "id": "bhyt-max-reimbursement-table",
  "topic": "bhyt_pricing",
  "title": "Bảng giá BHYT chi trả tối đa — khám bệnh và ngày giường điều trị",
  "keywords": ["BHYT chi trả", "giường bệnh", "hồi sức cấp cứu", "hồi sức tích cực", "ngoại khoa"],
  "source_url": null,
  "last_reviewed": "2026-07-18",
  "is_synthetic": false
}
```

Bảng giá bảo hiểm y tế — khám bệnh và ngày giường điều trị (đơn vị: VNĐ):

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

Đối với câu hỏi về dịch vụ/kỹ thuật cụ thể không có trong bảng: liên hệ tổng đài 19001082 để được hỗ trợ chi tiết.
