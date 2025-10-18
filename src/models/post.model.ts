import {Vehicle, Battery, Category} from './product.model';
import {Brand} from './brand.model';

export interface Post {
   id: number;
   title: string;
   status: string;
   end_date: Date;
   review_by: number;
   created_by: number;
   created_at: Date;
   description: string;
   updated_at: Date;
   priority: number;
   pushed_at: Date;
   product: Vehicle | Battery;
}