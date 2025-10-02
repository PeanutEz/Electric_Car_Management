export interface Category {
	id: number;
	type: string;
	name: string;
}

export interface Brand {
	id?: number;
	name: string;
	type: string;
}



export interface Vehicle {
	id: number;
	product_category_id?: number;
	status?: string;
	brand: string;
	model: string;
	address: string;
	title?: string;
	description: string;
	end_date?: Date;
	power: number;
	color: string;
	seats: number;
	mileage: number;
	battery_capacity: number;
	license_plate: string;
	engine_number: number;
	price: number;
	year: number;
	priority: number;
    pushed_at: Date;
	category: Category;
	image: string;
	images: string[];
}

export interface Battery {
	id: number;
	product_category_id?: number;
	status?: string;
	brand: string;
	model: string;
	capacity: number;
	address: string;
	title?: string;
	description: string;
	voltage: number;
	chemistry: string;
	health: string;
	price: number;
	year: number;
	priority: number;
	end_date?: Date;
	pushed_at: Date;
	category: Category;
	image: string;
	images: string[];
}
