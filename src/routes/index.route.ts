import {Router} from "express";
import UserRouter from "./user.routes";

const routes = Router();
routes.use('/api/user', UserRouter);
//routes.use('/api/product', ProductRouter);


export default routes;
