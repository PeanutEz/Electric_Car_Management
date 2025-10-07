import Router from 'express';
import {createTopupPaymentController, topupCreditController,purchasePackageController , listServices,createPackagePaymentController} from '../controllers/service.controller';
import { create } from 'domain';

const router = Router();

router.get('/get-all', listServices);

router.post('/create-topup-payment', createTopupPaymentController);
router.post('/topup-credit', topupCreditController);
router.post('/purchase-package', purchasePackageController);
router.post('/create-package-payment', createPackagePaymentController);

export default router;