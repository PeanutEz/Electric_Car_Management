# API Tạo Bài Viết Xe và Pin

## Tổng Quan

Đã tạo 2 API riêng biệt để tạo bài viết cho xe và pin, giúp validate dữ liệu chính xác hơn và dễ dàng sử dụng.

## API Endpoints

### 1. Tạo Bài Viết Xe (Vehicle)

**Endpoint:** `POST /api/post/create-post-vehicle`

**Content-Type:** `multipart/form-data`

**Required Fields:**

-   `brand` (string): Thương hiệu xe
-   `model` (string): Model xe
-   `price` (number): Giá xe
-   `title` (string): Tiêu đề bài viết
-   `category` (string): JSON string `{"id": 1}` - ID category, type sẽ tự động set thành 'vehicle'
-   `power` (number): Công suất (kW) - **BẮT BUỘC**
-   `seats` (integer): Số ghế - **BẮT BUỘC**

**Optional Fields:**

-   `year` (integer): Năm sản xuất
-   `description` (string): Mô tả chi tiết
-   `address` (string): Địa chỉ
-   `mileage` (number): Số km đã đi
-   `color` (string): Màu sắc
-   `image` (file): Ảnh chính
-   `images` (files[]): Các ảnh phụ (tối đa 6 ảnh)

**Example Request (cURL):**

```bash
curl -X POST http://localhost:3000/api/post/create-post-vehicle \
  -H "Content-Type: multipart/form-data" \
  -F "brand=Tesla" \
  -F "model=Model 3" \
  -F "price=800000000" \
  -F "title=Bán Tesla Model 3 2023 như mới" \
  -F "year=2023" \
  -F "description=Xe mới chạy 5000km, nội thất còn mới" \
  -F "address=Hà Nội" \
  -F "category={\"id\": 1}" \
  -F "power=283" \
  -F "mileage=5000" \
  -F "seats=5" \
  -F "color=Đen" \
  -F "image=@/path/to/main-image.jpg" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

**Example Request (JavaScript/Fetch):**

```javascript
const formData = new FormData();
formData.append('brand', 'Tesla');
formData.append('model', 'Model 3');
formData.append('price', '800000000');
formData.append('title', 'Bán Tesla Model 3 2023 như mới');
formData.append('year', '2023');
formData.append('description', 'Xe mới chạy 5000km, nội thất còn mới');
formData.append('address', 'Hà Nội');
formData.append('category', JSON.stringify({ id: 1 }));
formData.append('power', '283');
formData.append('mileage', '5000');
formData.append('seats', '5');
formData.append('color', 'Đen');
formData.append('image', imageFile); // File object
formData.append('images', imageFile1);
formData.append('images', imageFile2);

const response = await fetch(
	'http://localhost:3000/api/post/create-post-vehicle',
	{
		method: 'POST',
		body: formData,
	},
);
```

**Success Response (201):**

```json
{
	"message": "Tạo bài viết xe thành công",
	"data": {
		"id": 123,
		"title": "Bán Tesla Model 3 2023 như mới",
		"status": "pending",
		"product": {
			"brand": "Tesla",
			"model": "Model 3",
			"price": "800000000",
			"year": 2023,
			"image": "https://res.cloudinary.com/.../image.jpg",
			"images": [
				"https://res.cloudinary.com/.../image1.jpg",
				"https://res.cloudinary.com/.../image2.jpg"
			],
			"power": 283,
			"mileage": 5000,
			"seats": 5,
			"color": "Đen",
			"category": {
				"id": 1,
				"type": "vehicle"
			}
		}
	}
}
```

---

### 2. Tạo Bài Viết Pin (Battery)

**Endpoint:** `POST /api/post/create-post-battery`

**Content-Type:** `multipart/form-data`

**Required Fields:**

-   `brand` (string): Thương hiệu pin
-   `model` (string): Model pin
-   `price` (number): Giá pin
-   `title` (string): Tiêu đề bài viết
-   `category` (string): JSON string `{"id": 2}` - ID category, type sẽ tự động set thành 'battery'
-   `capacity` (number): Dung lượng (Ah) - **BẮT BUỘC**
-   `voltage` (number): Điện áp (V) - **BẮT BUỘC**

**Optional Fields:**

-   `year` (integer): Năm sản xuất
-   `description` (string): Mô tả chi tiết
-   `address` (string): Địa chỉ
-   `health` (string): Tình trạng sức khỏe pin (vd: "95%")
-   `image` (file): Ảnh chính
-   `images` (files[]): Các ảnh phụ (tối đa 6 ảnh)

**Example Request (cURL):**

```bash
curl -X POST http://localhost:3000/api/post/create-post-battery \
  -H "Content-Type: multipart/form-data" \
  -F "brand=Panasonic" \
  -F "model=NCR18650B" \
  -F "price=5000000" \
  -F "title=Bán pin lithium 48V như mới" \
  -F "year=2023" \
  -F "description=Pin còn mới 95%, ít sử dụng" \
  -F "address=TP.HCM" \
  -F "category={\"id\": 2}" \
  -F "capacity=100" \
  -F "voltage=48" \
  -F "health=95%" \
  -F "image=@/path/to/battery-main.jpg" \
  -F "images=@/path/to/battery1.jpg"
```

**Example Request (JavaScript/Fetch):**

```javascript
const formData = new FormData();
formData.append('brand', 'Panasonic');
formData.append('model', 'NCR18650B');
formData.append('price', '5000000');
formData.append('title', 'Bán pin lithium 48V như mới');
formData.append('year', '2023');
formData.append('description', 'Pin còn mới 95%, ít sử dụng');
formData.append('address', 'TP.HCM');
formData.append('category', JSON.stringify({ id: 2 }));
formData.append('capacity', '100');
formData.append('voltage', '48');
formData.append('health', '95%');
formData.append('image', imageFile); // File object
formData.append('images', imageFile1);

const response = await fetch(
	'http://localhost:3000/api/post/create-post-battery',
	{
		method: 'POST',
		body: formData,
	},
);
```

**Success Response (201):**

```json
{
	"message": "Tạo bài viết pin thành công",
	"data": {
		"id": 124,
		"title": "Bán pin lithium 48V như mới",
		"status": "pending",
		"product": {
			"brand": "Panasonic",
			"model": "NCR18650B",
			"price": "5000000",
			"year": 2023,
			"image": "https://res.cloudinary.com/.../battery.jpg",
			"images": ["https://res.cloudinary.com/.../battery1.jpg"],
			"capacity": 100,
			"voltage": 48,
			"health": "95%",
			"category": {
				"id": 2,
				"type": "battery"
			}
		}
	}
}
```

---

## Error Responses

### 400 Bad Request - Thiếu thông tin bắt buộc chung

```json
{
	"message": "Thiếu thông tin bắt buộc (brand, model, price, title)"
}
```

### 400 Bad Request - Thiếu thông tin xe

```json
{
	"message": "Thiếu thông tin xe (power, seats)"
}
```

### 400 Bad Request - Thiếu thông tin pin

```json
{
	"message": "Thiếu thông tin pin (capacity, voltage)"
}
```

### 400 Bad Request - Category không hợp lệ

```json
{
	"message": "Category phải là JSON hợp lệ"
}
```

### 500 Internal Server Error

```json
{
	"message": "Lỗi khi tạo bài viết xe",
	"error": "Chi tiết lỗi..."
}
```

---

## Lưu Ý Quan Trọng

### 1. Category Type

-   **API create-post-vehicle**: `category.type` sẽ tự động được set thành `"vehicle"`, bạn chỉ cần truyền `category.id`
-   **API create-post-battery**: `category.type` sẽ tự động được set thành `"battery"`, bạn chỉ cần truyền `category.id`

### 2. Validation

-   API vehicle **bắt buộc** có `power` và `seats`
-   API battery **bắt buộc** có `capacity` và `voltage`
-   Điều này đảm bảo dữ liệu luôn đầy đủ cho từng loại sản phẩm

### 3. Upload Ảnh

-   Ảnh chính: field name `image` (1 ảnh)
-   Ảnh phụ: field name `images` (tối đa 6 ảnh)
-   Ảnh sẽ được upload lên Cloudinary tự động

### 4. Status

-   Tất cả bài viết mới được tạo đều có `status = "pending"`
-   Admin cần duyệt bài qua API `/api/post/update-post-by-admin/:id`

---

## So Sánh với API Cũ

### API Cũ: `/api/post/create-post`

-   Nhận cả xe và pin
-   Phải truyền đầy đủ `category.type` trong request
-   Ít validate hơn

### API Mới: `/api/post/create-post-vehicle` và `/api/post/create-post-battery`

-   **Ưu điểm:**
    -   Tự động set `category.type` đúng
    -   Validate chặt chẽ các trường bắt buộc riêng cho từng loại
    -   Rõ ràng hơn về mục đích sử dụng
    -   Dễ maintain và test hơn
-   **Khi nào dùng:**
    -   Dùng API mới khi frontend đã biết chắc đang tạo xe hay pin
    -   API cũ vẫn hoạt động bình thường nếu cần

---

## Testing với Postman

### Test API Vehicle:

1. Tạo request mới: `POST http://localhost:3000/api/post/create-post-vehicle`
2. Chọn Body → form-data
3. Thêm các fields:
    - brand: Tesla
    - model: Model 3
    - price: 800000000
    - title: Test xe
    - category: {"id": 1}
    - power: 283
    - seats: 5
4. Thêm file ảnh nếu cần
5. Send

### Test API Battery:

1. Tạo request mới: `POST http://localhost:3000/api/post/create-post-battery`
2. Chọn Body → form-data
3. Thêm các fields:
    - brand: Panasonic
    - model: NCR18650B
    - price: 5000000
    - title: Test pin
    - category: {"id": 2}
    - capacity: 100
    - voltage: 48
4. Thêm file ảnh nếu cần
5. Send

---

## Database Schema

### Bảng products (chung)

-   `id`, `brand`, `model`, `price`, `year`, `description`, `address`, `title`, `image`, `status`, `priority`, `created_at`, `product_category_id`

### Bảng vehicles (riêng cho xe)

-   `product_id`, `power`, `mileage_km`, `seats`, `color`

### Bảng batteries (riêng cho pin)

-   `product_id`, `capacity`, `voltage`, `health`

### Bảng product_imgs (ảnh phụ)

-   `id`, `product_id`, `url`

---

## Swagger Documentation

Sau khi chạy server, truy cập:

-   **Swagger UI**: `http://localhost:3000/api-docs`
-   Tìm section **Posts**
-   Sẽ thấy 2 API mới:
    -   `POST /api/post/create-post-vehicle`
    -   `POST /api/post/create-post-battery`

Có thể test trực tiếp từ Swagger UI với nút "Try it out"
