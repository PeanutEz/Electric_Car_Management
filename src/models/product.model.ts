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
	brand: string;
	model: string;
	power: number;
	address: string;
	title?: string;
	description: string;
	status?: string;
	end_date?: Date;
	seats: number;
	mileage: number;
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
	status?: string;
	brand: string;
	model: string;
	capacity: number;
	address: string;
	title?: string;
	description: string;
	voltage: number;
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
