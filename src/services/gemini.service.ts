import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = process.env.GEMINI_URL || '';

export async function generateText(prompt: string): Promise<string> {
	try {
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
		throw error;
	}
}
