# 📘 Favorites API Documentation

This document describes the API endpoints for managing **favorite posts** in the system.

---

## **4️⃣ – Choose Favorite Post**

**Endpoint:**  
`POST /api/favorites`

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": 1
}
```

> `id`: number — ID of the post to add to favorites.

**Response (200 OK):**

```json
{
  "message": "Đã thêm bài viết vào danh sách yêu thích thành công",
  "data": {
    "post_id": 1,
    "user_id": 12,
    "favorite_at": "2025-10-28T09:20:00.000Z"
  }
}
```

---

## **5️⃣ – List Favorite Posts**

**Endpoint:**  
`GET /api/favorites`

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**

```json
{
  "message": "Lấy danh sách bài viết yêu thích thành công",
  "data": {
    "posts": [
      {
        "id": 1,
        "allow_resubmit": false,
        "title": "VinFast VF3 - Xe điện mini đô thị",
        "priority": 1,
        "status": "approved",
        "end_date": null,
        "created_at": "2025-10-20T07:28:00.000Z",
        "favorite_at": "2025-10-26T09:20:00.000Z",
        "updated_at": "2025-10-28T04:35:16.000Z",
        "status_verify": "unverified",
        "product": {
          "id": 1,
          "brand": "VinFast",
          "model": "VF3",
          "price": "350000000.00",
          "description": "VF3 nhỏ gọn, tiết kiệm, phù hợp đi nội thành.",
          "status": "approved",
          "year": 2025,
          "warranty": "6",
          "address": "Hà Nội",
          "color": "brown",
          "seats": 4,
          "mileage": "5000",
          "power": "200",
          "health": null,
          "previousOwners": 1,
          "image": "https://res.cloudinary.com/dn2xh5rxe/image/upload/v1760944584/demo-node-ts/xvvvqyndhd1dk80doijb.jpg",
          "images": [
            "https://res.cloudinary.com/dn2xh5rxe/image/upload/v1760944584/demo-node-ts/xvvvqyndhd1dk80doijb.jpg"
          ],
          "category": {
            "id": 1,
            "type": "vehicle",
            "name": "Electric Car",
            "typeSlug": "vehicle",
            "count": 0
          }
        },
        "seller": {
          "id": 12,
          "full_name": "Nhật Trường",
          "email": "nhatruong5012@gmail.com",
          "phone": "0911973863"
        }
      }, {}, {}, ...
    ],
    "count": {
      "all": 5
    },
    "pagination": {
      "page": 1,
      "limit": 5,
      "page_size": 1
    }
  }
}
```

---

## **6️⃣ – Delete Favorite Post**

**Endpoint:**  
`DELETE /api/favorites`

**Headers:**

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**

```json
{
  "id": 1
}
```

> `id`: number — ID of the post to remove from favorites.

**Response (200 OK):**

```json
{
  "message": "Đã xóa bài viết khỏi danh sách yêu thích thành công",
  "data": {
    "post_id": 1,
    "user_id": 12,
    "deleted_at": "2025-10-28T10:35:06.603126Z"
  }
}
```

---

### 💡 Notes

- All endpoints require a valid `accessToken` in the request header.
- The `favorite_at` and `deleted_at` fields use ISO 8601 datetime format (UTC).
- Optional query params for `/api/favorites`:
  - `category`: filter by category (e.g. `vehicle`, `battery`)
  - `page`, `limit`: for pagination
  - `sort`: e.g. `favorite_at_desc`

---
