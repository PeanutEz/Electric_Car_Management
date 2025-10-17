import Router from 'express';
import { addService,editService, listServices, removeService,listOrders } from '../controllers/admin.controller';

const router = Router();

router.get('/list-services', listServices);
router.post('/create-service', addService);
router.put('/update-service/:id', editService);
router.delete('/delete-service/:id', removeService);

router.get('/list-orders', listOrders);

export default router;