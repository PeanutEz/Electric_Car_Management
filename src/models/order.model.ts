export interface Order {
	id: number;
	type:
		| 'post'
		| 'push'
		| 'verify'
		| 'package'
		| 'topup'
		| 'deposit'
		| 'auction_fee'
		| 'auction_deposit';
	order_code: string;
	service_id?: number;
	product_id?: number;
	user_id?: number;
	seller_id?: number;
	buyer_id?: number;
	amount: number;
	status: 'PENDING' | 'PAID' | 'CANCELLED';
	payment_method?: 'PAYOS' | 'CREDIT';
	created_at: Date;
}
