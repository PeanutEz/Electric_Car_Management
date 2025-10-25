import pool from '../config/db';

export async function getOrdersByUserIdAndCode(
	userId: number,
	orderCode: string,
) {
	const [rows]: any = await pool.query(
		'select * from orders where buyer_id = ? and code = ?',
		[userId, orderCode],
	);
	return rows[0];
}

export async function getTransactionDetail(userId: number) {
	const [rows]: any = await pool.query(
		`select u.id as user_id,u.full_name,u.email, u.phone, u.total_credit, s.type as service_type,s.name as service_name,
      s.description, s.cost, d.credits, d.type as changing,d.unit,o.status,o.created_at  from transaction_detail d
                                    inner join orders o on o.id = d.order_id
                                    inner join services s on s.id = o.service_id
                                    inner join users u on u.id = d.user_id where d.user_id = ?`,
		[userId],
	);
	return rows.map((row: any) => ({
		...row,
		service_type: row.changing === 'Increase' ? 'top up' : row.service_type,
		service_name:
			row.changing === 'Increase' ? 'Nạp tiền' : row.service_name,
	}));
}

export async function getOrderDetail(orderId: number) {
	const [rows]: any = await pool.query(
		`SELECT o.*, d.credits, d.type as changing, d.unit, d.id as transaction_id
        FROM orders o
        LEFT JOIN transaction_detail d ON o.id = d.order_id
        WHERE o.id = ?`,
		[orderId],
	);
	return rows;
}

// export async function getAllOrderByUserId(
// 	userId: number,
// 	status?: string,
// 	type?: string,
// 	orderId?: number,
// ) {
// 	try {
// 		const filters: string[] = [`o.buyer_id = ${userId}`];
// 		if (status) filters.push(`o.status = '${status}'`);
// 		if (orderId) filters.push(`o.id = ${orderId}`);
// 		const where = filters.join(' AND ');

// 		let sql = '';

// 		switch ((type || '').toLowerCase()) {
// 			// --- CASE AUCTION ---
// 			case 'auction':
// 				sql = `
//           SELECT
//             o.id AS order_id, o.type, o.status, o.price, o.service_id, o.product_id, o.buyer_id,
//             o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
//             u.full_name, u.email, u.phone,
//             s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
//             s.number_of_post, s.number_of_push, s.feature,
//             a.id AS auction_id, a.starting_price, a.original_price, a.target_price,
//             a.deposit, a.winner_id, a.winning_price, a.step, a.note,

//             p.title AS product_title, p.brand, p.model, p.price AS product_price,
//             p.address, p.description, p.product_category_id, p.year, p.image,
//             c.type AS category_type, c.slug AS category_slug, c.name AS category_name,

//             p.color, v.seats, v.mileage_km, v.power,
//             b.capacity AS battery_capacity, b.health AS battery_health,
//             b.chemistry AS battery_chemistry, b.voltage AS battery_voltage, b.dimension AS battery_dimension
//           FROM orders o
//           INNER JOIN users u ON u.id = o.buyer_id
//           INNER JOIN services s ON s.id = o.service_id
//           INNER JOIN auctions a ON a.product_id = o.product_id
//           INNER JOIN products p ON p.id = a.product_id
//           INNER JOIN product_categories c ON c.id = p.product_category_id
//           LEFT JOIN vehicles v ON v.product_id = p.id
//           LEFT JOIN batteries b ON b.product_id = p.id
//           WHERE o.type = 'auction' AND ${where}
//         `;
// 				break;

// 			// --- CASE POST ---
// 			case 'post':
// 				sql = `
//           SELECT
//             o.id AS order_id, o.type, o.status, o.price, o.service_id, o.product_id, o.buyer_id,
//             o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
//             u.full_name, u.email, u.phone,
//             s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
//             s.number_of_post, s.number_of_push, s.feature,

//             p.title AS product_title, p.brand, p.model, p.price AS product_price,
//             p.address, p.description, p.product_category_id, p.year, p.image,
//             c.type AS category_type, c.slug AS category_slug, c.name AS category_name,

//             p.color, v.seats, v.mileage_km, v.power,
//             b.capacity AS battery_capacity, b.health AS battery_health,
//             b.chemistry AS battery_chemistry, b.voltage AS battery_voltage, b.dimension AS battery_dimension
//           FROM orders o
//           INNER JOIN users u ON u.id = o.buyer_id
//           INNER JOIN services s ON s.id = o.service_id
//           INNER JOIN products p ON p.id = o.product_id
//           INNER JOIN product_categories c ON c.id = p.product_category_id
//           LEFT JOIN vehicles v ON v.product_id = p.id
//           LEFT JOIN batteries b ON b.product_id = p.id
//           WHERE o.type = 'post' AND ${where}
//         `;
// 				break;

// 			// --- CASE PACKAGE, TOPUP, DEPOSIT ---
// 			case 'package':
// 			case 'pakage':
// 			case 'deposit':
// 			case 'topup':
// 				sql = `
//           SELECT
//             o.id AS order_id, o.type, o.status, o.price, o.service_id, o.product_id, o.buyer_id,
//             o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
//             u.full_name, u.email, u.phone,
//             s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
//             s.type AS service_type, s.feature
//           FROM orders o
//           INNER JOIN services s ON s.id = o.service_id
//           INNER JOIN users u ON u.id = o.buyer_id
//           WHERE o.type = '${type}' AND ${where}
//         `;
// 				break;

// 			default:
// 				sql = `
//           SELECT
//             o.id AS order_id, o.type, o.status, o.price, o.service_id, o.product_id, o.buyer_id,
//             o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
//             u.full_name, u.email, u.phone,
//             s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
//             s.type AS service_type, s.feature
//           FROM orders o
//           INNER JOIN services s ON s.id = o.service_id
//           INNER JOIN users u ON u.id = o.buyer_id
//           WHERE ${where}
//         `;
// 				break;
// 		}

// 		const [rows]: any = await pool.query(sql);

// 		const formatted = rows.map((r: any) => {
// 			const base = {
// 				id: r.order_id,
// 				type: r.type,
// 				status: r.status,
// 				price: parseFloat(r.price) || 0, // 👈 parse price
// 				created_at: r.created_at,
// 				updated_at: r.updated_at,
// 				buyer: {
// 					id: r.buyer_id,
// 					full_name: r.full_name,
// 					email: r.email,
// 					phone: r.phone,
// 				},
// 			};

// 			if (r.type === 'post') {
// 				const isVehicle = r.category_type === 'vehicle';
// 				const isBattery = r.category_type === 'battery';

// 				const productBase = {
// 					id: r.product_id,
// 					brand: r.brand,
// 					model: r.model,
// 					price: parseFloat(r.product_price) || 0, // 👈 parse product price
// 					address: r.address,
// 					description: r.description,
// 					category: {
// 						id: r.product_category_id,
// 						typeSlug: r.category_slug,
// 						name: r.category_name,
// 					},
// 					year: r.year,
// 					image: r.image,
// 					images: [],
// 				};

// 				const productExtra = isVehicle
// 					? {
// 							color: r.color,
// 							seats: r.seats,
// 							mileage: r.mileage_km ? `${r.mileage_km} km` : null,
// 							power: r.power,
// 							battery_capacity: r.battery_capacity,
// 							is_verified: !!r.is_verified,
// 					  }
// 					: isBattery
// 					? {
// 							capacity: r.battery_capacity,
// 							health: r.battery_health,
// 							chemistry: r.battery_chemistry,
// 							voltage: r.battery_voltage,
// 							dimension: r.battery_dimension,
// 					  }
// 					: {};

// 				return {
// 					...base,
// 					post: {
// 						id: r.product_id,
// 						title: r.product_title,
// 						priority: 1,
// 						created_at: '',
// 						updated_at: '',
// 						product: { ...productBase, ...productExtra },
// 					},
// 					service: {
// 						id: r.service_id,
// 						name: r.service_name,
// 						description: r.service_description,
// 						price: parseFloat(r.service_cost) || 0, // 👈 parse service price
// 					},
// 				};
// 			}

// 			if (r.type === 'auction') {
// 				return {
// 					...base,
// 					viewingAppointment: {
// 						address: r.address,
// 						time: new Date(Date.now() + 2 * 3600_000).toISOString(),
// 					},
// 					post: {
// 						id: r.product_id,
// 						title: r.product_title,
// 						product: {
// 							id: r.product_id,
// 							brand: r.brand,
// 							model: r.model,
// 							price: parseFloat(r.product_price) || 0, // 👈 parse product price
// 							address: r.address,
// 							description: r.description,
// 							category: {
// 								id: r.product_category_id,
// 								typeSlug: r.category_slug,
// 								name: r.category_name,
// 							},
// 							year: r.year,
// 							color: r.color,
// 							seats: r.seats,
// 							mileage: r.mileage_km ? `${r.mileage_km} km` : null,
// 							battery_capacity: r.battery_capacity,
// 							power: r.power,
// 							is_verified: !!r.is_verified,
// 						},
// 					},
// 					auction: {
// 						id: r.auction_id,
// 						startingBid: parseFloat(r.starting_price) || 0,
// 						original_price: parseFloat(r.original_price) || 0,
// 						buyNowPrice: parseFloat(r.target_price) || 0,
// 						bidIncrement: parseFloat(r.step) || 0,
// 						deposit: parseFloat(r.deposit) || 0,
// 						winner: r.winner_id,
// 						winning_price: parseFloat(r.winning_price) || 0,
// 						note: r.note,
// 					},
// 				};
// 			}

// 			if (['package', 'pakage', 'topup', 'deposit'].includes(r.type)) {
// 				return {
// 					...base,
// 					service: {
// 						id: r.service_id,
// 						name: r.service_name,
// 						type: r.service_type,
// 						description: r.service_description,
// 						price: parseFloat(r.service_cost) || 0, // 👈 parse service price
// 						feature: r.feature,
// 					},
// 				};
// 			}

// 			return base;
// 		});

// 		return formatted;
// 	} catch (error) {
// 		console.error('❌ Error in getAllOrderByUserId:', error);
// 		throw error;
// 	}
// }


export async function getAllOrderByUserId(
	userId: number,
	status?: string,
	type?: string,
	orderId?: number,
	page: number = 1,
	page_size: number = 10,
) {
	try {
		const filters: string[] = [`o.buyer_id = ${userId}`];
		if (status) filters.push(`o.status = '${status}'`);
		if (orderId) filters.push(`o.id = ${orderId}`);
		const where = filters.join(' AND ');

		// ✅ Pagination
		const offset = (page - 1) * page_size;

		let baseSql = '';
		let countSql = '';

		switch ((type || '').toLowerCase()) {
			// --- CASE AUCTION ---
			case 'auction':
				baseSql = `
          FROM orders o
          INNER JOIN users u ON u.id = o.buyer_id
          INNER JOIN services s ON s.id = o.service_id
          INNER JOIN auctions a ON a.product_id = o.product_id
          INNER JOIN products p ON p.id = a.product_id
          INNER JOIN product_categories c ON c.id = p.product_category_id
          LEFT JOIN vehicles v ON v.product_id = p.id
          LEFT JOIN batteries b ON b.product_id = p.id
          WHERE o.type = 'auction' AND ${where}
        `;
				break;

			// --- CASE POST ---
			case 'post':
				baseSql = `
          FROM orders o
          INNER JOIN users u ON u.id = o.buyer_id
          INNER JOIN services s ON s.id = o.service_id
          INNER JOIN products p ON p.id = o.product_id
          INNER JOIN product_categories c ON c.id = p.product_category_id
          LEFT JOIN vehicles v ON v.product_id = p.id
          LEFT JOIN batteries b ON b.product_id = p.id
          WHERE o.type = 'post' AND ${where}
        `;
				break;

			// --- CASE PACKAGE, TOPUP, DEPOSIT ---
			case 'package':
			case 'pakage':
			case 'deposit':
			case 'topup':
				baseSql = `
          FROM orders o
          INNER JOIN services s ON s.id = o.service_id
          INNER JOIN users u ON u.id = o.buyer_id
          WHERE o.type = '${type}' AND ${where}
        `;
				break;

			default:
				baseSql = `
          FROM orders o
          INNER JOIN services s ON s.id = o.service_id
          INNER JOIN users u ON u.id = o.buyer_id
          WHERE ${where}
        `;
				break;
		}

		// ✅ Tạo 2 SQL: 1 để đếm, 1 để lấy dữ liệu
		countSql = `SELECT COUNT(*) AS total ${baseSql}`;

		let sql = '';

		switch ((type || '').toLowerCase()) {
			case 'auction':
				sql = `
      SELECT
        o.id AS order_id, o.type, o.status, o.price, o.service_id, o.product_id, o.buyer_id,
        o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
        u.full_name, u.email, u.phone,
        s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
        s.number_of_post, s.number_of_push, s.feature,
        a.id AS auction_id, a.starting_price, a.original_price, a.target_price,
        a.deposit, a.winner_id, a.winning_price, a.step, a.note,
        p.title AS product_title, p.brand, p.model, p.price AS product_price,
        p.address, p.description, p.product_category_id, p.year, p.image,
        c.type AS category_type, c.slug AS category_slug, c.name AS category_name,
        p.color, v.seats, v.mileage_km, v.power,
        b.capacity AS battery_capacity, b.health AS battery_health,
        b.chemistry AS battery_chemistry, b.voltage AS battery_voltage, b.dimension AS battery_dimension
      ${baseSql}
      ORDER BY o.created_at DESC
      LIMIT ${page_size} OFFSET ${offset};
    `;
				break;

			case 'post':
				sql = `
      SELECT
        o.id AS order_id, o.type, o.status, o.price, o.service_id, o.product_id, o.buyer_id,
        o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
        u.full_name, u.email, u.phone,
        s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
        s.number_of_post, s.number_of_push, s.feature,
        p.title AS product_title, p.brand, p.model, p.price AS product_price, p.status as product_status,
        p.address, p.description, p.product_category_id, p.year, p.image,
        c.type AS category_type, c.slug AS category_slug, c.name AS category_name,
        p.color, v.seats, v.mileage_km, v.power,
        b.capacity AS battery_capacity, b.health AS battery_health,
        b.chemistry AS battery_chemistry, b.voltage AS battery_voltage, b.dimension AS battery_dimension
      ${baseSql}
      ORDER BY o.created_at DESC
      LIMIT ${page_size} OFFSET ${offset};
    `;
				break;

			default:
				sql = `
      SELECT
        o.id AS order_id, o.type, o.status, o.price, o.service_id, o.product_id, o.buyer_id,
        o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
        u.full_name, u.email, u.phone,
        s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
        s.type AS service_type, s.feature
      ${baseSql}
      ORDER BY o.created_at DESC
      LIMIT ${page_size} OFFSET ${offset};
    `;
				break;
		}

		// ✅ Chạy song song cả 2 query
		const [[{ total }]]: any = await pool.query(countSql);
		const [rows]: any = await pool.query(sql);

		// ✅ Format như cũ
		const formatted = rows.map((r: any) => {
			const base = {
				id: r.order_id,
				type: r.type,
				status: r.status,
				price: parseFloat(r.price) || 0,
				created_at: r.created_at,
				updated_at: r.updated_at,
				buyer: {
					id: r.buyer_id,
					full_name: r.full_name,
					email: r.email,
					phone: r.phone,
				},
			};

			if (r.type === 'post') {
				const isVehicle = r.category_type === 'vehicle';
				const isBattery = r.category_type === 'battery';

				const productBase = {
					id: r.product_id,
					brand: r.brand,
					model: r.model,
					price: parseFloat(r.product_price) || 0,
					address: r.address,
					description: r.description,
					category: {
						id: r.product_category_id,
						typeSlug: r.category_slug,
						name: r.category_name,
					},
					year: r.year,
					image: r.image,
					images: [],
				};

				const productExtra = isVehicle
					? {
						color: r.color,
						seats: r.seats,
						mileage: r.mileage_km ? `${r.mileage_km} km` : null,
						power: r.power,
						battery_capacity: r.battery_capacity,
						is_verified: !!r.is_verified,
					}
					: isBattery
						? {
							capacity: r.battery_capacity,
							health: r.battery_health,
							chemistry: r.battery_chemistry,
							voltage: r.battery_voltage,
							dimension: r.battery_dimension,
						}
						: {};

				// status của post 
				let finalStatus = r.status.toLowerCase(); // Mặc định theo order.status

				if (r.status.toLowerCase() === 'pending') {
					finalStatus = 'pending';
				} else if (r.status.toLowerCase() === 'paid') {
					const normalizedStatus = r.product_status.toLowerCase()
						? r.product_status.toString().trim().toLowerCase()
						: '';

					switch (normalizedStatus) {
						case 'pending':
							finalStatus = 'processing';
							break;
						case 'approved':
						case 'auctioning':
						case 'auctioned':
							finalStatus = 'success';
							break;
						case 'rejected':
							finalStatus = 'fail';
							break;
						default:
							finalStatus = r.status;
					}
				}
				// status của post

				return {
					...base,
					status: finalStatus, // 👈 Ghi đè lại status tại đây
					post: {
						id: r.product_id,
						title: r.product_title,
						priority: 1,
						created_at: '',
						updated_at: '',
						product: { ...productBase, ...productExtra },
					},
					service: {
						id: r.service_id,
						name: r.service_name,
						description: r.service_description,
						price: parseFloat(r.service_cost) || 0,
					},
				};
			}

			if (r.type === 'auction') {
				return {
					...base,
					viewingAppointment: {
						address: r.address,
						time: new Date(Date.now() + 2 * 3600_000).toISOString(),
					},
					post: {
						id: r.product_id,
						title: r.product_title,
						product: {
							id: r.product_id,
							brand: r.brand,
							model: r.model,
							price: parseFloat(r.product_price) || 0,
							address: r.address,
							description: r.description,
							category: {
								id: r.product_category_id,
								typeSlug: r.category_slug,
								name: r.category_name,
							},
							year: r.year,
							color: r.color,
							seats: r.seats,
							mileage: r.mileage_km ? `${r.mileage_km} km` : null,
							battery_capacity: r.battery_capacity,
							power: r.power,
							is_verified: !!r.is_verified,
						},
					},
					auction: {
						id: r.auction_id,
						startingBid: parseFloat(r.starting_price) || 0,
						original_price: parseFloat(r.original_price) || 0,
						buyNowPrice: parseFloat(r.target_price) || 0,
						bidIncrement: parseFloat(r.step) || 0,
						deposit: parseFloat(r.deposit) || 0,
						winner: r.winner_id,
						winning_price: parseFloat(r.winning_price) || 0,
						note: r.note,
					},
				};
			}

			if (['package', 'pakage', 'topup', 'deposit'].includes(r.type)) {
				return {
					...base,
					service: {
						id: r.service_id,
						name: r.service_name,
						type: r.service_type,
						description: r.service_description,
						price: parseFloat(r.service_cost) || 0,
						feature: r.feature,
					},
				};
			}

			return base;
		});

		// ✅ Trả về cả dữ liệu và meta pagination
		return {
			total,
			page,
			page_size,
			total_pages: Math.ceil(total / page_size),
			data: formatted,
		};
	} catch (error) {
		console.error('❌ Error in getAllOrderByUserId:', error);
		throw error;
	}
}
