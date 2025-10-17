# 🔧 FIX: Unknown column 'NaN' in 'where clause'

## ❌ Lỗi gặp phải

```json
{
    "message": "Unknown column 'NaN' in 'where clause'"
}
```

## 🐛 Nguyên nhân

Khi các query parameters không được truyền từ client, chúng sẽ có giá trị `undefined`. Khi đưa vào SQL query bằng string interpolation, `undefined` sẽ trở thành chuỗi `"NaN"` (Not a Number), dẫn đến lỗi SQL.

### Ví dụ lỗi:

```typescript
// ❌ SAI - Khi year = undefined
AND (p.year IS NULL OR p.year = ${year || 'p.year'})
// Kết quả: AND (p.year IS NULL OR p.year = NaN)  ← LỖI!

// ❌ SAI - Khi seats = undefined  
AND (v.seats IS NULL OR v.seats = '${seats}')
// Kết quả: AND (v.seats IS NULL OR v.seats = 'undefined')  ← LỖI!

// ❌ SAI - Khi min/max = undefined
AND (p.price IS NULL OR p.price BETWEEN ${min} AND ${max})
// Kết quả: AND (p.price IS NULL OR p.price BETWEEN NaN AND NaN)  ← LỖI!
```

## ✅ Giải pháp

### 1. **Validate và sanitize parameters**

Thêm validation ở đầu hàm để kiểm tra và chuyển đổi tất cả parameters:

```typescript
export async function paginatePosts(
	page: number,
	limit: number,
	year?: number,
	capacity?: number,
	health?: number,
	voltage?: number,
	color?: string,
	seats?: number,
	mileage_km?: number,
	power?: number,
	title?: string,
	min?: number,
	max?: number,
	category_type?: string,
): Promise<Post[]> {
	const offset = (page - 1) * limit;

	// ✅ Validate và sanitize các tham số số
	const validYear = year && !isNaN(year) ? year : null;
	const validCapacity = capacity && !isNaN(capacity) ? capacity : null;
	const validHealth = health && !isNaN(health) ? health : null;
	const validVoltage = voltage && !isNaN(voltage) ? voltage : null;
	const validSeats = seats && !isNaN(seats) ? seats : null;
	const validMileage = mileage_km && !isNaN(mileage_km) ? mileage_km : null;
	const validPower = power && !isNaN(power) ? power : null;
	const validMin = min && !isNaN(min) ? min : null;
	const validMax = max && !isNaN(max) ? max : null;
	const validTitle = title?.trim() || null;
	const validColor = color?.trim() || null;
	
	// ... rest of the code
}
```

### 2. **Sử dụng conditional query building**

Thay vì luôn thêm conditions vào query, chỉ thêm khi giá trị hợp lệ:

```typescript
// ❌ TRƯỚC - Luôn thêm condition
WHERE p.status LIKE '%approved%'
AND (p.year IS NULL OR p.year = ${year || 'p.year'})
AND (v.color IS NULL OR v.color = '${color}')
AND (p.price BETWEEN ${min} AND ${max})

// ✅ SAU - Chỉ thêm khi có giá trị hợp lệ
WHERE p.status LIKE '%approved%'
${validYear ? `AND p.year = ${validYear}` : ''}
${validColor ? `AND v.color = '${validColor}'` : ''}
${validMin && validMax ? `AND p.price BETWEEN ${validMin} AND ${validMax}` : ''}
```

### 3. **Code đầy đủ sau khi fix**

#### **Battery Query:**
```typescript
if (category_type === 'battery') {
	const [result] = await pool.query(
		`SELECT p.id, p.title, p.priority, p.warranty, p.pushed_at, p.end_date, p.created_by,
		p.model, p.price, p.description, p.image, p.brand, p.year, p.created_at, p.updated_at, p.address, p.status,
		pc.slug as slug, pc.name as category_name, pc.id as category_id, 
		b.capacity, b.health, b.voltage, b.chemistry, b.dimension
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
		INNER JOIN batteries b on b.product_id = p.id
		WHERE p.status LIKE '%approved%'  
		AND pc.slug LIKE '%battery%'
		${validYear ? `AND p.year = ${validYear}` : ''}
		${validCapacity ? `AND b.capacity = ${validCapacity}` : ''}
		${validHealth ? `AND b.health = ${validHealth}` : ''}
		${validVoltage ? `AND b.voltage = ${validVoltage}` : ''}
		${validTitle ? `AND p.title LIKE '%${validTitle}%'` : ''}
		${validMin && validMax ? `AND p.price BETWEEN ${validMin} AND ${validMax}` : ''}
		ORDER BY p.priority DESC, p.created_at DESC
		LIMIT ? OFFSET ?`,
		[limit, offset],
	);
	rows = result as any[];
}
```

#### **Vehicle Query:**
```typescript
else if (category_type === 'vehicle') {
	const [result] = await pool.query(
		`SELECT p.id, p.title, p.priority, p.warranty, p.pushed_at, p.end_date, p.created_by,
		p.model, p.price, p.description, p.image, p.brand, p.year, p.created_at, p.updated_at, p.address, p.status,
		pc.slug as slug, pc.name as category_name, pc.id as category_id, 
		v.color, v.seats, v.mileage_km, v.power, v.license_plate, v.engine_number, v.battery_capacity
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
		INNER JOIN vehicles v on v.product_id = p.id
		WHERE p.status LIKE '%approved%'  
		AND pc.slug LIKE '%vehicle%'
		${validYear ? `AND p.year = ${validYear}` : ''}
		${validColor ? `AND v.color = '${validColor}'` : ''}
		${validSeats ? `AND v.seats = ${validSeats}` : ''}
		${validMileage ? `AND v.mileage_km = ${validMileage}` : ''}
		${validPower ? `AND v.power = ${validPower}` : ''}
		${validTitle ? `AND p.title LIKE '%${validTitle}%'` : ''}
		${validMin && validMax ? `AND p.price BETWEEN ${validMin} AND ${validMax}` : ''}
		ORDER BY p.priority DESC, p.created_at DESC
		LIMIT ? OFFSET ?`,
		[limit, offset],
	);
	rows = result as any[];
}
```

#### **Default Query:**
```typescript
else {
	const [result] = await pool.query(
		`SELECT p.id, p.title, p.priority, p.warranty, p.pushed_at, p.end_date, p.created_by,
		p.model, p.price, p.description, p.image, p.brand, p.year, p.created_at, p.updated_at, p.address, p.status,
		pc.slug as slug, pc.name as category_name, pc.id as category_id
		FROM products p
		INNER JOIN product_categories pc ON pc.id = p.product_category_id
		WHERE p.status LIKE '%approved%'
		${validYear ? `AND p.year = ${validYear}` : ''}
		${validTitle ? `AND p.title LIKE '%${validTitle}%'` : ''}
		${validMin && validMax ? `AND p.price BETWEEN ${validMin} AND ${validMax}` : ''}
		ORDER BY p.priority DESC, p.created_at DESC
		LIMIT ? OFFSET ?`,
		[limit, offset],
	);
	rows = result as any[];
}
```

## 🎯 Lợi ích

### ✅ **Trước khi fix:**
```sql
-- Khi không có parameters, query sẽ lỗi:
SELECT * FROM products 
WHERE year = NaN  -- ❌ LỖI: Unknown column 'NaN'
AND price BETWEEN NaN AND NaN  -- ❌ LỖI
```

### ✅ **Sau khi fix:**
```sql
-- Query chỉ có điều kiện cần thiết:
SELECT * FROM products 
WHERE status LIKE '%approved%'
ORDER BY priority DESC
-- ✅ HOẠT ĐỘNG ĐÚNG!
```

### ✅ **Với parameters hợp lệ:**
```sql
-- ?year=2023&min=50000&max=100000
SELECT * FROM products 
WHERE status LIKE '%approved%'
AND year = 2023
AND price BETWEEN 50000 AND 100000
ORDER BY priority DESC
-- ✅ HOẠT ĐỘNG ĐÚNG!
```

## 🧪 Testing

### Test case 1: Không có filters
```bash
GET /api/posts?page=1&limit=20&category_type=vehicle
# ✅ Expected: Trả về tất cả vehicles, không có lỗi NaN
```

### Test case 2: Có một số filters
```bash
GET /api/posts?page=1&limit=20&category_type=vehicle&year=2023
# ✅ Expected: Chỉ filter theo year, bỏ qua các filters khác
```

### Test case 3: Có filters không hợp lệ
```bash
GET /api/posts?page=1&limit=20&category_type=vehicle&year=abc&seats=xyz
# ✅ Expected: Bỏ qua các filters không hợp lệ, không throw error
```

### Test case 4: Đầy đủ filters
```bash
GET /api/posts?page=1&limit=20&category_type=vehicle&year=2023&color=Red&seats=5&min=50000&max=100000
# ✅ Expected: Áp dụng tất cả filters hợp lệ
```

### Test case 5: Price range
```bash
GET /api/posts?page=1&limit=20&category_type=battery&min=10000&max=50000
# ✅ Expected: Chỉ trả về batteries trong khoảng giá
```

### Test case 6: Search với title
```bash
GET /api/posts?page=1&limit=20&title=Tesla
# ✅ Expected: Trả về các bài có title chứa "Tesla"
```

## 📝 Validation Logic

```typescript
// Số: Kiểm tra NaN và null/undefined
const validYear = year && !isNaN(year) ? year : null;

// String: Trim và kiểm tra empty
const validTitle = title?.trim() || null;

// Range: Cả 2 giá trị phải hợp lệ
${validMin && validMax ? `AND p.price BETWEEN ${validMin} AND ${validMax}` : ''}
```

## ⚠️ Lưu ý quan trọng

### 1. **SQL Injection vẫn tồn tại**
Code hiện tại vẫn dùng string interpolation, dễ bị SQL Injection:
```typescript
// ❌ UNSAFE
${validTitle ? `AND p.title LIKE '%${validTitle}%'` : ''}
```

**Khuyến nghị**: Sử dụng parameterized queries:
```typescript
// ✅ SAFE
const conditions = [];
const params = [];

if (validTitle) {
    conditions.push('p.title LIKE ?');
    params.push(`%${validTitle}%`);
}

const query = `SELECT * FROM products WHERE ${conditions.join(' AND ')} LIMIT ? OFFSET ?`;
await pool.query(query, [...params, limit, offset]);
```

### 2. **Type Safety**
Controller nên validate params trước khi gọi service:
```typescript
// controller/post.controller.ts
const year = parseInt(req.query.year as string) || undefined;
const min = parseInt(req.query.min as string) || undefined;
const max = parseInt(req.query.max as string) || undefined;
```

### 3. **Error Handling**
Nên thêm try-catch và logging:
```typescript
try {
    const posts = await paginatePosts(...);
    return res.status(200).json({ data: posts });
} catch (error) {
    console.error('Error in paginatePosts:', error);
    return res.status(500).json({ message: 'Internal server error' });
}
```

## 📊 So sánh Before/After

| Aspect | Before | After |
|--------|--------|-------|
| **NaN errors** | ❌ Yes | ✅ No |
| **Undefined handling** | ❌ Poor | ✅ Good |
| **Query flexibility** | ❌ Fixed conditions | ✅ Dynamic conditions |
| **Performance** | ⚠️ Always evaluates all conditions | ✅ Only necessary conditions |
| **Code clarity** | ⚠️ Complex logic | ✅ Clear validation |

## 🚀 Next Steps

1. ✅ Fix NaN errors - **DONE**
2. ⏳ Implement parameterized queries (Security)
3. ⏳ Add input validation in controller
4. ⏳ Add comprehensive error handling
5. ⏳ Add query caching for performance
6. ⏳ Add unit tests for edge cases
7. ⏳ Add API documentation

---

**Fixed by**: GitHub Copilot  
**Date**: October 17, 2025  
**Issue**: Unknown column 'NaN' in 'where clause'  
**File**: `c:\vsCode\SWP391_BE\Electric_Car_Management\src\services\post.service.ts`
