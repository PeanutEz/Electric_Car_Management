import pool from '../config/db';
import { Service } from '../models/service.model';
import { Order } from '../models/order.model';


// ## 📦 Table: `services`
// ID  Name                          type            cost          number_of_post    number_of_push   number_of_verify      service_ref
// 1   Đăng post cho vehicle có phí  post            50000             1                 0                   0                 1 
// 2   Đăng post cho battery có phí  post            50000             1                 0                   0                 2
// 3   Đẩy post cho vehicle có phí   push            50000             0                 1                   0                 3
// 4  Đẩy post cho battery có phí     push            50000             0                 1                   0                 4
// 5  Kiểm duyệt cho vehicle có phí   verify          50000             0                 0                   1                 5
// 6  Kiểm duyệt cho battery có phí    verify          50000             0                 0                   1                 6
// 7  Gói cơ bản(3 lần đăng tin cho xe)   package               100000            3                 0                   0                  1
// 8  gói nâng cao (3 push 3 post cho xe)   package           300000            3                 3                   0                  1,3

export async function createService(service: Service): Promise<void> {
   const { name, type, cost, number_of_post, number_of_push, number_of_verify, service_ref } = service;
   await pool.query('INSERT INTO services (name, type, cost, number_of_post, number_of_push, number_of_verify, service_ref) VALUES (?, ?, ?, ?, ?, ?, ?)', 
   [name, type, cost, number_of_post, number_of_push, number_of_verify, service_ref]);
}
export async function getAllServices(): Promise<Service[]> {
    const [rows] = await pool.query('SELECT * FROM services');
   return rows as Service[];
}
export async function updateService(id: number, service: Service): Promise<void> {
   const { name, type, cost, number_of_post, number_of_push, number_of_verify, service_ref } = service;
   await pool.query('UPDATE services SET name = ?, type = ?, cost = ?, number_of_post = ?, number_of_push = ?, number_of_verify = ?, service_ref = ? WHERE id = ?', 
   [name, type, cost, number_of_post, number_of_push, number_of_verify, service_ref, id]);
}
export async function deleteService(id: number): Promise<void> {
   await pool.query('DELETE FROM services WHERE id = ?', [id]);
}

export async function getOrder(page: number, limit: number): Promise<{orders: Order[], total: number}> {
   const offset = (page - 1) * limit;
   const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
   const [countRows] = await pool.query('SELECT COUNT(*) as count FROM orders');
   const total = (countRows as any)[0].count as number;
   return { orders: rows as Order[], total };
}
