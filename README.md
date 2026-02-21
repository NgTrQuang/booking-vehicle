# 🚖Booking Vehicle

Hệ thống demo gọi xe giống Grab/Uber sử dụng công nghệ miễn phí.
**Frontend** và **Backend** được tách riêng hoàn toàn để dễ tích hợp và mở rộng.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express + Socket.io |
| **Frontend** | Vite + Vanilla JS + Leaflet.js |
| **Database** | PostgreSQL |
| **Cache/Location** | Redis (GEO) |
| **Map** | OpenStreetMap + Leaflet.js |
| **Routing** | OSRM (Open Source Routing Machine) |
| **Realtime** | WebSocket (Socket.io) |

## 📁 Cấu trúc dự án

```
DEMO_BOOKING_VEHICLE/
├── package.json                  # Root: scripts chạy cả 2
├── README.md
│
├── backend/                      # ⚙️ API + WebSocket Server
│   ├── package.json
│   ├── .env.example
│   ├── docker-compose.yml        # PostgreSQL + Redis
│   └── src/
│       ├── app.js                # Entry point
│       ├── auth/
│       │   ├── auth.controller.js
│       │   ├── auth.service.js
│       │   └── jwt.js
│       ├── users/
│       │   ├── user.controller.js
│       │   └── user.service.js
│       ├── drivers/
│       │   ├── driver.controller.js
│       │   └── driver.service.js
│       ├── passengers/
│       │   ├── passenger.controller.js
│       │   └── passenger.service.js
│       ├── trips/
│       │   ├── trip.controller.js
│       │   ├── trip.service.js
│       │   └── dispatch.service.js
│       ├── realtime/
│       │   └── socket.js
│       ├── redis/
│       │   └── client.js
│       ├── osrm/
│       │   └── osrm.service.js
│       ├── middleware/
│       │   └── auth.middleware.js
│       └── db/
│           ├── connection.js
│           ├── init.js
│           └── seed.js
│
└── frontend/                     # 🖥️ Passenger & Driver UI
    ├── package.json
    ├── vite.config.js
    ├── passenger.html
    ├── driver.html
    └── src/
        ├── config.js             # API URL + Auth helpers
        ├── passenger.js
        ├── driver.js
        └── styles/
            ├── passenger.css
            └── driver.css
```

## �📋 Yêu cầu

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 7

## 🚀 Cài đặt & Chạy

### 1. Cấu hình Backend

```bash
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # Linux/Mac
```

Chỉnh `.env` với credentials PostgreSQL & Redis của bạn.

### 2. Cài dependencies

```bash
# Từ thư mục root
npm run install:all
```

Hoặc cài riêng từng phần:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Khởi tạo Database

```bash
npm run db:init
npm run db:seed
```

### 4. Chạy Backend (Terminal 1)

```bash
npm run dev:backend
```

Backend chạy tại `http://localhost:3000`

### 5. Chạy Frontend (Terminal 2)

```bash
npm run dev:frontend
```

Frontend chạy tại `http://localhost:5173`

### 6. Truy cập

- **Passenger:** http://localhost:5173/passenger.html
- **Driver:** http://localhost:5173/driver.html

## 🔌 Cấu hình kết nối Frontend → Backend

Sửa file `frontend/src/config.js`:

```js
export const API_BASE_URL = 'http://localhost:3000';
export const SOCKET_URL = 'http://localhost:3000';
```

Khi deploy, thay đổi URL tương ứng với server backend.

## 🔐 Tài khoản test (sau khi seed)

| Role | Email | Password |
|------|-------|----------|
| Passenger | passenger1@hpkgo.com | 123456 |
| Passenger | passenger2@hpkgo.com | 123456 |
| Driver | driver1@hpkgo.com | 123456 |
| Driver | driver2@hpkgo.com | 123456 |
| Driver | driver3@hpkgo.com | 123456 |

## 🎮 Hướng dẫn Demo

### Bước 1: Mở tab Tài xế
1. Truy cập `/driver.html`
2. Đăng nhập bằng tài khoản driver (hoặc đăng ký mới)
3. Nhấn vào bản đồ để đặt vị trí
4. Bật **"Bắt đầu nhận chuyến"**

### Bước 2: Mở tab Khách hàng
1. Truy cập `/passenger.html`
2. Đăng nhập bằng tài khoản passenger (hoặc đăng ký mới)
3. Nhấn vào bản đồ chọn **điểm đón** (lần nhấn 1)
4. Nhấn vào bản đồ chọn **điểm đến** (lần nhấn 2)
5. Xem tuyến đường + giá ước tính
6. Bấm **"Đặt xe ngay"**

### Bước 3: Tài xế nhận chuyến
1. Tab tài xế hiện popup chuyến mới
2. Bấm **"Nhận chuyến"**
3. Tài xế tự động di chuyển về phía điểm đón

### Bước 4: Hoàn thành chuyến
1. Tài xế bấm **"Đã đến điểm đón"**
2. Bấm **"Bắt đầu chuyến"**
3. Bấm **"Hoàn thành chuyến"**

## 🗄️ Database Schema

### users
| Column | Type | Note |
|--------|------|------|
| id | UUID (PK) | auto-generated |
| name | VARCHAR(100) | |
| email | VARCHAR(255) UNIQUE | |
| password_hash | VARCHAR(255) | bcrypt |
| role | ENUM | PASSENGER, DRIVER, ADMIN |
| created_at | TIMESTAMP | |

### drivers_profile
| Column | Type | Note |
|--------|------|------|
| user_id | UUID (PK, FK users.id) | |
| vehicle_type | VARCHAR(50) | car, motorbike |
| plate_number | VARCHAR(20) | |
| status | ENUM | OFFLINE, ONLINE, BUSY |

### passengers_profile
| Column | Type | Note |
|--------|------|------|
| user_id | UUID (PK, FK users.id) | |
| default_payment_method | VARCHAR(50) | |

### driver_locations
| Column | Type | Note |
|--------|------|------|
| driver_id | UUID (PK, FK users.id) | |
| lat | DOUBLE PRECISION | |
| lng | DOUBLE PRECISION | |
| updated_at | TIMESTAMP | |

### trips
| Column | Type | Note |
|--------|------|------|
| id | UUID (PK) | auto-generated |
| passenger_id | UUID (FK users.id) | |
| driver_id | UUID (FK users.id) | |
| pickup_lat/lng | DOUBLE PRECISION | |
| dropoff_lat/lng | DOUBLE PRECISION | |
| distance | DOUBLE PRECISION | km |
| duration | DOUBLE PRECISION | minutes |
| status | ENUM | REQUESTED → DRIVER_ASSIGNED → ACCEPTED → ARRIVED → ON_TRIP → COMPLETED |
| created_at | TIMESTAMP | |

## 📡 REST API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | ❌ | Đăng ký user |
| POST | /api/auth/login | ❌ | Đăng nhập, nhận JWT |
| GET | /api/auth/me | ✅ | Thông tin user hiện tại |
| GET | /api/drivers | ✅ | Danh sách tài xế |
| GET | /api/drivers/:id | ✅ | Chi tiết tài xế |
| PUT | /api/drivers/profile | ✅ DRIVER | Cập nhật profile |
| GET | /api/passengers | ✅ | Danh sách khách hàng |
| GET | /api/trips/:id | ✅ | Chi tiết chuyến |
| GET | /api/trips/history/me | ✅ | Lịch sử chuyến |

## ⚡ WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `passenger:request_trip` | Client → Server | Đặt xe |
| `trip:searching` | Server → Passenger | Đang tìm tài xế |
| `trip:request` | Server → Driver | Gửi yêu cầu chuyến |
| `driver:accept_trip` | Client → Server | Nhận chuyến |
| `trip:accepted` | Server → Passenger | Tài xế đã nhận |
| `driver:location_update` | Server → Passenger | Cập nhật vị trí tài xế |
| `driver:arrived` | Client → Server | Đến điểm đón |
| `driver:start_trip` | Client → Server | Bắt đầu chuyến |
| `driver:finish_trip` | Client → Server | Hoàn thành |
| `trip:finished` | Server → Both | Chuyến hoàn tất |

## 🐳 Docker (PostgreSQL + Redis)

```bash
cd backend
docker-compose up -d
```

## 🏗️ Tích hợp & Mở rộng

- **Backend** chỉ expose REST API + WebSocket — dễ thay thế frontend bằng React, Vue, hoặc mobile app
- **Frontend** chỉ cần biết `API_BASE_URL` và `SOCKET_URL` — có thể deploy riêng (Netlify, Vercel...)
- **Auth** dùng JWT Bearer token — socket.io cũng authenticate qua JWT
- **Config** tập trung tại `frontend/src/config.js` và `backend/.env`
