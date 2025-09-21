export interface User {
	id?: number;
	status?: string;
	full_name?: string;
	email: string;
	phone: string;
	password: string;
	reputation?: number;
	total_credit?: number;
	is_new?: number;
	role_id?: number;
  access_token?: string;
  refresh_token?: string;
	created_at?: Date;
}

// Default values
const defaultUser: User = {
	status: 'active',
	reputation: 0,
	total_credit: 0,
	is_new: 0,
	role_id: 1,
	email: '', // để satisfy type (vì email bắt buộc)
	phone: '', // để satisfy type
	password: '', // để satisfy type
};
