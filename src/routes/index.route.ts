import UserRouter from "./user.routes";

export const routes = (app: any) => {
   // API routes
   app.use('/api/user', UserRouter);
   //app.use('/api/product', ProductRouter);
};


