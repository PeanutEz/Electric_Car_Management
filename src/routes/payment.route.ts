import { Router } from "express";
import { createPaymentLink, getPaymentInfo } from "../controllers/payment.controller";

const router = Router();

router.post("/create-payment", createPaymentLink);

router.get("/payment-status/:paymentId", getPaymentInfo);

export default router;