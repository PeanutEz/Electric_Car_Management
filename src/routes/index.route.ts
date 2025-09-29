import { Router } from 'express';
import UserRouter from './user.route';
import ProductRouter from './product.route';
import PostRouter from './post.route';
import BrandRoute from './brand.route';
import CategoryRouter from './category.route';


const routes = Router();

routes.use('/api/user', UserRouter);
routes.use('/api/product', ProductRouter);
routes.use('/api/post', PostRouter);
routes.use('/api/brand', BrandRoute);
routes.use('/api/category', CategoryRouter);

export default routes;
