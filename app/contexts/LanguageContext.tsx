import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type SupportedLanguage = "ka" | "en" | "ru";

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
    "common.language.russian": "Русский",
    "common.actions.close": "დახურვა",
    "common.actions.continue": "გაგრძელება",
    "common.actions.ok": "OK",

    // Identomat
    "identomat.error.title": "შეცდომა",
    "identomat.error.idNotFound": "პირადი ნომერი ვერ მოიძებნა.",
    "identomat.error.resultFailed": "IDENTOMAT-ის შედეგის მიღება ვერ მოხერხდა",
    "identomat.success.verified": "IDENTOMAT-ით დადასტურებული",
    "identomat.success.completed":
      "IDENTOMAT-ით იდენტიფიკაცია წარმატებით დასრულდა",

    // OTP Modal
    "otp.title": "ტელეფონის ნომრის დადასტურება",
    "otp.subtitle": "შეიყვანეთ SMS კოდი",
    "otp.notReceived": "კოდი არ მიიღეთ? სცადეთ თავიდან",
    "otp.resendCode": "კოდის ხელახლა გაგზავნა",
    "otp.resendCountdown": "კოდის ხელახლა გაგზავნა ({{seconds}}წმ)",
    "otp.verify": "დადასტურება",
    "otp.skip": "გამოტოვება (დროებით)",
    "otp.error.default": "შეცდომა",
    "otp.error.phoneRequired": "გთხოვთ შეიყვანოთ ტელეფონის ნომერი",
    "otp.error.phoneInvalid":
      "გთხოვთ შეიყვანოთ სწორი ტელეფონის ნომერი (9 ციფრი, 5-ით დაწყებული)",
    "otp.error.codeRequired": "გთხოვთ შეიყვანოთ 6-ნიშნა კოდი",
    "otp.error.invalidCode": "არასწორი ვერიფიკაციის კოდი",
    "otp.error.sendCode": "ვერ მოხერხდა კოდის გაგზავნა",
    "otp.error.verifyFailed": "ვერიფიკაცია ვერ მოხერხდა",
    "otp.success.title": "წარმატება",
    "otp.success.codeSent": "ვერიფიკაციის კოდი გაიგზავნა",
    "otp.success.verified": "ტელეფონი წარმატებით დადასტურდა",

    // Onboarding
    "onboarding.title": "MedCompass",
    "onboarding.description":
      "ინოვაციური სამედიცინო პლატფორმა სანდო და ხარისხიანი მომსახურებისთვის",

    // Auth - Login
    "auth.login.title": "კეთილი იყოს შენი მობრძანება!",
    "auth.login.email.label": "ელ. ფოსტა",
    "auth.login.email.placeholder": "შეიყვანე ელ. ფოსტა",
    "auth.login.password.label": "პაროლი",
    "auth.login.password.placeholder": "••••••••••",
    "auth.login.rememberMe": "ანგარიშის დამახსოვრება",
    "auth.login.forgotPassword": "დაგავიწყდა პაროლი?",
    "auth.login.submit": "შესვლა",
    "auth.login.submitting": "შესვლა...",
    "auth.login.signup.question": "ანგარიში არ გაქვს?",
    "auth.login.signup.action": "დარეგისტრირდი",
    "auth.login.language.title": "აირჩიე ენა",
    "auth.login.validation.fillAll": "გთხოვთ შეავსოთ ყველა ველი",
    "auth.login.error.default": "შეცდომა შესვლისას",
    "auth.login.error.invalidCredentials": "არასწორი ელ-ფოსტა ან პაროლი",
    "auth.login.error.userNotFound": "მომხმარებელი არ მოიძებნა",
    "auth.login.error.invalidEmail": "არასწორი ელ-ფოსტის ფორმატი",

    // Auth - Forgot password
    "auth.forgotPassword.title": "დაგავიწყდა პაროლი?",
    "auth.forgotPassword.subtitle":
      "შეიყვანე ტელეფონის ნომერი და შეცვალე პაროლი",
    "auth.forgotPassword.titleReset": "პაროლის აღდგენა",
    "auth.forgotPassword.subtitleReset": "შეიყვანეთ ახალი პაროლი",
    "auth.forgotPassword.phone.label": "ტელეფონის ნომერი",
    "auth.forgotPassword.phone.placeholder": "5XX XXX XXX",
    "auth.forgotPassword.sendCode": "კოდის გაგზავნა",
    "auth.forgotPassword.sending": "იგზავნება...",
    "auth.forgotPassword.newPassword.label": "ახალი პაროლი",
    "auth.forgotPassword.confirmPassword.label": "დაადასტურეთ პაროლი",
    "auth.forgotPassword.resetButton": "პაროლის შეცვლა",
    "auth.forgotPassword.resetting": "იცვლება...",
    "auth.forgotPassword.backToLogin": "უკან დაბრუნება",
    "auth.forgotPassword.validation.phoneRequired":
      "გთხოვთ შეიყვანოთ ტელეფონის ნომერი",
    "auth.forgotPassword.validation.phoneInvalid":
      "გთხოვთ შეიყვანოთ სწორი ტელეფონის ნომერი (9 ციფრი, 5-ით დაწყებული)",
    "auth.forgotPassword.validation.passwordRequired":
      "გთხოვთ შეიყვანოთ ახალი პაროლი",
    "auth.forgotPassword.validation.passwordLength":
      "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო",
    "auth.forgotPassword.validation.passwordMismatch": "პაროლები არ ემთხვევა",
    "auth.forgotPassword.success.title": "წარმატება",
    "auth.forgotPassword.success.codeSent":
      "ვერიფიკაციის კოდი გაიგზავნა SMS-ით",
    "auth.forgotPassword.success.passwordChanged": "პაროლი წარმატებით შეიცვალა",
    "auth.forgotPassword.error.default": "შეცდომა",
    "auth.forgotPassword.error.sendCode": "ვერ მოხერხდა კოდის გაგზავნა",
    "auth.forgotPassword.error.reset": "ვერ მოხერხდა პაროლის შეცვლა",
    "auth.forgotPassword.otp.title": "ტელეფონის ნომრის დადასტურება",
    "auth.forgotPassword.otp.subtitle": "შეიყვანეთ SMS კოდი",

    // Auth - Register
    "auth.register.title.doctor": "ექიმის რეგისტრაცია",
    "auth.register.title.patient": "შექმენი ანგარიში",
    "auth.register.title.foreignPatient": "უცხოელი პაციენტის რეგისტრაცია",
    "auth.register.subtitle.doctor":
      "შემოგვიერთდი როგორც სამედიცინო მომსახურების მიმწოდებელი",
    "auth.register.subtitle.patient": "დაიწყე გამოყენება უფასოდ",
    "auth.register.subtitle.patientDescription":
      "მიიღე სამედიცინო მომსახურება სახლიდან გაუსვლელად",
    "auth.register.scanId.label": "დაასკანერე პირადობის მოწმობა",
    "auth.register.scanId.label.passport": "დაასკანერე პასპორტი",
    "auth.register.scanInfo.title": "ინფორმაცია",
    "auth.register.scanInfo.dataProtected": "თქვენი მონაცემები დაცულია",
    "auth.register.scanInfo.scanRequirement":
      "სკანირების დროს საჭიროა კარგი განათება და დოკუმენტის მკვეთრი გამოსახულება",
    "auth.register.scanInfo.ok": "გასაგებია",
    "auth.register.name.label": "სახელი და გვარი",
    "auth.register.name.placeholder": "შეიყვანე სრული სახელი",
    "auth.register.email.label": "ელ. ფოსტა",
    "auth.register.email.placeholder": "შეიყვანე ელ. ფოსტა",
    "auth.register.idNumber.label": "პირადი ნომერი",
    "auth.register.idNumber.label.passport": "ID",
    "auth.register.idNumber.placeholder": "პირადი ნომერი",
    "auth.register.idNumber.placeholder.passport": "ID",
    "auth.register.dob.label": "დაბადების თარიღი",
    "auth.register.dob.placeholder": "აირჩიე",
    "auth.register.nationality.label": "მოქალაქეობა",
    "auth.register.nationality.georgian": "ქართველი",
    "auth.register.nationality.georgianSub": "საქართველო",
    "auth.register.nationality.nonGeorgian": "არაქართველი",
    "auth.register.nationality.nonGeorgianSub": "სხვა",
    "auth.register.address.label": "ფაქტობრივი მისამართი",
    "auth.register.address.placeholder": "ქალაქი, რეგიონი, უბანი",
    "auth.register.passportInfo.title": "ინფორმაცია",
    "auth.register.passportInfo.message": "გთხოვთ ჩაწერეთ პასპორტის ნომერი",
    "auth.register.passportInfo.ok": "გასაგებია",
    "auth.register.phone.label": "ტელეფონი",
    "auth.register.phone.placeholder": "+995 5XX XX XX XX",
    "auth.register.password.label": "პაროლი",
    "auth.register.password.placeholder": "••••••••••",
    "auth.register.confirmPassword.label": "დაადასტურე პაროლი",
    "auth.register.confirmPassword.placeholder": "••••••••••",
    "auth.register.profile.label": "პროფილის ფოტო",
    "auth.register.profile.placeholder": "ატვირთე",
    "auth.register.profile.upload": "ატვირთე",
    "auth.register.profile.change": "შეცვალე ფოტო",
    "auth.register.profile.remove": "წაშლა",
    "auth.register.profile.uploading": "სურათი იტვირთება...",
    "auth.register.profile.hint": "დაშვებულია JPG/PNG/WebP • მაქს 5MB",
    "auth.register.submit": "დარეგისტრირდი",
    "auth.register.submitting": "რეგისტრაცია...",
    "auth.register.signin.question": "ანგარიში უკვე გაქვს?",
    "auth.register.signin.action": "შესვლა",
    "auth.register.tos.inlineText":
      "გავეცანი და ვეთანხმები „Medcompass“-ის სერვისის პირობებს და კონფიდენციალურობის პოლიტიკას.",
    "auth.register.tos.readMore": "წაიკითხე დეტალურად",
    "auth.register.tos.title":
      "სერვისის პირობები და კონფიდენციალურობის პოლიტიკა",
    "auth.register.tos.description":
      "გთხოვ, ყურადღებით გაეცნო ჩვენს სერვის პირობებს და კონფიდენციალურობის პოლიტიკას.",
    "auth.register.tos.checkboxLabel":
      "გავეცანი და ვეთანხმები „Medcompass“-ის სერვისის პირობებს და კონფიდენციალურობის პოლიტიკას.",
    "auth.register.tos.acceptButton": "ვეთანხმები",
    "auth.register.tos.cancelButton": "გაუქმება",
    "auth.register.tos.validationRequired":
      "რეგისტრაციისთვის უნდა დაეთანხმო Medcompass-ის სერვისის პირობებს და კონფიდენციალურობის პოლიტიკას.",

    "auth.register.validation.fillAll": "გთხოვთ შეავსოთ ყველა სავალდებულო ველი",
    "auth.register.validation.specialization": "გთხოვთ აირჩიოთ სპეციალობა",
    "auth.register.validation.degrees": "გთხოვთ შეიყვანოთ ხარისხი",
    "auth.register.validation.experience": "გთხოვთ შეიყვანოთ გამოცდილება",
    "auth.register.validation.location": "გთხოვთ შეიყვანოთ მისამართი",
    "auth.register.validation.passwordLength":
      "პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო",
    "auth.register.error.default": "შეცდომა რეგისტრაციისას",

    // Doctor specific
    "doctor.specialization.label": "სპეციალობა",
    "doctor.specialization.loading": "სპეციალობები იტვირთება...",
    "doctor.specialization.selectPlaceholder": "აირჩიე სპეციალობა",
    "doctor.specialization.valuePlaceholder": "",
    "doctor.specialization.helper": "შეგიძლია მონიშნო რამდენიმე სპეციალობა",
    "doctor.specialization.empty": "ჯერ სპეციალობები არ არის დამატებული.",
    "doctor.degrees.label": "ხარისხი",
    "doctor.degrees.placeholder": "",
    "doctor.experience.label": "სამუშაო გამოცდილება",
    "doctor.experience.placeholder": "",
    "doctor.location.label": "ფაქტობრივი მისამართი",
    "doctor.location.placeholder": "ქალაქი, რეგიონი, უბანი",
    "doctor.workingLanguage.label": "სამუშაო ენა",
    "doctor.workingLanguage.placeholder": "",
    "doctor.dob.label": "დაბადების თარიღი",
    "doctor.dob.placeholder": "აირჩიე",
    "doctor.gender.label": "სქესი",
    "doctor.gender.male": "მამრობითი",
    "doctor.gender.female": "მდედრობითი",
    "doctor.gender.other": "სხვა",
    "doctor.about.label": "შესახებ",
    "doctor.about.placeholder": "",
    "doctor.license.label": "სამედიცინო ლიცენზია (PDF)",
    "doctor.license.placeholder": "ატვირთე",
    "doctor.license.success": "✓ ფაილი წარმატებით აიტვირთა",
    "doctor.license.uploading": "იტვირთება...",
    "doctor.profile.label": "პროფილის ფოტო",
    "doctor.profile.placeholder": "აირჩიე პროფილის სურათი",
    "doctor.profile.upload": "ატვირთე საქმიანი ფოტო",
    "doctor.profile.change": "შეცვალე ფოტო",
    "doctor.profile.remove": "წაშლა",
    "doctor.profile.uploading": "სურათი იტვირთება...",
    "doctor.profile.hint": "დაშვებულია JPG/PNG/WebP • მაქს 5MB",
    "doctor.license.info.title": "სამედიცინო ლიცენზიის ატვირთვის ინსტრუქცია!",
    "doctor.license.info.message":
      "ლიცენზიის შეცვლა შესაძლებელია ადმინისტრატორის მხარდაჭერით.",
    "doctor.license.info.ok": "გასაგებია",
    "doctor.specialization.modalTitle": "აირჩიე სპეციალობა",
    "doctor.specialization.modalDone": "დადასტურება",
    "doctor.dob.modalTitle": "დაბადების თარიღი",
    "doctor.dob.modalCancel": "გაუქმება",
    "doctor.dob.modalDone": "დასრულება",

    // Tab bar (patient)
    "tabs.home": "მთავარი",
    "tabs.doctors": "ექიმები",
    "tabs.lab": "კვლევები",
    "tabs.appointments": "ჯავშნები",
    "tabs.aiAssistant": "AI",
    "tabs.history": "ისტორია",
    "tabs.settings": "პარამეტრები",

    // Appointments
    "appointments.tab.title": "ჩანიშნული ვიზიტები",
    "appointments.tab.filter.video": "ვიდეო",
    "appointments.tab.filter.visit": "ბინაზე",
    "appointments.tab.status.current": "მიმდინარე",
    "appointments.tab.notFound.title": "ჯავშანი ვერ მოიძებნა",
    "appointments.tab.notFound.hint": "სცადე განსხვავებული ფილტრით",
    "appointments.consultation.expired": "კონსულტაციის დრო ამოიწურა",
    "appointments.filtered.video.title": "მიმდინარე ვიდეო კონსულტაცია",
    "appointments.filtered.homeVisit.title": "მიმდინარე ვიზიტი ბინაზე",
    "appointments.filtered.video.emptyTitle":
      "მიმდინარე ვიდეო კონსულტაცია არ მოიძებნა",
    "appointments.filtered.homeVisit.emptyTitle":
      "მიმდინარე ვიზიტი ბინაზე არ მოიძებნა",
    "appointments.address.label": "მისამართი",
    "appointments.filtered.emptySubtitle": "ამ ტიპის ჯავშნები ჯერ არ გაქვთ",
    "appointments.filtered.loading": "ჯავშნების ჩატვირთვა...",
    "appointments.filtered.loadError": "ჯავშნების ჩატვირთვა ვერ მოხერხდა",
    "appointments.filtered.retry": "ხელახლა ცდა",
    "appointments.filtered.joinConsultation": "შესვლა კონსულტაციაზე",

    // Doctors — specialties
    "doctors.specialty.title": "სპეციალობა",
    "doctors.specialty.empty": "სპეციალობები არ მოიძებნა",
    "doctors.specialty.loading": "იტვირთება...",

    // Doctors — list screen
    "doctors.title": "ექიმები",
    "doctors.search.placeholder": "ექიმის ძებნა",
    "doctors.notFound.title": "ექიმი ვერ მოიძებნა",
    "doctors.notFound.hint": "სცადე განსხვავებული ფილტრით",
    "doctors.filter.all": "ყველა",
    "doctors.filter.video": "ვიდეო",
    "doctors.filter.visit": "ბინაზე",
    "doctors.fee.video": "ვიდეო",
    "doctors.fee.homeVisit": "ბინაზე",
    "doctors.loading": "ექიმების ჩატვირთვა...",
    "doctors.loadError": "ექიმების ჩატვირთვა ვერ მოხერხდა",
    "doctors.retry": "ხელახლა ცდა",
    "doctors.specialty.unknown": "უცნობი",

    // Home — quick services
    "home.services.title": "ჩემი სერვისები",
    "home.services.video.title": "ვიდეო კონსულტაცია ექიმთან",
    "home.services.homeVisit.title": "ექიმის ბინაზე გამოძახება",
    "home.services.lab.title": "სამედიცინო კვლევები",

    // Profile — language
    "profile.language.title": "ენა",

    // Home — AI assistant banner
    "home.aiAssistant.title": "AI ჯანმრთელობის ასისტენტი",
    "home.aiAssistant.description":
      "დასვი კითხვა შენთვის საინტერესო ჯანმრთელობის თემაზე",

    // AI assistant screen
    "aiAssistant.title": "AI ჯანმრთელობის ასისტენტი",
    "aiAssistant.poweredBy": "Powered by MedCompass",
    "aiAssistant.disclaimer":
      "შექმნილია ხელოვნური ინტელექტის მიერ. რეკომენდებულია შემოწმება",
    "aiAssistant.bannerDescription":
      "დასვი კითხვა შენთვის საინტერესო ჯანმრთელობის თემაზე",
    "aiAssistant.inputPlaceholder":
      "დასვი კითხვა შენთვის საინტერესო ჯანმრთელობის თემაზე",
    "aiAssistant.prompt.medcompass":
      "რა არის Medcompass? მითხარით ყველაფერი ამ სამედიცინო აპლიკაციის შესახებ — მისი ფუნქციები, დანიშნულება, სამიზნე აუდიტორია და როგორ მუშაობს იგი.",
    "aiAssistant.prompt.healthCheck":
      "შემიფასე ჯანმრთელობის მდგომარეობა, ჯანმრთელობის საერთო მაჩვენებლების საფუძველზე.",
    "aiAssistant.prompt.disease":
      "მომეცი დეტალური ინფორმაცია [დაავადების სახელი]-ის შესახებ.",

    // Role selection
    "roleSelection.title": "აირჩიე შენი როლი",
    "roleSelection.subtitle.authenticated":
      "აირჩიე რომელი ნაწილი გინდა გამოიყენო",
    "roleSelection.subtitle.guest": "აირჩიე რომელი პროფილით დავიწყოთ",
    "roleSelection.doctor.title": "მე ვარ ექიმი",
    "roleSelection.doctor.description":
      "შემოუერთდი როგორც სამედიცინო მომსახურების მიმწოდებელი",
    "roleSelection.patient.title": "მე ვარ პაციენტი",
    "roleSelection.patient.description": "მოძებნე ექიმი და დაჯავშნე ვიზიტი",
    "roleSelection.continue": "გასაგრძელებლად",
    "roleSelection.login.question": "უკვე გაქვს ანგარიში? ",
    "roleSelection.login.action": "შესვლა",
    "roleSelection.alert.selectRole": "გთხოვ აირჩიო როლი",
  },
  en: {
    // Generic
    "common.language.georgian": "ქართული",
    "common.language.english": "English",
    "common.language.russian": "Русский",
    "common.actions.close": "Close",
    "common.actions.continue": "Continue",
    "common.actions.ok": "OK",

    // Identomat
    "identomat.error.title": "Error",
    "identomat.error.idNotFound": "Personal ID not verified",
    "identomat.error.resultFailed": "Failed to get IDENTOMAT result",
    "identomat.success.verified": "Verified with IDENTOMAT",
    "identomat.success.completed":
      "IDENTOMAT verification completed successfully",

    // OTP Modal
    "otp.title": "Phone number confirmation",
    "otp.subtitle": "Enter SMS code",
    "otp.notReceived": "Didn't receive the code? Try again.",
    "otp.resendCode": "Resend code",
    "otp.resendCountdown": "Resend code ({{seconds}}s)",
    "otp.verify": "Confirm",
    "otp.skip": "Skip (temporary)",
    "otp.error.default": "Error",
    "otp.error.phoneRequired": "Please enter your phone number",
    "otp.error.phoneInvalid":
      "Please enter a valid phone number (9 digits, starting with 5)",
    "otp.error.codeRequired": "Please enter the 6-digit code",
    "otp.error.invalidCode": "Invalid verification code",
    "otp.error.sendCode": "Failed to send code",
    "otp.error.verifyFailed": "Verification failed",
    "otp.success.title": "Success",
    "otp.success.codeSent": "Verification code sent",
    "otp.success.verified": "Phone verified successfully",

    // Onboarding
    "onboarding.title": "MedCompass",
    "onboarding.description":
      "Innovative medical platform for reliable and high-quality services.",

    // Auth - Login
    "auth.login.title": "Welcome",
    "auth.login.email.label": "Email",
    "auth.login.email.placeholder": "Enter your email",
    "auth.login.password.label": "Password",
    "auth.login.password.placeholder": "••••••••••",
    "auth.login.rememberMe": "Save account",
    "auth.login.forgotPassword": "Forgot password?",
    "auth.login.submit": "Log in",
    "auth.login.submitting": "Logging in...",
    "auth.login.signup.question": "Don't have an account?",
    "auth.login.signup.action": "Sign Up",
    "auth.login.language.title": "Language",
    "auth.login.validation.fillAll": "Please fill in all fields",
    "auth.login.error.default": "Error while logging in",
    "auth.login.error.invalidCredentials":
      "Incorrect email address or password",
    "auth.login.error.userNotFound": "User not found",
    "auth.login.error.invalidEmail": "Invalid email format",

    // Auth - Forgot password
    "auth.forgotPassword.title": "Forgot password?",
    "auth.forgotPassword.subtitle":
      "Enter your phone number and change password",
    "auth.forgotPassword.titleReset": "Reset password",
    "auth.forgotPassword.subtitleReset": "Enter your new password",
    "auth.forgotPassword.phone.label": "Phone number",
    "auth.forgotPassword.phone.placeholder": "5XX XXX XXX",
    "auth.forgotPassword.sendCode": "Send code",
    "auth.forgotPassword.sending": "Sending...",
    "auth.forgotPassword.newPassword.label": "New password",
    "auth.forgotPassword.confirmPassword.label": "Confirm password",
    "auth.forgotPassword.resetButton": "Change password",
    "auth.forgotPassword.resetting": "Changing...",
    "auth.forgotPassword.backToLogin": "Back",
    "auth.forgotPassword.validation.phoneRequired":
      "Please enter your phone number",
    "auth.forgotPassword.validation.phoneInvalid":
      "Please enter a valid phone number (9 digits, starting with 5)",
    "auth.forgotPassword.validation.passwordRequired":
      "Please enter a new password",
    "auth.forgotPassword.validation.passwordLength":
      "Password must be at least 6 characters",
    "auth.forgotPassword.validation.passwordMismatch": "Passwords do not match",
    "auth.forgotPassword.success.title": "Success",
    "auth.forgotPassword.success.codeSent": "Verification code sent via SMS",
    "auth.forgotPassword.success.passwordChanged":
      "Password changed successfully",
    "auth.forgotPassword.error.default": "Error",
    "auth.forgotPassword.error.sendCode": "Failed to send code",
    "auth.forgotPassword.error.reset": "Failed to change password",
    "auth.forgotPassword.otp.title": "Phone number confirmation",
    "auth.forgotPassword.otp.subtitle": "Enter SMS code",

    // Auth - Register
    "auth.register.title.doctor": "Register as a doctor",
    "auth.register.title.patient": "Create an account",
    "auth.register.title.foreignPatient": "Foreign patient registration",
    "auth.register.subtitle.doctor":
      "Join our platform as a healthcare provider",
    "auth.register.subtitle.patient": "Start using the app for free",
    "auth.register.subtitle.patientDescription":
      "Access to medical services from home",
    "auth.register.scanId.label": "Scan ID card",
    "auth.register.scanId.label.passport": "Scan passport",
    "auth.register.scanInfo.title": "Information",
    "auth.register.scanInfo.dataProtected": "Your personal data is protected",
    "auth.register.scanInfo.scanRequirement":
      "Good lighting and a sharp image of the document are required when scanning",
    "auth.register.scanInfo.ok": "OK",
    "auth.register.name.label": "Full name",
    "auth.register.name.placeholder": "Enter your full name",
    "auth.register.email.label": "e-mail",
    "auth.register.email.placeholder": "Enter your e-mail",
    "auth.register.idNumber.label": "ID",
    "auth.register.idNumber.label.passport": "ID",
    "auth.register.idNumber.placeholder": "ID",
    "auth.register.idNumber.placeholder.passport": "ID",
    "auth.register.dob.label": "Date of birth",
    "auth.register.dob.placeholder": "Select",
    "auth.register.nationality.label": "Citizenship",
    "auth.register.nationality.georgian": "Georgian",
    "auth.register.nationality.georgianSub": "Georgia",
    "auth.register.nationality.nonGeorgian": "Non-Georgian",
    "auth.register.nationality.nonGeorgianSub": "Other",
    "auth.register.address.label": "Address",
    "auth.register.address.placeholder": "City, region, district",
    "auth.register.passportInfo.title": "Information",
    "auth.register.passportInfo.message": "Please enter your passport number",
    "auth.register.passportInfo.ok": "OK",
    "auth.register.phone.label": "Phone",
    "auth.register.phone.placeholder": "+995 5XX XX XX XX",
    "auth.register.password.label": "Password",
    "auth.register.password.placeholder": "••••••••••",
    "auth.register.confirmPassword.label": "Confirm password",
    "auth.register.confirmPassword.placeholder": "••••••••••",
    "auth.register.profile.label": "Profile photo",
    "auth.register.profile.placeholder": "Upload",
    "auth.register.profile.upload": "Upload",
    "auth.register.profile.change": "Change photo",
    "auth.register.profile.remove": "Remove",
    "auth.register.profile.uploading": "Uploading image...",
    "auth.register.profile.hint": "JPG/PNG/WebP allowed • Max 5MB",
    "auth.register.submit": "Sign up",
    "auth.register.submitting": "Signing up...",
    "auth.register.signin.question": "Already have an account?",
    "auth.register.signin.action": "Log in",
    "auth.register.tos.inlineText":
      "I have read and agree to Medcompass Terms of Service and Privacy Policy.",
    "auth.register.tos.readMore": "Read in detail",
    "auth.register.tos.title": "Terms of Service and Privacy Policy",
    "auth.register.tos.description":
      "Please read our Terms of Service and Privacy Policy carefully.",
    "auth.register.tos.checkboxLabel":
      "I have read and agree to Medcompass Terms of Service and Privacy Policy.",
    "auth.register.tos.acceptButton": "I agree",
    "auth.register.tos.cancelButton": "Cancel",
    "auth.register.tos.validationRequired":
      "You must agree to Medcompass Terms of Service and Privacy Policy to complete registration.",

    "auth.register.validation.fillAll": "Please fill in all required fields",
    "auth.register.validation.specialization":
      "Please choose at least one specialty",
    "auth.register.validation.degrees": "Please enter your degree",
    "auth.register.validation.experience": "Please enter your work experience",
    "auth.register.validation.location": "Please enter your address",
    "auth.register.validation.passwordLength":
      "Password must be at least 6 characters",
    "auth.register.error.default": "Error while registering",

    // Doctor specific
    "doctor.specialization.label": "Specialty",
    "doctor.specialization.loading": "Loading specialties...",
    "doctor.specialization.selectPlaceholder": "Choose specialty",
    "doctor.specialization.valuePlaceholder": "",
    "doctor.specialization.helper": "You can select multiple specialties",
    "doctor.specialization.empty": "No specialties have been added yet.",
    "doctor.degrees.label": "Degree",
    "doctor.degrees.placeholder": "",
    "doctor.experience.label": "Work experience",
    "doctor.experience.placeholder": "",
    "doctor.location.label": "Address",
    "doctor.location.placeholder": "City, region, district",
    "doctor.workingLanguage.label": "Working language",
    "doctor.workingLanguage.placeholder": "",
    "doctor.dob.label": "Date of birth",
    "doctor.dob.placeholder": "Select",
    "doctor.gender.label": "Gender",
    "doctor.gender.male": "Male",
    "doctor.gender.female": "Female",
    "doctor.gender.other": "Other",
    "doctor.about.label": "About",
    "doctor.about.placeholder": "",
    "doctor.license.label": "Medical license (PDF)",
    "doctor.license.placeholder": "Upload",
    "doctor.license.success": "✓ File uploaded successfully",
    "doctor.license.uploading": "Uploading...",
    "doctor.profile.label": "Profile photo",
    "doctor.profile.placeholder": "Choose profile photo",
    "doctor.profile.upload": "Upload professional photo",
    "doctor.profile.change": "Change photo",
    "doctor.profile.remove": "Remove",
    "doctor.profile.uploading": "Uploading image...",
    "doctor.profile.hint": "JPG/PNG/WebP allowed • Max 5MB",
    "doctor.license.info.title": "Medical license upload instructions!",
    "doctor.license.info.message":
      "License can only be changed through administrator support.",
    "doctor.license.info.ok": "OK",
    "doctor.specialization.modalTitle": "Choose specialty",
    "doctor.specialization.modalDone": "Confirm",
    "doctor.dob.modalTitle": "Choose date of birth",
    "doctor.dob.modalCancel": "Cancel",
    "doctor.dob.modalDone": "Done",

    // Tab bar (patient)
    "tabs.home": "Dashboard",
    "tabs.doctors": "Doctors",
    "tabs.lab": "Lab",
    "tabs.appointments": "Appointments",
    "tabs.aiAssistant": "AI",
    "tabs.history": "Visit History",
    "tabs.settings": "Settings",

    // Appointments
    "appointments.tab.title": "Scheduled Visits",
    "appointments.tab.filter.video": "video",
    "appointments.tab.filter.visit": "Visit",
    "appointments.tab.status.current": "Current",
    "appointments.tab.notFound.title": "Booking not found",
    "appointments.tab.notFound.hint": "Try a different filter",
    "appointments.consultation.expired": "Consultation expired",
    "appointments.filtered.video.title": "Current Video consultation",
    "appointments.filtered.homeVisit.title": "Current Home Visit",
    "appointments.filtered.video.emptyTitle":
      "No current video consultation found",
    "appointments.filtered.homeVisit.emptyTitle": "No current home visit found",
    "appointments.address.label": "Address",
    "appointments.filtered.emptySubtitle":
      "You don't have appointments of this type yet",
    "appointments.filtered.loading": "Loading appointments...",
    "appointments.filtered.loadError": "Failed to load appointments",
    "appointments.filtered.retry": "Try again",
    "appointments.filtered.joinConsultation": "Join consultation",

    // Doctors — specialties
    "doctors.specialty.title": "Specialty",
    "doctors.specialty.empty": "No specialties found",
    "doctors.specialty.loading": "Loading...",

    // Doctors — list screen
    "doctors.title": "Doctors",
    "doctors.search.placeholder": "Search doctor",
    "doctors.notFound.title": "Doctor not found",
    "doctors.notFound.hint": "Try different filter",
    "doctors.filter.all": "All",
    "doctors.filter.video": "video",
    "doctors.filter.visit": "Visit",
    "doctors.fee.video": "video",
    "doctors.fee.homeVisit": "Visit",
    "doctors.loading": "Loading doctors...",
    "doctors.loadError": "Failed to load doctors",
    "doctors.retry": "Try again",
    "doctors.specialty.unknown": "Unknown",

    // Home — quick services
    "home.services.title": "My Services",
    "home.services.video.title": "Doctor Video consultation",
    "home.services.homeVisit.title": "Doctor Home Visit",
    "home.services.lab.title": "Medical examinations & Lab",

    // Profile — language
    "profile.language.title": "Language",

    // Home — AI assistant banner
    "home.aiAssistant.title": "AI Health Assistant",
    "home.aiAssistant.description": "Ask a question about health topic",

    // AI assistant screen
    "aiAssistant.title": "AI Health Assistant",
    "aiAssistant.poweredBy": "Powered by MedCompass",
    "aiAssistant.disclaimer": "Generated by AI. Review Recommended",
    "aiAssistant.bannerDescription":
      "Ask a question about health topic that interests you",
    "aiAssistant.inputPlaceholder":
      "Ask a question about health topic that interests you",
    "aiAssistant.prompt.medcompass":
      "Tell me everything about this medical app — its features, purpose, target users, and how it works.",
    "aiAssistant.prompt.healthCheck":
      "Check health condition based on general health indicators.",
    "aiAssistant.prompt.disease":
      "Give me detailed information about disease [name].",

    // Role selection
    "roleSelection.title": "Choose your role",
    "roleSelection.subtitle.authenticated":
      "Choose which part of the app you want to use",
    "roleSelection.subtitle.guest":
      "Choose which profile you want to start with",
    "roleSelection.doctor.title": "I am a doctor",
    "roleSelection.doctor.description": "Join as a healthcare service provider",
    "roleSelection.patient.title": "I am a patient",
    "roleSelection.patient.description":
      "Find a doctor and book an appointment",
    "roleSelection.continue": "Continue",
    "roleSelection.login.question": "Already have an account? ",
    "roleSelection.login.action": "Log in",
    "roleSelection.alert.selectRole": "Please select a role",
  },
  ru: {
    // Generic
    "common.language.georgian": "ქართული",
    "common.language.english": "English",
    "common.language.russian": "Русский",
    "common.actions.close": "Закрыть",
    "common.actions.continue": "Продолжить",
    "common.actions.ok": "OK",

    // Identomat
    "identomat.error.title": "Ошибка",
    "identomat.error.idNotFound": "Документ не верифицирован",
    "identomat.error.resultFailed": "Не удалось получить результат IDENTOMAT",
    "identomat.success.verified": "Подтверждено через IDENTOMAT",
    "identomat.success.completed":
      "Идентификация через IDENTOMAT успешно завершена",

    // OTP Modal
    "otp.title": "Подтверждение номера телефона",
    "otp.subtitle": "Введите SMS-код",
    "otp.notReceived": "Не получили код? Попробуйте снова.",
    "otp.resendCode": "Повторно отправить код",
    "otp.resendCountdown": "Повторно отправить код ({{seconds}}с)",
    "otp.verify": "Подтвердить",
    "otp.skip": "Пропустить (временно)",
    "otp.error.default": "Ошибка",
    "otp.error.phoneRequired": "Пожалуйста, введите номер телефона",
    "otp.error.phoneInvalid":
      "Пожалуйста, введите корректный номер (9 цифр, начинается с 5)",
    "otp.error.codeRequired": "Пожалуйста, введите 6-значный код",
    "otp.error.invalidCode": "Неверный код подтверждения",
    "otp.error.sendCode": "Не удалось отправить код",
    "otp.error.verifyFailed": "Не удалось подтвердить",
    "otp.success.title": "Успешно",
    "otp.success.codeSent": "Код подтверждения отправлен",
    "otp.success.verified": "Телефон успешно подтверждён",

    // Onboarding
    "onboarding.title": "MedCompass",
    "onboarding.description":
      "Инновационная медицинская платформа для надёжного и качественного обслуживания.",

    // Auth - Login
    "auth.login.title": "Добро пожаловать",
    "auth.login.email.label": "Эл. почта",
    "auth.login.email.placeholder": "Введите эл. почту",
    "auth.login.password.label": "Пароль",
    "auth.login.password.placeholder": "••••••••••",
    "auth.login.rememberMe": "Запомнить аккаунт",
    "auth.login.forgotPassword": "Забыли пароль?",
    "auth.login.submit": "Войти",
    "auth.login.submitting": "Вход...",
    "auth.login.signup.question": "Нет аккаунта?",
    "auth.login.signup.action": "Регистрация",
    "auth.login.language.title": "Выберите язык",
    "auth.login.validation.fillAll": "Пожалуйста, заполните все поля",
    "auth.login.error.default": "Ошибка при входе",
    "auth.login.error.invalidCredentials":
      "Неверный адрес эл. почты или пароль",
    "auth.login.error.userNotFound": "Пользователь не найден",
    "auth.login.error.invalidEmail": "Неверный формат эл. почты",

    // Auth - Forgot password
    "auth.forgotPassword.title": "Забыли пароль?",
    "auth.forgotPassword.subtitle": "Введите номер телефона и обновите пароль",
    "auth.forgotPassword.titleReset": "Восстановление пароля",
    "auth.forgotPassword.subtitleReset": "Введите новый пароль",
    "auth.forgotPassword.phone.label": "Номер телефона",
    "auth.forgotPassword.phone.placeholder": "5XX XXX XXX",
    "auth.forgotPassword.sendCode": "Отправить код",
    "auth.forgotPassword.sending": "Отправка...",
    "auth.forgotPassword.newPassword.label": "Новый пароль",
    "auth.forgotPassword.confirmPassword.label": "Подтвердите пароль",
    "auth.forgotPassword.resetButton": "Изменить пароль",
    "auth.forgotPassword.resetting": "Изменение...",
    "auth.forgotPassword.backToLogin": "Страница авторизации",
    "auth.forgotPassword.validation.phoneRequired":
      "Пожалуйста, введите номер телефона",
    "auth.forgotPassword.validation.phoneInvalid":
      "Пожалуйста, введите корректный номер (9 цифр, начинается с 5)",
    "auth.forgotPassword.validation.passwordRequired":
      "Пожалуйста, введите новый пароль",
    "auth.forgotPassword.validation.passwordLength":
      "Пароль должен содержать не менее 6 символов",
    "auth.forgotPassword.validation.passwordMismatch": "Пароли не совпадают",
    "auth.forgotPassword.success.title": "Успешно",
    "auth.forgotPassword.success.codeSent":
      "Код подтверждения отправлен по SMS",
    "auth.forgotPassword.success.passwordChanged": "Пароль успешно изменён",
    "auth.forgotPassword.error.default": "Ошибка",
    "auth.forgotPassword.error.sendCode": "Не удалось отправить код",
    "auth.forgotPassword.error.reset": "Не удалось изменить пароль",
    "auth.forgotPassword.otp.title": "Подтверждение номера телефона",
    "auth.forgotPassword.otp.subtitle": "Введите SMS-код",

    // Auth - Register
    "auth.register.title.doctor": "Регистрация врача",
    "auth.register.title.patient": "Создать аккаунт",
    "auth.register.title.foreignPatient": "Регистрация иностранного пациента",
    "auth.register.subtitle.doctor":
      "Присоединяйтесь к платформе как поставщик медицинских услуг",
    "auth.register.subtitle.patient":
      "Начните пользоваться приложением бесплатно",
    "auth.register.subtitle.patientDescription":
      "Медицинские услуги, не выходя из дома",
    "auth.register.scanId.label": "Сканируйте удостоверение личности",
    "auth.register.scanId.label.passport": "Отсканируйте паспорт",
    "auth.register.scanInfo.title": "Информация",
    "auth.register.scanInfo.dataProtected": "Ваши персональные данные защищены",
    "auth.register.scanInfo.scanRequirement":
      "Для сканирования необходимы качественное освещение и четкое изображение документа",
    "auth.register.scanInfo.ok": "Понятно",
    "auth.register.name.label": "Имя и фамилия",
    "auth.register.name.placeholder": "Введите полное имя",
    "auth.register.email.label": "Адрес электронной почты",
    "auth.register.email.placeholder": "Введите адрес электронной почты",
    "auth.register.idNumber.label": "ID",
    "auth.register.idNumber.label.passport": "ID",
    "auth.register.idNumber.placeholder": "ID",
    "auth.register.idNumber.placeholder.passport": "ID",
    "auth.register.dob.label": "Дата рождения",
    "auth.register.dob.placeholder": "Выберите",
    "auth.register.nationality.label": "Гражданство",
    "auth.register.nationality.georgian": "Грузин",
    "auth.register.nationality.georgianSub": "Грузия",
    "auth.register.nationality.nonGeorgian": "Не грузин",
    "auth.register.nationality.nonGeorgianSub": "Другое",
    "auth.register.address.label": "Адрес проживания",
    "auth.register.address.placeholder": "Город, регион, район",
    "auth.register.passportInfo.title": "Информация",
    "auth.register.passportInfo.message": "Пожалуйста, введите номер паспорта",
    "auth.register.passportInfo.ok": "Понятно",
    "auth.register.phone.label": "Телефон",
    "auth.register.phone.placeholder": "+995 5XX XX XX XX",
    "auth.register.password.label": "Пароль",
    "auth.register.password.placeholder": "••••••••••",
    "auth.register.confirmPassword.label": "Подтвердите пароль",
    "auth.register.confirmPassword.placeholder": "••••••••••",
    "auth.register.profile.label": "Фото профиля",
    "auth.register.profile.placeholder": "Загрузить",
    "auth.register.profile.upload": "Загрузить",
    "auth.register.profile.change": "Изменить фото",
    "auth.register.profile.remove": "Удалить",
    "auth.register.profile.uploading": "Загрузка изображения...",
    "auth.register.profile.hint": "Допустимы JPG/PNG/WebP • Макс. 5MB",
    "auth.register.submit": "Зарегистрироваться",
    "auth.register.submitting": "Регистрация...",
    "auth.register.signin.question": "Уже есть аккаунт?",
    "auth.register.signin.action": "Войти",
    "auth.register.tos.inlineText":
      "Ознакомился и согласен с Условиями предоставления услуг и Политикой конфиденциальности Medcompass",
    "auth.register.tos.readMore": "Подробнее",
    "auth.register.tos.title":
      "Условия предоставления услуг и Политика конфиденциальности",
    "auth.register.tos.description":
      "Пожалуйста, внимательно ознакомьтесь с Условиями использования и Политикой конфиденциальности.",
    "auth.register.tos.checkboxLabel":
      "Ознакомился и согласен с Условиями предоставления услуг и Политикой конфиденциальности Medcompass",
    "auth.register.tos.acceptButton": "Согласен",
    "auth.register.tos.cancelButton": "Отмена",
    "auth.register.tos.validationRequired":
      "Для завершения регистрации необходимо согласиться с Условиями и Политикой конфиденциальности Medcompass.",

    "auth.register.validation.fillAll":
      "Пожалуйста, заполните все обязательные поля",
    "auth.register.validation.specialization":
      "Пожалуйста, выберите специальность",
    "auth.register.validation.degrees": "Пожалуйста, укажите степень",
    "auth.register.validation.experience": "Пожалуйста, укажите опыт работы",
    "auth.register.validation.location": "Пожалуйста, укажите адрес",
    "auth.register.validation.passwordLength":
      "Пароль должен содержать не менее 6 символов",
    "auth.register.error.default": "Ошибка при регистрации",

    // Doctor specific
    "doctor.specialization.label": "Специальность",
    "doctor.specialization.loading": "Загрузка специальностей...",
    "doctor.specialization.selectPlaceholder": "Выберите специальность",
    "doctor.specialization.valuePlaceholder": "",
    "doctor.specialization.helper": "Можно выбрать несколько специальностей",
    "doctor.specialization.empty": "Специальности ещё не добавлены.",
    "doctor.degrees.label": "Степень",
    "doctor.degrees.placeholder": "",
    "doctor.experience.label": "Опыт работы",
    "doctor.experience.placeholder": "",
    "doctor.location.label": "Адрес проживания",
    "doctor.location.placeholder": "Город, регион, район",
    "doctor.workingLanguage.label": "Рабочий язык",
    "doctor.workingLanguage.placeholder": "",
    "doctor.dob.label": "Дата рождения",
    "doctor.dob.placeholder": "Выберите",
    "doctor.gender.label": "Пол",
    "doctor.gender.male": "Мужской",
    "doctor.gender.female": "Женский",
    "doctor.gender.other": "Другое",
    "doctor.about.label": "О враче",
    "doctor.about.placeholder": "",
    "doctor.license.label": "Лицензия врача (PDF)",
    "doctor.license.placeholder": "Загрузить",
    "doctor.license.success": "✓ Файл успешно загружен",
    "doctor.license.uploading": "Загрузка...",
    "doctor.profile.label": "Фото профиля",
    "doctor.profile.placeholder": "Выберите фото профиля",
    "doctor.profile.upload": "Загрузите официальное фото",
    "doctor.profile.change": "Изменить фото",
    "doctor.profile.remove": "Удалить",
    "doctor.profile.uploading": "Загрузка изображения...",
    "doctor.profile.hint": "Допустимы JPG/PNG/WebP • Макс. 5MB",
    "doctor.license.info.title": "Инструкция по загрузке медицинской лицензии!",
    "doctor.license.info.message":
      "Изменить лицензию можно только через администратора.",
    "doctor.license.info.ok": "Понятно",
    "doctor.specialization.modalTitle": "Выберите специальность",
    "doctor.specialization.modalDone": "Подтвердить",
    "doctor.dob.modalTitle": "Дата рождения",
    "doctor.dob.modalCancel": "Отмена",
    "doctor.dob.modalDone": "Готово",

    // Tab bar (patient)
    "tabs.home": "Главная",
    "tabs.doctors": "Врачи",
    "tabs.lab": "Анализы",
    "tabs.appointments": "Мои записи",
    "tabs.aiAssistant": "AI",
    "tabs.history": "История визитов",
    "tabs.settings": "Настройки",

    // Appointments
    "appointments.tab.title": "Запланированный Визит",
    "appointments.tab.filter.video": "видео",
    "appointments.tab.filter.visit": "Визит",
    "appointments.tab.status.current": "Текущий",
    "appointments.tab.notFound.title": "Бронирование не найдено",
    "appointments.tab.notFound.hint": "Попробуйте другой фильтр",
    "appointments.consultation.expired": "Время консультации истекло",
    "appointments.filtered.video.title": "Текущая видеоконсультация",
    "appointments.filtered.homeVisit.title": "Текущий визит врача",
    "appointments.filtered.video.emptyTitle":
      "Текущая видеоконсультация не найдена",
    "appointments.filtered.homeVisit.emptyTitle":
      "Текущий визит врача не найден",
    "appointments.address.label": "Адрес",
    "appointments.filtered.emptySubtitle": "У вас пока нет записей этого типа",
    "appointments.filtered.loading": "Загрузка записей...",
    "appointments.filtered.loadError": "Не удалось загрузить записи",
    "appointments.filtered.retry": "Повторить",
    "appointments.filtered.joinConsultation": "Войти в консультацию",

    // Doctors — specialties
    "doctors.specialty.title": "Специальность",
    "doctors.specialty.empty": "Специальности не найдены",
    "doctors.specialty.loading": "Загрузка...",

    // Doctors — list screen
    "doctors.title": "Врачи",
    "doctors.search.placeholder": "Поиск врача",
    "doctors.notFound.title": "Врач не найден",
    "doctors.notFound.hint": "Попробуйте другой фильтр",
    "doctors.filter.all": "Все",
    "doctors.filter.video": "видео",
    "doctors.filter.visit": "Визит",
    "doctors.fee.video": "видео",
    "doctors.fee.homeVisit": "Визит",
    "doctors.loading": "Загрузка врачей...",
    "doctors.loadError": "Не удалось загрузить врачей",
    "doctors.retry": "Повторить",
    "doctors.specialty.unknown": "Неизвестно",

    // Home — quick services
    "home.services.title": "Мои сервисы",
    "home.services.video.title": "Видеоконсультация врача",
    "home.services.homeVisit.title": "Домашние визиты врача",
    "home.services.lab.title": "Исследования и анализы",

    // Profile — language
    "profile.language.title": "Язык",

    // Home — AI assistant banner
    "home.aiAssistant.title": "AI ассистент по здоровью",
    "home.aiAssistant.description": "Задайте вопрос на тему здоровья",

    // AI assistant screen
    "aiAssistant.title": "AI ассистент по здоровью",
    "aiAssistant.poweredBy": "Powered by MedCompass",
    "aiAssistant.disclaimer": "Создано ИИ. Рекомендуется проверка",
    "aiAssistant.bannerDescription":
      "Задайте вопрос по интересующему вас вопросу о здоровье",
    "aiAssistant.inputPlaceholder":
      "Задайте вопрос по интересующему вас вопросу о здоровье",
    "aiAssistant.prompt.medcompass":
      "Что такое Medcompass? Расскажите мне всё об этом медицинском приложении — его функции, назначение, целевую аудиторию и принцип работы.",
    "aiAssistant.prompt.healthCheck":
      "Оцени состояние здоровья на основе общих показателей здоровья.",
    "aiAssistant.prompt.disease":
      "Дай мне подробную информацию о [название болезни].",

    // Role selection
    "roleSelection.title": "Выберите роль",
    "roleSelection.subtitle.authenticated":
      "Выберите, какую часть приложения вы хотите использовать",
    "roleSelection.subtitle.guest": "Выберите, с какого профиля начать",
    "roleSelection.doctor.title": "Я врач",
    "roleSelection.doctor.description":
      "Присоединяйтесь как поставщик медицинских услуг",
    "roleSelection.patient.title": "Я пациент",
    "roleSelection.patient.description": "Найдите врача и запишитесь на приём",
    "roleSelection.continue": "Продолжить",
    "roleSelection.login.question": "Уже есть аккаунт? ",
    "roleSelection.login.action": "Войти",
    "roleSelection.alert.selectRole": "Пожалуйста, выберите роль",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>("ka");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored === "ka" || stored === "en" || stored === "ru") {
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
