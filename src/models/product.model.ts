export interface Product {
  id: number;
  category: string;
  brand: string;          
  model: string;         
  price: number;          
  description?: string;   
  warranty?: string;     
  year: number;          
  image?: string;         
  images?: string[];      
}

export interface Vehicle {
  product_id: number; 
  color: string;   
  seat: number; 
  battery_capacity?: number; 
  engine_number?: string; 
  license_plate?: string; 
  mileage: number;       
  description?: string;   
}

export interface Battery {
  product_id: number;
  capacity: number;
  health?: string;
  voltage?: number;
  dimensions?: string;
  chemistry?: string;
}