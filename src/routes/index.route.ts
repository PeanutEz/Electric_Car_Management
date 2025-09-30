import { Router } from 'express';
import UserRouter from './user.route';
import ProductRouter from './product.route';
import PostRouter from './post.route';
import BrandRoute from './brand.route';
import CategoryRouter from './category.route';
import PaymentRouter from './payment.route';

const routes = Router();

routes.use('/api/user', UserRouter);
routes.use('/api/product', ProductRouter);
routes.use('/api/post', PostRouter);
routes.use('/api/brand', BrandRoute);
routes.use('/api/category', CategoryRouter);
routes.use('/api/payment', PaymentRouter);

export default routes;
