import {Router} from "express";
import UserRouter from "./user.route";
import ProductRouter from "./product.route";

const routes = Router();
routes.use('/api/user', UserRouter);
routes.use('/api/product', ProductRouter);


export default routes;
