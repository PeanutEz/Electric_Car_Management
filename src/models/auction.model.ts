export interface Auction {
	id?: number;
	product_id: number;
	seller_id: number;
	starting_price: number;
	original_price: number;
	target_price: number;
	deposit: number;
	winner_id?: number;
	winning_price?: number;
	user_id: number;
	auction_id: number;
	desire_price?: number;
	updated_at?: number;
}
