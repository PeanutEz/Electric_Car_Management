# 🖼️ API Documentation - Product Images

## 📋 Danh sách API để lấy records từ bảng `product_imgs`

### 1. **Lấy tất cả ảnh sản phẩm**

```
GET /api/post/images/all
```

**Response:**

```json
{
	"message": "Lấy danh sách tất cả ảnh sản phẩm thành công",
	"data": [
		{
			"id": 1,
			"product_id": 123,
			"url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/demo-node-ts/abc123.jpg"
		},
		{
			"id": 2,
			"product_id": 123,
			"url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/demo-node-ts/def456.jpg"
		}
	],
	"count": 2
}
```

### 2. **Lấy ảnh theo Product ID**

```
GET /api/post/images/product/{productId}
```

**Ví dụ:**

```
GET /api/post/images/product/123
```

**Response:**

```json
{
	"message": "Lấy danh sách ảnh sản phẩm thành công",
	"data": [
		{
			"id": 1,
			"product_id": 123,
			"url": "https://cloudinary.com/image1.jpg"
		},
		{
			"id": 2,
			"product_id": 123,
			"url": "https://cloudinary.com/image2.jpg"
		}
	],
	"count": 2
}
```

### 3. **Lấy ảnh với thông tin sản phẩm**

```
GET /api/post/images/with-info
```

**Response:**

```json
{
	"message": "Lấy danh sách ảnh với thông tin sản phẩm thành công",
	"data": [
		{
			"image_id": 1,
			"product_id": 123,
			"url": "https://cloudinary.com/image1.jpg",
			"product_title": "Bán Tesla Model 3 2023",
			"brand": "Tesla",
			"model": "Model 3",
			"price": "800000000.00",
			"category_name": "Xe điện",
			"category_type": "car"
		}
	],
	"count": 1
}
```

### 4. **Lấy ảnh với filter**

```
GET /api/post/images/filter?categoryType=car&brand=Tesla&limit=10&offset=0
```

**Query Parameters:**

-   `productId` (number, optional): Filter theo product ID
-   `categoryType` (string, optional): Filter theo loại (car, battery)
-   `brand` (string, optional): Filter theo thương hiệu
-   `limit` (number, optional): Giới hạn số lượng record
-   `offset` (number, optional): Bỏ qua số lượng record

**Response:**

```json
{
	"message": "Lấy danh sách ảnh với filter thành công",
	"data": [
		{
			"image_id": 1,
			"product_id": 123,
			"url": "https://cloudinary.com/tesla1.jpg",
			"product_title": "Bán Tesla Model 3",
			"brand": "Tesla",
			"model": "Model 3",
			"price": "800000000.00",
			"category_name": "Xe điện",
			"category_type": "car"
		}
	],
	"count": 1,
	"filter": {
		"categoryType": "car",
		"brand": "Tesla",
		"limit": 10,
		"offset": 0
	}
}
```

### 5. **Đếm số lượng ảnh theo sản phẩm**

```
GET /api/post/images/count-by-product
```

**Response:**

```json
{
	"message": "Lấy thống kê số lượng ảnh theo sản phẩm thành công",
	"data": [
		{
			"product_id": 123,
			"title": "Bán Tesla Model 3 2023",
			"brand": "Tesla",
			"model": "Model 3",
			"image_count": 5
		},
		{
			"product_id": 124,
			"title": "Bán pin LG Chem",
			"brand": "LG",
			"model": "Chem RESU",
			"image_count": 3
		}
	]
}
```

### 6. **Lấy ảnh theo ID cụ thể**

```
GET /api/post/images/{imageId}
```

**Ví dụ:**

```
GET /api/post/images/1
```

**Response:**

```json
{
	"message": "Lấy thông tin ảnh thành công",
	"data": {
		"id": 1,
		"product_id": 123,
		"url": "https://cloudinary.com/image1.jpg"
	}
}
```

## 🔧 Utility Functions (Sử dụng trong code)

```typescript
import {
	getAllProductImages,
	getProductImagesByProductId,
	getProductImagesWithProductInfo,
	getProductImagesWithFilter,
	countImagesByProduct,
	getProductImageById,
	addProductImage,
	deleteProductImage,
	updateProductImages,
} from '../services/post.service';

// Lấy tất cả ảnh
const allImages = await getAllProductImages();

// Lấy ảnh theo product ID
const productImages = await getProductImagesByProductId(123);

// Lấy ảnh với thông tin sản phẩm
const imagesWithInfo = await getProductImagesWithProductInfo();

// Lấy ảnh với filter
const filteredImages = await getProductImagesWithFilter({
	categoryType: 'car',
	brand: 'Tesla',
	limit: 10,
});

// Đếm ảnh theo sản phẩm
const imageCounts = await countImagesByProduct();

// Lấy ảnh theo ID
const image = await getProductImageById(1);

// Thêm ảnh mới
await addProductImage(123, 'https://cloudinary.com/new-image.jpg');

// Xóa ảnh
await deleteProductImage(123, 'https://cloudinary.com/image-to-delete.jpg');

// Cập nhật tất cả ảnh của sản phẩm
await updateProductImages(123, [
	'https://cloudinary.com/image1.jpg',
	'https://cloudinary.com/image2.jpg',
]);
```

## 📊 Use Cases

### 1. **Admin Dashboard**

-   Xem tất cả ảnh: `GET /api/post/images/all`
-   Thống kê ảnh: `GET /api/post/images/count-by-product`

### 2. **Product Management**

-   Xem ảnh của sản phẩm: `GET /api/post/images/product/123`
-   Quản lý ảnh cụ thể: `GET /api/post/images/1`

### 3. **Search & Filter**

-   Tìm ảnh theo thương hiệu: `GET /api/post/images/filter?brand=Tesla`
-   Tìm ảnh theo loại: `GET /api/post/images/filter?categoryType=car`

### 4. **Gallery Display**

-   Hiển thị với thông tin: `GET /api/post/images/with-info`
-   Phân trang: `GET /api/post/images/filter?limit=20&offset=40`

## 🔑 Lưu ý

-   Tất cả API đều return status code 200 khi thành công
-   Lỗi 400 cho invalid parameters
-   Lỗi 404 cho không tìm thấy
-   Lỗi 500 cho server errors
-   Tất cả response đều có `message` và `data` fields
