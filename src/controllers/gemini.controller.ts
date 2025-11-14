import { generateText } from '../services/gemini.service';
import { Request, Response } from 'express';

export const getGeminiResponse = async (req: Request, res: Response) => {
	try {
		const { prompt } = req.body;
		const answer = await generateText(prompt);
		res.json({ answer });
	} catch (err: any) {
		// Check if it's a rate limit error (from our code or Google)
		if (
			err.message &&
			(err.message.includes('Vui lòng đợi') ||
				err.message.includes('quá tải'))
		) {
			return res.status(429).json({
				message: err.message,
				error: 'RATE_LIMIT_EXCEEDED',
			});
		}

		// Other errors
		const errorMessage = err.message || 'Error calling Gemini';
		res.status(500).json({
			message: errorMessage,
			error: 'GEMINI_ERROR',
		});
	}
};
