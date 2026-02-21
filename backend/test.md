# HPK GO - Kịch Bản Kiểm Thử

> Version: 2.0.0 | Updated: 2026-02-11

---

## 1. Authentication

### TC-AUTH-01: Đăng ký thành công (Passenger)
- **Method:** `POST /api/auth/register`
- **Body:** `{ "name": "Test User", "email": "test@test.com", "password": "123456", "role": "PASSENGER" }`
- **Expected:** 201, trả về `user` + `token`
- **Verify:** Account được tạo trong `accounts`, role PASSENGER được gán trong `account_roles`, profile tạo trong `passengers_profile`

### TC-AUTH-02: Đăng ký thành công (Driver)
- **Method:** `POST /api/auth/register`
- **Body:** `{ "name": "Driver Test", "email": "dtest@test.com", "password": "123456", "role": "DRIVER", "vehicle_type": "Xe máy", "plate_number": "59A-11111" }`
- **Expected:** 201, trả về `user` + `token`
- **Verify:** Profile tạo trong `drivers_profile` với vehicle_type và plate_number

### TC-AUTH-03: Đăng ký email trùng
- **Method:** `POST /api/auth/register`
- **Body:** `{ "name": "Dup", "email": "test@test.com", "password": "123456", "role": "PASSENGER" }`
- **Expected:** 409, message "Email đã được sử dụng"

### TC-AUTH-04: Đăng ký thiếu field
- **Method:** `POST /api/auth/register`
- **Body:** `{ "name": "No Email" }`
- **Expected:** 400, message chứa "Thiếu trường bắt buộc"

### TC-AUTH-05: Đăng ký password ngắn
- **Body:** `{ "name": "Short", "email": "s@t.com", "password": "123", "role": "PASSENGER" }`
- **Expected:** 400, message "Mật khẩu phải có ít nhất 6 ký tự"

### TC-AUTH-06: Đăng nhập thành công
- **Method:** `POST /api/auth/login`
- **Body:** `{ "email": "test@test.com", "password": "123456" }`
- **Expected:** 200, trả về `user`, `role`, `roles`, `profile`, `token`

### TC-AUTH-07: Đăng nhập sai password
- **Body:** `{ "email": "test@test.com", "password": "wrong" }`
- **Expected:** 401, message "Email hoặc mật khẩu không đúng"

### TC-AUTH-08: Đăng nhập email không tồn tại
- **Body:** `{ "email": "noexist@test.com", "password": "123456" }`
- **Expected:** 401

### TC-AUTH-09: GET /api/auth/me với token hợp lệ
- **Header:** `Authorization: Bearer <valid_token>`
- **Expected:** 200, trả về user info + roles + permissions + profile

### TC-AUTH-10: GET /api/auth/me không có token
- **Expected:** 401, message "Token không hợp lệ hoặc thiếu"

### TC-AUTH-11: GET /api/auth/me với token hết hạn
- **Expected:** 401, message "Token hết hạn hoặc không hợp lệ"

---

## 2. Users (RBAC)

### TC-USER-01: GET /api/users với role ADMIN
- **Expected:** 200, danh sách tất cả accounts

### TC-USER-02: GET /api/users với role PASSENGER
- **Expected:** 403, "Bạn không có quyền truy cập (role)"

### TC-USER-03: GET /api/users/:id
- **Expected:** 200, thông tin account

### TC-USER-04: PUT /api/users/:id (chính mình)
- **Body:** `{ "name": "New Name", "phone": "0909999999" }`
- **Expected:** 200, account được cập nhật

### TC-USER-05: PUT /api/users/:id (user khác, không phải ADMIN)
- **Expected:** 403

### TC-USER-06: POST /api/users/:id/roles (ADMIN gán role)
- **Body:** `{ "roleName": "DRIVER" }`
- **Expected:** 200, role được gán

### TC-USER-07: DELETE /api/users/:id/roles (ADMIN xóa role)
- **Body:** `{ "roleName": "DRIVER" }`
- **Expected:** 200, role bị xóa

### TC-USER-08: POST /api/users/:id/permissions (ADMIN gán permission trực tiếp)
- **Body:** `{ "permissionName": "trip:create" }`
- **Expected:** 200

---

## 3. Drivers

### TC-DRV-01: GET /api/drivers
- **Expected:** 200, danh sách drivers với profile

### TC-DRV-02: GET /api/drivers/online
- **Expected:** 200, chỉ drivers có status ONLINE

### TC-DRV-03: GET /api/drivers/:id
- **Expected:** 200, thông tin driver cụ thể

### TC-DRV-04: PUT /api/drivers/profile (role DRIVER)
- **Body:** `{ "vehicle_type": "Ô tô", "plate_number": "59B-99999" }`
- **Expected:** 200, profile được cập nhật

### TC-DRV-05: PUT /api/drivers/profile (role PASSENGER)
- **Expected:** 403

---

## 4. Passengers

### TC-PSG-01: GET /api/passengers
- **Expected:** 200, danh sách passengers

### TC-PSG-02: GET /api/passengers/:id
- **Expected:** 200

### TC-PSG-03: PUT /api/passengers/profile (role PASSENGER)
- **Body:** `{ "default_payment_method": "CARD" }`
- **Expected:** 200

### TC-PSG-04: PUT /api/passengers/profile (role DRIVER)
- **Expected:** 403

---

## 5. Trips

### TC-TRIP-01: GET /api/trips/:id
- **Expected:** 200, thông tin trip đầy đủ (passenger + driver info)

### TC-TRIP-02: GET /api/trips/active/passenger
- **Expected:** 200, trip đang active hoặc null

### TC-TRIP-03: GET /api/trips/active/driver
- **Expected:** 200, trip đang active hoặc null

### TC-TRIP-04: GET /api/trips/history/me
- **Expected:** 200, danh sách trips (max 50)

---

## 6. Socket.io Events

### TC-SOCK-01: Connect với token hợp lệ
- **Expected:** Connection thành công, nhận `trip:restored` nếu có chuyến active

### TC-SOCK-02: Connect không có token
- **Expected:** Connection bị từ chối

### TC-SOCK-03: Driver go online
- **Emit:** `driver:go_online` `{ lat: 10.762, lng: 106.660 }`
- **Expected:** Nhận `driver:status_changed` `{ status: 'ONLINE' }`
- **Verify:** Redis GEO có vị trí, DB `drivers_profile.status = 'ONLINE'`

### TC-SOCK-04: Driver go offline
- **Emit:** `driver:go_offline`
- **Expected:** Nhận `driver:status_changed` `{ status: 'OFFLINE' }`
- **Verify:** Redis GEO đã xóa vị trí

### TC-SOCK-05: Passenger request trip (có driver online)
- **Precondition:** Ít nhất 1 driver ONLINE gần vị trí pickup
- **Emit:** `passenger:request_trip` `{ pickupLat, pickupLng, dropoffLat, dropoffLng, distance, duration }`
- **Expected Passenger:** Nhận `trip:searching`
- **Expected Driver:** Nhận `trip:request`

### TC-SOCK-06: Driver accept trip
- **Emit (driver):** `driver:accept_trip` `{ tripId }`
- **Expected Driver:** Nhận `trip:confirmed`
- **Expected Passenger:** Nhận `trip:accepted` với driver info + location

### TC-SOCK-07: Driver reject trip → cascading
- **Emit (driver):** `driver:reject_trip` `{ tripId }`
- **Expected:** Server gửi `trip:request` cho driver tiếp theo

### TC-SOCK-08: Driver timeout (15s) → cascading
- **Expected:** Sau 15s không phản hồi, server gửi cho driver tiếp theo

### TC-SOCK-09: Tất cả driver từ chối
- **Expected Passenger:** Nhận `trip:no_driver`
- **Verify:** Trip status = CANCELLED

### TC-SOCK-10: Full trip lifecycle
1. Driver go online → 2. Passenger request trip → 3. Driver accept →
4. Driver arrived → 5. Driver start trip → 6. Driver finish trip
- **Verify mỗi bước:** Passenger nhận event tương ứng, DB status cập nhật đúng

### TC-SOCK-11: Passenger cancel trip
- **Emit:** `passenger:cancel_trip` `{ tripId }`
- **Expected Driver:** Nhận `trip:cancelled`
- **Verify:** Trip status = CANCELLED, driver status = ONLINE

### TC-SOCK-12: Driver location broadcast khi đang trên chuyến
- **Precondition:** Trip đang active (ACCEPTED/ARRIVED/ON_TRIP)
- **Emit (driver):** `driver:update_location` `{ lat, lng }`
- **Expected Passenger:** Nhận `driver:location_update`

### TC-SOCK-13: Reconnect restore trip
- **Precondition:** Trip đang active
- **Action:** Disconnect rồi reconnect
- **Expected:** Nhận `trip:restored` với trip info

---

## 7. Migration & Seed

### TC-MIG-01: migrate:up
```bash
npm run migrate:up
```
- **Verify:** Tất cả tables được tạo, roles + permissions được seed

### TC-MIG-02: migrate:down
```bash
npm run migrate:down
```
- **Verify:** Tất cả tables bị xóa

### TC-MIG-03: seed:up
```bash
npm run seed:up
```
- **Verify:** 3 accounts mẫu + roles + profiles

### TC-MIG-04: db:reset
```bash
npm run db:reset
```
- **Verify:** Database sạch, schema mới, data mẫu mới

---

## 8. Error Handling

### TC-ERR-01: Route không tồn tại
- **Method:** `GET /api/nonexistent`
- **Expected:** 404, `{ success: false, message: "Route GET /api/nonexistent không tồn tại" }`

### TC-ERR-02: Invalid JSON body
- **Expected:** 400 hoặc 500 với error message

### TC-ERR-03: Database connection fail
- **Expected:** 500 với error message, server log lỗi
