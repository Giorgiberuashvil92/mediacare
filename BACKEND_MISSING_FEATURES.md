# Medicare Backend - გამოტოვებული ფუნქციები

## 📋 მიმოხილვა

ეს დოკუმენტი შეიცავს სრულ სიას იმ ფუნქციებისა, რომლებიც აკლია backend API-ს სპეციფიკაციის მიხედვით.

---

## ✅ რა არის გაკეთებული

1. **Authentication Module** (ნაწილობრივ)
   - ✅ User Registration (`POST /auth/register`)
   - ✅ User Login (`POST /auth/login`)
   - ✅ Refresh Token (`POST /auth/refresh`)
   - ✅ Logout (`POST /auth/logout`)
   - ✅ JWT Authentication Guard
   - ✅ User Schema (MongoDB/Mongoose)
   - ✅ Refresh Token Schema

2. **Upload Module** (ნაწილობრივ)
   - ✅ License Document Upload (`POST /upload/license`)

3. **Infrastructure**
   - ✅ MongoDB Connection
   - ✅ CORS Configuration
   - ✅ Swagger Documentation
   - ✅ Rate Limiting
   - ✅ Validation Pipes
   - ✅ Static File Serving

---

## ❌ რა აკლია

### 1. Authentication & User Management

#### 1.1 Social Login
- ❌ `POST /auth/social-login` - Google/Facebook login
- **საჭიროა:**
  - Social login service integration
  - OAuth providers configuration
  - User creation/update logic for social users

#### 1.2 Password Recovery
- ❌ `POST /auth/forgot-password` - Send password reset email
- ❌ `POST /auth/reset-password` - Reset password with token
- **საჭიროა:**
  - Password reset token schema
  - Email service integration
  - Token generation and validation

---

### 2. User Profile Management

#### 2.1 Profile Endpoints
- ❌ `GET /profile` - Get user profile
- ❌ `PUT /profile` - Update user profile
- ❌ `POST /profile/image` - Upload profile image
- **საჭიროა:**
  - Profile controller
  - Profile service
  - Profile module
  - Address schema/field in User model
  - Image upload handling

---

### 3. Doctor Management

#### 3.1 Doctor Endpoints
- ❌ `GET /doctors` - Get all doctors (with filters)
- ❌ `GET /doctors/:id` - Get doctor by ID
- ❌ `GET /doctors/:id/availability` - Get doctor availability
- ❌ `PUT /doctors/availability` - Update doctor availability (Doctor only)
- **საჭიროა:**
  - Doctors controller
  - Doctors service
  - Doctors module
  - Availability schema
  - Pagination logic
  - Filtering and search logic
  - Reviews aggregation

---

### 4. Appointment Management

#### 4.1 Appointment Endpoints
- ❌ `POST /appointments` - Book appointment
- ❌ `GET /appointments` - Get user appointments
- ❌ `GET /appointments/:id` - Get appointment details
- ❌ `PUT /appointments/:id/cancel` - Cancel appointment
- ❌ `PUT /appointments/:id/reschedule` - Reschedule appointment
- ❌ `GET /doctors/appointments` - Get doctor appointments
- **საჭიროა:**
  - Appointments controller
  - Appointments service
  - Appointments module
  - Appointment schema
  - Appointment number generation
  - Status management
  - Patient details handling
  - Documents handling
  - Payment integration

---

### 5. Product & Medicine Management

#### 5.1 Product Endpoints
- ❌ `GET /products/categories` - Get product categories
- ❌ `GET /products/category/:categoryId` - Get products by category
- ❌ `GET /products/popular` - Get popular products
- ❌ `GET /products/:id` - Get product details
- ❌ `GET /products/search` - Search products
- **საჭიროა:**
  - Products controller
  - Products service
  - Products module
  - Product schema
  - Category schema
  - Pagination
  - Sorting and filtering
  - Search functionality

---

### 6. Cart & Order Management

#### 6.1 Cart Endpoints
- ❌ `POST /cart/add` - Add to cart
- ❌ `GET /cart` - Get cart items
- ❌ `PUT /cart/:itemId` - Update cart item quantity
- ❌ `DELETE /cart/:itemId` - Remove from cart
- ❌ `DELETE /cart` - Clear cart

#### 6.2 Order Endpoints
- ❌ `POST /orders` - Create order
- ❌ `GET /orders` - Get user orders
- ❌ `GET /orders/:id` - Get order details
- ❌ `PUT /orders/:id/cancel` - Cancel order
- **საჭიროა:**
  - Cart controller
  - Cart service
  - Cart module
  - Cart schema
  - Orders controller
  - Orders service
  - Orders module
  - Order schema
  - Order number generation
  - Shipping address handling
  - Order status management

---

### 7. Favorites Management

#### 7.1 Favorites Endpoints
- ❌ `POST /favorites/doctors` - Add doctor to favorites
- ❌ `GET /favorites/doctors` - Get favorite doctors
- ❌ `DELETE /favorites/doctors/:doctorId` - Remove doctor from favorites
- **საჭიროა:**
  - Favorites controller
  - Favorites service
  - Favorites module
  - Favorites schema (many-to-many relationship)

---

### 8. Reviews & Ratings

#### 8.1 Review Endpoints
- ❌ `POST /reviews` - Add review
- ❌ `GET /doctors/:id/reviews` - Get doctor reviews
- **საჭიროა:**
  - Reviews controller
  - Reviews service
  - Reviews module
  - Review schema
  - Rating calculation logic
  - Review aggregation for doctors

---

### 9. Payment Management

#### 9.1 Payment Endpoints
- ❌ `GET /payment/methods` - Get payment methods
- ❌ `POST /payment/process` - Process payment
- **საჭიროა:**
  - Payment controller
  - Payment service
  - Payment module
  - Payment method schema
  - Payment processing logic
  - Payment gateway integration (Stripe, PayPal, etc.)
  - Payment status tracking

---

### 10. Notifications

#### 10.1 Notification Endpoints
- ❌ `GET /notifications` - Get notifications
- ❌ `PUT /notifications/:id/read` - Mark notification as read
- ❌ `PUT /notifications/read-all` - Mark all notifications as read
- **საჭიროა:**
  - Notifications controller
  - Notifications service
  - Notifications module
  - Notification schema
  - Real-time notification system (WebSocket/Socket.io)
  - Push notification integration

---

### 11. File Upload (გაფართოება)

#### 11.1 Generic File Upload
- ❌ `POST /upload` - Generic file upload (not just license)
- **საჭიროა:**
  - Generic upload endpoint
  - Multiple file type support
  - File validation for different types
  - File size limits

---

### 12. Admin Endpoints

#### 12.1 Admin Endpoints
- ❌ `GET /admin/users` - Get all users
- ❌ `GET /admin/stats` - Get system statistics
- **საჭიროა:**
  - Admin controller
  - Admin service
  - Admin module
  - Admin role/guard
  - Statistics aggregation

---

## 📊 Database Schemas რომლებიც აკლია

### 1. Appointment Schema
```typescript
- id (UUID)
- appointmentNumber (String, Unique)
- doctorId (ObjectId, Ref: User)
- patientId (ObjectId, Ref: User)
- appointmentDate (Date)
- appointmentTime (String)
- status (Enum: 'confirmed', 'completed', 'cancelled')
- consultationFee (Number)
- totalAmount (Number)
- paymentMethod (String)
- patientDetails (Object)
- documents (Array)
- createdAt (Date)
- updatedAt (Date)
```

### 2. Product Schema
```typescript
- id (UUID)
- name (String)
- description (String)
- price (Number)
- oldPrice (Number)
- discount (String)
- image (String)
- weight (String)
- categoryId (ObjectId, Ref: Category)
- inStock (Boolean)
- stockQuantity (Number)
- rating (Number)
- reviewCount (Number)
- createdAt (Date)
- updatedAt (Date)
```

### 3. Category Schema
```typescript
- id (UUID)
- name (String)
- bgColor (String)
- image (String)
- createdAt (Date)
- updatedAt (Date)
```

### 4. Cart Schema
```typescript
- id (UUID)
- userId (ObjectId, Ref: User)
- items (Array of CartItem)
- createdAt (Date)
- updatedAt (Date)

CartItem:
- productId (ObjectId, Ref: Product)
- quantity (Number)
```

### 5. Order Schema
```typescript
- id (UUID)
- orderNumber (String, Unique)
- userId (ObjectId, Ref: User)
- items (Array of OrderItem)
- status (Enum: 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
- totalAmount (Number)
- shippingAddress (Object)
- paymentMethod (String)
- paymentStatus (Enum: 'pending', 'paid', 'failed')
- createdAt (Date)
- updatedAt (Date)

OrderItem:
- productId (ObjectId, Ref: Product)
- quantity (Number)
- price (Number)
```

### 6. Favorite Schema
```typescript
- id (UUID)
- userId (ObjectId, Ref: User)
- doctorId (ObjectId, Ref: User)
- createdAt (Date)
```

### 7. Review Schema
```typescript
- id (UUID)
- doctorId (ObjectId, Ref: User)
- patientId (ObjectId, Ref: User)
- appointmentId (ObjectId, Ref: Appointment)
- rating (Number, 1-5)
- comment (String)
- createdAt (Date)
- updatedAt (Date)
```

### 8. Availability Schema
```typescript
- id (UUID)
- doctorId (ObjectId, Ref: User)
- date (Date)
- timeSlots (Array of String)
- isAvailable (Boolean)
- createdAt (Date)
- updatedAt (Date)
```

### 9. Notification Schema
```typescript
- id (UUID)
- userId (ObjectId, Ref: User)
- type (Enum: 'appointment', 'order', 'general')
- title (String)
- message (String)
- isRead (Boolean)
- createdAt (Date)
```

### 10. Password Reset Token Schema
```typescript
- id (UUID)
- userId (ObjectId, Ref: User)
- token (String, Unique)
- expiresAt (Date)
- used (Boolean)
- createdAt (Date)
```

### 11. Payment Method Schema
```typescript
- id (UUID)
- name (String)
- type (Enum: 'card', 'paypal', 'apple_pay', 'google_pay')
- isActive (Boolean)
- createdAt (Date)
- updatedAt (Date)
```

---

## 🔧 დამატებითი საჭიროებები

### 1. Services & Integrations
- ❌ Email Service (for password reset, notifications)
- ❌ Payment Gateway Integration (Stripe, PayPal, etc.)
- ❌ Push Notification Service (Firebase, OneSignal, etc.)
- ❌ File Storage Service (AWS S3, Cloudinary, etc.)
- ❌ Social Login Providers (Google, Facebook)

### 2. Middleware & Guards
- ❌ Role-based Guard (Patient/Doctor)
- ❌ Admin Guard
- ❌ File Upload Validation Middleware

### 3. Utilities
- ❌ Pagination utility
- ❌ Response formatter utility
- ❌ Error handler utility
- ❌ Date/time utilities
- ❌ File validation utilities

### 4. User Schema გაფართოება
- ❌ Address field (Object with street, city, state, zipCode, country)
- ❌ licenseNumber field (currently only licenseDocument exists)

---

## 📈 პრიორიტეტები

### მაღალი პრიორიტეტი (კრიტიკული ფუნქციები)
1. Profile Management
2. Doctor Management
3. Appointment Management
4. Product Management
5. Cart & Order Management

### საშუალო პრიორიტეტი
6. Favorites Management
7. Reviews & Ratings
8. Payment Management
9. File Upload გაფართოება

### დაბალი პრიორიტეტი (nice to have)
10. Notifications
11. Social Login
12. Password Recovery
13. Admin Endpoints

---

## 📝 შენიშვნები

1. **Database**: ამჟამად MongoDB გამოიყენება, რაც კარგია. უნდა დავრწმუნდეთ, რომ ყველა schema სწორად არის დაპროექტებული.

2. **Authentication**: JWT authentication უკვე მუშაობს, მაგრამ სჭირდება role-based access control გაფართოება.

3. **File Upload**: არსებობს license upload, მაგრამ საჭიროა generic file upload endpoint.

4. **Error Handling**: უნდა დავრწმუნდეთ, რომ ყველა endpoint აბრუნებს სპეციფიკაციის მიხედვით error responses-ს.

5. **Validation**: class-validator უკვე დაყენებულია, უნდა დავრწმუნდეთ, რომ ყველა DTO სწორად არის validated.

6. **Pagination**: უნდა შევქმნათ reusable pagination utility.

7. **Response Format**: უნდა დავრწმუნდეთ, რომ ყველა response იცავს სპეციფიკაციის format-ს (success, message, data).

---

## 🎯 შემდეგი ნაბიჯები

1. შექმნა Profile Module
2. შექმნა Doctors Module
3. შექმნა Appointments Module
4. შექმნა Products Module
5. შექმნა Cart & Orders Module
6. შექმნა Favorites Module
7. შექმნა Reviews Module
8. შექმნა Payment Module
9. შექმნა Notifications Module
10. გაფართოება Upload Module
11. დამატება Password Recovery
12. დამატება Social Login
13. დამატება Admin Module

---

ეს დოკუმენტი განახლდება როგორც კი დაიწყება ახალი ფუნქციების დამატება.

