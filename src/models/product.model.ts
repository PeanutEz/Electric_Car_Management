export interface Category {
	id: number;
	type: string;
	slug: string;
	count: number;
	name: string;
}

export interface Brand {
	id?: number;
	name: string;
	type: string;
}

export interface ProductImage {
	id: number;
	product_id: number;
	url: string;
}

export interface Vehicle {
	id: number;
	product_category_id?: number;
	category_id?: number;
	status?: string;
	brand: string;
	model: string;
	address: string;
	title?: string;
	description: string;
	end_date?: string;
	health: string;
	previousOwners: number;
	power: number;
	color: string;
	seats: number;
	mileage: number;
	battery_capacity: number;
	license_plate: string;
	engine_number: number;
	price: number;
	warranty: number;
	year: number;
	priority: number;
	pushed_at: string;
	category: Category;
	created_by?: number;
	image: string;
	images: string[];
}

export interface Battery {
	id: number;
	product_category_id?: number;
	category_id?: number;
	status?: string;
	brand: string;
	model: string;
	capacity: number;
	address: string;
	color: string;
	previousOwners: number;
	title?: string;
	description: string;
	voltage: number;
	chemistry: string;
	health: string;
	warranty: number;
	price: number;
	year: number;
	priority: number;
	end_date?: string;
	pushed_at: string;
	category: Category;
	created_by?: number;
	image: string;
	images: string[];
}
