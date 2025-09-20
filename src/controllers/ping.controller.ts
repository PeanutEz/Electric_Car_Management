import { Request, Response } from "express";

export async function ping(req: Request, res: Response) {
    res.status(200).json({
      status: "ok",
      message: "Server is alive 🚀",
      timestamp: new Date().toISOString(),
    });
}