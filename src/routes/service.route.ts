import Router from 'express';
import { listServices } from '../controllers/service.controller';

const router = Router();

router.get('/get-all', listServices);

export default router;