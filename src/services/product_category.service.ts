import pool from "../config/db";
import { ProductCategory } from "../models/product_category.model";

export async function getAllProductCategories(): Promise<ProductCategory[]> {
    const [rows] = await pool.query('select id, name, type from product_categories');
    return rows as ProductCategory[];
}