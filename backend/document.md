# HPK GO - API Documentation

> Version: 2.0.0 | Updated: 2026-02-11

---

## Base URL

```
http://localhost:3000/api
```

## Authentication

Tất cả API (trừ `/auth/register`, `/auth/login`, `/health`) yêu cầu header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Health Check

### `GET /api/health`

**Response:**
```json
{
  "success": true,
  "message": "HPK GO API is running",
  "timestamp": "2026-02-11T04:00:00.000Z"
}
```

---

## 2. Authentication

### `POST /api/auth/register`

Đăng ký tài khoản mới.

**Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | Tên người dùng |
| email | string | ✅ | Email (unique) |
| password | string | ✅ | Mật khẩu (≥ 6 ký tự) |
| role | string | ✅ | `PASSENGER` hoặc `DRIVER` |
| vehicle_type | string | ❌ | Loại xe (chỉ DRIVER) |
| plate_number | string | ❌ | Biển số (chỉ DRIVER) |

**Response (201):**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": { "id": "uuid", "name": "...", "email": "...", "created_at": "..." },
    "token": "jwt_token"
  }
}
```

### `POST /api/auth/login`

Đăng nhập.

**Body:**
| Field | Type | Required |
|-------|------|----------|
| email | string | ✅ |
| password | string | ✅ |

**Response (200):**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": { "id": "uuid", "name": "...", "email": "..." },
    "role": "DRIVER",
    "roles": ["DRIVER"],
    "profile": { "vehicle_type": "...", "plate_number": "...", "status": "OFFLINE" },
    "token": "jwt_token"
  }
}
```

### `GET /api/auth/me`

Lấy thông tin user hiện tại. **Yêu cầu auth.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "...", "email": "..." },
    "role": "PASSENGER",
    "roles": ["PASSENGER"],
    "permissions": ["passenger:read", "passenger:write", "trip:read", "trip:create", "trip:cancel"],
    "profile": { "default_payment_method": "CASH" }
  }
}
```

---

## 3. Users (Admin)

### `GET /api/users`
Lấy tất cả accounts. **Yêu cầu role ADMIN.**

### `GET /api/users/:id`
Lấy account theo ID. **Yêu cầu auth.**

### `PUT /api/users/:id`
Cập nhật account. **Yêu cầu auth** (chỉ chính mình hoặc ADMIN).

**Body:** `{ "name": "...", "phone": "..." }`

### `GET /api/users/:id/roles`
Lấy danh sách roles của account.

### `GET /api/users/:id/permissions`
Lấy danh sách permissions (từ roles + trực tiếp).

### `POST /api/users/:id/roles` (Admin)
Gán role cho account. **Body:** `{ "roleName": "DRIVER" }`

### `DELETE /api/users/:id/roles` (Admin)
Xóa role khỏi account. **Body:** `{ "roleName": "DRIVER" }`

### `POST /api/users/:id/permissions` (Admin)
Gán permission trực tiếp cho account. **Body:** `{ "permissionName": "trip:create" }`

---

## 4. Drivers

### `GET /api/drivers`
Lấy tất cả drivers. **Yêu cầu auth.**

### `GET /api/drivers/online`
Lấy drivers đang online. **Yêu cầu auth.**

### `GET /api/drivers/:id`
Lấy driver theo ID. **Yêu cầu auth.**

### `PUT /api/drivers/profile`
Driver tự cập nhật profile. **Yêu cầu role DRIVER.**

**Body:** `{ "vehicle_type": "Ô tô", "plate_number": "59A-99999" }`

---

## 5. Passengers

### `GET /api/passengers`
Lấy tất cả passengers. **Yêu cầu auth.**

### `GET /api/passengers/:id`
Lấy passenger theo ID. **Yêu cầu auth.**

### `PUT /api/passengers/profile`
Passenger tự cập nhật profile. **Yêu cầu role PASSENGER.**

**Body:** `{ "default_payment_method": "CARD" }`

---

## 6. Trips

### `GET /api/trips/:id`
Lấy trip theo ID. **Yêu cầu auth.**

### `GET /api/trips/active/passenger`
Lấy chuyến đang active của passenger hiện tại. **Yêu cầu role PASSENGER.**

### `GET /api/trips/active/driver`
Lấy chuyến đang active của driver hiện tại. **Yêu cầu role DRIVER.**

### `GET /api/trips/history/me`
Lấy lịch sử chuyến đi (50 gần nhất). **Yêu cầu auth.**

---

## 7. Socket.io Events

### Connection
```js
const socket = io('http://localhost:3000', {
  auth: { token: 'jwt_token' }
});
```

### Driver Events (emit)
| Event | Payload | Description |
|-------|---------|-------------|
| `driver:go_online` | `{ lat, lng }` | Bật online |
| `driver:go_offline` | — | Tắt online |
| `driver:update_location` | `{ lat, lng }` | Cập nhật vị trí |
| `driver:accept_trip` | `{ tripId }` | Chấp nhận chuyến |
| `driver:reject_trip` | `{ tripId }` | Từ chối chuyến |
| `driver:arrived` | `{ tripId }` | Đã đến điểm đón |
| `driver:start_trip` | `{ tripId }` | Bắt đầu chuyến |
| `driver:finish_trip` | `{ tripId }` | Hoàn thành chuyến |

### Passenger Events (emit)
| Event | Payload | Description |
|-------|---------|-------------|
| `passenger:request_trip` | `{ pickupLat, pickupLng, dropoffLat, dropoffLng, distance, duration }` | Yêu cầu chuyến |
| `passenger:cancel_trip` | `{ tripId }` | Hủy chuyến |

### Server Events (listen)
| Event | Payload | Description |
|-------|---------|-------------|
| `driver:status_changed` | `{ status }` | Trạng thái driver thay đổi |
| `trip:request` | `{ tripId, passengerId, pickupLat, ... }` | Yêu cầu chuyến mới (driver nhận) |
| `trip:confirmed` | `{ trip }` | Chuyến đã xác nhận (driver) |
| `trip:accepted` | `{ trip, driver }` | Tài xế đã nhận (passenger) |
| `trip:searching` | `{ tripId, driversCount }` | Đang tìm tài xế |
| `trip:no_driver` | `{ tripId, message }` | Không tìm được tài xế |
| `trip:driver_arrived` | `{ tripId }` | Tài xế đã đến |
| `trip:started` | `{ tripId, trip }` | Chuyến bắt đầu |
| `trip:finished` | `{ tripId, trip }` | Chuyến hoàn thành |
| `trip:cancelled` | `{ tripId }` | Chuyến bị hủy |
| `trip:restored` | `{ trip, driverLocation? }` | Khôi phục chuyến khi reconnect |
| `trip:status_updated` | `{ tripId, status }` | Trạng thái chuyến thay đổi |
| `driver:location_update` | `{ tripId, driverId, lat, lng }` | Vị trí tài xế realtime |

---

## Error Response Format

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errors": null
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad Request - Dữ liệu không hợp lệ |
| 401 | Unauthorized - Chưa xác thực |
| 403 | Forbidden - Không có quyền |
| 404 | Not Found - Không tìm thấy |
| 409 | Conflict - Dữ liệu đã tồn tại |
| 500 | Internal Server Error |

---

## Database Schema (Hybrid RBAC)

```
accounts ──< account_roles >── roles ──< role_permissions >── permissions
    │                                                              │
    └──────────────< account_permissions >─────────────────────────┘
    │
    ├── drivers_profile (1:1)
    ├── passengers_profile (1:1)
    ├── driver_locations (1:1)
    └── trips (1:N as passenger or driver)
```
