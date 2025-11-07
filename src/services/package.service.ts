import pool from '../config/db';

export async function getAllPackages(productType?: string) {
	const [rows] = await pool.query(
		'SELECT * FROM services WHERE type = "package"' + (productType ? ' AND product_type = ?' : ''),
		[productType]
	);
	return rows;
}

/**
 * Tạo package mới với service_ref tự động
 * Logic:
 * - Vehicle + post → service_ref chứa 1
 * - Vehicle + push → service_ref chứa 3
 * - Battery + post → service_ref chứa 2
 * - Battery + push → service_ref chứa 4
 *
 * @param name - Tên package (VD: "Gói Pro", "Gói Enterprise")
 * @param cost - Giá tiền
 * @param number_of_post - Số lượng post
 * @param number_of_push - Số lượng push
 * @param product_type - Loại sản phẩm: 'vehicle' hoặc 'battery'
 * @param description - Mô tả (optional)
 * @param feature - Tính năng (optional)
 */
export async function createPackage(
	name: string,
	cost: number,
	number_of_post: number,
	number_of_push: number,
	product_type: 'vehicle' | 'battery',
	description?: string,
	feature?: string,
) {
	try {
		// ✅ Xác định service_ref dựa trên product_type và số lượng
		const serviceRefs: number[] = [];

		if (product_type === 'vehicle') {
			if (number_of_post > 0) {
				serviceRefs.push(1); // Service "Đăng post cho vehicle có phí"
			}
			if (number_of_push > 0) {
				serviceRefs.push(3); // Service "Đẩy post cho vehicle có phí"
			}
		} else if (product_type === 'battery') {
			if (number_of_post > 0) {
				serviceRefs.push(2); // Service "Đăng post cho battery có phí"
			}
			if (number_of_push > 0) {
				serviceRefs.push(4); // Service "Đẩy post cho battery có phí"
			}
		}


		console.log(product_type);
		console.log(number_of_post);
		console.log(number_of_push);

	
		if (serviceRefs.length === 0) {
			throw new Error(
				'Package phải có ít nhất 1 trong 2: number_of_post > 0 hoặc number_of_push > 0',
			);
		}

		// ✅ Convert array thành string "1,3" hoặc "2,4"
		const service_ref = serviceRefs.join(',');

		// ✅ Insert vào database
		const [result]: any = await pool.query(
			`INSERT INTO services (name, type, cost, number_of_post, number_of_push, service_ref, product_type, description, feature, duration)
       VALUES (?, 'package', ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				name,
				cost,
				number_of_post,
				number_of_push,
				service_ref,
				product_type,
				description || null,
				feature || null,
				30, // Mặc định duration là 30 ngày
			],
		);

		// ✅ Lấy package vừa tạo
		const [rows]: any = await pool.query(
			'SELECT * FROM services WHERE id = ?',
			[result.insertId],
		);

		console.log(
			`✅ Package created: ${name} (ID: ${result.insertId}, service_ref: ${service_ref})`,
		);

		return {
			success: true,
			message: 'Package created successfully',
			data: rows[0],
		};
	} catch (error: any) {
		console.error('❌ Error creating package:', error);
		throw error;
	}
}

export async function updatePackage(name: string, description: string, cost: number, number_of_post: number, number_of_push: number, feature: string, id: number) {
   const [result] = await pool.query(
      `UPDATE services SET name = ?, description = ?, cost = ?, number_of_post = ?, number_of_push = ?, feature = ? WHERE id = ?`,
      [name, description, cost, number_of_post, number_of_push, feature, id]
   );
   if ((result as any).affectedRows === 0) {
      throw new Error('Package not found');
   }
   const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [id]);

   return (rows as any)[0];
}

export async function deletePackage(id: number) {
	const [result] = await pool.query(
		`DELETE FROM services WHERE id = ? AND type = 'package'`,
		[id]
	);
	if ((result as any).affectedRows === 0) {
		throw new Error('Package not found or could not be deleted');
	}
	return { success: true, message: 'Package deleted successfully' };
}

export async function getPackageByUserId(userId: number) {
	const [rows] = await pool.query(
		`SELECT * FROM user_packages LEFT JOIN services ON user_packages.package_id = services.id
		WHERE user_id = ?`,
		[userId]
	);
	return rows;
}
