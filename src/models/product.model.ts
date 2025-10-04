export interface Category {
	id: number;
	type: string;
	name: string;
	slug: string;
}

export interface Product {
	id: number;
	title: string;
	brand: string;
	model: string;
	price: number;
	year: number;
	status: string;
	address: string;
	warranty: string;
	description: string;
	priority: number;
	image: string;
	category: Category;
}

export interface Vehicle {
	product_id: number;
	color: string;
	mileage_km: number;
	seats: number;
	power: number;
	battery_capacity: number;
	license_plate: string;
	engine_number: string;
}

export interface Battery {
	product_id: number;
	capacity: number;
	voltage: number;
	health: number;
	chemistry: string;
	dimensions: string;
}
