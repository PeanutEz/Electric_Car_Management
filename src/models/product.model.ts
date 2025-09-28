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
	//power: number;
	//address: string;
	description: string;
	seats: number;
	mileage: number;
	price: number;
	year: number;
	category: Category;
	image: string;
	images: string[];
}

export interface Battery {
	id: number;
	brand: string;
	model: string;
	capacity: number;
	//address: string;
	description: string;
	voltage: number;
	health: string;
	price: number;
	year: number;
	category: Category;
	image: string;
	images: string[];
}
