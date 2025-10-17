export interface Transaction {
   id?: number;
   order_id: number;
   user_id: number;
   unit: string;
   type: 'Increase' | 'Decrease';
   credits: number;
}