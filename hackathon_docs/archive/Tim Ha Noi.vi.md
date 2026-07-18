# Trợ Lý Chăm Sóc Khách Hàng AI Thông Minh cho Bệnh viện Tim Hà Nội

## A. Bối cảnh

Bệnh viện Tim Hà Nội là bệnh viện chuyên khoa tim mạch hạng I và là một trong những trung tâm tuyến đầu hàng đầu Việt Nam về chăm sóc tim mạch. Bệnh viện tiếp nhận khoảng 2.500–3.000 lượt bệnh nhân ngoại trú mỗi ngày, tạo ra nhu cầu thông tin rất lớn từ phía bệnh nhân và người nhà.

Các câu hỏi phổ biến nhất bao gồm:

- Đặt lịch khám
- Lịch làm việc của bác sĩ
- Quy trình khám và điều trị
- Quyền lợi bảo hiểm y tế (BHYT)
- Bảng giá dịch vụ
- Thủ tục nhập viện
- Hướng dẫn tái khám
- Thông tin về các dịch vụ y tế chuyên sâu của bệnh viện

Hiện tại, các câu hỏi này được xử lý thông qua tổng đài chăm sóc khách hàng, website bệnh viện, các kênh mạng xã hội và nhân viên lễ tân. Khối lượng lớn các câu hỏi lặp đi lặp lại tạo áp lực đáng kể lên đội ngũ chăm sóc khách hàng, dẫn đến phản hồi chậm trễ và trải nghiệm không đồng nhất giữa các bệnh nhân.

## B. Đề bài

Phát triển một Trợ lý Chăm sóc Khách hàng AI có thể tích hợp trực tiếp vào website của Bệnh viện Tim Hà Nội nhằm hỗ trợ bệnh nhân và người nhà tiếp cận thông tin bệnh viện và trả lời các câu hỏi thường gặp.

Giải pháp cần tối thiểu đáp ứng các yêu cầu sau:

### 1. Trả lời câu hỏi dựa trên tri thức (Knowledge-based Question Answering)

Trả lời chính xác các câu hỏi liên quan đến:

- Đặt lịch khám
- Quy trình khám và điều trị
- Quyền lợi bảo hiểm y tế (BHYT)
- Bảng giá dịch vụ y tế
- Giờ làm việc của bệnh viện
- Bác sĩ và các khoa/phòng chuyên môn
- Các thông tin chính thức khác của bệnh viện

### 2. Tích hợp với hệ thống bệnh viện

Hỗ trợ tích hợp với API hoặc hệ thống thông tin của bệnh viện để:

- Truy xuất lịch hẹn khám
- Chuyển hướng người dùng đến các dịch vụ đặt lịch khám (Website, Zalo Mini App, hoặc Tổng đài chăm sóc khách hàng)
- Truy xuất thông tin dịch vụ khi có sẵn

### 3. Trải nghiệm hội thoại

- Hỗ trợ hội thoại dạng văn bản
- Điểm cộng nếu hỗ trợ nhận dạng giọng nói tiếng Việt (ASR) và tổng hợp giọng nói (TTS)

### 4. Độ tin cậy của phản hồi AI

Mọi phản hồi phải dựa trên cơ sở tri thức chính thức của bệnh viện.

AI không được phép "ảo giác" (hallucinate) hoặc bịa đặt thông tin. Nếu không có đủ thông tin, trợ lý cần nêu rõ điều này và hướng dẫn người dùng đến các kênh hỗ trợ phù hợp của bệnh viện.

### 5. Xử lý tình huống khẩn cấp

Khi phát hiện các triệu chứng có thể là dấu hiệu cấp cứu y tế (ví dụ: đau ngực dữ dội, khó thở, ngất xỉu), AI không được đưa ra lời khuyên điều trị.

Thay vào đó, AI phải ngay lập tức hướng dẫn người dùng tìm kiếm sự chăm sóc y tế khẩn cấp hoặc đến Khoa Cấp cứu của bệnh viện theo đúng quy trình chính thức của bệnh viện.

### 6. Sẵn sàng triển khai

Giải pháp cần có khả năng triển khai trên hạ tầng của bệnh viện và tuân thủ các yêu cầu hiện hành về:

- Quyền riêng tư dữ liệu
- An toàn thông tin
- Các quy định về bảo vệ dữ liệu y tế
