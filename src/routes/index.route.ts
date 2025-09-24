import {Router} from "express";
import UserRouter from "./user.route";
import ProductRouter from "./product.route";
import BrandRouter from "./brand.route";
import ProductCategoryRouter from "./product_category.route";

const routes = Router();

routes.use('/api/user', UserRouter);
routes.use('/api/product', ProductRouter);
routes.use('/api/brand', BrandRouter);
routes.use('/api/product-categories', ProductCategoryRouter);

export default routes;
