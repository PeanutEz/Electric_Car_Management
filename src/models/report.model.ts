export interface Report {
   id: number;
   product_id: number;
   user_id: number;          // Người bị lỗi (vd: seller hoặc buyer)
   reason: string;          // Lý do báo cáo
   created_at: Date;
}