// Doctor Dashboard Data - Statistics and Schedules

export interface DoctorStatistics {
  earnings: {
    paid: number; // დარიცხული
    pending: number; // მოსალოდნელი
    thisMonth: number; // მიმდინარე თვე
    lastMonth: number; // წინა თვე
  };
  appointments: {
    completed: number; // შესრულებული
    inProgress: number; // მიმდინარე
    uncompleted: number; // შეუსრულებელი
    total: number; // სულ
  };
  patients: {
    total: number; // სულ პაციენტები
    new: number; // ახალი პაციენტები (ამ თვე)
    returning: number; // დაბრუნებული პაციენტები
  };
  visits: {
    today: number; // დღევანდელი
    thisWeek: number; // ამ კვირის
    thisMonth: number; // ამ თვის
    total: number; // სულ ვიზიტები
  };
  videoConsultations?: {
    thisMonth: number; // ვიდეო კონსულტაციები ამ თვეში
    lastMonth: number; // ვიდეო კონსულტაციები წინა თვეში
    total: number; // სულ ვიდეო კონსულტაციები
    completed: number; // დასრულებული ვიდეო კონსულტაციები
  };
  homeVisits?: {
    thisMonth: number; // ბინაზე ვიზიტები ამ თვეში
    lastMonth: number; // ბინაზე ვიზიტები წინა თვეში
    total: number; // სულ ბინაზე ვიზიტები
    completed: number; // დასრულებული ბინაზე ვიზიტები
  };
}

export interface ConsultationVitals {
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  weight?: string;
}

export interface ConsultationSummary {
  diagnosis?: string;
  symptoms?: string;
  medications?: string;
  notes?: string;
  vitals?: ConsultationVitals;
}

export interface FollowUpInfo {
  required: boolean;
  date?: string;
  reason?: string;
  appointmentId?: string;
}

export interface Form100Info {
  id?: string;
  issueDate?: string;
  validUntil?: string;
  reason?: string;
  diagnosis?: string;
  recommendations?: string;
  pdfUrl?: string;
  fileName?: string;
}

export interface PatientDetails {
  name?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  personalId?: string;
  address?: string;
  problem?: string;
}

export interface Consultation {
  id: string;
  patientName: string;
  patientAge: number;
  date: string;
  time: string;
  // ტიპი ახლა მოიცავს როგორც ძველ მნიშვნელობებს, ისე რეალურ ვიზიტის ტიპებს
  type:
    | "consultation"
    | "followup"
    | "emergency"
    | "video"
    | "home-visit";
  status: "completed" | "scheduled" | "cancelled" | "in-progress"; // შესრულებული | დანიშნული | გაუქმებული | მიმდინარე
  fee: number; // ანაზღაურება
  isPaid: boolean; // გადახდილია
  diagnosis?: string; // დიაგნოზი
  symptoms?: string; // სიმპტომები
  consultationSummary?: ConsultationSummary;
  followUp?: FollowUpInfo;
  form100?: Form100Info;
  patientDetails?: PatientDetails; // Full patient details for Form 100 generation
  laboratoryTests?: any[]; // Laboratory tests assigned to this appointment
  instrumentalTests?: any[]; // Instrumental tests assigned to this appointment
  rescheduleRequest?: {
    requestedBy?: 'doctor' | 'patient';
    requestedDate?: string;
    requestedTime?: string;
    reason?: string;
    status?: 'pending' | 'approved' | 'rejected';
    requestedAt?: string;
    respondedAt?: string;
    respondedBy?: string;
  };
  subStatus?: 'scheduled' | 'conducted' | 'documents-pending';
  patientJoinedAt?: string;
  doctorJoinedAt?: string;
  completedAt?: string;
  homeVisitCompletedAt?: string;
}

export interface Schedule {
  id: string;
  date: string;
  dayOfWeek: string;
  consultations: Consultation[];
  availableSlots: string[];
  totalSlots: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  consultations: number;
}

export interface PatientVisitHistory {
  patientId: string;
  patientName: string;
  totalVisits: number;
  lastVisit: string;
  totalSpent: number;
  conditions: string[];
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  dateOfBirth?: string;
  gender: "male" | "female";
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  allergies: string[];
  chronicDiseases: string[];
  currentMedications: string[];
  lastVisit: string;
  nextAppointment?: string;
  totalVisits: number;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
  };
  notes: string;
  registrationDate: string;
}

// Sample Doctor Statistics
export const doctorStatistics: DoctorStatistics = {
  earnings: {
    paid: 12450.0, // გადახდილი ანაზღაურება
    pending: 3200.0, // მოსალოდნელი ანაზღაურება
    thisMonth: 8900.0, // მიმდინარე თვის ანაზღაურება
    lastMonth: 10200.0, // წინა თვის ანაზღაურება
  },
  appointments: {
    completed: 156, // შესრულებული დანიშვნები
    inProgress: 8, // მიმდინარე დანიშვნები
    uncompleted: 12, // შეუსრულებელი დანიშვნები
    total: 176, // სულ დანიშვნები
  },
  patients: {
    total: 342, // სულ პაციენტები
    new: 28, // ახალი პაციენტები (ამ თვე)
    returning: 89, // დაბრუნებული პაციენტები
  },
  visits: {
    today: 5, // დღევანდელი ვიზიტები
    thisWeek: 23, // ამ კვირის ვიზიტები
    thisMonth: 94, // ამ თვის ვიზიტები
    total: 1248, // სულ ვიზიტები
  },
};

// Recent Consultations
export const recentConsultations: Consultation[] = [
  {
    id: "C001",
    patientName: "გიორგი მელაძე",
    patientAge: 45,
    date: "2024-10-26",
    time: "09:00",
    type: "consultation",
    status: "completed",
    fee: 100.0,
    isPaid: true,
    diagnosis: "მაღალი წნევა",
    symptoms: "თავის ტკივილი, თავბრუსხვევა",
    consultationSummary: {
      diagnosis: "მაღალი წნევა",
      symptoms: "თავის ტკივილი, თავბრუსხვევა",
      medications: "ანაპრილინი",
      vitals: {
        bloodPressure: "150/100",
        heartRate: "78",
      },
    },
    form100: {
      id: "FORM-100-0001",
      issueDate: "2024-10-26",
      validUntil: "2024-11-10",
      reason: "სამედიცინო შვებულება",
      diagnosis: "ჰიპერტენზია",
      recommendations: "სრული დასვენება 10 დღე",
      pdfUrl: "uploads/forms/sample-form100.pdf",
    },
  },
  {
    id: "C002",
    patientName: "ნინო ხარაიშვილი",
    patientAge: 32,
    date: "2024-10-26",
    time: "10:00",
    type: "followup",
    status: "completed",
    fee: 50.0,
    isPaid: true,
    diagnosis: "გულის არითმია",
    symptoms: "გულისცემის დარღვევა",
  },
  {
    id: "C003",
    patientName: "დავით ბერიძე",
    patientAge: 58,
    date: "2024-10-26",
    time: "11:00",
    type: "consultation",
    status: "in-progress",
    fee: 100.0,
    isPaid: false,
    symptoms: "გულის ტკივილი, სუნთქვის სიძნელე",
  },
  {
    id: "C004",
    patientName: "მარიამ გელაშვილი",
    patientAge: 41,
    date: "2024-10-26",
    time: "14:00",
    type: "consultation",
    status: "scheduled",
    fee: 100.0,
    isPaid: false,
    symptoms: "გულის ტკივილი",
  },
  {
    id: "C005",
    patientName: "ლევან კვარაცხელია",
    patientAge: 67,
    date: "2024-10-26",
    time: "15:00",
    type: "emergency",
    status: "scheduled",
    fee: 150.0,
    isPaid: false,
    symptoms: "მძიმე გულის ტკივილი",
  },
  {
    id: "C006",
    patientName: "ანა ჯავახიშვილი",
    patientAge: 29,
    date: "2024-10-25",
    time: "16:00",
    type: "consultation",
    status: "completed",
    fee: 100.0,
    isPaid: true,
    diagnosis: "გულის პროლაფსი",
    symptoms: "გულის შფოთვა",
  },
  {
    id: "C007",
    patientName: "გიორგი შენგელია",
    patientAge: 52,
    date: "2024-10-25",
    time: "09:30",
    type: "followup",
    status: "completed",
    fee: 50.0,
    isPaid: true,
    diagnosis: "გულის უკმარისობა",
  },
  {
    id: "C008",
    patientName: "თამარ მიქაძე",
    patientAge: 38,
    date: "2024-10-25",
    time: "11:30",
    type: "consultation",
    status: "cancelled",
    fee: 100.0,
    isPaid: false,
    symptoms: "ზოგადი სუსტი მდგომარეობა",
  },
];

// Weekly Schedule
export const weeklySchedule: Schedule[] = [
  {
    id: "S001",
    date: "2024-10-26",
    dayOfWeek: "ორშაბათი",
    consultations: [
      recentConsultations[0],
      recentConsultations[1],
      recentConsultations[2],
      recentConsultations[3],
      recentConsultations[4],
    ],
    availableSlots: ["16:00", "17:00"],
    totalSlots: 7,
  },
  {
    id: "S002",
    date: "2024-10-27",
    dayOfWeek: "სამშაბათი",
    consultations: [],
    availableSlots: [
      "09:00",
      "10:00",
      "11:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ],
    totalSlots: 7,
  },
  {
    id: "S003",
    date: "2024-10-28",
    dayOfWeek: "ოთხშაბათი",
    consultations: [],
    availableSlots: [
      "09:00",
      "10:00",
      "11:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ],
    totalSlots: 7,
  },
  {
    id: "S004",
    date: "2024-10-29",
    dayOfWeek: "ხუთშაბათი",
    consultations: [],
    availableSlots: [
      "09:00",
      "10:00",
      "11:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ],
    totalSlots: 7,
  },
  {
    id: "S005",
    date: "2024-10-30",
    dayOfWeek: "პარასკევი",
    consultations: [],
    availableSlots: [
      "09:00",
      "10:00",
      "11:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ],
    totalSlots: 7,
  },
  {
    id: "S006",
    date: "2024-10-31",
    dayOfWeek: "შაბათი",
    consultations: [],
    availableSlots: ["09:00", "10:00", "11:00"],
    totalSlots: 3,
  },
];

// Monthly Revenue History
export const monthlyRevenue: MonthlyRevenue[] = [
  { month: "იანვარი", revenue: 9800.0, consultations: 82 },
  { month: "თებერვალი", revenue: 10500.0, consultations: 88 },
  { month: "მარტი", revenue: 11200.0, consultations: 94 },
  { month: "აპრილი", revenue: 10800.0, consultations: 90 },
  { month: "მაისი", revenue: 12100.0, consultations: 101 },
  { month: "ივნისი", revenue: 11900.0, consultations: 99 },
  { month: "ივლისი", revenue: 13200.0, consultations: 110 },
  { month: "აგვისტო", revenue: 12800.0, consultations: 107 },
  { month: "სექტემბერი", revenue: 10200.0, consultations: 85 },
  { month: "ოქტომბერი", revenue: 8900.0, consultations: 74 },
];

// Patient Visit History
export const patientVisitHistory: PatientVisitHistory[] = [
  {
    patientId: "P001",
    patientName: "გიორგი მელაძე",
    totalVisits: 8,
    lastVisit: "2024-10-26",
    totalSpent: 650.0,
    conditions: ["მაღალი წნევა", "დიაბეტი"],
  },
  {
    patientId: "P002",
    patientName: "ნინო ხარაიშვილი",
    totalVisits: 12,
    lastVisit: "2024-10-26",
    totalSpent: 1050.0,
    conditions: ["გულის არითმია"],
  },
  {
    patientId: "P003",
    patientName: "დავით ბერიძე",
    totalVisits: 5,
    lastVisit: "2024-10-26",
    totalSpent: 450.0,
    conditions: ["გულის იშემია"],
  },
  {
    patientId: "P004",
    patientName: "მარიამ გელაშვილი",
    totalVisits: 3,
    lastVisit: "2024-10-24",
    totalSpent: 300.0,
    conditions: ["გულის პროლაფსი"],
  },
  {
    patientId: "P005",
    patientName: "ლევან კვარაცხელია",
    totalVisits: 15,
    lastVisit: "2024-10-23",
    totalSpent: 1450.0,
    conditions: ["გულის უკმარისობა", "მაღალი წნევა"],
  },
  {
    patientId: "P006",
    patientName: "ანა ჯავახიშვილი",
    totalVisits: 4,
    lastVisit: "2024-10-25",
    totalSpent: 350.0,
    conditions: ["გულის შფოთვა"],
  },
  {
    patientId: "P007",
    patientName: "გიორგი შენგელია",
    totalVisits: 10,
    lastVisit: "2024-10-25",
    totalSpent: 850.0,
    conditions: ["გულის უკმარისობა"],
  },
  {
    patientId: "P008",
    patientName: "თამარ მიქაძე",
    totalVisits: 2,
    lastVisit: "2024-10-22",
    totalSpent: 200.0,
    conditions: [],
  },
];

// Helper function to get consultation type label in Georgian
export const getConsultationTypeLabel = (
  type: Consultation["type"]
): string => {
  switch (type) {
    case "video":
      return "ვიდეო კონსულტაცია";
    case "home-visit":
      return "ბინაზე ვიზიტი";
    case "consultation":
      return "კონსულტაცია";
    case "followup":
      return "განმეორებითი";
    case "emergency":
      return "სასწრაფო";
    default:
      return "კონსულტაცია";
  }
};

// Helper function to get status label in Georgian
export const getStatusLabel = (status: Consultation["status"]): string => {
  switch (status) {
    case "completed":
      return "დასრულებული";
    case "scheduled":
      return "დანიშნული";
    case "cancelled":
      return "გაუქმებული";
    case "in-progress":
      return "მიმდინარე";
    default:
      return "უცნობი";
  }
};

// Helper function to get status color
export const getStatusColor = (status: Consultation["status"]): string => {
  switch (status) {
    case "completed":
      return "#10B981"; // green
    case "scheduled":
      return "#06B6D4"; // blue
    case "cancelled":
      return "#EF4444"; // red
    case "in-progress":
      return "#F59E0B"; // orange
    default:
      return "#6B7280"; // gray
  }
};

// Patients Data
export const patients: Patient[] = [
  {
    id: "P001",
    name: "გიორგი მელაძე",
    age: 45,
    gender: "male",
    phone: "+995 555 123 456",
    email: "giorgi.meladze@email.com",
    address: "თბილისი, საბურთალო, ვაჟა-ფშაველას 47",
    bloodType: "A+",
    allergies: ["პენიცილინი", "კაკალი"],
    chronicDiseases: ["მაღალი წნევა", "დიაბეტი ტიპი 2"],
    currentMedications: ["Metformin 500mg", "Losartan 50mg", "Aspirin 75mg"],
    lastVisit: "2024-10-26",
    nextAppointment: "2024-11-05",
    totalVisits: 8,
    emergencyContact: {
      name: "ნინო მელაძე",
      phone: "+995 555 987 654",
      relation: "მეუღლე",
    },
    insuranceInfo: {
      provider: "Aldagi BCI",
      policyNumber: "ALD-2024-45678",
    },
    notes:
      "პაციენტი რეგულარულად იღებს მედიკამენტებს. რეკომენდებულია დიეტა და ფიზიკური აქტივობა.",
    registrationDate: "2023-03-15",
  },
  {
    id: "P002",
    name: "ნინო ხარაიშვილი",
    age: 32,
    gender: "female",
    phone: "+995 555 234 567",
    email: "nino.kharaishvili@email.com",
    address: "თბილისი, ვაკე, ჭავჭავაძის 33",
    bloodType: "B+",
    allergies: ["იოდი"],
    chronicDiseases: ["გულის არითმია"],
    currentMedications: ["Bisoprolol 5mg", "Aspirin 75mg"],
    lastVisit: "2024-10-26",
    nextAppointment: "2024-11-12",
    totalVisits: 12,
    emergencyContact: {
      name: "დავით ხარაიშვილი",
      phone: "+995 555 876 543",
      relation: "მეუღლე",
    },
    insuranceInfo: {
      provider: "GPI Holding",
      policyNumber: "GPI-2024-12345",
    },
    notes:
      "პაციენტს აქვს გულის არითმიის ისტორია. რეკომენდებულია სტრესის მინიმიზაცია.",
    registrationDate: "2022-08-20",
  },
  {
    id: "P003",
    name: "დავით ბერიძე",
    age: 58,
    gender: "male",
    phone: "+995 555 345 678",
    email: "davit.beridze@email.com",
    address: "თბილისი, დიღომი, ა. ყაზბეგის 25",
    bloodType: "O+",
    allergies: ["არა"],
    chronicDiseases: ["გულის იშემიური დაავადება"],
    currentMedications: [
      "Atorvastatin 20mg",
      "Clopidogrel 75mg",
      "Ramipril 5mg",
    ],
    lastVisit: "2024-10-26",
    totalVisits: 5,
    emergencyContact: {
      name: "თამარ ბერიძე",
      phone: "+995 555 765 432",
      relation: "ქალიშვილი",
    },
    insuranceInfo: {
      provider: "Imedi L",
      policyNumber: "IML-2024-78901",
    },
    notes: "გულის შეტევის ისტორია 2023 წელს. საჭიროებს რეგულარულ მონიტორინგს.",
    registrationDate: "2023-11-10",
  },
  {
    id: "P004",
    name: "მარიამ გელაშვილი",
    age: 41,
    gender: "female",
    phone: "+995 555 456 789",
    email: "mariam.gelashvili@email.com",
    address: "თბილისი, ისანი, მოსკოვის 15",
    bloodType: "AB+",
    allergies: ["არა"],
    chronicDiseases: ["გულის პროლაფსი"],
    currentMedications: ["Magnesium 400mg"],
    lastVisit: "2024-10-24",
    nextAppointment: "2024-11-20",
    totalVisits: 3,
    emergencyContact: {
      name: "გიორგი გელაშვილი",
      phone: "+995 555 654 321",
      relation: "მეუღლე",
    },
    notes:
      "მსუბუქი ფორმის პროლაფსი. რეკომენდებულია პროფილაქტიკური მონიტორინგი.",
    registrationDate: "2024-05-18",
  },
  {
    id: "P005",
    name: "ლევან კვარაცხელია",
    age: 67,
    gender: "male",
    phone: "+995 555 567 890",
    email: "levan.kvaratskhelia@email.com",
    address: "თბილისი, ორთაჭალა, კოტე აფხაზის 12",
    bloodType: "A-",
    allergies: ["სულფა პრეპარატები"],
    chronicDiseases: [
      "გულის უკმარისობა",
      "მაღალი წნევა",
      "კუჭ-ნაწლავის პრობლემები",
    ],
    currentMedications: [
      "Furosemide 40mg",
      "Spironolactone 25mg",
      "Enalapril 10mg",
      "Omeprazole 20mg",
    ],
    lastVisit: "2024-10-23",
    nextAppointment: "2024-11-02",
    totalVisits: 15,
    emergencyContact: {
      name: "ანა კვარაცხელია",
      phone: "+995 555 543 210",
      relation: "ქალიშვილი",
    },
    insuranceInfo: {
      provider: "Aldagi BCI",
      policyNumber: "ALD-2023-99887",
    },
    notes:
      "მძიმე გულის უკმარისობა. საჭიროებს მკაცრ მონიტორინგს და რეგულარულ შემოწმებას.",
    registrationDate: "2021-02-14",
  },
  {
    id: "P006",
    name: "ანა ჯავახიშვილი",
    age: 29,
    gender: "female",
    phone: "+995 555 678 901",
    email: "ana.javakhishvili@email.com",
    address: "თბილისი, მთაწმინდა, ბარნოვის 8",
    bloodType: "O-",
    allergies: ["არა"],
    chronicDiseases: [],
    currentMedications: [],
    lastVisit: "2024-10-25",
    totalVisits: 4,
    emergencyContact: {
      name: "თამარ ჯავახიშვილი",
      phone: "+995 555 432 109",
      relation: "დედა",
    },
    insuranceInfo: {
      provider: "GPI Holding",
      policyNumber: "GPI-2024-55443",
    },
    notes: "ჯანმრთელი პაციენტი. პროფილაქტიკური შემოწმებებისთვის.",
    registrationDate: "2024-01-22",
  },
  {
    id: "P007",
    name: "გიორგი შენგელია",
    age: 52,
    gender: "male",
    phone: "+995 555 789 012",
    email: "giorgi.shengelia@email.com",
    address: "თბილისი, გლდანი, ა. წერეთლის 145",
    bloodType: "B-",
    allergies: ["ანტიბიოტიკები (Erythromycin)"],
    chronicDiseases: ["გულის უკმარისობა"],
    currentMedications: ["Carvedilol 12.5mg", "Lisinopril 10mg"],
    lastVisit: "2024-10-25",
    nextAppointment: "2024-11-08",
    totalVisits: 10,
    emergencyContact: {
      name: "მაია შენგელია",
      phone: "+995 555 321 098",
      relation: "მეუღლე",
    },
    insuranceInfo: {
      provider: "Imedi L",
      policyNumber: "IML-2023-66554",
    },
    notes:
      "საშუალო სიმძიმის გულის უკმარისობა. რეკომენდებულია სიარული და დიეტა.",
    registrationDate: "2022-06-30",
  },
  {
    id: "P008",
    name: "თამარ მიქაძე",
    age: 38,
    gender: "female",
    phone: "+995 555 890 123",
    email: "tamar.mikadze@email.com",
    address: "თბილისი, ნაძალადევი, აღმაშენებლის 25",
    bloodType: "A+",
    allergies: ["არა"],
    chronicDiseases: [],
    currentMedications: [],
    lastVisit: "2024-10-22",
    totalVisits: 2,
    emergencyContact: {
      name: "ნიკა მიქაძე",
      phone: "+995 555 210 987",
      relation: "მეუღლე",
    },
    notes: "ახალი პაციენტი. საერთო შემოწმება.",
    registrationDate: "2024-09-15",
  },
  {
    id: "P009",
    name: "ნიკოლოზ ფუტკარაძე",
    age: 55,
    gender: "male",
    phone: "+995 555 901 234",
    email: "nikoloz.futkaradze@email.com",
    address: "თბილისი, ჩუღურეთი, სანაპიროს 77",
    bloodType: "O+",
    allergies: ["ლატექსი"],
    chronicDiseases: ["მაღალი წნევა", "ჰიპერკოლესტერინემია"],
    currentMedications: ["Amlodipine 5mg", "Rosuvastatin 10mg"],
    lastVisit: "2024-10-20",
    nextAppointment: "2024-11-15",
    totalVisits: 7,
    emergencyContact: {
      name: "ნანა ფუტკარაძე",
      phone: "+995 555 109 876",
      relation: "მეუღლე",
    },
    insuranceInfo: {
      provider: "Aldagi BCI",
      policyNumber: "ALD-2024-11223",
    },
    notes:
      "მაღალი კოლესტეროლის დონე. რეკომენდებულია დიეტა და ფიზიკური აქტივობა.",
    registrationDate: "2023-07-12",
  },
  {
    id: "P010",
    name: "ეკა ლობჟანიძე",
    age: 44,
    gender: "female",
    phone: "+995 555 012 345",
    email: "eka.lobzhanidze@email.com",
    address: "თბილისი, დიდუბე, პ. ინგოროყვას 35",
    bloodType: "AB-",
    allergies: ["გლუტენი"],
    chronicDiseases: ["გულის პროლაფსი", "მიგრენი"],
    currentMedications: ["Propranolol 40mg", "Magnesium 500mg"],
    lastVisit: "2024-10-19",
    totalVisits: 6,
    emergencyContact: {
      name: "ზურაბ ლობჟანიძე",
      phone: "+995 555 098 765",
      relation: "მეუღლე",
    },
    notes:
      "პაციენტს აქვს მიგრენის ხშირი შეტევები. რეკომენდებულია სტრესის მართვა.",
    registrationDate: "2023-12-05",
  },
];
