# Medicare App - Integration Guide

## 🚀 გაშვებული სერვისები

### 1. Backend API
- **URL**: `http://localhost:4000`
- **Swagger Docs**: `http://localhost:4000/docs`
- **Health Check**: `http://localhost:4000/health`
- **გაშვება**: 
  ```bash
  cd backend/api
  npm run start:dev
  ```

### 2. Admin Panel (Next.js)
- **URL**: `http://localhost:3000`
- **გაშვება**:
  ```bash
  cd /Users/gio/Downloads/nextjs-admin-dashboard-main
  npm run dev
  ```
- **API Configuration**: 
  - შექმენით `.env.local` ფაილი:
    ```
    NEXT_PUBLIC_API_URL=http://localhost:4000
    ```

### 3. Mobile App (Expo)
- **გაშვება**:
  ```bash
  cd /Users/gio/Documents/Medicare
  npm start
  ```
- **API Configuration**: 
  - `app/services/api.ts` - `USE_MOCK_API = false` (უკვე განახლებულია)
  - `API_BASE_URL` ავტომატურად არის კონფიგურირებული

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - რეგისტრაცია
- `POST /auth/login` - ავტორიზაცია
- `POST /auth/refresh` - token-ის განახლება
- `POST /auth/logout` - გასვლა

### Profile
- `GET /profile` - პროფილის მიღება (Auth required)
- `PUT /profile` - პროფილის განახლება (Auth required)
- `POST /profile/image` - პროფილის სურათის ატვირთვა (Auth required)

### Doctors
- `GET /doctors` - ექიმების სია (Public)
- `GET /doctors/:id` - ექიმის დეტალები (Public)
- `GET /doctors/:id/availability` - ხელმისაწვდომობა (Public)
- `PUT /doctors/availability` - ხელმისაწვდომობის განახლება (Doctor only)

## 🔧 Configuration

### Backend CORS
Backend-ი მხარდაჭერას უწევს შემდეგ origins-ებს:
- `http://localhost:3000` - Admin Panel
- `http://localhost:3001` - Admin Panel (alternative)
- `http://localhost:19000-19002` - Expo
- `http://192.168.100.6:3000-3001` - Network IP
- `http://192.168.100.6:19000-19002` - Expo Network

### Mobile App API
- **iOS**: `http://192.168.100.6:4000`
- **Android**: `http://10.0.2.2:4000`
- **Mock Mode**: `false` (რეალური backend გამოიყენება)

## 📝 შემდეგი ნაბიჯები

1. ✅ Backend API - მუშაობს
2. ✅ Admin Panel - მუშაობს
3. ✅ Mobile App - მზადაა გაშვებისთვის
4. ⏳ Appointments Module - დასამატებელია
5. ⏳ Products Module - დასამატებელია
6. ⏳ Cart & Orders Module - დასამატებელია

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:4000/health
```

### Test Doctors Endpoint
```bash
curl http://localhost:4000/doctors?page=1&limit=5
```

### Test with Authentication
```bash
# 1. Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 2. Use token for authenticated requests
curl http://localhost:4000/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📚 Documentation

- **Backend API Docs**: http://localhost:4000/docs (Swagger)
- **Backend Specifications**: `BACKEND_SPECIFICATIONS.md`
- **Missing Features**: `BACKEND_MISSING_FEATURES.md`

