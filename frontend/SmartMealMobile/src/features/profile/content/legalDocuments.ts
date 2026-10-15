import type { LegalDocument, LegalDocumentId } from '../types/profile.types';

// Nội dung tĩnh của "Điều khoản sử dụng" và "Chính sách quyền riêng tư" (Settings). Chỉ mô tả
// đúng những gì ứng dụng đang làm với dữ liệu — sửa văn bản này khi luồng dữ liệu thay đổi.
const UPDATED_LABEL = 'Cập nhật ngày 14/10/2026';

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  terms: {
    title: 'Điều khoản sử dụng',
    updatedLabel: UPDATED_LABEL,
    sections: [
      {
        heading: '1. Phạm vi dịch vụ',
        paragraphs: [
          'SmartMeal hỗ trợ bạn ghi nhật ký ăn uống, theo dõi dinh dưỡng, lập thực đơn và danh sách đi chợ. Khi dùng ứng dụng, bạn đồng ý với các điều khoản dưới đây.',
        ],
      },
      {
        heading: '2. Không thay thế tư vấn y tế',
        paragraphs: [
          'Chỉ số BMI, BMR, TDEE, mục tiêu calo/macro và mọi cảnh báo trong ứng dụng chỉ mang tính tham khảo. SmartMeal không chẩn đoán, không điều trị và không thay thế ý kiến của bác sĩ hay chuyên gia dinh dưỡng.',
          'Nếu bạn có bệnh lý, đang mang thai hoặc có dị ứng nghiêm trọng, hãy hỏi ý kiến chuyên gia trước khi thay đổi chế độ ăn.',
        ],
      },
      {
        heading: '3. Kết quả AI và dữ liệu sản phẩm',
        paragraphs: [
          'Kết quả nhận diện món ăn, giọng nói, tủ lạnh và nhãn dinh dưỡng là ước tính và có thể sai. Bạn cần kiểm tra, chỉnh sửa và xác nhận trước khi lưu.',
          'Thông tin sản phẩm quét mã vạch có thể đến từ cơ sở dữ liệu cộng đồng Open Food Facts và chưa được kiểm chứng. Cảnh báo dị ứng dựa trên dữ liệu có sẵn nên không thể bảo đảm an toàn tuyệt đối — luôn đọc kỹ nhãn trên bao bì.',
        ],
      },
      {
        heading: '4. Tài khoản',
        paragraphs: [
          'Bạn chịu trách nhiệm giữ bí mật mật khẩu. Tài khoản bị tạm khóa sau nhiều lần đăng nhập sai liên tiếp để bảo vệ bạn.',
          'Bạn có thể xóa dữ liệu cá nhân hoặc xóa vĩnh viễn tài khoản trong Cài đặt bất cứ lúc nào.',
        ],
      },
      {
        heading: '5. Gói Pro',
        paragraphs: [
          'Gói Pro chỉ được kích hoạt sau khi máy chủ nhận xác nhận thanh toán thành công từ cổng thanh toán. Khi hủy gia hạn, bạn vẫn dùng Pro đến hết thời hạn đã trả; hết hạn thì tài khoản trở về gói miễn phí và dữ liệu vẫn được giữ.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Chính sách quyền riêng tư',
    updatedLabel: UPDATED_LABEL,
    sections: [
      {
        heading: '1. Dữ liệu chúng tôi lưu',
        paragraphs: [
          'Thông tin tài khoản: họ tên, email, ảnh đại diện, mật khẩu (chỉ lưu dạng đã băm).',
          'Hồ sơ sức khỏe: ngày sinh, giới tính, chiều cao, cân nặng, mức vận động, mục tiêu, dị ứng, bệnh lý, chế độ ăn và lịch sử cân nặng.',
          'Dữ liệu sử dụng: nhật ký ăn uống, nước uống, thực đơn, danh sách đi chợ, công thức yêu thích, bộ sưu tập, thử thách và số bước/calo vận động đã đồng bộ.',
        ],
      },
      {
        heading: '2. Dữ liệu gửi tới bên thứ ba',
        paragraphs: [
          'Ảnh món ăn, ảnh tủ lạnh, ảnh nhãn dinh dưỡng và đoạn ghi âm bạn gửi được máy chủ SmartMeal chuyển tới dịch vụ AI Google Gemini để phân tích. Ứng dụng không gửi trực tiếp từ điện thoại.',
          'Khi quét mã vạch chưa có trong hệ thống, máy chủ chỉ gửi mã vạch tới Open Food Facts để tra thông tin sản phẩm.',
          'Thanh toán do cổng thanh toán xử lý. SmartMeal chỉ lưu mã giao dịch, gói, số tiền, phương thức và trạng thái thanh toán.',
        ],
      },
      {
        heading: '3. Lưu trên điện thoại',
        paragraphs: [
          'Mã đăng nhập được lưu trong vùng lưu trữ bảo mật của hệ điều hành. Cài đặt giao diện, nhắc nhở và hàng đợi ghi nhật ký khi mất mạng được lưu cục bộ trên máy.',
        ],
      },
      {
        heading: '4. Quyền của bạn',
        paragraphs: [
          '"Xóa dữ liệu cá nhân" xóa nhật ký, nước uống, hồ sơ sức khỏe, thực đơn, danh sách đi chợ, món tự nhập, yêu thích, bộ sưu tập, thông báo và tiến độ Bé Mầm/thử thách nhưng giữ tài khoản.',
          '"Xóa tài khoản" xóa vĩnh viễn tài khoản cùng dữ liệu cá nhân. Lịch sử giao dịch thanh toán được giữ lại ở dạng không gắn với tài khoản theo yêu cầu đối soát.',
          'Dữ liệu của bạn chỉ bạn xem được, trừ bộ sưu tập công thức bạn chủ động chia sẻ bằng liên kết.',
        ],
      },
    ],
  },
};
