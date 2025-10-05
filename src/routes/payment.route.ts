import { Router } from 'express';
import {
	createPaymentLink,
	getPaymentInfo,
	createPackagePaymentLink,
	confirmPackagePaymentController,
} from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';

const router = Router();

router.post('/create-payment', createPaymentLink);

router.get('/payment-status/:paymentId', getPaymentInfo);

// Package payment routes
router.post('/create-package-payment', createPackagePaymentLink);

router.get(
	'/confirm-package-payment/:orderCode',
	confirmPackagePaymentController,
);

router.post('/confirm-package-payment', confirmPackagePaymentController);

export default router;
