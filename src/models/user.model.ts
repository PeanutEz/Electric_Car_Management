export interface User {
	id?: number;
	status?: string;
	full_name?: string;
	email: string;
	gender?: string;
	address?: string;
	phone: string;
	password: string;
	rating?: number;
	total_credit?: number;
	is_new?: number;
	role_id?: number;
	role?: string;
	description?: string;
	avatar?: string;
	verificationStatus?: boolean;
	total_posts?: number;
	total_active_posts?: number;
	total_sold_posts?: number;
	total_transactions?: number;
	recentTransaction?: {
		description: string;
		date: string;
		amount: number;
	};
	//access_token?: string;
	refresh_token?: string;
	//access_token_expires?: Date;
	// tính bằng giây
	expired_refresh_token?: Date;
	created_at?: Date;
}

// Default values
const defaultUser: User = {
	status: 'active',
	rating: 0,
	total_credit: 0,
	is_new: 0,
	role_id: 1,
	email: '', // để satisfy type (vì email bắt buộc)
	phone: '', // để satisfy type
	password: '', // để satisfy type
};
