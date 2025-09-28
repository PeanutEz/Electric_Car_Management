import Router from 'express';
import { 
listProducts
 } from '../controllers/product.controller';
const router = Router();

// Define product routes here
router.get('/getAllProducts', listProducts);


export default router;