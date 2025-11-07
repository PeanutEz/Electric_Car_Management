import pool from "../config/db";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { JWTService } from "./jwt.service";
import { createDefaultAvatar } from "../utils/avatar";
import { getVietnamTime } from "../utils/datetime";

export async function getUserById(id: number): Promise<User | null> {
  const [rows]: any = await pool.query(
    "select u.id,u.status,u.full_name,u.email, u.gender, u.address, u.avatar, u.phone,u.rating,u.total_credit,u.description,u.password,u.refresh_token,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.id = ?",
    [id]
  );

  const totalPosts: any = await pool.query(
    "select count(*) as total from products where created_by = ?",
    [id]
  );

  const totalActivePosts: any = await pool.query(
    "select count(*) as total from products where created_by = ? and status in ('approved','auctioning')",
    [id]
  );

  const totalSoldPosts: any = await pool.query(
    "select count(*) as total from products where created_by = ? and status = 'sold'",
    [id]
  );

  const totalTransactions: any = await pool.query(
    "select count(*) as total from orders where buyer_id = ?",
    [id]
  );

  const recentTransactions: any = await pool.query(
    "select created_at, description, price from orders where buyer_id = ? order by created_at desc limit 1",
    [id]
  );

  const user = rows[0];
  //return data giống như hàm loginUser
  if (!user) {
    return null;
  }

  const is_verified = user.phone !== null && user.phone !== "";

  return {
    id: user.id,
    status: user.status,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    address: user.address,
    avatar: user.avatar,
    rating: user.rating,
    total_credit: user.total_credit,
    total_posts: totalPosts[0][0].total,
    total_active_posts: totalActivePosts[0][0].total,
    total_sold_posts: totalSoldPosts[0][0].total,
    total_transactions: totalTransactions[0][0].total,
    verificationStatus: is_verified,
    description: user.description,
    recentTransaction: {
      description:
        recentTransactions[0].length > 0
          ? recentTransactions[0][0].description
          : "Chưa có giao dịch gần đây",
      date:
        recentTransactions[0].length > 0
          ? recentTransactions[0][0].created_at
          : "Chưa có giao dịch gần đây",
      amount:
        recentTransactions[0].length > 0 ? recentTransactions[0][0].price : 0,
    },
    role: user.role,
    expired_access_token: 3600, // 1 hour in seconds
    refresh_token: "Bearer " + user.refresh_token,
  } as any;
}

export function getTokenById(user: User): any {
  const tokens = JWTService.generateTokens({
    id: user.id as number,
    role: user.role as string,
  });
  return tokens;
}

export async function getAllUsers(searchName?: string) {
  const [users] = await pool.query(
    `select id, status, full_name, email, phone, rating, total_credit, created_at, role_id, refresh_token 
		 from users where full_name like ? order by created_at desc`,
    [`%${searchName}%`]
  );

  const [totalUsers]: any = await pool.query(
    `select count(*) as total_users from users`
  );

  const data = {
    users: users,
    totalUsers: Number(totalUsers[0].total_users),
  };

  // return rows as User[];
  return data;
}

export async function loginUser(email: string, password: string) {
  const [rows]: any = await pool.query(
    "select u.id,u.status,u.full_name,u.avatar,u.email,u.phone,u.rating,u.total_credit,u.password,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.email = ?",
    [email]
  );

  const user = rows[0];
  if (user === undefined) {
    const error = new Error("Lỗi");
    (error as any).data = { password: "Email hoặc mật khẩu không đúng" };
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error("Lỗi");
    (error as any).data = { password: "Email hoặc mật khẩu không đúng" };
    throw error;
  }

  const tokens = getTokenById(user);

  // Lưu refresh token vào database
  await JWTService.saveRefreshToken(user.id, tokens.refreshToken);
  if (user.phone === null || user.phone === "") {
    return {
      id: user.id,
      status: user.status,
      full_name: user.full_name,
      email: user.email,
      rating: user.rating,
      total_credit: user.total_credit,
      role: user.role,
      avatar: user.avatar,
      access_token: "Bearer " + tokens.accessToken,
      expired_access_token: 3600, // 1 hour in seconds
      refresh_token: "Bearer " + tokens.refreshToken,
      expired_refresh_token: 7 * 24 * 3600, // 7 days in seconds
    };
  } else {
    return {
      id: user.id,
      status: user.status,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      rating: user.rating,
      total_credit: user.total_credit,
      role: user.role,
      avatar: user.avatar,
      access_token: "Bearer " + tokens.accessToken,
      expired_access_token: 3600, // 1 hour in seconds
      refresh_token: "Bearer " + tokens.refreshToken,
      expired_refresh_token: 7 * 24 * 3600, // 7 days in seconds
    };
  }
}

export async function registerUser(userData: User) {
  const { full_name, email, gender, address, password, status } = userData;

  const errors: { [key: string]: string } = {};

  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!reg.test(email)) {
    errors.email = "Định dạng email không hợp lệ";
  }
  if (!email || email.length < 5 || email.length > 160) {
    errors.email = "Email phải từ 5 đến 160 ký tự";
  }
  if (!password || password.length < 6 || password.length > 160) {
    errors.password = "Mật khẩu phải từ 6 đến 160 ký tự";
  }
  if (!full_name || full_name.length < 6 || full_name.length > 160) {
    errors.full_name = "Họ tên phải từ 6 đến 160 ký tự";
  }
  if (address && address.length < 10) {
    errors.address = "Địa chỉ không được dưới 10 ký tự";
  }

  // Kiểm tra xem email đã tồn tại chưa
  const [existingUsers]: any = await pool.query(
    "select * from users where email = ?",
    [email]
  );
  if (existingUsers.length > 0) {
    errors.email = "Email đã tồn tại";
  }

  // Nếu có lỗi, throw error với format yêu cầu
  if (Object.keys(errors).length > 0) {
    const error = new Error("Dữ liệu không hợp lệ");
    (error as any).data = errors;
    throw error;
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  // Tạo avatar mặc định
  const defaultAvatar = createDefaultAvatar(
    { full_name, email },
    "ui-avatars" // Có thể đổi thành 'dicebear' hoặc 'gravatar'
  );

  const [result]: any = await pool.query(
    `insert into users (full_name, email, password, avatar, created_at) VALUES (?, ?, ?, ?, ?)`,
    [full_name, email, hashedPassword, defaultAvatar, getVietnamTime()]
  );
  const insertedId = result.insertId;

  const [selectUser]: any = await pool.query(
    "select * from users u WHERE id = ?",
    insertedId
  );
  const [rows]: any = await pool.query("select * from users WHERE email = ?", [
    email,
  ]);

  const user = rows[0];
  const roleName: any = await pool.query(
    "select r.name as role from users u inner join roles r on u.role_id = r.id where u.id = ?",
    [insertedId]
  );

  const tokens = JWTService.generateTokens({
    id: user.id,
    role: user.role_name,
  });

  // Lưu refresh token vào database
  await JWTService.saveRefreshToken(user.id, tokens.refreshToken);

  return {
    id: result.insertId,
    status: status,
    full_name: full_name,
    email: email,
    phone: user.phone,
    gender: user.gender,
    address: user.address,
    rating: user.rating,
    total_credit: user.total_credit,
    role: roleName[0][0].role,
    access_token: "Bearer " + tokens.accessToken,
    expired_access_token: 3600, // 1 hour in seconds
    refresh_token: "Bearer " + tokens.refreshToken,
    expired_refresh_token: 604800, // 7 days in seconds
  };
}

export async function logoutUser(userId: number) {
  // Clear refresh token using JWT service
  await JWTService.revokeRefreshToken(userId);
  return true;
}

export async function refreshToken(refreshToken: string) {
  try {
    // Remove "Bearer " prefix if present
    const token = refreshToken.startsWith("Bearer ")
      ? refreshToken.substring(7)
      : refreshToken;

    const result = await JWTService.refreshAccessToken(token);

    return {
      access_token: "Bearer " + result.accessToken,
      message: "Làm mới token truy cập thành công",
    };
  } catch (error) {
    throw new Error("Refresh token không hợp lệ hoặc đã hết hạn");
  }
}

export async function updateUser(userId: number, userData: Partial<User>, description?: string) {
  const { full_name, phone, email, gender, address, avatar } = userData;
  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const errors: { [key: string]: string } = {};
  if (!reg.test(email as string)) {
    errors.email = "Định dạng email không hợp lệ";
  }
  if (!email || email.length < 5 || email.length > 160) {
    errors.email = "Email phải từ 5 đến 160 ký tự";
  }
  if (!full_name || full_name.length < 6 || full_name.length > 160) {
    errors.full_name = "Họ tên phải từ 6 đến 160 ký tự";
  }
  if (!phone || phone.length !== 10) {
    errors.phone = "Số điện thoại phải 10 ký tự";
  }
  if (Object.keys(errors).length > 0) {
    const error = new Error("Dữ liệu không hợp lệ");
    (error as any).data = errors;
    throw error;
  }

  const [updateUser] = await pool.query(
    "UPDATE users SET full_name = ?, phone = ?, email = ?, avatar = ?, gender = ?, address = ?, description = ? WHERE id = ?",
    [full_name, phone, email, avatar, gender, address, description, userId]
  );

  if (updateUser === undefined) {
    errors.update = "Cập nhật người dùng thất bại";
  }
  return getUserById(userId);
}

export async function updatePhoneUser(userId: number, phone: string) {
  const [user]: any = await pool.query(
    "select u.id,u.status,u.full_name,u.email,u.phone,u.rating,u.total_credit,u.password,u.refresh_token,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.id = ?",
    [userId]
  );
  const errors: { [key: string]: string } = {};

  if (user.length === 0) {
    errors.user = "Người dùng không tồn tại";
  }

  if (!phone || phone.length !== 10) {
    errors.phone = "Số điện thoại phải 10 ký tự";
  }

  if (Object.keys(errors).length > 0) {
    const error = new Error("Dữ liệu không hợp lệ");
    (error as any).data = errors;
    throw error;
  }

  await pool.query("UPDATE users SET phone = ? WHERE id = ?", [phone, userId]);

  const [user1]: any = await pool.query(
    "select u.id,u.status,u.full_name,u.email,u.phone,u.avatar,u.rating,u.total_credit,u.password,u.refresh_token,u.expired_refresh_token,r.name as role from users u inner join roles r on u.role_id = r.id WHERE u.id = ?",
    [userId]
  );

  const token = getTokenById(user1[0]);

  // Lưu refresh token vào database
  await JWTService.saveRefreshToken(userId, token.refreshToken);

  return {
    id: user1[0].id,
    status: user1[0].status,
    full_name: user1[0].full_name,
    email: user1[0].email,
    phone: phone,
    rating: user1[0].rating,
    total_credit: user1[0].total_credit,
    role: user1[0].role,
    avatar: user1[0].avatar,
    expired_access_token: 3600, // 1 hour in seconds
    access_token: "Bearer " + token.accessToken,
    refresh_token: "Bearer " + token.refreshToken,
    expired_refresh_token: 7 * 24 * 3600, // 7 days in seconds
  };
}

export async function getPostByUserId(
  userId: number,
  status?: string,
  status_verify?: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit;

  if (status === "all") status = undefined;
  if (status_verify === "all") status_verify = undefined;

  // ✅ 1️⃣ Lấy counts song song (tối ưu performance)
  const [counts]: any = await pool.query(
    `
		SELECT
		    COUNT(*) AS "all",
			SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
			SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
			SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
			SUM(CASE WHEN status = 'auctioning' THEN 1 ELSE 0 END) AS auctioning,
			SUM(CASE WHEN status = 'auctioned' THEN 1 ELSE 0 END) AS auctioned,
			SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold,
			SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) AS banned
		FROM products
		WHERE created_by = ?
	`,
    [userId]
  );

  let queryCount = "SELECT COUNT(*) AS count FROM products WHERE 1=1";
  let param: any[] = [];

  // Nếu có status
  if (status) {
    queryCount += " AND status = ?";
    param.push(status);
  }

  // Luôn có created_by
  queryCount += " AND created_by = ?";
  param.push(userId);

  const [countStatus]: any = await pool.query(queryCount, param);

  const result = {
    all: Number(counts[0].all) || 0,
    pending: Number(counts[0].pending) || 0,
    approved: Number(counts[0].approved) || 0,
    rejected: Number(counts[0].rejected) || 0,
    auctioning: Number(counts[0].auctioning) || 0,
    auctioned: Number(counts[0].auctioned) || 0,
    sold: Number(counts[0].sold) || 0,
    banned: Number(counts[0].banned) || 0,
  };

  // ✅ 2️⃣ Lấy danh sách bài đăng
  let query = `
		SELECT 
			p.id, 
			p.title,
			p.brand, 
			p.model,
			p.description,
			p.year,
			p.address,
			p.image,
			p.end_date,
			p.warranty,
			p.priority,
			p.price, 
			p.status_verify,
			p.color,
			p.status, 
			p.previousOwners,
			p.created_at,
			p.updated_at,
			p.reject_count,
			p.is_finally_rejected,
			pc.id AS category_id,
			pc.name AS category,
			pc.type AS category_type,
			pc.slug AS category_slug,
			v.seats,
			v.mileage_km,
			v.power,
			v.health,
			bat.capacity,
			bat.voltage,
			bat.health
		FROM products p 
		INNER JOIN product_categories pc ON p.product_category_id = pc.id 
		left JOIN vehicles v ON v.product_id = p.id 
		left JOIN batteries bat ON bat.product_id = p.id
		WHERE p.created_by = ?
	`;

  const params: any[] = [userId];

  if (status) {
    query += " AND p.status = ?";
    params.push(status);
  }

  if (status_verify) {
    query += " AND p.status_verify = ?";
    params.push(status_verify);
  }

  query += " ORDER BY p.updated_at DESC, p.created_at desc  LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [posts]: any = await pool.query(query, params);

  // ✅ 3️⃣ Nếu không có bài đăng
  if (posts.length === 0) {
    return {
      counts: counts[0],
      posts: [],
    };
  }

  // ✅ 4️⃣ Lấy images cho tất cả sản phẩm
  const productIds = posts.map((p: any) => p.id);
  const [images]: any = await pool.query(
    `SELECT product_id, url
		 FROM product_imgs 
		 WHERE product_id IN (${productIds.map(() => "?").join(",")})`,
    productIds
  );

  const imageMap = new Map();
  images.forEach((img: any) => {
    if (!imageMap.has(img.product_id)) {
      imageMap.set(img.product_id, []);
    }
    imageMap.get(img.product_id).push(img.url);
  });

  // ✅ 5️⃣ Gộp dữ liệu
  const formattedPosts = posts.map((post: any) => ({
    id: post.id,
    allow_resubmit:
      !(post.reject_count === 2 && post.is_finally_rejected === 1) &&
      !["approved", "processing", "auctioning", "auctioned", "sold"].includes(
        post.status
      ) &&
      post.status === "rejected",
    title: post.title,
    description: post.description,
    priority: post.priority,
    status: post.status,
    end_date: post.end_date,
    created_at: post.created_at,
    updated_at: post.updated_at,
    status_verify: post.status_verify,
    product:
      post.category_type === "vehicle"
        ? {
            id: post.id,
            brand: post.brand,
            model: post.model,
            price: post.price,
            description: post.description,
            status: post.status,
            year: post.year,
            created_by: post.created_by,
            warranty: post.warranty,
            address: post.address,
            color: post.color,
            seats: post.seats,
            mileage: post.mileage_km,
            power: post.power,
            health: post.health,
            previousOwners: post.previousOwners,
            image: post.image,
            images: imageMap.get(post.id) || [],
            category: {
              id: post.category_id,
              type: post.category_type,
              name: post.category,
              typeSlug: post.category_slug,
              count: 0,
            },
          }
        : {
            id: post.id,
            brand: post.brand,
            model: post.model,
            price: post.price,
            description: post.description,
            status: post.status,
            year: post.year,
            color: post.color,
            created_by: post.created_by,
            warranty: post.warranty,
            address: post.address,
            capacity: post.capacity,
            voltage: post.voltage,
            health: post.health,
            previousOwners: post.previousOwners,
            image: post.image,
            images: imageMap.get(post.id) || [],
            category: {
              id: post.category_id,
              type: post.category_type,
              name: post.category,
              typeSlug: post.category_slug,
              count: 0,
            },
          },
  }));

  // ✅ 6️⃣ Trả về kết quả đầy đủ
  return {
    posts: formattedPosts,
    counts: result,
    countStatus: countStatus[0]?.count || 0,
  };
}

export async function getOrderByUserId(
  userId: number,
  page: number,
  limit: number
) {
  const [orders]: any = await pool.query(
    "SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT ?, ?",
    [userId, (page - 1) * limit, limit]
  );
  return orders;
}

export async function changeAndConfirmPassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  const [rows]: any = await pool.query(
    "select password from users WHERE id = ?",
    [userId]
  );
  const user = rows[0];
  if (!user) {
    const error = new Error("Người dùng không tồn tại");
    throw error;
  }
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    const error = new Error("Mật khẩu hiện tại không đúng");
    throw error;
  }
  if (newPassword !== confirmPassword) {
    const error = new Error("Mật khẩu mới và xác nhận mật khẩu không khớp");
    throw error;
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password = ? WHERE id = ?", [
    hashedPassword,
    userId,
  ]);
  return true;
}

export async function topUpOfUser(userId: number) {
  const [rows]: any = await pool.query(
    "SELECT total_credit FROM users WHERE id = ?",
    [userId]
  );
  const user = rows[0];
  return user.total_credit;
}
