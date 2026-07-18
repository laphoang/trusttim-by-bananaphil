/** Fixed out-of-scope default response (Implementation Spec §4.4) — includes harmful/abusive queries. */
export const OUT_OF_SCOPE_MESSAGE =
  "Xin lỗi, TrustTim chỉ hỗ trợ các câu hỏi liên quan đến Bệnh viện Tim Hà Nội — như đặt lịch khám, " +
  "bảo hiểm y tế , thông tin về bệnh viện, lịch khám bác sĩ, và quy trình khám chữa bệnh. Với các vấn đề khác, vui lòng liên hệ tổng đài " +
  "1900 1082.";

/** Grounding-gate "I don't know" — distinct from OUT_OF_SCOPE_MESSAGE (in-scope but ungrounded, not off-topic). */
export const GROUNDING_GATE_MESSAGE =
  "Xin lỗi, TrustTim chưa có đủ thông tin để trả lời chính xác câu hỏi này. Vui lòng liên hệ tổng đài " +
  "1900 1082 để được hỗ trợ trực tiếp.";

/** Attached whenever "booking" is among the matched intents (Architecture guide §3 step 7). */
export const BOOKING_CTA_LABEL = "Đặt lịch khám ngay";

/** A booking-only message (no informational intent) skips retrieval entirely and returns just this. */
export const BOOKING_ONLY_MESSAGE =
  "Quý vị có thể đặt lịch khám tại Bệnh viện Tim Hà Nội qua tổng đài 19001082, website, hoặc Zalo. " +
  "Vui lòng đặt hẹn trước ít nhất 24 giờ.";
