import { Router } from 'express';
import UserRouter from './user.route';
import ProductRouter from './product.route';
import PostRouter from './post.route';
import CategoryRouter from './category.route';
import PaymentRouter from './payment.route';
import UploadRouter from './upload.route';
import  GeminiRouter from './gemini.route';
import ServiceRouter from './service.route';
import OrderRouter from './order.route';
import AdminRouter from './admin.route';
import ChatRouter from './chat.route';
import NotificationRouter from './notification.route';
import AuctionRouter from './auction.route';
import PackageRouter from './package.route';


const routes = Router();

routes.use('/api/user', UserRouter);
routes.use('/api/product', ProductRouter);
routes.use('/api/post', PostRouter);
routes.use('/api/category', CategoryRouter);
routes.use('/api/payment', PaymentRouter);
routes.use('/api/upload', UploadRouter);
routes.use('/api/gemini', GeminiRouter); // For multiple uploads
routes.use('/api/service', ServiceRouter);
routes.use('/api/order', OrderRouter);
routes.use('/api/admin', AdminRouter);
routes.use('/api/chat', ChatRouter);
routes.use('/api/notification', NotificationRouter);
routes.use('/api/auction', AuctionRouter);
routes.use('/api/package', PackageRouter);

export default routes;
