# 🏥 Medicare - Complete Healthcare Management System

A comprehensive healthcare management platform built with modern technologies for patients, doctors, and administrators.

## 📱 System Components

### 1. **Mobile Application** (React Native + Expo)
- **Patient App**: Appointment booking, doctor search, medical records
- **Doctor App**: Patient management, schedule management, consultations
- Cross-platform (iOS & Android)
- Real-time notifications and updates

### 2. **Backend API** (NestJS + MongoDB)
- RESTful API with JWT authentication
- Role-based access control (Patient/Doctor/Admin)
- Real-time appointment management
- File upload and medical records
- Time slot blocking system

### 3. **Admin Panel** (Next.js)
- User management (Patients & Doctors)
- Appointment oversight
- Doctor approval system
- Specializations management
- System analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Expo CLI
- Git

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/Medicare-System.git
cd Medicare-System
```

### 2. Backend Setup
```bash
cd backend/api
npm install
cp env.example .env
# Configure your MongoDB connection and JWT secret
npm run start:dev
```

### 3. Mobile App Setup
```bash
# From project root
npm install
npx expo start
```

### 4. Admin Panel Setup
```bash
cd admin-panel
npm install
npm run dev
```

## 🏗️ Architecture

```
Medicare-System/
├── 📱 app/                    # React Native Mobile App
│   ├── (tabs)/               # Patient Interface
│   ├── (doctor-tabs)/        # Doctor Interface
│   ├── screens/              # Shared Screens
│   └── services/             # API Services
├── 🖥️ admin-panel/           # Next.js Admin Dashboard
│   ├── src/app/              # Admin Pages
│   ├── src/components/       # UI Components
│   └── src/lib/              # Admin API Services
└── ⚙️ backend/api/           # NestJS Backend
    ├── src/auth/             # Authentication
    ├── src/doctors/          # Doctor Management
    ├── src/appointments/     # Appointment System
    ├── src/admin/            # Admin Functions
    └── src/specializations/  # Medical Specializations
```

## 🔧 Key Features

### For Patients
- ✅ User registration and authentication
- ✅ Doctor search by specialization
- ✅ Real-time appointment booking
- ✅ Medical history tracking
- ✅ Appointment notifications

### For Doctors
- ✅ Professional profile management
- ✅ Schedule and availability control
- ✅ Patient management dashboard
- ✅ Appointment confirmations
- ✅ Real-time statistics

### For Administrators
- ✅ User management system
- ✅ Doctor approval workflow
- ✅ Appointment oversight
- ✅ System analytics
- ✅ Specializations management

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Mobile** | React Native + Expo | Cross-platform mobile app |
| **Backend** | NestJS + TypeScript | Scalable API server |
| **Database** | MongoDB + Mongoose | Document-based data storage |
| **Admin** | Next.js + TypeScript | Web-based admin interface |
| **Auth** | JWT + Guards | Secure authentication |
| **Styling** | Tailwind CSS | Modern UI design |

## 🔐 Authentication & Security

- **JWT-based authentication** with role-based access control
- **Password hashing** with bcrypt
- **Route protection** with custom guards
- **Input validation** and sanitization
- **File upload security** with type checking

## 📊 Database Schema

### Core Collections
- **Users**: Patient and doctor profiles
- **Appointments**: Booking and scheduling data
- **Specializations**: Medical specialties
- **Availability**: Doctor working hours
- **Medical Records**: Patient history

## 🌍 Localization

- **Georgian language** support
- **Local timezone** handling (UTC+4)
- **Cultural date formats**
- **Localized UI components**

## 🚀 Deployment

### Backend (NestJS)
```bash
npm run build
npm run start:prod
```

### Mobile App (Expo)
```bash
npx expo build:android
npx expo build:ios
```

### Admin Panel (Next.js)
```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Mobile Development**: React Native + Expo
- **Backend Development**: NestJS + MongoDB
- **Admin Panel**: Next.js + TypeScript
- **UI/UX Design**: Modern healthcare interface

## 📞 Support

For support and questions:
- Create an issue in this repository
- Contact the development team

---

**Built with ❤️ for better healthcare management**