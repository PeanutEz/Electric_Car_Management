import {Vehicle, Battery, Brand, Category} from './product.model';

export interface Post {
   id: number;
   title: string;
   status: string;
   end_date: Date;
   review_by: number;
   created_by: number;
   created_at: Date;
   priority: number;
   pushed_at: Date;
   product: Vehicle | Battery;
   category: Category;
   brand: Brand;
   
}