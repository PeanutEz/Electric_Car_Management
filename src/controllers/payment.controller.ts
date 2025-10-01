import { Request, Response } from "express";
import { createPayosPayment, getPaymentStatus } from "../services/payment.service";


export const createPaymentLink = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    
    const paymentLink = await createPayosPayment(payload);

    return res.json(paymentLink);
  } catch (error: any) {
    return res.status(500).json({ message: "Tạo payment link thất bại" });
  }
};


export const getPaymentInfo = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const paymentInfo = await getPaymentStatus(paymentId);
    return res.json(paymentInfo.data);
  } catch (error: any) {
    return res.status(500).json({ message: "Lấy thông tin payment thất bại" });
  }
};
