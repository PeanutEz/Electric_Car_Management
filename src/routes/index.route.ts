import { Router } from 'express';
import UserRouter from './user.route';
import ProductRouter from './product.route';
import PostRouter from './post.route';


const routes = Router();

routes.use('/api/user', UserRouter);
routes.use('/api/product', ProductRouter);
routes.use('/api/post', PostRouter);

export default routes;
