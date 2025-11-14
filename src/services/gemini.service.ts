import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = process.env.GEMINI_URL || '';

// Rate limiting: 1 request per 15 seconds
let lastRequestTime = 0;
const REQUEST_INTERVAL = 15000; // 15 seconds in milliseconds

export async function generateText(prompt: string): Promise<string> {
	try {
		// Check rate limit
		const now = Date.now();
		const timeSinceLastRequest = now - lastRequestTime;

		if (timeSinceLastRequest < REQUEST_INTERVAL) {
			const waitTime = REQUEST_INTERVAL - timeSinceLastRequest;
			throw new Error(
				`Vui lòng đợi ${Math.ceil(
					waitTime / 1000,
				)} giây trước khi gửi yêu cầu tiếp theo.`,
			);
		}

		// Update last request time
		lastRequestTime = now;

		const systemPrompt = `Bạn là một chuyên gia về xe điện và pin xe điện tại Việt Nam với nhiều năm kinh nghiệm.

NHIỆM VỤ CỦA BẠN:
- Dự đoán và tư vấn về giá cả xe điện (ô tô điện, xe máy điện)
- Dự đoán và tư vấn về giá cả pin xe điện
- Phân tích xu hướng thị trường xe điện và pin
- Tư vấn về mua bán, đấu giá xe điện và pin
- Đánh giá giá trị xe điện cũ và pin cũ

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời các câu hỏi liên quan đến: xe điện, pin xe điện, giá cả, thị trường xe điện
2. Nếu câu hỏi KHÔNG liên quan đến xe điện hoặc pin xe điện, trả lời: "Xin lỗi, tôi chỉ có thể tư vấn về xe điện và pin xe điện. Vui lòng hỏi các câu hỏi liên quan đến lĩnh vực này."
3. LUÔN LUÔN trả lời HOÀN TOÀN BẰNG TIẾNG VIỆT
4. Cung cấp thông tin chính xác, cụ thể về giá cả (đơn vị VNĐ)
5. Đưa ra lý do và phân tích khi dự đoán giá

Câu hỏi của người dùng: `;

		const response = await axios.post(
			`${GEMINI_URL}?key=${GEMINI_API_KEY}`,
			{
				contents: [
					{
						parts: [{ text: systemPrompt + prompt }],
					},
				],
			},
			{
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);
		// Lấy text từ response
		const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
		return text || 'No response from Gemini';
	} catch (error: any) {
		console.error(
			'Gemini API error:',
			error.response?.data || error.message,
		);

		// Handle rate limit from Google (429)
		if (
			error.response?.status === 429 ||
			error.response?.data?.error?.code === 429
		) {
			throw new Error(
				'Hệ thống AI tạm thời quá tải. Vui lòng thử lại sau ít phút. Xin lỗi vì sự bất tiện này!',
			);
		}

		// Handle other API errors gracefully
		if (error.response?.data?.error?.message) {
			throw new Error(
				`Lỗi kết nối với AI: ${error.response.data.error.message}`,
			);
		}

		throw error;
	}
}
