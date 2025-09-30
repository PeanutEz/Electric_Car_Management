import { Router } from "express";
import { createPaymentLink } from "../controllers/payment.controller";

const router = Router();

router.post("/create-payment", createPaymentLink);

export default router;
