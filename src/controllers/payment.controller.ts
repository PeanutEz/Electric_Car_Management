import { Request, Response } from "express";
import payos from "../config/payos";

export const createPaymentLink = async (req: Request, res: Response) => {
  try {
    const orderCode = Math.floor(Math.random() * 1000000);
    const { amount, description } = req.body;

    // Gọi method trực tiếp từ instance
    const paymentLink = await payos.paymentRequests.create({
      orderCode,
      amount,
      description: description || "Thanh toán đơn hàng",
      returnUrl: "http://localhost:3000/payment-success",
      cancelUrl: "http://localhost:3000/payment-cancel",
    });

    return res.json(paymentLink);
  } catch (error: any) {
    return res.status(500).json({ message: "Tạo payment link thất bại" });
  }
};
