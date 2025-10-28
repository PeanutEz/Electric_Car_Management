import pool from '../config/db';
import { Category } from '../models/product.model';

// {
//     "message": "Lấy categories thành công",
//     "data": [
//         {
//             "type": "vehicle",
//             "slug": "vehicle",
//             "count": 128,
//             "has_chidren": true
//         },
//         {
//             "type": "battery",
//             "slug": "battery",
//             "count": 86,
//             "has_children": true
//         }
//     ]
// }
export async function getAllCategories(status: string): Promise<Category[]> {
	const [rows] = await pool.query(
		`SELECT pc.type, pc.slug, COUNT(p.id) as count
     FROM product_categories pc
     left JOIN (select * from products where status = 'approved') p ON p.product_category_id = pc.id
     GROUP BY pc.type, pc.slug`,
		[status],
	);

	return (rows as any).map((r: any) => {
		if (r.count > 0) {
			return {
				type: r.type,
				slug: r.slug,
				count: r.count,
				has_children: true, // Giả sử tất cả đều có con, bạn có thể điều chỉnh logic này nếu cần
			};
		}
		return {
				type: r.type,
				slug: r.slug,
				count: r.count,
				has_children: false, // Giả sử tất cả đều có con, bạn có thể điều chỉnh logic này nếu cần
			};
	});
}

// query param : slug
// ```
// {
//     "message": "Lấy category vehicle thành công",
//     "data": {
//         "type": "vehicle",
//         "slug": "vehicle",
//         "count": 128,
//         "children": [
//             {
//                 "id": 1,
//                 "typeSlug": "vehicle",
//                 "name": "Xe hơi điện",
//                 "count": 70
//             },
//             {
//                 "id": 2,
//                 "typeSlug": "vehicle",
//                 "name": "Xe máy điện",
//                 "count": 58
//             }
//         ]
//     }
// }
export async function getCategoryBySlug(slug: any): Promise<Category[]> {
	const [rows] = await pool.query(
		`SELECT pc.type, pc.slug, COUNT(p.id) as count
      FROM product_categories pc
      inner JOIN products p ON p.product_category_id = pc.id
      WHERE pc.slug = ? and p.status = 'approved'
      GROUP BY pc.type, pc.slug`,
		[slug],
	);
	const [rows1] = await pool.query(
		`SELECT pc.type, pc.slug, pc.id, pc.name, COUNT(p.id) as count
	    FROM product_categories pc
	    left JOIN  (select * from products where status = 'approved') p ON p.product_category_id = pc.id
	    WHERE pc.slug = ? 
	    GROUP BY pc.type, pc.slug, pc.id, pc.name`,
		[slug],
	);
	const parent = (rows as any).map((r: any) => ({
		type: r.type,
		slug: r.slug,
		count: r.count, // Giả sử tất cả đều có con, bạn có thể điều chỉnh logic này nếu cần
	}))[0];
	const children = rows1 as any;
	return (
		{
			...parent,
			childrens: children.map((c: any) => ({
				id: c.id,
				typeSlug: c.slug,
				name: c.name,
				count: c.count,
			})),
		}
	)
}

// export async function getCategoryBySlug(slug: any): Promise<Category[]> {
// 	const [rows] = await pool.query('SELECT pc.type, pc.slug, pc.id, pc.name, COUNT(po.id) as count' +
//       ' FROM product_categories pc' +
//       ' left JOIN products p ON p.product_category_id = pc.id' +
//       ' left JOIN posts po ON po.product_id = p.id' +
//       ' WHERE pc.slug = ? and po.status = "approved"' +
//       ' GROUP BY pc.type, pc.slug, pc.id, pc.name', [slug]);
//    return (rows as any).map((r: any) => ({
//       type: r.type,
//       slug: r.slug,
//       count: r.count,
//       has_children: true, // Giả sử tất cả đều có con, bạn có thể điều chỉnh logic này nếu cần
//       children: [{
//          id: r.id,
//          typeSlug: r.slug,
//          name: r.name,
//          count: r.count,
//       }],
//    }));
// }

export async function getAllCategoryDetail(): Promise<any> {
	// Lấy danh sách cha (type)
	const [parentRows] = await pool.query(
		`SELECT pc.type, pc.slug, COUNT(p.id) as count
     FROM product_categories pc
     left JOIN (select * from products where status = 'approved') p ON p.product_category_id = pc.id
     GROUP BY pc.type, pc.slug`,
	);

	// Lấy danh sách con (categories chi tiết)
	const [childRows] = await pool.query(
		`SELECT pc.id, pc.name, pc.type, pc.slug, COUNT(p.id) as count
      FROM product_categories pc
      LEFT JOIN (select * from products where status = 'approved') p ON p.product_category_id = pc.id
      GROUP BY pc.id, pc.name, pc.type, pc.slug`,
	);
	const parents: any = (parentRows as any).map((r: any) => ({
		type: r.type,
		slug: r.slug,
		count: r.count,
	}));
	const children = childRows as any;

	return parents.map((parent: any) => ({
		...parent,
		childrens: children
			.filter((child: any) => child.type === parent.type)
			.map((child: any) => ({
				id: child.id,
				typeSlug: child.slug,
				name: child.name,
				count: child.count,
			})),
	}));
}


