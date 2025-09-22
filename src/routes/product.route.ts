import Router from 'express';

const router = Router();
// Define product-related routes here
router.get('/', (req, res) => {
   res.send('Product route');
});

export default router;