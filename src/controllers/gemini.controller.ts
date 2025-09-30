import { generateText } from '../services/gemini.service';
import { Request, Response } from 'express';

export const getGeminiResponse = async (req: Request, res: Response) => {

	try {
		const { prompt } = req.body;
		const answer = await generateText(prompt);
		res.json({ answer });
	} catch (err) {
		res.status(500).json({ message: 'Error calling Gemini' });
	}
};


