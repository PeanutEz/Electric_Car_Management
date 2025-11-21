export interface Auction {
	id?: number;
	product_id: number;
	seller_id: number;
	starting_price: number;
	original_price: number;
	target_price: number;
	deposit: number;
	step: number;
	note?: string;
	winner_id?: number;
	winning_price?: number;
	duration?: number;
	status?: 'draft' | 'live' | 'ended' | 'verified';
}

export interface Auction_member {
	id?: number;
	user_id: number;
	auction_id: number;
	desire_price?: number;
	updated_at?: number;
}
