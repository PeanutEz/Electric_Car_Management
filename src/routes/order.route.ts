import Router from 'express';
import { getOrdersByUserIdAndCodeController } from '../controllers/order.controller';
import { authenticateToken } from '../middleware/AuthMiddleware';
const router = Router();
+
router.post('/verify', authenticateToken,getOrdersByUserIdAndCodeController);

export default router;