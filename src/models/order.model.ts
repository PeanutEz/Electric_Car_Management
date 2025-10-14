export interface Order {
   id: number;
   order_code: string;
   service_id: number;
   user_id: number;
   amount: number;
   status: 'PENDING' | 'PAID' | 'CANCELLED';
   created_at: Date;
}