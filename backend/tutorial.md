# HPK GO - Hướng Dẫn Sử Dụng

> Version: 2.0.0 | Updated: 2026-02-11

---

## 1. Yêu Cầu Hệ Thống

- **Node.js** >= 18.x
- **PostgreSQL** >= 13 (hoặc Neon PostgreSQL)
- **Redis** >= 3.2 (hoặc Upstash Redis)
- **npm** >= 9.x

---

## 2. Cài Đặt

### 2.1 Clone & Install

```bash
cd backend
npm install
```

### 2.2 Cấu Hình Environment

Copy `.env.example` thành `.env` và điền thông tin:

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=booking_vehicle
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

### 2.3 Khởi Tạo Database

```bash
# Tạo schema + seed roles/permissions
npm run migrate:up

# Seed dữ liệu mẫu (driver, passenger)
npm run seed:up
```

**Hoặc chạy tất cả cùng lúc:**
```bash
npm run db:setup
```

**Reset toàn bộ database:**
```bash
npm run db:reset
```

---

## 3. Chạy Server

### Development (auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

Server sẽ chạy tại `http://localhost:3000`.

Kiểm tra: `GET http://localhost:3000/api/health`

---

## 4. Cấu Trúc Thư Mục

```
backend/
├── src/
│   ├── config/          # Cấu hình hệ thống
│   │   ├── env.js       # Biến môi trường
│   │   ├── database.js  # PostgreSQL pool
│   │   ├── redis.js     # Redis client
│   │   └── socket.js    # Socket.io config
│   ├── routes/          # Định tuyến API
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── driver.routes.js
│   │   ├── passenger.routes.js
│   │   └── trip.routes.js
│   ├── controllers/     # Xử lý request/response
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── driver.controller.js
│   │   ├── passenger.controller.js
│   │   └── trip.controller.js
│   ├── services/        # Business logic
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── driver.service.js
│   │   ├── passenger.service.js
│   │   ├── trip.service.js
│   │   └── dispatch.service.js
│   ├── models/          # Database query layer
│   │   ├── user.model.js
│   │   ├── driver.model.js
│   │   ├── passenger.model.js
│   │   └── trip.model.js
│   ├── sockets/         # Socket.io event handlers
│   │   ├── socket.handler.js
│   │   └── trip.socket.js
│   ├── middlewares/      # Middleware
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validate.middleware.js
│   ├── utils/           # Helper functions
│   │   ├── logger.js
│   │   ├── response.js
│   │   └── jwt.js
│   ├── app.js           # Express app setup
│   └── server.js        # HTTP + Socket entry point
├── migrations/          # Database migrations
│   ├── 20260211_001_init_hybrid_rbac_schema.js
│   └── 20260211_002_seed_sample_data.js
├── .env
├── .env.example
├── package.json
├── document.md          # API documentation
├── tutorial.md          # Hướng dẫn này
└── test.md              # Kịch bản kiểm thử
```

---

## 5. Luồng Hoạt Động

### 5.1 Đăng Ký & Đăng Nhập

1. Passenger/Driver gọi `POST /api/auth/register` với `{ name, email, password, role }`
2. Hệ thống tạo account, gán role, tạo profile, trả về JWT token
3. Đăng nhập: `POST /api/auth/login` → nhận token
4. Sử dụng token trong header: `Authorization: Bearer <token>`

### 5.2 Luồng Đặt Xe (Socket.io)

```
Passenger                    Server                     Driver
    │                          │                          │
    │  passenger:request_trip  │                          │
    │─────────────────────────>│                          │
    │                          │  (tìm driver gần nhất)   │
    │  trip:searching          │                          │
    │<─────────────────────────│                          │
    │                          │  trip:request             │
    │                          │─────────────────────────>│
    │                          │                          │
    │                          │  driver:accept_trip       │
    │                          │<─────────────────────────│
    │  trip:accepted           │                          │
    │<─────────────────────────│  trip:confirmed           │
    │                          │─────────────────────────>│
    │                          │                          │
    │  driver:location_update  │  driver:update_location   │
    │<─────────────────────────│<─────────────────────────│
    │                          │                          │
    │                          │  driver:arrived           │
    │  trip:driver_arrived     │<─────────────────────────│
    │<─────────────────────────│                          │
    │                          │                          │
    │                          │  driver:start_trip        │
    │  trip:started            │<─────────────────────────│
    │<─────────────────────────│                          │
    │                          │                          │
    │                          │  driver:finish_trip       │
    │  trip:finished           │<─────────────────────────│
    │<─────────────────────────│                          │
```

### 5.3 Cascading Dispatch

Khi passenger yêu cầu chuyến:
1. Server tìm tài xế gần nhất (bán kính 1km → 3km → 5km)
2. Gửi yêu cầu cho tài xế gần nhất
3. Nếu tài xế từ chối hoặc timeout (15s) → gửi cho tài xế tiếp theo
4. Nếu hết tài xế → thông báo `trip:no_driver`

---

## 6. Hybrid RBAC

### Cấu trúc quyền

- **Roles**: ADMIN, DRIVER, PASSENGER
- **Permissions**: `user:read`, `user:write`, `driver:read`, `trip:create`, ...
- Account có thể có **nhiều roles** (qua `account_roles`)
- Role có **nhiều permissions** (qua `role_permissions`)
- Account có thể được gán **permission trực tiếp** (qua `account_permissions`)

### Kiểm tra quyền

```
Quyền cuối cùng = Permissions từ Roles + Permissions trực tiếp
```

### Middleware sử dụng

```js
// Kiểm tra role
requireRole('ADMIN')
requireRole('DRIVER', 'ADMIN')  // OR logic

// Kiểm tra permission cụ thể
requirePermission('trip:create')
requirePermission('user:write', 'user:delete')  // OR logic
```

---

## 7. Tài Khoản Mẫu (sau khi seed)

| Email | Password | Role |
|-------|----------|------|
| driver1@test.com | 123456 | DRIVER |
| driver2@test.com | 123456 | DRIVER |
| passenger1@test.com | 123456 | PASSENGER |

---

## 8. Scripts

| Script | Mô tả |
|--------|--------|
| `npm start` | Chạy server production |
| `npm run dev` | Chạy server dev (nodemon) |
| `npm run migrate:up` | Tạo schema database |
| `npm run migrate:down` | Xóa toàn bộ schema |
| `npm run seed:up` | Seed dữ liệu mẫu |
| `npm run seed:down` | Xóa dữ liệu mẫu |
| `npm run db:setup` | migrate:up + seed:up |
| `npm run db:reset` | Xóa & tạo lại toàn bộ |
