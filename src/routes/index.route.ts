import { Router } from 'express';
import UserRouter from './user.route';
import ProductRouter from './product.route';
import PostRouter from './post.route';
import BrandRoute from './brand.route';
import CategoryRouter from './category.route';
import PaymentRouter from './payment.route';
import UploadRouter from './upload.route';
import  GeminiRouter from './gemini.route';
import PackageRouter from './package.route';
import ServiceRouter from './service.route';

const routes = Router();

routes.use('/api/user', UserRouter);
routes.use('/api/product', ProductRouter);
routes.use('/api/post', PostRouter);
routes.use('/api/brand', BrandRoute);
routes.use('/api/category', CategoryRouter);
routes.use('/api/payment', PaymentRouter);
routes.use('/api/upload', UploadRouter);
routes.use('/api/gemini', GeminiRouter); // For multiple uploads
routes.use('/api/package', PackageRouter);
routes.use('/api/service', ServiceRouter);

export default routes;
