import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type SupportedLanguage = "ka" | "en";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const LANGUAGE_STORAGE_KEY = "@medicare_language";

const translations: Record<SupportedLanguage, Record<string, string>> = {
  ka: {
    // Generic
    "common.language.georgian": "ქართული",
    "common.language.english": "English",
    "common.actions.close": "დახურვა",
    "common.actions.continue": "გაგრძელება",

    // Onboarding
    "onboarding.title": "HERRA XXI",
    "onboarding.description":
      "შედით თქვენს ანგარიშში, აირჩიეთ ექიმი და მართეთ ჯავშნები მარტივად, სადაც არ უნდა იყოთ.",

    // Auth - Login
    "auth.login.title": "კეთილი იყოს შენი დაბრუნება!",
    "auth.login.email.label": "ელ. ფოსტა",
    "auth.login.email.placeholder": "შეიყვანე ელ. ფოსტა",
    "auth.login.password.label": "პაროლი",
    "auth.login.password.placeholder": "••••••••••",
    "auth.login.rememberMe": "დამიმახსოვრე",
    "auth.login.forgotPassword": "პაროლი დაგავიწყდა? ",
    "auth.login.submit": "შესვლა",
    "auth.login.submitting": "შესვლა...",
    "auth.login.signup.question": "ანგარიში არ გაქვს? ",
    "auth.login.signup.action": "დარეგისტრირდი",
    "auth.login.language.title": "აირჩიე ენა",
    "auth.login.validation.fillAll": "გთხოვთ შეავსოთ ყველა ველი",
    "auth.login.error.default": "შეცდომა შესვლისას",
    "auth.login.error.invalidCredentials": "არასწორი ელ-ფოსტა ან პაროლი",
    "auth.login.error.userNotFound": "მომხმარებელი არ მოიძებნა",
    "auth.login.error.invalidEmail": "არასწორი ელ-ფოსტის ფორმატი",

    // Auth - Register
    "auth.register.title.doctor": "დარეგისტრირდი როგორც ექიმი",
    "auth.register.title.patient": "შექმენი ანგარიში",
    "auth.register.subtitle.doctor":
      "შემოგვიერთდი როგორც სამედიცინო მომსახურების მიმწოდებელი",
    "auth.register.subtitle.patient": "დაიწყე გამოყენება უფასოდ",
    "auth.register.name.label": "სახელი/გვარი *",
    "auth.register.name.placeholder": "შეიყვანე სრული სახელი",
    "auth.register.email.label": "ელ. ფოსტა *",
    "auth.register.email.placeholder": "შეიყვანე ელ. ფოსტა",
    "auth.register.idNumber.label": "პირადი ნომერი *",
    "auth.register.idNumber.label.passport": "პასპორტის ნომერი *",
    "auth.register.idNumber.placeholder": "შეიყვანე პირადი ნომერი",
    "auth.register.idNumber.placeholder.passport": "შეიყვანე პასპორტის ნომერი",
    "auth.register.nationality.label": "ეროვნება *",
    "auth.register.nationality.georgian": "ქართველი",
    "auth.register.nationality.nonGeorgian": "არაქართველი",
    "auth.register.passportInfo.title": "ინფორმაცია",
    "auth.register.passportInfo.message": "გთხოვთ ჩაწერეთ პასპორტის ნომერი",
    "auth.register.passportInfo.ok": "გასაგებია",
    "auth.register.phone.label": "ტელეფონი",
    "auth.register.phone.placeholder": "+995 555 123 456",
    "auth.register.password.label": "პაროლი *",
    "auth.register.password.placeholder": "••••••••••",
    "auth.register.submit": "დარეგისტრირდი",
    "auth.register.submitting": "რეგისტრაცია...",
    "auth.register.signin.question": "ანგარიში უკვე გაქვს? ",
    "auth.register.signin.action": "შესვლა",
    "auth.register.tos.inlineText":
      "გაგრძელებით, ეთანხმები HERRA-ს სერვის პირობებს და კონფიდენციალურობის პოლიტიკას.",
    "auth.register.tos.readMore": "წაიკითხე დეტალურად",
    "auth.register.tos.title":
      "HERRA - სერვის პირობები და პოლიტიკა",
    "auth.register.tos.description":
      "გთხოვ, ყურადღებით გაეცნო ჩვენს სერვის პირობებს და კონფიდენციალურობის პოლიტიკას. რეგისტრაციით ადასტურებ, რომ გესმის როგორ მუშავდება და იცავს HERRA შენს მონაცემებს.",
    "auth.register.tos.checkboxLabel":
      "წავიკითხე და ვეთანხმები HERRA-ს სერვის პირობებს და კონფიდენციალურობის პოლიტიკას.",
    "auth.register.tos.acceptButton": "ვეთანხმები",
    "auth.register.tos.cancelButton": "გაუქმება",
    "auth.register.tos.validationRequired":
      "რეგისტრაციისთვის უნდა დაეთანხმო HERRA-ს სერვის პირობებს და კონფიდენციალურობის პოლიტიკას.",

    "auth.register.validation.fillAll":
      "გთხოვთ შეავსოთ ყველა სავალდებულო ველი",
    "auth.register.validation.specialization":
      "გთხოვთ აირჩიოთ ექიმის სპეციალიზაცია",
    "auth.register.validation.passwordLength":
      "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო",
    "auth.register.error.default": "შეცდომა რეგისტრაციისას",

    // Doctor specific (labels left Georgian but routed through i18n)
    "doctor.specialization.label": "სპეციალიზაცია *",
    "doctor.specialization.loading": "სპეციალიზაციები იტვირთება...",
    "doctor.specialization.selectPlaceholder": "აირჩიე სპეციალიზაციები",
    "doctor.specialization.valuePlaceholder":
      "მინიმუმ ერთი სპეციალიზაცია აირჩიე",
    "doctor.specialization.helper":
      "შეგიძლია მონიშნო რამდენიმე სპეციალიზაცია",
    "doctor.specialization.empty":
      "ჯერ სპეციალიზაციები არ არის დამატებული.",
    "doctor.degrees.label": "ხარისხი",
    "doctor.degrees.placeholder": "MD, PhD",
    "doctor.experience.label": "გამოცდილება",
    "doctor.experience.placeholder": "10 წელი",
    "doctor.location.label": "მდებარეობა",
    "doctor.location.placeholder": "თბილისი, საქართველო",
    "doctor.dob.label": "დაბადების თარიღი",
    "doctor.dob.placeholder": " დაბადების თარიღი",
    "doctor.gender.label": "სქესი",
    "doctor.gender.male": "კაცი",
    "doctor.gender.female": "ქალი",
    "doctor.gender.other": "სხვა",
    "doctor.about.label": "შესახებ",
    "doctor.about.placeholder": "დაწერე ექიმის შესახებ...",
    "doctor.license.label": "ლიცენზიის ფაილი (PDF) (არჩევითი)",
    "doctor.license.placeholder": "ატვირთეთ სამედიცინო ლიცენზია",
    "doctor.license.success": "✓ ფაილი წარმატებით აიტვირთა",
    "doctor.license.uploading": "ატვირთვა...",
    "doctor.specialization.modalTitle": "აირჩიე სპეციალიზაციები",
    "doctor.specialization.modalDone": "არჩევა დასრულებულია",
    "doctor.dob.modalTitle": "დაბადების თარიღი",
    "doctor.dob.modalCancel": "გაუქმება",
    "doctor.dob.modalDone": "დასრულება",

    // Role selection
    "roleSelection.title": "აირჩიე შენი როლი",
    "roleSelection.subtitle.authenticated":
      "აირჩიე რომელი ნაწილი გინდა გამოიყენო",
    "roleSelection.subtitle.guest": "აირჩიე რომელი პროფილით დავიწყოთ",
    "roleSelection.doctor.title": "მე ვარ ექიმი",
    "roleSelection.doctor.description":
      "შემოუერთდი როგორც სამედიცინო მომსახურების მიმწოდებელი",
    "roleSelection.patient.title": "მე ვარ პაციენტი",
    "roleSelection.patient.description":
      "მოძებნე ექიმი და დაჯავშნე ვიზიტი",
    "roleSelection.continue": "გასაგრძელებლად",
    "roleSelection.login.question": "უკვე გაქვს ანგარიში? ",
    "roleSelection.login.action": "შესვლა",
    "roleSelection.alert.selectRole": "გთხოვ აირჩიო როლი",
  },
  en: {
    // Generic
    "common.language.georgian": "ქართული",
    "common.language.english": "English",
    "common.actions.close": "Close",
    "common.actions.continue": "Continue",

    // Onboarding
    "onboarding.title": "HERRA XXI",
    "onboarding.description":
      "Log into your account, choose a doctor and manage your appointments easily from anywhere.",

    // Auth - Login
    "auth.login.title": "Welcome back!",
    "auth.login.email.label": "Email",
    "auth.login.email.placeholder": "Enter your email",
    "auth.login.password.label": "Password",
    "auth.login.password.placeholder": "••••••••••",
    "auth.login.rememberMe": "Remember me",
    "auth.login.forgotPassword": "Forgot Password?",
    "auth.login.submit": "Log in",
    "auth.login.submitting": "Logging in...",
    "auth.login.signup.question": "Don't have an account? ",
    "auth.login.signup.action": "Sign up",
    "auth.login.language.title": "Choose language",
    "auth.login.validation.fillAll": "Please fill in all fields",
    "auth.login.error.default": "Error while logging in",
    "auth.login.error.invalidCredentials":
      "Incorrect email address or password",
    "auth.login.error.userNotFound": "User not found",
    "auth.login.error.invalidEmail": "Invalid email format",

    // Auth - Register
    "auth.register.title.doctor": "Register as a doctor",
    "auth.register.title.patient": "Create an account",
    "auth.register.subtitle.doctor":
      "Join our platform as a healthcare provider",
    "auth.register.subtitle.patient": "Start using the app for free",
    "auth.register.name.label": "Name/Surname *",
    "auth.register.name.placeholder": "Enter your full name",
    "auth.register.email.label": "Email *",
    "auth.register.email.placeholder": "Enter your email",
    "auth.register.idNumber.label": "Personal ID *",
    "auth.register.idNumber.label.passport": "Passport Number *",
    "auth.register.idNumber.placeholder": "Enter your personal ID",
    "auth.register.idNumber.placeholder.passport": "Enter your passport number",
    "auth.register.nationality.label": "Nationality *",
    "auth.register.nationality.georgian": "Georgian",
    "auth.register.nationality.nonGeorgian": "Non-Georgian",
    "auth.register.passportInfo.title": "Information",
    "auth.register.passportInfo.message": "Please enter your passport number",
    "auth.register.passportInfo.ok": "OK",
    "auth.register.phone.label": "Phone",
    "auth.register.phone.placeholder": "+995 555 123 456",
    "auth.register.password.label": "Password *",
    "auth.register.password.placeholder": "••••••••••",
    "auth.register.submit": "Sign up",
    "auth.register.submitting": "Signing up...",
    "auth.register.signin.question": "Already have an account? ",
    "auth.register.signin.action": "Log in",
    "auth.register.tos.inlineText":
      "By continuing, you agree to HERRA's Terms of Service and Privacy Policy.",
    "auth.register.tos.readMore": "Read in detail",
    "auth.register.tos.title":
      "HERRA - Terms of Service and Privacy Policy",
    "auth.register.tos.description":
      "Please read our Terms of Service and Privacy Policy carefully. By registering you confirm that you understand how HERRA processes and protects your data.",
    "auth.register.tos.checkboxLabel":
      "I have read and agree to HERRA's Terms of Service and Privacy Policy.",
    "auth.register.tos.acceptButton": "I agree",
    "auth.register.tos.cancelButton": "Cancel",
    "auth.register.tos.validationRequired":
      "You must agree to HERRA's Terms of Service and Privacy Policy to complete registration.",

    "auth.register.validation.fillAll": "Please fill in all required fields",
    "auth.register.validation.specialization":
      "Please choose at least one specialization",
    "auth.register.validation.passwordLength":
      "Password must be at least 6 characters",
    "auth.register.error.default": "Error while registering",

    // Doctor specific
    "doctor.specialization.label": "Specialization *",
    "doctor.specialization.loading": "Loading specializations...",
    "doctor.specialization.selectPlaceholder": "Choose specializations",
    "doctor.specialization.valuePlaceholder":
      "Select at least one specialization",
    "doctor.specialization.helper":
      "You can select multiple specializations",
    "doctor.specialization.empty":
      "No specializations have been added yet.",
    "doctor.degrees.label": "Degree",
    "doctor.degrees.placeholder": "MD, PhD",
    "doctor.experience.label": "Experience",
    "doctor.experience.placeholder": "10 years",
    "doctor.location.label": "Location",
    "doctor.location.placeholder": "Tbilisi, Georgia",
    "doctor.dob.label": "Date of birth",
    "doctor.dob.placeholder": "Choose date of birth",
    "doctor.gender.label": "Gender",
    "doctor.gender.male": "Male",
    "doctor.gender.female": "Female",
    "doctor.gender.other": "Other",
    "doctor.about.label": "About",
    "doctor.about.placeholder": "Write about the doctor...",
    "doctor.license.label": "License file (PDF) (optional)",
    "doctor.license.placeholder": "Upload medical license",
    "doctor.license.success": "✓ File uploaded successfully",
    "doctor.license.uploading": "Uploading...",
    "doctor.specialization.modalTitle": "Choose specializations",
    "doctor.specialization.modalDone": "Done",
    "doctor.dob.modalTitle": "Choose date of birth",
    "doctor.dob.modalCancel": "Cancel",
    "doctor.dob.modalDone": "Done",

    // Role selection
    "roleSelection.title": "Choose your role",
    "roleSelection.subtitle.authenticated":
      "Choose which part of the app you want to use",
    "roleSelection.subtitle.guest":
      "Choose which profile you want to start with",
    "roleSelection.doctor.title": "I am a doctor",
    "roleSelection.doctor.description":
      "Join as a healthcare service provider",
    "roleSelection.patient.title": "I am a patient",
    "roleSelection.patient.description":
      "Find a doctor and book an appointment",
    "roleSelection.continue": "Continue",
    "roleSelection.login.question": "Already have an account? ",
    "roleSelection.login.action": "Log in",
    "roleSelection.alert.selectRole": "Please select a role",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>("ka");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === "ka" || stored === "en") {
          setLanguageState(stored);
        }
      } catch (error) {
        console.error("Failed to load language:", error);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (lang: SupportedLanguage) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  };

  const t = (key: string): string => {
    const dict = translations[language] || translations.ka;
    return dict[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
};


