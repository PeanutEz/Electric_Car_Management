# 📝 Hướng dẫn sử dụng API tạo bài post với upload ảnh

## 🚀 Endpoint

```
POST /api/post/create-post
Content-Type: multipart/form-data
```

## �️ Cấu trúc Database

-   **Ảnh chính**: Lưu URL trong cột `image` của bảng `products`
-   **Ảnh phụ**: Lưu trong bảng `product_imgs` riêng biệt
    ```sql
    create table product_imgs (
      id int auto_increment primary key,
      product_id int not null,
      url varchar(2000)
    );
    ```

## �📋 Các trường dữ liệu

### ✅ Bắt buộc cho tất cả

-   `brand` (string): Thương hiệu
-   `model` (string): Model sản phẩm
-   `price` (number): Giá
-   `title` (string): Tiêu đề bài viết
-   `category` (string): JSON string chứa `{"id": number, "type": "car|battery"}`

### 📷 Upload ảnh (tùy chọn)

-   `mainImage` (file): Ảnh chính của sản phẩm
-   `images` (files[]): Nhiều ảnh phụ (tối đa 10 ảnh)

### 🚗 Cho xe ô tô (category.type = "car")

-   `power` (number): Công suất (kW)
-   `mileage` (number): Số km đã đi
-   `seats` (number): Số ghế
-   `color` (string): Màu sắc

### 🔋 Cho pin (category.type = "battery")

-   `capacity` (number): Dung lượng (Ah)
-   `voltage` (number): Điện áp (V)
-   `health` (string): Tình trạng sức khỏe pin

### 📝 Tùy chọn khác

-   `year` (number): Năm sản xuất
-   `description` (string): Mô tả
-   `address` (string): Địa chỉ

## 💡 Ví dụ sử dụng với JavaScript/FormData

### Tạo bài post xe ô tô

```javascript
const formData = new FormData();

// Thông tin cơ bản
formData.append('brand', 'Tesla');
formData.append('model', 'Model 3');
formData.append('price', '800000000');
formData.append('title', 'Bán Tesla Model 3 2023 như mới');
formData.append('category', JSON.stringify({ id: 1, type: 'car' }));

// Thông tin xe
formData.append('power', '283');
formData.append('mileage', '5000');
formData.append('seats', '5');
formData.append('color', 'Đen');
formData.append('year', '2023');
formData.append('description', 'Xe mới chạy 5000km, tình trạng tốt');
formData.append('address', 'Hà Nội');

// Upload ảnh
formData.append('mainImage', mainImageFile); // File object
formData.append('images', imageFile1); // File object
formData.append('images', imageFile2); // File object

// Gửi request
const response = await fetch('/api/post/create-post', {
	method: 'POST',
	body: formData,
	headers: {
		Authorization: 'Bearer your-jwt-token',
	},
});
```

### Tạo bài post pin

```javascript
const formData = new FormData();

// Thông tin cơ bản
formData.append('brand', 'LG');
formData.append('model', 'Chem RESU');
formData.append('price', '50000000');
formData.append('title', 'Bán pin LG Chem RESU 48V');
formData.append('category', JSON.stringify({ id: 2, type: 'battery' }));

// Thông tin pin
formData.append('capacity', '100');
formData.append('voltage', '48');
formData.append('health', '95%');
formData.append('year', '2023');
formData.append('description', 'Pin còn mới, dung lượng 95%');
formData.append('address', 'TP.HCM');

// Upload ảnh
formData.append('mainImage', mainImageFile);
formData.append('images', imageFile1);

const response = await fetch('/api/post/create-post', {
	method: 'POST',
	body: formData,
});
```

## 📤 Response thành công

```json
{
	"message": "Tạo bài viết mới thành công",
	"data": {
		"id": 123,
		"title": "Bán Tesla Model 3 2023 như mới",
		"status": "pending",
		"product": {
			"brand": "Tesla",
			"model": "Model 3",
			"price": "800000000",
			"image": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/demo-node-ts/abc123.jpg",
			"images": [
				"https://res.cloudinary.com/your-cloud/image/upload/v1234567890/demo-node-ts/def456.jpg",
				"https://res.cloudinary.com/your-cloud/image/upload/v1234567890/demo-node-ts/ghi789.jpg"
			]
		}
	}
}
```

## ❌ Response lỗi

```json
{
	"message": "Thiếu thông tin bắt buộc (brand, model, price, title)",
	"error": "..."
}
```

## 🔑 Lưu ý quan trọng

1. **Ảnh chính**: Lưu URL trong cột `image` của bảng `products`
2. **Ảnh phụ**: Lưu trong bảng `product_imgs` với `product_id` liên kết
3. **Ảnh sẽ được upload lên Cloudinary** và URL sẽ được lưu vào database
4. **Trạng thái mặc định** của bài viết là `pending` (chờ phê duyệt)
5. **Category phải là JSON string** với format `{"id": number, "type": "car|battery"}`
6. **Kích thước ảnh**: Nên tối ưu ảnh trước khi upload để tăng tốc độ
7. **Authentication**: Cần JWT token hợp lệ

## 🛠️ Utility Functions (trong post.service.ts)

```typescript
// Lấy danh sách ảnh của sản phẩm
getProductImages(productId: number): Promise<string[]>

// Thêm ảnh cho sản phẩm
addProductImage(productId: number, imageUrl: string): Promise<void>

// Xóa ảnh của sản phẩm (xóa tất cả hoặc ảnh cụ thể)
deleteProductImage(productId: number, imageUrl?: string): Promise<void>

// Cập nhật ảnh của sản phẩm (thay thế tất cả)
updateProductImages(productId: number, imageUrls: string[]): Promise<void>
```

## 🧪 Test với Postman

1. Chọn `POST` method
2. URL: `http://localhost:3000/api/post/create-post`
3. Headers: `Authorization: Bearer your-jwt-token`
4. Body: Chọn `form-data`
5. Thêm các key-value theo bảng trên
6. Với file ảnh, chọn type là `File`
