import Router from 'express';
import { listPackages } from '../controllers/package.controller';

const router = Router();

router.get('/get-all', listPackages);

export default router;
