export interface Service {
   id?: number;
   name: string;
   type: string;
   description: string;
   cost: number;
   number_of_post: number;
   number_of_push: number;
   number_of_verify: number;
   service_ref: string;
   product_type: string;
   duration: number; // duration in days
   feature: string; // JSON string representing additional features
}