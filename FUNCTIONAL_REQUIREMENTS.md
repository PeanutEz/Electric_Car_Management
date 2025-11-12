# Second-hand EV & Battery Trading Platform
## Functional Requirements Documentation

**Project Name:** Nền tảng giao dịch pin và xe điện đã qua sử dụng  
**Version:** 1.0  
**Last Updated:** November 11, 2025

---

## I. Primary Actors

1. **Guest** - Người dùng chưa đăng nhập
2. **Member** - Thành viên đã đăng ký
3. **Admin** - Quản trị viên hệ thống

---

## II. Functional Requirements

### 1. Authentication & Authorization

#### 1.1 Sign Up (Đăng ký)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Authentication |
| **Function Name** | Sign Up / Register |
| **Actor** | Guest |
| **Trigger** | User clicks "Đăng ký" button and submits registration form |
| **Description** | Creates new user account in the system. Validates input data (email uniqueness, password strength). Returns user profile and authentication tokens on success. |
| **Screen Layout** | Three input fields (Full Name, Email, Password) and one Register button. Optional: Terms & Conditions checkbox, Login link. |
| **Function Details** | |
| Input | - `full_name`: string (required, 6-160 characters)<br>- `email`: string (required, valid email format, 5-160 characters)<br>- `password`: string (required, minimum 6 characters) |
| Validation | - Email must be unique<br>- Password minimum 6 characters<br>- Full name required<br>- All fields must be properly formatted |
| Functionality | Register new user account |
| Output | ```json<br>{<br>  "success": true,<br>  "message": "Đăng ký người dùng thành công",<br>  "user": {<br>    "id": 1,<br>    "full_name": "John Doe",<br>    "email": "john@example.com"<br>  }<br>}``` |
| **API Endpoint** | `POST /api/user/register` |
| **Status Codes** | - 201: Success<br>- 400: Validation error (email exists, invalid format)<br>- 500: Server error |

---

#### 1.2 Sign In (Đăng nhập)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Authentication |
| **Function Name** | Sign In / Login |
| **Actor** | Guest, Member |
| **Trigger** | User enters credentials (email & password) and clicks Login button |
| **Description** | Authenticates user credentials via API `/auth/login`. On success, returns access & refresh tokens and redirects user to their role-based dashboard. |
| **Screen Layout** | Two input fields (Email, Password) and one Login button. Optional links: Forgot Password, Remember Me, Login with Google. |
| **Function Details** | |
| Input | - `email`: string (required, valid email)<br>- `password`: string (required) |
| Validation | - Email format must be valid<br>- Password must not be empty<br>- Check if user exists and is active |
| Functionality | Authenticate user and issue JWT tokens |
| Output | ```json<br>{<br>  "success": true,<br>  "message": "Đăng nhập thành công",<br>  "data": {<br>    "user": {<br>      "id": 1,<br>      "full_name": "John Doe",<br>      "email": "john@example.com",<br>      "role": "member",<br>      "total_credit": 0<br>    },<br>    "access_token": "Bearer eyJhbG...",<br>    "refresh_token": "Bearer eyJhbG..."<br>  }<br>}``` |
| **API Endpoint** | `POST /api/user/login` |
| **Status Codes** | - 200: Success<br>- 401: Invalid credentials<br>- 500: Server error |

---

#### 1.3 Sign Out (Đăng xuất)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Authentication |
| **Function Name** | Sign Out / Logout |
| **Actor** | Member, Admin |
| **Trigger** | User clicks Logout button |
| **Description** | Invalidates user session, clears tokens from storage, and redirects to homepage. |
| **Function Details** | |
| Input | - JWT token in Authorization header |
| Functionality | Clear user session and tokens |
| Output | ```json<br>{<br>  "success": true,<br>  "message": "Đăng xuất thành công"<br>}``` |
| **API Endpoint** | `POST /api/user/logout` |
| **Authentication** | Required (Bearer token) |
| **Status Codes** | - 200: Success<br>- 401: Unauthorized |

---

#### 1.4 Refresh Token (Làm mới token)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Authentication |
| **Function Name** | Refresh Access Token |
| **Actor** | Member, Admin |
| **Trigger** | Access token expires, system automatically refreshes |
| **Description** | Issues new access token using refresh token without requiring re-login. |
| **Function Details** | |
| Input | - `refresh_token`: string (JWT refresh token) |
| Validation | - Refresh token must be valid<br>- Refresh token must not be expired |
| Functionality | Generate new access token |
| Output | ```json<br>{<br>  "message": "Làm mới token thành công",<br>  "data": {<br>    "access_token": "Bearer eyJhbG..."<br>  }<br>}``` |
| **API Endpoint** | `POST /api/user/refresh-token` |
| **Status Codes** | - 200: Success<br>- 400: Refresh token required<br>- 401: Invalid/expired refresh token |

---

### 2. User Management

#### 2.1 View Profile (Xem thông tin cá nhân)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | User Management |
| **Function Name** | Get User Details |
| **Actor** | Member |
| **Trigger** | User navigates to Profile page |
| **Description** | Retrieves detailed user information including personal data, avatar, credit balance. |
| **Function Details** | |
| Input | - User ID (from JWT token) |
| Functionality | Fetch user profile data |
| Output | ```json<br>{<br>  "id": 1,<br>  "full_name": "John Doe",<br>  "email": "john@example.com",<br>  "phone": "+84912345678",<br>  "avatar": "https://...",<br>  "gender": "male",<br>  "address": "123 Main St",<br>  "reputation": 0,<br>  "total_credit": 100000,<br>  "role": "member"<br>}``` |
| **API Endpoint** | `GET /api/user/user-detail` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 404: User not found<br>- 500: Server error |

---

#### 2.2 Update Profile (Cập nhật thông tin)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | User Management |
| **Function Name** | Update User Information |
| **Actor** | Member |
| **Trigger** | User submits profile edit form |
| **Description** | Updates user personal information including avatar upload. Supports multipart/form-data for file upload. |
| **Function Details** | |
| Input | - `full_name`: string (optional, 6-160 chars)<br>- `phone`: string (optional, 10 digits)<br>- `email`: string (optional, valid email)<br>- `gender`: enum (male, female, other)<br>- `address`: string (optional)<br>- `avatar`: file (optional, image) |
| Validation | - Email format if provided<br>- Phone must be 10 digits<br>- Avatar must be valid image file |
| Functionality | Update user profile and upload avatar to cloud storage |
| Output | ```json<br>{<br>  "message": "Cập nhật thông tin thành công",<br>  "data": {<br>    "user": { /* updated user object */ }<br>  }<br>}``` |
| **API Endpoint** | `PUT /api/user/update-user` |
| **Authentication** | Required |
| **Content-Type** | multipart/form-data |
| **Status Codes** | - 200: Success<br>- 422: Validation error<br>- 500: Upload error |

---

#### 2.3 Change Password (Đổi mật khẩu)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | User Management |
| **Function Name** | Change User Password |
| **Actor** | Member |
| **Trigger** | User submits password change form |
| **Description** | Allows user to change password by providing current password and new password. |
| **Function Details** | |
| Input | - `currentPassword`: string (required)<br>- `newPassword`: string (required, min 6 chars)<br>- `confirmPassword`: string (must match newPassword) |
| Validation | - Current password must be correct<br>- New password minimum 6 characters<br>- Confirm password must match new password |
| Functionality | Validate current password and update to new password |
| Output | ```json<br>{<br>  "message": "Đổi mật khẩu thành công",<br>  "data": true<br>}``` |
| **API Endpoint** | `PUT /api/user/change-password` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 422: Password mismatch or incorrect |

---

### 3. Post Management (Quản lý tin đăng)

#### 3.1 Create Post (Đăng tin bán xe/pin)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Post Management |
| **Function Name** | Create New Post |
| **Actor** | Member |
| **Trigger** | User submits post creation form with product details and images |
| **Description** | Creates new post for selling EV or battery. Checks payment quota or credit before allowing post creation. Supports AI price suggestion. Uploads multiple images to cloud storage. |
| **Screen Layout** | Multi-step form:<br>1. Service selection (post type)<br>2. Product category (vehicle/battery)<br>3. Basic info (brand, model, price, year, title)<br>4. Detailed specs (power, mileage, seats OR capacity, voltage, health)<br>5. Images upload (1 main + up to 6 additional)<br>6. Address & description |
| **Function Details** | |
| Input | **Common fields:**<br>- `service_id`: integer (required)<br>- `brand`: string (required)<br>- `model`: string (required)<br>- `price`: number (required)<br>- `title`: string (required)<br>- `year`: integer<br>- `description`: string<br>- `address`: string<br>- `category_id`: integer (required)<br>- `image`: file (main image)<br>- `images`: array of files (max 6)<br><br>**For vehicles:**<br>- `power`: number (kW)<br>- `mileage`: number (km)<br>- `seats`: integer<br>- `color`: string<br><br>**For batteries:**<br>- `capacity`: number (Ah)<br>- `voltage`: number (V)<br>- `health`: string (%) |
| Validation | - All required fields must be filled<br>- Service ID must be valid<br>- Check user quota/credit<br>- Images must be valid format<br>- Price must be positive number |
| Functionality | 1. Check payment/quota (checkAndProcessPostPayment)<br>2. Upload images to Cloudinary<br>3. Generate AI price suggestion (Gemini API)<br>4. Create product record<br>5. Create vehicle/battery specific data<br>6. Create post record (status: pending)<br>7. Deduct quota from user_packages<br>8. Send notification to user |
| Output (Success) | ```json<br>{<br>  "message": "Tạo bài viết mới thành công",<br>  "data": {<br>    "post_id": 123,<br>    "status": "pending"<br>  }<br>}``` |
| Output (Need Payment) | ```json<br>{<br>  "message": "Bạn không đủ credit. Vui lòng nạp thêm 50000 VND",<br>  "needPayment": true,<br>  "priceRequired": 50000,<br>  "checkoutUrl": "https://pay.payos.vn/...",<br>  "orderCode": 123456<br>}``` |
| **API Endpoint** | `POST /api/post/create-post` |
| **Authentication** | Required |
| **Content-Type** | multipart/form-data |
| **Status Codes** | - 201: Success<br>- 400: Missing required fields<br>- 401: Unauthorized<br>- 402: Payment required<br>- 500: Server error |

---

#### 3.2 View All Posts (Xem danh sách tin đăng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Post Management |
| **Function Name** | List Approved Posts |
| **Actor** | Guest, Member, Admin |
| **Trigger** | User browses post listing page |
| **Description** | Displays paginated list of approved posts with filtering and sorting options. Shows product details, seller info, AI price suggestions. |
| **Function Details** | |
| Input (Query Params) | - `page`: integer (default 1)<br>- `limit`: integer (default 10)<br>- `category_type`: enum (vehicle, battery)<br>- `year`: integer<br>- `price_min`: number (million VND)<br>- `price_max`: number (million VND)<br>- `title`: string (search)<br>- `sort_by`: enum (price, created_at, recommend)<br>- `order`: enum (asc, desc)<br><br>**Vehicle filters:**<br>- `color`: string<br>- `seats`: integer<br>- `mileage`: integer<br>- `power`: integer<br><br>**Battery filters:**<br>- `capacity`: number<br>- `health`: string<br>- `voltage`: number |
| Functionality | 1. Query posts with status='approved'<br>2. Apply filters (year, price range, category)<br>3. Join with products, vehicles/batteries, categories<br>4. Join with users (seller info)<br>5. Calculate AI price range (Gemini)<br>6. Sort and paginate results |
| Output | ```json<br>{<br>  "message": "Lấy danh sách bài viết thành công",<br>  "data": {<br>    "posts": [<br>      {<br>        "id": 164,<br>        "title": "Xe điện VinFast VF 6",<br>        "priority": 1,<br>        "status": "approved",<br>        "created_at": "2025-10-04T07:50:28.000Z",<br>        "product": {<br>          "brand": "VinFast",<br>          "model": "VF 6",<br>          "price": 500000000,<br>          "year": 2023,<br>          "image": "https://...",<br>          "images": ["https://..."],<br>          "category": {<br>            "id": 1,<br>            "name": "Electric Car"<br>          }<br>        },<br>        "seller": {<br>          "id": 12,<br>          "full_name": "Nhật Trường",<br>          "phone": "0911973863"<br>        },<br>        "ai": {<br>          "min_price": "200,000,000",<br>          "max_price": "400,000,000"<br>        }<br>      }<br>    ],<br>    "pagination": {<br>      "page": 1,<br>      "limit": 10,<br>      "page_size": 5<br>    }<br>  }<br>}``` |
| **API Endpoint** | `GET /api/post/get-all-approved` |
| **Authentication** | Optional (for favorite status) |
| **Status Codes** | - 200: Success<br>- 500: Server error |

---

#### 3.3 View Post Detail (Xem chi tiết tin đăng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Post Management |
| **Function Name** | Get Post Details |
| **Actor** | Guest, Member, Admin |
| **Trigger** | User clicks on a post to view details |
| **Description** | Retrieves comprehensive post information including product specs, images, seller contact, AI price estimate, and favorite status. |
| **Function Details** | |
| Input | - `id`: integer (post ID, path parameter)<br>- JWT token (optional, for favorite status) |
| Functionality | 1. Get post by ID with status check<br>2. Join with product, category, vehicle/battery<br>3. Get seller information<br>4. Get all product images<br>5. Calculate AI price suggestion<br>6. Check if user favorited (if authenticated) |
| Output | ```json<br>{<br>  "message": "Lấy thông tin bài viết thành công",<br>  "data": {<br>    "id": 8,<br>    "title": "Post demo 8",<br>    "status": "approved",<br>    "end_date": "2025-10-07T17:00:00.000Z",<br>    "priority": 2,<br>    "product": {<br>      "id": 102,<br>      "brand": "Tesla",<br>      "model": "Model 3",<br>      "price": 800000000,<br>      "description": "Xe mới...",<br>      "year": 2023,<br>      "seats": 4,<br>      "mileage": 5000,<br>      "power": 283,<br>      "category": {<br>        "id": 3,<br>        "name": "Xe điện",<br>        "type": "vehicle"<br>      },<br>      "image": "https://...",<br>      "images": ["https://..."]<br>    },<br>    "seller": {<br>      "id": 12,<br>      "full_name": "John Doe",<br>      "email": "john@example.com",<br>      "phone": "0912345678"<br>    },<br>    "is_favorite": false<br>  }<br>}``` |
| **API Endpoint** | `GET /api/post/:id` |
| **Authentication** | Optional |
| **Status Codes** | - 200: Success<br>- 400: Invalid ID<br>- 404: Post not found<br>- 500: Server error |

---

#### 3.4 Update Post (Cập nhật tin đăng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Post Management |
| **Function Name** | Update User Post (Resubmit) |
| **Actor** | Member |
| **Trigger** | User edits and resubmits rejected post |
| **Description** | Allows users to edit and resubmit posts that were rejected once (reject_count=1, is_finally_rejected=0). Post status changes to 'pending' after update. |
| **Function Details** | |
| Input | - Post data (same as create post)<br>- Must include post `id` |
| Validation | - User must own the post<br>- Post must have reject_count = 1<br>- Post must not be finally rejected<br>- All required fields must be valid |
| Functionality | 1. Verify post ownership<br>2. Check rejection status<br>3. Update product details<br>4. Update vehicle/battery specific data<br>5. Change post status to 'pending'<br>6. Update timestamps |
| Output | ```json<br>{<br>  "message": "Cập nhật bài viết thành công",<br>  "data": {<br>    "post_id": 123,<br>    "status": "pending"<br>  }<br>}``` |
| **API Endpoint** | `PUT /api/post/update-post` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 400: Post cannot be edited (finally rejected)<br>- 404: Post not found<br>- 500: Server error |

---

#### 3.5 Search Posts (Tìm kiếm tin đăng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Post Management |
| **Function Name** | Search Posts by Title |
| **Actor** | Guest, Member |
| **Trigger** | User enters search keywords |
| **Description** | Searches posts by title using fuzzy matching. Returns matching approved posts. |
| **Function Details** | |
| Input | - `title`: string (search query, path parameter) |
| Functionality | Search posts where title contains search term (case-insensitive) |
| Output | ```json<br>{<br>  "message": "Tìm kiếm bài viết thành công",<br>  "data": [<br>    { /* post objects */ }<br>  ]<br>}``` |
| **API Endpoint** | `GET /api/post/search/:title` |
| **Authentication** | Optional |
| **Status Codes** | - 200: Success<br>- 500: Server error |

---

#### 3.6 Get User Posts (Lấy tin đăng của tôi)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Post Management |
| **Function Name** | Get My Posts |
| **Actor** | Member |
| **Trigger** | User navigates to "My Posts" page |
| **Description** | Retrieves all posts created by the authenticated user with filtering by status. |
| **Function Details** | |
| Input | - JWT token (user ID)<br>- `status`: string (optional query param - pending, approved, rejected, sold, etc.) |
| Functionality | Get all posts where created_by = user_id, with optional status filter |
| Output | ```json<br>{<br>  "message": "Lấy danh sách bài đăng thành công",<br>  "data": [<br>    {<br>      "id": 1,<br>      "title": "Xe điện VinFast VF3",<br>      "status": "approved",<br>      "created_at": "2025-10-10T12:00:00Z",<br>      "product": { /* product details */ },<br>      "category": { /* category info */ },<br>      "images": ["https://..."]<br>    }<br>  ]<br>}``` |
| **API Endpoint** | `GET /api/user/user-posts` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 401: Unauthorized<br>- 500: Server error |

---

### 4. Package & Payment (Gói dịch vụ & Thanh toán)

#### 4.1 View Packages (Xem gói dịch vụ)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Package Management |
| **Function Name** | Get Available Packages |
| **Actor** | Member |
| **Trigger** | User navigates to pricing/packages page |
| **Description** | Displays available service packages for posting (vehicle or battery). Shows package details, pricing, and user's credit balance. Calculates required topup amount if credit insufficient. |
| **Function Details** | |
| Input | - User ID (from JWT)<br>- `product_type`: string (vehicle/battery, query param)<br>- `id`: integer (optional, specific package ID) |
| Functionality | 1. Get packages by product_type<br>2. Get user's total_credit<br>3. Calculate topup_credit needed<br>4. Return package list with pricing |
| Output | ```json<br>[<br>  {<br>    "id": 7,<br>    "name": "Gói cơ bản (3 lần đăng tin cho xe)",<br>    "description": "3 lần đăng tin",<br>    "cost": 100000,<br>    "type": "package",<br>    "product_type": "vehicle",<br>    "number_of_post": 3,<br>    "duration": 30,<br>    "user_total_credit": 50000,<br>    "topup_credit": 50000<br>  }<br>]``` |
| **API Endpoint** | `GET /api/service/packages?product_type=vehicle` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 500: Server error |

---

#### 4.2 Purchase Package (Mua gói dịch vụ)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Package Management |
| **Function Name** | Buy Package with Credit |
| **Actor** | Member |
| **Trigger** | User clicks "Mua gói" button and confirms purchase |
| **Description** | Allows user to purchase service package using account credit. Creates order, deducts credit, adds quota to user_packages table. |
| **Function Details** | |
| Input | - `service_id`: integer (package ID)<br>- JWT token (user ID) |
| Validation | - Package must exist<br>- User must have sufficient credit<br>- Service type must be 'package' |
| Functionality | 1. Get package details (cost, duration, number_of_post)<br>2. Check user credit balance<br>3. Begin transaction<br>4. Deduct credit from user<br>5. Create order record (type: package, status: PAID)<br>6. Log transaction_detail (Decrease credit)<br>7. Calculate expires_at (purchased_at + duration days)<br>8. Insert into user_packages (service_id from service_ref)<br>9. Commit transaction<br>10. Send success notification |
| Output (Success) | ```json<br>{<br>  "success": true,<br>  "message": "Mua gói thành công",<br>  "data": {<br>    "order_id": 456,<br>    "package_id": 7,<br>    "remaining_posts": 3,<br>    "expires_at": "2025-11-11T..."<br>  }<br>}``` |
| Output (Insufficient Credit) | ```json<br>{<br>  "success": false,<br>  "needPayment": true,<br>  "message": "Không đủ credit. Cần 50000 VND",<br>  "topupRequired": 50000<br>}``` |
| **API Endpoint** | `POST /api/service/buy-package-with-credit` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 400: Insufficient credit<br>- 500: Server error |

---

#### 4.3 Top Up Credit (Nạp tiền)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Payment |
| **Function Name** | Top Up Credit via PayOS |
| **Actor** | Member |
| **Trigger** | User enters topup amount and confirms payment |
| **Description** | Creates payment link for credit topup using PayOS gateway. Redirects user to payment page. |
| **Function Details** | |
| Input | - `amount`: number (VND, minimum 1000)<br>- JWT token (user ID) |
| Validation | - Amount must be > 0<br>- Amount must be integer |
| Functionality | 1. Generate unique order code<br>2. Create order (type: topup, status: PENDING)<br>3. Create PayOS payment link<br>4. Return checkout URL |
| Output | ```json<br>{<br>  "message": "Tạo link thanh toán thành công",<br>  "data": {<br>    "checkoutUrl": "https://pay.payos.vn/...",<br>    "orderCode": 123456,<br>    "amount": 100000<br>  }<br>}``` |
| **API Endpoint** | `POST /api/payment/topup` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 400: Invalid amount<br>- 500: PayOS error |

---

#### 4.4 Payment Webhook (Xử lý callback thanh toán)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Payment |
| **Function Name** | PayOS Webhook Handler |
| **Actor** | System (PayOS) |
| **Trigger** | PayOS sends payment result to webhook endpoint |
| **Description** | Processes payment results from PayOS. Updates order status, credits user account for topup/package purchases, handles deposit payments for auctions. |
| **Function Details** | |
| Input | - Webhook payload from PayOS<br>- Payment status (PAID, CANCELLED, EXPIRED) |
| Validation | - Verify webhook signature<br>- Check duplicate processing<br>- Validate order exists |
| Functionality | **For PAID status:**<br>1. Update order status to PAID<br>2. Based on order type:<br>   - **topup**: Add amount to user credit<br>   - **package**: Call processServicePayment<br>   - **deposit**: Update auction deposit<br>   - **auction_fee**: Process auction fee<br>3. Log transaction_detail<br>4. Send notification<br><br>**For CANCELLED/EXPIRED:**<br>1. Update order status<br>2. Send notification |
| Output | ```json<br>{<br>  "error": 0,<br>  "message": "Success",<br>  "data": null<br>}``` |
| **API Endpoint** | `POST /api/payment/payos-webhook` |
| **Authentication** | PayOS signature verification |
| **Status Codes** | - 200: Success<br>- 400: Invalid data<br>- 500: Processing error |

---

### 5. Auction (Đấu giá)

#### 5.1 Create Auction (Tạo phiên đấu giá)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Auction Management |
| **Function Name** | Create Auction Session |
| **Actor** | Member (Seller) |
| **Trigger** | User selects post and creates auction |
| **Description** | Creates auction session for an approved post. Sets starting price, deposit amount, start/end times. |
| **Function Details** | |
| Input | - `post_id`: integer<br>- `starting_price`: number<br>- `deposit_amount`: number<br>- `start_time`: datetime<br>- `end_time`: datetime |
| Validation | - Post must be approved<br>- User must own the post<br>- End time must be after start time<br>- Starting price > 0<br>- Deposit amount > 0 |
| Functionality | 1. Verify post ownership and status<br>2. Create auction record<br>3. Update post status to 'auctioning'<br>4. Schedule auction start/end timers |
| Output | ```json<br>{<br>  "message": "Tạo phiên đấu giá thành công",<br>  "data": {<br>    "auction_id": 789,<br>    "post_id": 123,<br>    "starting_price": 500000000,<br>    "start_time": "2025-11-15T10:00:00Z",<br>    "end_time": "2025-11-20T10:00:00Z"<br>  }<br>}``` |
| **API Endpoint** | `POST /api/auction/create` |
| **Authentication** | Required |
| **Status Codes** | - 201: Success<br>- 400: Invalid data<br>- 403: Not post owner<br>- 500: Server error |

---

#### 5.2 Place Bid (Đặt giá)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Auction Management |
| **Function Name** | Place Bid |
| **Actor** | Member (Bidder) |
| **Trigger** | User enters bid amount and submits |
| **Description** | Allows user to place bid on active auction. Validates bid amount, checks deposit payment, updates highest bid. |
| **Function Details** | |
| Input | - `auction_id`: integer<br>- `bid_amount`: number<br>- JWT token (user ID) |
| Validation | - Auction must be active (status='active')<br>- Current time between start_time and end_time<br>- Bid amount > current highest bid<br>- User has paid deposit<br>- User cannot bid on own auction |
| Functionality | 1. Check auction status and timing<br>2. Verify user paid deposit<br>3. Validate bid amount > current_price<br>4. Insert bid record<br>5. Update auction current_price and highest_bidder_id<br>6. Send notification to previous highest bidder<br>7. Send notification to seller |
| Output | ```json<br>{<br>  "message": "Đặt giá thành công",<br>  "data": {<br>    "bid_id": 456,<br>    "auction_id": 789,<br>    "bid_amount": 520000000,<br>    "rank": 1<br>  }<br>}``` |
| **API Endpoint** | `POST /api/auction/bid` |
| **Authentication** | Required |
| **Status Codes** | - 201: Success<br>- 400: Invalid bid (too low, auction ended)<br>- 402: Deposit not paid<br>- 403: Cannot bid on own auction<br>- 500: Server error |

---

#### 5.3 Pay Auction Deposit (Thanh toán đặt cọc)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Auction Management |
| **Function Name** | Pay Auction Deposit |
| **Actor** | Member (Bidder) |
| **Trigger** | User clicks "Đặt cọc" and confirms payment |
| **Description** | Creates payment order for auction deposit. Required before user can place bids. |
| **Function Details** | |
| Input | - `auction_id`: integer<br>- JWT token (user ID) |
| Validation | - Auction must exist<br>- User has not paid deposit yet<br>- User is not the seller |
| Functionality | 1. Get auction deposit_amount<br>2. Create order (type: deposit)<br>3. Generate PayOS payment link<br>4. Return checkout URL |
| Output | ```json<br>{<br>  "message": "Tạo link thanh toán đặt cọc",<br>  "data": {<br>    "checkoutUrl": "https://pay.payos.vn/...",<br>    "orderCode": 654321,<br>    "depositAmount": 50000000<br>  }<br>}``` |
| **API Endpoint** | `POST /api/auction/pay-deposit` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 400: Already paid or invalid<br>- 500: Server error |

---

### 6. Contract Management (Quản lý hợp đồng)

#### 6.1 Create Contract (Tạo hợp đồng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Contract Management |
| **Function Name** | Create Digital Contract |
| **Actor** | Admin |
| **Trigger** | Admin creates contract after auction ends or direct sale agreement |
| **Description** | Creates digital contract using DocuSeal API. Sends contract to buyer and seller for electronic signature. |
| **Function Details** | |
| Input | - `order_id`: integer<br>- `buyer_id`: integer<br>- `seller_id`: integer<br>- `product_id`: integer<br>- `deposit_amount`: number |
| Validation | - Order must exist<br>- Buyer and seller must be valid users<br>- Product must exist |
| Functionality | 1. Get buyer, seller, product details<br>2. Prepare contract template data<br>3. Call DocuSeal API to create contract<br>4. Store contract details in database<br>5. Send email to both parties<br>6. Send notifications |
| Output | ```json<br>{<br>  "message": "Tạo hợp đồng thành công",<br>  "data": {<br>    "contract_id": 123,<br>    "docuseal_submission_id": "abc123",<br>    "status": "pending_signature"<br>  }<br>}``` |
| **API Endpoint** | `POST /api/contract/create` |
| **Authentication** | Required (Admin) |
| **Status Codes** | - 201: Success<br>- 400: Invalid data<br>- 500: DocuSeal error |

---

#### 6.2 Sign Contract (Ký hợp đồng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Contract Management |
| **Function Name** | Sign Contract via DocuSeal |
| **Actor** | Member (Buyer or Seller) |
| **Trigger** | User receives email, clicks link to sign contract |
| **Description** | Redirects user to DocuSeal signing page. After both parties sign, system processes deposit transfer and completes transaction. |
| **Function Details** | |
| Input | - DocuSeal signature webhook payload |
| Functionality (When both signed) | 1. Verify both parties signed<br>2. Update contract status to 'signed'<br>3. **Transfer deposit from winner to seller:**<br>   - Decrease winner's credit by deposit_amount<br>   - Increase seller's credit by deposit_amount<br>   - Log 2 transaction_detail records (Decrease, Increase)<br>4. Update product status to 'sold'<br>5. Update order tracking to 'DEALING_SUCCESS'<br>6. Send completion notifications to both parties |
| Output (Webhook) | ```json<br>{<br>  "success": true,<br>  "message": "Contract signed successfully"<br>}``` |
| **API Endpoint** | `POST /api/contract/docuseal-webhook` |
| **Authentication** | DocuSeal webhook signature |
| **Status Codes** | - 200: Success<br>- 400: Invalid signature<br>- 500: Processing error |

---

### 7. Admin Functions

#### 7.1 Approve/Reject Post (Duyệt/Từ chối tin đăng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Admin Management |
| **Function Name** | Moderate Post |
| **Actor** | Admin |
| **Trigger** | Admin reviews pending post and clicks Approve/Reject |
| **Description** | Allows admin to approve or reject user posts. Tracks rejection count. After 2 rejections, post is permanently banned. |
| **Function Details** | |
| Input | - `post_id`: integer (path param)<br>- `status`: enum (approved, rejected)<br>- `reason`: string (required if rejected) |
| Validation | - Post must exist<br>- Status must be valid<br>- Reason required for rejection |
| Functionality | **For Approved:**<br>1. Update post status to 'approved'<br>2. Send notification to seller<br><br>**For Rejected:**<br>- **First rejection (reject_count=0):**<br>  1. Set reject_count = 1<br>  2. Update rejected_reason<br>  3. Status stays 'rejected'<br>  4. Send notification with reason<br><br>- **Second rejection (reject_count=1):**<br>  1. Set reject_count = 2<br>  2. Set is_finally_rejected = 1<br>  3. Status = 'banned'<br>  4. Send final rejection notification<br><br>- **Attack prevention (reject_count>=2):**<br>  1. Return error "Hành động nghi ngờ tấn công" |
| Output | ```json<br>{<br>  "message": "Cập nhật trạng thái bài viết thành công",<br>  "data": {<br>    "post_id": 123,<br>    "status": "approved",<br>    "reject_count": 0<br>  }<br>}``` |
| **API Endpoint** | `PUT /api/post/update-post-by-admin/:id` |
| **Authentication** | Required (Admin role) |
| **Status Codes** | - 200: Success<br>- 400: Invalid action or attack attempt<br>- 404: Post not found<br>- 500: Server error |

---

#### 7.2 Manage Users (Quản lý người dùng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Admin Management |
| **Function Name** | List & Manage Users |
| **Actor** | Admin |
| **Trigger** | Admin navigates to user management page |
| **Description** | Lists all users with search and filter options. Allows admin to view, activate, deactivate user accounts. |
| **Function Details** | |
| Input | - `page`: integer<br>- `limit`: integer<br>- `search`: string (name, email, phone) |
| Functionality | 1. Query all users with pagination<br>2. Apply search filter<br>3. Return user list with stats |
| Output | ```json<br>{<br>  "success": true,<br>  "users": [<br>    {<br>      "id": 1,<br>      "full_name": "John Doe",<br>      "email": "john@example.com",<br>      "phone": "+84912345678",<br>      "status": "active",<br>      "role": "member",<br>      "total_credit": 100000,<br>      "reputation": 0<br>    }<br>  ]<br>}``` |
| **API Endpoint** | `GET /api/user/get-all-users` |
| **Authentication** | Required (Admin role) |
| **Status Codes** | - 200: Success<br>- 500: Server error |

---

#### 7.3 View Revenue Analytics (Xem thống kê doanh thu)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Admin Management |
| **Function Name** | Revenue Analytics Dashboard |
| **Actor** | Admin |
| **Trigger** | Admin opens analytics/dashboard page |
| **Description** | Displays revenue statistics including total revenue, daily revenue for last 7 days, revenue by category, popular services. |
| **Function Details** | |
| Input | - Date range (optional)<br>- Category filter (optional) |
| Functionality | 1. Calculate total revenue from orders (PAID status)<br>2. Get daily revenue for last 7 days<br>3. Revenue breakdown by service type<br>4. Most purchased packages<br>5. Transaction volume metrics |
| Output | ```json<br>{<br>  "totalRevenue": 50000000,<br>  "dailyRevenue": [<br>    { "date": "2025-11-05", "revenue": 5000000 },<br>    { "date": "2025-11-06", "revenue": 8000000 }<br>  ],<br>  "revenueByCategory": {<br>    "topup": 20000000,<br>    "package": 15000000,<br>    "auction_fee": 10000000<br>  },<br>  "popularPackages": [<br>    { "name": "Gói cơ bản", "sold": 120, "revenue": 12000000 }<br>  ]<br>}``` |
| **API Endpoint** | `GET /api/admin/revenue` |
| **Authentication** | Required (Admin role) |
| **Status Codes** | - 200: Success<br>- 500: Server error |

---

### 8. Additional Features

#### 8.1 Favorite Posts (Yêu thích tin đăng)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | User Features |
| **Function Name** | Add/Remove Favorite |
| **Actor** | Member |
| **Trigger** | User clicks favorite/heart icon on post |
| **Description** | Allows user to save posts to favorites list for later viewing. |
| **Function Details** | |
| Input | - `post_id`: integer<br>- JWT token (user ID) |
| Functionality | 1. Check if already favorited<br>2. If yes: Remove from favorites<br>3. If no: Add to favorites<br>4. Return updated favorite status |
| Output | ```json<br>{<br>  "message": "Đã thêm vào yêu thích",<br>  "is_favorite": true<br>}``` |
| **API Endpoint** | `POST /api/favorite/toggle` |
| **Authentication** | Required |
| **Status Codes** | - 200: Success<br>- 404: Post not found<br>- 500: Server error |

---

#### 8.2 AI Price Suggestion (Gợi ý giá AI)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | AI Integration |
| **Function Name** | Get AI Price Estimate |
| **Actor** | Member, Guest |
| **Trigger** | System automatically generates when creating post or viewing post details |
| **Description** | Uses Gemini AI to analyze product specs and suggest price range based on market data. Currently disabled but can be re-enabled. |
| **Function Details** | |
| Input | - Product details (brand, model, year, condition, specs) |
| Functionality | 1. Build prompt with product info<br>2. Call Gemini API<br>3. Parse AI response<br>4. Extract min/max price<br>5. Return price range |
| Output | ```json<br>{<br>  "ai_suggestion": {<br>    "min_price": "200000000",<br>    "max_price": "400000000"<br>  }<br>}``` |
| **API Endpoint** | Internal function (used in post creation/viewing) |
| **Status** | Currently disabled (GEMINI_API_KEY commented out) |

---

#### 8.3 Notifications (Thông báo)

| **Attribute** | **Details** |
|---------------|-------------|
| **Feature** | Notification System |
| **Function Name** | Get User Notifications |
| **Actor** | Member |
| **Trigger** | User opens notifications dropdown or page |
| **Description** | Displays system notifications for user actions (post approved/rejected, bid updates, payment confirmations, contract events). |
| **Function Details** | |
| Input | - JWT token (user ID)<br>- `page`: integer<br>- `limit`: integer |
| Functionality | 1. Get notifications for user_id<br>2. Mark as read when viewed<br>3. Return paginated list |
| Output | ```json<br>{<br>  "notifications": [<br>    {<br>      "id": 1,<br>      "type": "post_approved",<br>      "title": "Bài đăng được duyệt",<br>      "message": "Bài đăng 'Tesla Model 3' đã được duyệt",<br>      "is_read": false,<br>      "created_at": "2025-11-11T10:00:00Z"<br>    }<br>  ],<br>  "unread_count": 5<br>}``` |
| **API Endpoint** | `GET /api/notification/list` |
| **Authentication** | Required |
| **Real-time** | Uses Socket.IO for instant notifications |
| **Status Codes** | - 200: Success<br>- 500: Server error |

---

## III. Business Rules

### Payment & Credit System
1. **Credit Balance**: Users maintain credit balance for purchasing packages/services
2. **Package Quota**: Purchased packages add quota to user_packages table with expiry date
3. **Post Deduction**: Each post creation deducts 1 from remaining_amount in user_packages
4. **Topup Minimum**: Minimum topup amount is 1,000 VND
5. **Refund Policy**: Deposits are refunded to losing bidders after auction ends

### Post Moderation
1. **Approval Flow**: Posts start as 'pending' → Admin approves/rejects
2. **Rejection Limit**: Users get 1 chance to resubmit rejected posts
3. **Permanent Ban**: After 2 rejections, post is permanently banned
4. **Auto-expire**: Posts expire after end_date (configurable per package)

### Auction Rules
1. **Deposit Required**: Bidders must pay deposit before bidding
2. **Bid Increment**: Each bid must be higher than current highest bid
3. **Winner Selection**: Highest bidder at end_time wins
4. **Deposit Transfer**: Winner's deposit transfers to seller when contract signed
5. **Refund Losers**: Non-winning bidders receive deposit refund

### Contract & Transaction
1. **Digital Signature**: Both parties must sign via DocuSeal
2. **Deposit Transfer**: Only transfers when contract fully signed
3. **Transaction Logging**: All credit movements logged in transaction_detail
4. **Final Status**: Product marked 'sold' after contract completion

---

## IV. API Authentication

### JWT Bearer Token
- All authenticated endpoints require `Authorization: Bearer <token>` header
- Access token expires in 1 hour
- Refresh token expires in 7 days
- Use `/api/user/refresh-token` to get new access token

### Role-based Access
- **Guest**: View public posts, post details
- **Member**: Create posts, bid, buy packages, manage profile
- **Admin**: Approve posts, manage users, view analytics

---

## V. Database Schema Reference

### Key Tables
- **users**: User accounts, credit balance, roles
- **posts**: Post listings with status tracking
- **products**: Product details (brand, model, price)
- **vehicles**: Vehicle-specific attributes
- **batteries**: Battery-specific attributes
- **services**: Service packages and pricing
- **user_packages**: User quota tracking with expiry
- **orders**: Payment orders and tracking
- **transaction_detail**: Credit movement logs
- **auctions**: Auction sessions
- **bids**: Bid history
- **contracts**: Digital contract records
- **notifications**: User notification queue

---

## VI. External Integrations

### PayOS Payment Gateway
- **Purpose**: Process online payments (topup, packages, deposits)
- **Webhook**: `/api/payment/payos-webhook`
- **Payment Methods**: e-wallet, banking
- **Currency**: VND

### DocuSeal E-Signature
- **Purpose**: Digital contract signing
- **Webhook**: `/api/contract/docuseal-webhook`
- **Template**: Pre-configured contract template
- **Signers**: Buyer and Seller

### Gemini AI (Currently Disabled)
- **Purpose**: Price suggestion based on market analysis
- **Model**: gemini-1.5-flash
- **Language**: Vietnamese
- **Scope**: EV and battery pricing only

### Cloudinary
- **Purpose**: Image upload and storage
- **Formats**: JPEG, PNG, WebP
- **Max Size**: Configurable
- **CDN**: Automatic optimization and delivery

---

## VII. Error Handling

### Common Error Codes
- **400**: Bad Request (validation errors, missing required fields)
- **401**: Unauthorized (invalid/missing token)
- **402**: Payment Required (insufficient credit/quota)
- **403**: Forbidden (access denied, not owner)
- **404**: Not Found (resource doesn't exist)
- **422**: Unprocessable Entity (business logic violation)
- **500**: Internal Server Error (system errors)

### Error Response Format
```json
{
  "success": false,
  "message": "Detailed error message in Vietnamese",
  "errors": {
    "field_name": "Field-specific error"
  }
}
```

---

**Document End**

*For API testing and detailed request/response examples, refer to Swagger documentation at `/api-docs` endpoint.*
