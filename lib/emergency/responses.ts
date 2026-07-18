/**
 * Fixed, doctor-owned copy (Implementation Spec §4.4). The LLM never free-generates in these
 * paths — draft copy, grounded in the hospital's public "call 115" line; doctor sign-off pending.
 */

export const SERIOUS_EMERGENCY_MESSAGE =
  "Đây có thể là một tình huống cấp cứu. Vui lòng gọi ngay 115 hoặc đến Khoa Cấp cứu gần nhất. " +
  "TrustTim không thể xử lý các tình huống khẩn cấp — sự an toàn của bạn là ưu tiên hàng đầu.";

export const NORMAL_SYMPTOM_REDIRECT_MESSAGE =
  "TrustTim không thể thăm khám hoặc chẩn đoán triệu chứng. Để được đánh giá chính xác, vui lòng đặt " +
  "lịch khám tại Bệnh viện Tim Hà Nội.";

/** Shown when the severity classifier itself errors/times out — safety must not depend on a
 * successful model call (Architecture guide §3 step 2 fail-safe). */
export const CLASSIFIER_FAILSAFE_MESSAGE =
  "Xin lỗi, TrustTim đang gặp sự cố kỹ thuật và không thể xử lý yêu cầu này một cách an toàn. " +
  "Nếu đây là tình huống cấp cứu, vui lòng gọi ngay 115. Nếu không, vui lòng liên hệ tổng đài 1900 1082.";
