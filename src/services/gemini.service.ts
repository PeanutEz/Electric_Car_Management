import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = process.env.GEMINI_URL || '';

export async function generateText(prompt: string): Promise<string> {
	try {
		const response = await axios.post(
			`${GEMINI_URL}?key=${GEMINI_API_KEY}`,
			{
				contents: [
					{
						parts: [{ text: "Bạn là một chuyên gia dự đoán .Hãy trả lời cho tôi bằng tiếng việt." + prompt }],
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
