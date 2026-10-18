import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    // Brand
    brandName: 'MediResQ',
    brandTagline: 'AI Healthcare Navigation & Physical Resource Platform',
    
    // Auth & Roles
    signIn: 'Sign In',
    register: 'Create Account',
    logout: 'Sign Out',
    selectRole: 'Step 1: Select Your Role to Register',
    selectRoleDesc: 'Choose how you will be using MediResQ. Each account type is customized for your specific workflow.',
    rolePatient: 'Patient / Citizen',
    rolePatientDesc: 'AI Symptom checker, skin/prescription scan, verified physical resources, home delivery medicine ordering.',
    roleDoctor: 'Doctor / Clinician',
    roleDoctorDesc: 'WHO triage emergency queue, prioritize nearby critical emergencies, teleconsultation & digital prescription.',
    rolePharmacy: 'Pharmacy / Medical Store',
    rolePharmacyDesc: 'Live medicine inventory, stock management, home delivery order fulfillment with dispatch tracking.',
    roleHospital: 'Hospital Representative',
    roleHospitalDesc: 'Emergency department triage, 24/7 ICU/trauma bed readiness, critical patient handoff coordination.',
    
    // Common Form Fields
    fullName: 'Full Name',
    phone: 'Phone Number',
    email: 'Email (Optional)',
    password: 'Password',
    languagePref: 'Preferred Language',
    continue: 'Continue to Details',
    back: 'Back',
    submitRegister: 'Complete Registration',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    
    // Doctor Specific Fields
    specialties: 'Medical Specialties (e.g. Cardiology, General Medicine, Pediatrics)',
    qualifications: 'Qualifications (e.g. MBBS, MD, MS)',
    medicalRegistrationNumber: 'Medical Council Registration Number',
    registrationCouncil: 'State Medical Council',
    consultationFee: 'Consultation Fee (₹)',
    clinicAddress: 'Clinic / Hospital Address',
    workingHoursStart: 'Available From (Time)',
    workingHoursEnd: 'Available Until (Time)',
    
    // Pharmacy Specific Fields
    storeName: 'Medical Store / Pharmacy Name',
    drugLicenseNumber: 'Drug License Number (DL No.)',
    gstin: 'GSTIN Number (Optional)',
    homeDeliveryAvailable: 'Can you deliver medicines at patient home?',
    yesDelivery: 'Yes, Home Delivery Available',
    noDelivery: 'No, In-store Pickup Only',
    deliveryRadiusKm: 'Home Delivery Radius (Kilometers)',
    operatingHours: 'Operating Hours (e.g. 08:00 AM - 10:00 PM)',
    pharmacyAddress: 'Pharmacy Street Address & Landmark',
    city: 'City',
    state: 'State',
    
    // Hospital Specific Fields
    hospitalName: 'Hospital / Trauma Center Name',
    hospitalRegNo: 'Hospital Registration / NABH Number',
    emergency247: '24/7 Emergency Department Available?',
    traumaLevel: 'Trauma Care Level',
    emergencyHotlines: 'Emergency Hotline Numbers',
    hospitalAddress: 'Hospital Address',
    
    // Patient Specific Fields
    age: 'Age (Years)',
    gender: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    emergencyContactName: 'Emergency Contact Person Name',
    emergencyContactPhone: 'Emergency Contact Phone Number',
    deliveryAddress: 'Home Address (for Medicine Delivery)',
    
    // Navigation & Sidebar
    navSymptomIntake: 'Symptom Triage',
    navSkinPrescription: 'Skin & Bill Scanner',
    navHospitals: 'Nearby Hospitals',
    navMedicines: 'Medicine Stock & Delivery',
    navDoctorConnect: 'Consult Doctors',
    navMyOrders: 'My Delivery Orders',
    
    navDoctorQueue: 'Priority Emergency Queue',
    navActiveConsultations: 'Active Consultations',
    navDoctorProfile: 'Clinical Profile & Hours',
    
    navPharmacyInventory: 'Inventory & Stock',
    navPharmacyOrders: 'Delivery Orders',
    navPharmacyAlerts: 'Low Stock Alerts',
    
    // Triage Badges
    p0Emergency: 'P0 - CRITICAL EMERGENCY (Immediate Care)',
    p1Urgent: 'P1 - URGENT (Under 30 Mins)',
    p2Priority: 'P2 - PRIORITY (Under 2 Hours)',
    p3Routine: 'P3 - ROUTINE (General Consultation)',
    
    // Scanner
    scannerTitle: 'AI Vision & Document Scanner',
    scannerSubtitle: 'Upload a photo of your skin for infection analysis OR scan a prescription/medical bill to order medicine.',
    scanSkinTab: 'Skin Infection Analysis',
    scanPrescriptionTab: 'Prescription / Medical Bill OCR',
    uploadSkinPhoto: 'Upload Skin Rash / Infection Photo',
    uploadPrescription: 'Upload Prescription or Medical Bill',
    analyzingImage: 'AI Neural Model analyzing visual image...',
    skinAnalysisResult: 'Skin Infection Clinical Analysis',
    prescriptionResult: 'Prescription OCR Extracted Medicines',
    orderFromPharmacyBtn: 'Order Medicines for Home Delivery',
    
    // Orders & Tracking
    orderStatusPlaced: 'Order Placed',
    orderStatusConfirmed: 'Order Confirmed',
    orderStatusPacked: 'Packed & Ready',
    orderStatusOutForDelivery: 'Out for Delivery',
    orderStatusDelivered: 'Delivered',
    liveOrderTracking: 'Live Delivery Status',
    estimatedTime: 'Estimated Time',
    trackOrder: 'Track Order',
    noOrdersYet: 'No medicine delivery orders yet.',
    
    // Footer
    emergencyCallText: 'National Emergency Hotline: 112 / 108',
    disclaimerText: 'MediResQ provides medical decision-support and logistics routing. In life-threatening emergencies, call 112 immediately.',
  },
  
  hi: {
    // Brand
    brandName: 'मेडीरेस्क्यू (MediResQ)',
    brandTagline: 'एआई स्वास्थ्य मार्गदर्शन एवं सत्यापित भौतिक संसाधन मंच',
    
    // Auth & Roles
    signIn: 'लॉग इन करें',
    register: 'खाता बनाएं',
    logout: 'लॉग आउट',
    selectRole: 'चरण 1: पंजीकरण हेतु अपनी भूमिका चुनें',
    selectRoleDesc: 'चुनें कि आप मेडीरेस्क्यू का उपयोग कैसे करेंगे। प्रत्येक प्रकार का खाता आपकी आवश्यकताओं के अनुरूप है।',
    rolePatient: 'रोगी / नागरिक',
    rolePatientDesc: 'एआई लक्षण जांच, त्वचा/दवा पर्ची स्कैनर, सत्यापित अस्पताल एवं घर पर दवा डिलीवरी।',
    roleDoctor: 'डॉक्टर / चिकित्सक',
    roleDoctorDesc: 'आपातकालीन प्राथमिकता कतार, पास के आपात मामलों की प्राथमिकता, टेलीकंसल्टेशन व डिजिटल पर्चा।',
    rolePharmacy: 'मेडिकल स्टोर / फार्मेसी',
    rolePharmacyDesc: 'दवाओं का लाइव स्टॉक प्रबंधन, होम डिलीवरी ऑर्डर स्वीकारना और लाइव ट्रैकिंग।',
    roleHospital: 'अस्पताल प्रतिनिधि',
    roleHospitalDesc: 'आपातकालीन विभाग, 24/7 आईसीयू और ट्रामा बेड की स्थिति, रोगी भर्ती समन्वय।',
    
    // Common Form Fields
    fullName: 'पूरा नाम',
    phone: 'मोबाइल नंबर',
    email: 'ईमेल (वैकल्पिक)',
    password: 'पासवर्ड',
    languagePref: 'पसंदीदा भाषा',
    continue: 'विवरण भरने के लिए आगे बढ़ें',
    back: 'पीछे जाएं',
    submitRegister: 'पंजीकरण पूरा करें',
    alreadyHaveAccount: 'क्या पहले से खाता है?',
    dontHaveAccount: 'खाता नहीं है?',
    
    // Doctor Specific Fields
    specialties: 'चिकित्सा विशेषता (उदा. हृदय रोग, सामान्य चिकित्सा, बाल रोग)',
    qualifications: 'योग्यता / डिग्रियां (उदा. MBBS, MD, MS)',
    medicalRegistrationNumber: 'मेडिकल काउंसिल पंजीकरण संख्या (Reg No.)',
    registrationCouncil: 'राज्य मेडिकल काउंसिल',
    consultationFee: 'परामर्श शुल्क (₹)',
    clinicAddress: 'क्लिनिक / अस्पताल का पता',
    workingHoursStart: 'उपलब्धता शुरू (समय)',
    workingHoursEnd: 'उपलब्धता समाप्त (समय)',
    
    // Pharmacy Specific Fields
    storeName: 'मेडिकल स्टोर / फार्मेसी का नाम',
    drugLicenseNumber: 'ड्रग लाइसेंस नंबर (DL No.)',
    gstin: 'जीएसटी नंबर (वैकल्पिक)',
    homeDeliveryAvailable: 'क्या आप घर पर दवाइयां डिलीवर कर सकते हैं?',
    yesDelivery: 'हाँ, होम डिलीवरी उपलब्ध है',
    noDelivery: 'नहीं, केवल स्टोर से प्राप्त करें',
    deliveryRadiusKm: 'होम डिलीवरी का दायरा (किलोमीटर में)',
    operatingHours: 'दुकान खुलने का समय (उदा. 08:00 AM - 10:00 PM)',
    pharmacyAddress: 'मेडिकल स्टोर का पता एवं लैंडमार्क',
    city: 'शहर',
    state: 'राज्य',
    
    // Hospital Specific Fields
    hospitalName: 'अस्पताल / ट्रॉमा सेंटर का नाम',
    hospitalRegNo: 'अस्पताल पंजीकरण / NABH नंबर',
    emergency247: 'क्या 24/7 आपातकालीन विभाग उपलब्ध है?',
    traumaLevel: 'ट्रॉमा केयर स्तर (Level 1, 2, 3)',
    emergencyHotlines: 'आपातकालीन हेल्पलाइन नंबर',
    hospitalAddress: 'अस्पताल का पता',
    
    // Patient Specific Fields
    age: 'आयु (वर्ष)',
    gender: 'लिंग',
    genderMale: 'पुरुष',
    genderFemale: 'महिला',
    genderOther: 'अन्य',
    emergencyContactName: 'आपातकालीन संपर्क व्यक्ति का नाम',
    emergencyContactPhone: 'आपातकालीन संपर्क मोबाइल नंबर',
    deliveryAddress: 'घर का पता (दवा डिलीवरी हेतु)',
    
    // Navigation & Sidebar
    navSymptomIntake: 'लक्षण व आपात जांच',
    navSkinPrescription: 'त्वचा व पर्ची स्कैनर',
    navHospitals: 'निकटतम अस्पताल',
    navMedicines: 'दवाइयां एवं होम डिलीवरी',
    navDoctorConnect: 'डॉक्टर से परामर्श',
    navMyOrders: 'मेरे डिलीवरी ऑर्डर्स',
    
    navDoctorQueue: 'आपातकालीन प्राथमिकता कतार',
    navActiveConsultations: 'सक्रिय परामर्श',
    navDoctorProfile: 'चिकित्सक प्रोफ़ाइल व समय',
    
    navPharmacyInventory: 'दवा स्टॉक व इन्वेंट्री',
    navPharmacyOrders: 'होम डिलीवरी ऑर्डर्स',
    navPharmacyAlerts: 'कम स्टॉक अलर्ट्स',
    
    // Triage Badges
    p0Emergency: 'P0 - अति गंभीर आपातकाल (तत्काल अस्पताल जाएं)',
    p1Urgent: 'P1 - जरूरी (30 मिनट के भीतर)',
    p2Priority: 'P2 - प्राथमिकता (2 घंटे के भीतर)',
    p3Routine: 'P3 - सामान्य परामर्श',
    
    // Scanner
    scannerTitle: 'एआई विज़न एवं दस्तावेज़ स्कैनर',
    scannerSubtitle: 'त्वचा संक्रमण जांच हेतु फोटो अपलोड करें अथवा दवा पर्ची/बिल स्कैन कर सीधे घर पर मंगवाएं।',
    scanSkinTab: 'त्वचा संक्रमण विश्लेषण',
    scanPrescriptionTab: 'दवा पर्ची / मेडिकल बिल स्कैनर',
    uploadSkinPhoto: 'त्वचा पर दाने / संक्रमण की फोटो अपलोड करें',
    uploadPrescription: 'डॉक्टर का पर्चा या मेडिकल बिल अपलोड करें',
    analyzingImage: 'एआई न्यूरल मॉडल छवि का विश्लेषण कर रहा है...',
    skinAnalysisResult: 'त्वचा संक्रमण का संभावित निदान',
    prescriptionResult: 'पर्चे से पहचानी गई दवाइयां',
    orderFromPharmacyBtn: 'दवाइयां घर पर मंगवाएं (होम डिलीवरी)',
    
    // Orders & Tracking
    orderStatusPlaced: 'ऑर्डर दर्ज हुआ',
    orderStatusConfirmed: 'स्वीकार किया गया',
    orderStatusPacked: 'पैक हो गया',
    orderStatusOutForDelivery: 'डिलीवरी के लिए निकला',
    orderStatusDelivered: 'सफलतापूर्वक डिलीवर हुआ',
    liveOrderTracking: 'लाइव डिलीवरी ट्रैकिंग स्थिति',
    estimatedTime: 'अनुमानित समय',
    trackOrder: 'ऑर्डर ट्रैक करें',
    noOrdersYet: 'अभी कोई डिलीवरी ऑर्डर नहीं है।',
    
    // Footer
    emergencyCallText: 'राष्ट्रीय आपातकालीन हेल्पलाइन: 112 / 108',
    disclaimerText: 'मेडीरेस्क्यू केवल चिकित्सकीय मार्गदर्शन व संसाधन खोजने में मदद करता है। जानलेवा स्थिति में तुरंत 112 पर कॉल करें।',
  },
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('mediresq_lang') || 'en';
  });

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('mediresq_lang', lang);
  };

  const t = (key) => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    if (translations['en'][key]) {
      return translations['en'][key];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
