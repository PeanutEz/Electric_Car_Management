import pool from '../config/db';
import { addHoursToVietnamTime } from '../utils/datetime';

export async function getRevenue() {
	const [rows]: any = await pool.query(`
		SELECT 
            SUM(CASE WHEN status = 'PAID' AND payment_method = 'CREDIT' THEN price ELSE 0 END) AS revenue,
            SUM(CASE WHEN status = 'PAID' AND payment_method = 'CREDIT' AND type = 'post' THEN price ELSE 0 END) AS order_posts,
            SUM(CASE WHEN status = 'PAID' AND payment_method = 'CREDIT' AND type = 'package' THEN price ELSE 0 END) AS order_packages,
            SUM(CASE WHEN status = 'PAID' AND payment_method = 'CREDIT' AND type = 'auction' THEN price ELSE 0 END) AS order_auctions
        FROM orders
		`);

	const result = rows[0];

	// Get daily revenue for last 7 days
	const [dailyRows]: any = await pool.query(`
		SELECT 
			DATE_FORMAT(o.created_at, '%d/%m') as date,
			COALESCE(SUM(CASE WHEN o.status = 'PAID' AND o.payment_method = 'CREDIT' THEN o.price ELSE 0 END), 0) as revenue
		FROM orders o
		WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
		GROUP BY DATE(o.created_at), DATE_FORMAT(o.created_at, '%d/%m')
		ORDER BY DATE(o.created_at) ASC
	`);

	const daily_revenue = dailyRows.map((row: any) => ({
		date: row.date,
		revenue: Number(row.revenue),
	}));

	return {
		revenue: Number(result.revenue),
		revenue_post: Number(result.order_posts),
		revenue_packages: Number(result.order_packages),
		revenue_auctions: Number(result.order_auctions),
		daily_revenue,
	};
}

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

export async function getAllOrders() {
	const [rows]: any = await pool.query('select * from orders');
	return rows;
}

export async function getTransactionDetail(
	userId: number,
	page: number,
	limit: number,
) {
	const [rows]: any = await pool.query(
		`select u.id as user_id,u.full_name,u.email, u.phone, u.total_credit, s.type as service_type,s.name as service_name,
      s.description, s.cost, d.credits, d.type as changing,d.unit,o.status,o.created_at  from transaction_detail d
                                    inner join orders o on o.id = d.order_id
		 left join services s on s.id = o.service_id
                                    inner join users u on u.id = d.user_id where d.user_id = ? order by d.id desc
		 LIMIT ? OFFSET ?`,
		[userId, limit, (page - 1) * limit],
	);

	const [totalTransactions]: any = await pool.query(
		`select count(*) as total_records from transaction_detail where user_id = ?`,
		[userId],
	);

	const [totalTopup]: any = await pool.query(
		`select sum(d.credits) as total_credits from transaction_detail d
                                    inner join orders o on o.id = d.order_id
                                    left join services s on s.id = o.service_id
                                    inner join users u on u.id = d.user_id where d.user_id = ? and d.type = 'increase' order by o.created_at desc`,
		[userId],
	);
	// Total spend là transaction mà changing = 'decrease'
	const [totalSpend]: any = await pool.query(
		`select sum(d.credits) as total_credits from transaction_detail d
                                    inner join orders o on o.id = d.order_id
                                    left join services s on s.id = o.service_id
                                    inner join users u on u.id = d.user_id where d.user_id = ? and d.type = 'decrease' order by o.created_at desc`,
		[userId],
	);

	const transactions = rows.map((row: any) => ({
		...row,
		service_type: row.changing === 'Increase' ? 'top up' : row.service_type,
		service_name:
			row.changing === 'Increase' ? 'Nạp tiền' : row.service_name,
	}));

	return {
		data: transactions,
		total_credit: Number(rows[0]?.total_credit) || 0,
		total_topup: Number(totalTopup[0].total_credits) || 0,
		total_spend: Number(totalSpend[0].total_credits) || 0,
		length: totalTransactions[0].total_records,
		pagination: {
			page: page,
			limit: limit,
			page_size: Math.ceil(totalTransactions[0].total_records / limit),
		},
	};
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

export async function getAllOrderByUserId(
	userId: number,
	tracking?: string,
	type?: string,
	orderId?: number,
	page: number = 1,
	page_size: number = 10,
) {
	try {
		const filters: string[] = [`o.buyer_id = ${userId}`];
		if (tracking) filters.push(`o.tracking = '${tracking}'`);
		if (orderId) filters.push(`o.id = ${orderId}`);
		const where = filters.join(' AND ');

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
          LEFT JOIN contracts ct ON ct.product_id = p.id
          INNER JOIN product_categories c ON c.id = p.product_category_id
          LEFT JOIN vehicles v ON v.product_id = p.id
          LEFT JOIN batteries b ON b.product_id = p.id
          WHERE o.type = 'auction' AND ${where}
        `;
				break; // --- CASE POST ---
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

			// --- CASE DEPOSIT (updated) ---
			case 'deposit':
				baseSql = `
          FROM orders o
          INNER JOIN services s ON s.id = o.service_id
          INNER JOIN users u ON u.id = o.buyer_id
          LEFT JOIN auctions a ON a.product_id = o.product_id
          LEFT JOIN products p ON p.id = a.product_id
          LEFT JOIN users seller ON seller.id = p.created_by
          LEFT JOIN contracts ct ON ct.product_id = p.id
          INNER JOIN product_categories c ON c.id = p.product_category_id
          LEFT JOIN vehicles v ON v.product_id = p.id
          LEFT JOIN batteries b ON b.product_id = p.id
          WHERE o.type = 'deposit' and o.status = 'PAID' and o.payment_method = 'CREDIT' AND ${where}
        `;
				break; // --- CASE PACKAGE, TOPUP ---
			case 'package':
			case 'pakage':
			case 'topup':
				baseSql = `
          FROM orders o
          INNER JOIN services s ON s.id = o.service_id
          INNER JOIN users u ON u.id = o.buyer_id
          WHERE o.type = '${type}' AND ${where}
        `;
				break;

			// --- CASE ALL / DEFAULT ---
			default:
				baseSql = `
          FROM orders o
          INNER JOIN services s ON s.id = o.service_id
          INNER JOIN users u ON u.id = o.buyer_id
          WHERE ${where}
        `;
				break;
		}

		// Count query
		countSql = `SELECT COUNT(*) AS total ${baseSql}`;

		let sql = '';

		switch ((type || '').toLowerCase()) {
			// === SELECT FOR AUCTION ===
			case 'auction':
				sql = `
      SELECT
        o.id AS order_id, o.type, o.status, o.tracking, o.price, o.service_id, o.product_id, o.buyer_id,
        o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
        u.full_name, u.email, u.phone,
        s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
        s.number_of_post, s.number_of_push, s.feature,
        a.id AS auction_id, a.starting_price, a.original_price, a.target_price,
        a.deposit, a.winner_id, a.winning_price, a.step, a.note,
        ct.id AS contract_id, ct.contract_code, ct.status AS contract_status, ct.url AS contract_url,
        p.title AS product_title, p.brand, p.model, p.price AS product_price,
        p.address, p.description, p.product_category_id, p.year, p.image,
        c.type AS category_type, c.slug AS category_slug, c.name AS category_name, p.warranty,
        p.color, v.seats, v.mileage_km, v.power, v.health as vehicle_health,
        b.capacity AS battery_capacity, b.health AS battery_health,
        b.chemistry AS battery_chemistry, b.voltage AS battery_voltage, b.dimension AS battery_dimension
      ${baseSql}
      ORDER BY o.created_at DESC
      LIMIT ${page_size} OFFSET ${offset};
    `;
				break; // === SELECT FOR POST ===
			case 'post':
				sql = `
      SELECT
        o.id AS order_id, o.type, o.status, o.tracking, o.price, o.service_id, o.product_id, o.buyer_id,
        o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
        u.full_name, u.email, u.phone,
        s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
        s.number_of_post, s.number_of_push, s.feature,
        p.title AS product_title, p.brand, p.model, p.price AS product_price, p.status as product_status,
        p.address, p.description, p.product_category_id, p.year, p.image,
        c.type AS category_type, c.slug AS category_slug, c.name AS category_name, p.warranty,
        p.color, v.seats, v.mileage_km, v.power, v.health as vehicle_health,
        b.capacity AS battery_capacity, b.health AS battery_health,
        b.chemistry AS battery_chemistry, b.voltage AS battery_voltage, b.dimension AS battery_dimension
      ${baseSql}
      ORDER BY o.created_at DESC
      LIMIT ${page_size} OFFSET ${offset};
    `;
				break;

			// === SELECT FOR DEPOSIT (UPDATED) ===
			// 		case 'deposit':
			// 			sql = `
			//    SELECT
			//      o.id AS order_id, o.type, o.status, o.tracking, o.price, o.service_id, o.product_id, o.buyer_id,
			//      o.created_at, o.code AS order_code, o.payment_method, o.updated_at,
			//      u.full_name, u.email, u.phone,
			//      s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
			//      s.type AS service_type, s.feature,
			//      a.id AS auction_id, a.starting_price, a.original_price, a.target_price,
			//      a.deposit AS auction_deposit, a.winning_price, a.step, a.note, a.winner_id,
			//      p.title AS product_title, p.brand, p.model, p.price AS product_price
			//    ${baseSql}
			//    ORDER BY o.created_at DESC
			//    LIMIT ${page_size} OFFSET ${offset};
			//  `;
			// 			break;

			case 'deposit':
				sql = `
    SELECT
      -- Order
      o.id AS order_id, o.type, o.status, o.tracking, o.price, o.service_id, o.product_id, o.buyer_id,
      o.created_at, o.code AS order_code, o.payment_method, o.updated_at,

      -- Buyer
      u.full_name, u.email, u.phone,

      -- Seller
      seller.id AS seller_id, seller.full_name AS seller_full_name, 
      seller.email AS seller_email, seller.phone AS seller_phone,

      -- Contract
      ct.id AS contract_id, ct.contract_code, ct.status AS contract_status, ct.url AS contract_url,

      -- Service
      s.cost AS service_cost, s.name AS service_name, s.description AS service_description,
      s.type AS service_type, s.number_of_post, s.number_of_push, s.feature,

      -- Auction
      a.id AS auction_id, a.starting_price, a.original_price, a.target_price,
      a.deposit AS auction_deposit, a.winning_price, a.step, a.note, a.winner_id,

      -- Product (đủ bộ như auction)
      p.title AS product_title, p.brand, p.model, p.price AS product_price,
      p.address, p.description, p.product_category_id, p.year, p.image,
      c.type AS category_type, c.slug AS category_slug, c.name AS category_name, p.warranty,
      p.color,

      -- Vehicle-specific
      v.seats, v.mileage_km, v.power, v.health AS vehicle_health,

      -- Battery-specific
      b.capacity AS battery_capacity, b.health AS battery_health,
      b.chemistry AS battery_chemistry, b.voltage AS battery_voltage, b.dimension AS battery_dimension

    ${baseSql}
    ORDER BY o.created_at DESC
    LIMIT ${page_size} OFFSET ${offset};
  `;
				break; // === DEFAULT SELECT ===
			default:
				sql = `
      SELECT
        o.id AS order_id, o.type, o.status, o.tracking, o.price, o.service_id, o.product_id, o.buyer_id,
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

		// Run queries
		const [[{ total }]]: any = await pool.query(countSql);
		const [rows]: any = await pool.query(sql);

		// Format response
		const formatted = await Promise.all(
			rows.map(async (r: any) => {
				const base = {
					id: r.order_id,
					type: r.type,
					status: r.status,
					tracking: r.tracking,
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

				// === FORMAT AUCTION (no change) ===
				if (r.type === 'auction') {
					let winner = null;
					const [winnerRows]: any = await pool.query(
						'SELECT id, full_name, phone, email FROM users WHERE id = ?',
						[r.winner_id],
					);
					winner = winnerRows[0] || null;

					return {
						...base,
						viewingAppointment: {
							address: r.address,
							time: addHoursToVietnamTime(2).toISOString(),
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
								warranty: r.warranty,
								category: {
									id: r.product_category_id,
									typeSlug: r.category_slug,
									name: r.category_name,
								},
								year: r.year,
								color: r.color,
								seats: r.seats,
								mileage: r.mileage_km,
								health: r.vehicle_health || r.battery_health,
								power: r.power,
								is_verified: !!r.is_verified,
							},
						},
						auction: {
							id: r.auction_id,
							startingBid: parseFloat(r.starting_price) || 0,
							originalPrice: parseFloat(r.original_price) || 0,
							buyNowPrice: parseFloat(r.target_price) || 0,
							bidIncrement: parseFloat(r.step) || 0,
							deposit: parseFloat(r.deposit) || 0,
							winner,
							winning_price: parseFloat(r.winning_price) || 0,
							note: r.note,
						},
						contract: {
							id: r.contract_id,
							contract_code: r.contract_code,
							status: r.contract_status,
							url: r.contract_url,
						},
					};
				}

				// === FORMAT POST (no change) ===
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
						warranty: r.warranty,
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
								mileage: r.mileage_km
									? `${r.mileage_km} km`
									: null,
								power: r.power,
								battery_capacity: r.battery_capacity,
								health: r.vehicle_health,
								is_verified: !!r.is_verified,
						  }
						: isBattery
						? {
								capacity: r.battery_capacity,
								health: r.battery_health,
								color: r.color,
								chemistry: r.battery_chemistry,
								voltage: r.battery_voltage,
								dimension: r.battery_dimension,
						  }
						: {};

					let finalStatus = r.status.toLowerCase();

					if (r.status.toLowerCase() === 'pending') {
						finalStatus = 'pending';
					} else if (r.status.toLowerCase() === 'paid') {
						const trackingStatus = r.tracking
							? r.tracking.toLowerCase()
							: '';

						switch (trackingStatus) {
							case 'auction_success':
							case 'completed':
								finalStatus = 'success';
								break;
							case 'processing':
								finalStatus = 'processing';
								break;
							case 'cancelled':
							case 'failed':
								finalStatus = 'fail';
								break;
							default:
								const normalizedStatus = r.product_status
									? r.product_status
											.toString()
											.trim()
											.toLowerCase()
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
					}

					return {
						...base,
						status: finalStatus,
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

				// === FORMAT DEPOSIT (updated) ===
				if (r.type === 'deposit') {
					return {
						...base,
						seller: {
							id: r.seller_id,
							full_name: r.seller_full_name,
							email: r.seller_email,
							phone: r.seller_phone,
						},
						contract: r.contract_id
							? {
									id: r.contract_id,
									contract_code: r.contract_code,
									status: r.contract_status,
									url: r.contract_url,
							  }
							: null,
						service: {
							id: r.service_id,
							name: r.service_name,
							type: r.service_type,
							description: r.service_description,
							price: parseFloat(r.service_cost) || 0,
							feature: r.feature,
						},
						auction: r.auction_id
							? {
									id: r.auction_id,
									startingBid:
										parseFloat(r.starting_price) || 0,
									original_price:
										parseFloat(r.original_price) || 0,
									buyNowPrice:
										parseFloat(r.target_price) || 0,
									deposit: parseFloat(r.auction_deposit) || 0,
									bidIncrement: parseFloat(r.step) || 0,
									winning_price:
										parseFloat(r.winning_price) || 0,
									note: r.note,
									winner_id: r.winner_id,
							  }
							: null,
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
								warranty: r.warranty,
								category: {
									id: r.product_category_id,
									typeSlug: r.category_slug,
									name: r.category_name,
								},
								year: r.year,
								color: r.color,
								seats: r.seats,
								mileage: r.mileage_km,
								health: r.vehicle_health || r.battery_health,
								power: r.power,
								is_verified: !!r.is_verified,
							},
						},
					};
				} // === FORMAT DEFAULT TYPES (unchanged) ===
				if (['package', 'pakage', 'topup'].includes(r.type)) {
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
			}),
		);

		// Stats
		const statsSql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN o.status = 'PENDING' THEN 1 ELSE 0 END) AS total_pending,
        SUM(CASE WHEN o.status = 'PAID' THEN 1 ELSE 0 END) AS total_paid,
        COALESCE(SUM(CASE WHEN o.status = 'PAID' THEN o.price ELSE 0 END), 0) AS total_spent
      FROM orders o
      WHERE o.buyer_id = ${userId};
    `;

		const [[stats]]: any = await pool.query(statsSql);

		return {
			total,
			page,
			page_size,
			total_pages: Math.ceil(total / page_size),
			data: formatted,
			stats: {
				total: Number(stats.total) || 0,
				total_pending: Number(stats.total_pending) || 0,
				total_paid: Number(stats.total_paid) || 0,
				total_spent: parseFloat(stats.total_spent) || 0,
			},
		};
	} catch (error) {
		console.error('❌ Error in getAllOrderByUserId:', error);
		throw error;
	}
}
