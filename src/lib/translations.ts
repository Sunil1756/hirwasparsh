export type Language = "en" | "mr" | "hi";

export interface TranslationDictionary {
  // Navigation
  nav_home: string;
  nav_tree_map: string;
  nav_plant: string;
  nav_dashboard: string;
  nav_intelligence: string;
  nav_community: string;
  nav_scouting: string;
  nav_bulk: string;
  nav_satellite: string;
  nav_leaderboard: string;
  nav_about: string;
  nav_contact: string;

  // Hero & CTA
  hero_title_1: string;
  hero_title_2: string;
  hero_subtitle: string;
  hero_plant_btn: string;
  hero_explore_btn: string;

  // Tree Planting Hub
  plant_hub_title: string;
  plant_hub_subtitle: string;
  plant_indiv_title: string;
  plant_indiv_desc: string;
  plant_bulk_title: string;
  plant_bulk_desc: string;
  plant_ngo_title: string;
  plant_ngo_desc: string;

  // Features
  feat_satellite_title: string;
  feat_satellite_desc: string;
  feat_scouting_title: string;
  feat_scouting_desc: string;
  feat_carbon_title: string;
  feat_carbon_desc: string;
  feat_qr_title: string;
  feat_qr_desc: string;

  // Common Actions
  action_save: string;
  action_cancel: string;
  action_print: string;
  action_download: string;
  action_listen_voice: string;
  action_stop_voice: string;
  action_offline_sync: string;
  offline_status_online: string;
  offline_status_offline: string;
  offline_queued_count: string;
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    nav_home: "Home",
    nav_tree_map: "🗺️ Tree Map & GIS",
    nav_plant: "Plant a Tree",
    nav_dashboard: "Dashboard",
    nav_intelligence: "AI Intelligence",
    nav_community: "Community",
    nav_scouting: "📍 Field Scouting",
    nav_bulk: "📂 Bulk Onboard & QR",
    nav_satellite: "🛰️ Satellite NDVI",
    nav_leaderboard: "Leaderboard",
    nav_about: "About Us",
    nav_contact: "Contact",

    hero_title_1: "Every Tree Has a Story.",
    hero_title_2: "Every Sapling Verified.",
    hero_subtitle:
      "India's premier Geo-Spatial & AI-powered Agroforestry OS. Combining Sentinel-2 multi-spectral NDVI telemetry, IPCC carbon allometry, and physical vector QR passports.",
    hero_plant_btn: "🌱 Plant a Tree Now",
    hero_explore_btn: "🛰️ Explore Satellite Map",

    plant_hub_title: "How Would You Like to Plant?",
    plant_hub_subtitle: "Choose the workflow that fits your plantation drive.",
    plant_indiv_title: "🌱 Individual Tree",
    plant_indiv_desc: "For planting and verifying single trees with mobile camera & selfie.",
    plant_bulk_title: "📂 Bulk CSV & Batch QR (Module C)",
    plant_bulk_desc: "Mass onboarding (1,000+ trees) and printable field QR tag sheets.",
    plant_ngo_title: "🏢 NGO / CSR Project",
    plant_ngo_desc: "Full enterprise project tracking, satellite monitoring & boundary polygon.",

    feat_satellite_title: "Satellite NDVI Telemetry",
    feat_satellite_desc: "Sentinel-2 multi-spectral NDVI & NDRE canopy vigor tracking",
    feat_scouting_title: "Field Scouting Matrix",
    feat_scouting_desc: "Geotag pest, disease, and water stress with scientific remedies",
    feat_carbon_title: "IPCC Carbon Biomass",
    feat_carbon_desc: "Pantropical allometric biomass modeling and ESG carbon credits",
    feat_qr_title: "Bulk CSV & Batch QR",
    feat_qr_desc: "Mass plantation onboarding with printable A4 field QR sheets",

    action_save: "Save",
    action_cancel: "Cancel",
    action_print: "Print A4 Sheet",
    action_download: "Download",
    action_listen_voice: "🔊 Listen in Marathi/Hindi",
    action_stop_voice: "⏹️ Stop Audio",
    action_offline_sync: "Sync Offline Plantations",
    offline_status_online: "Online · Cloud Synced",
    offline_status_offline: "Offline Mode Active",
    offline_queued_count: "saved locally for sync",
  },

  mr: {
    nav_home: "मुख्यपृष्ठ",
    nav_tree_map: "🗺️ वृक्ष नकाशा व जीआयएस",
    nav_plant: "झाड लावा",
    nav_dashboard: "डॅशबोर्ड",
    nav_intelligence: "एआय बुद्धिमत्ता",
    nav_community: "समुदाय",
    nav_scouting: "📍 शेत पाहणी (Scouting)",
    nav_bulk: "📂 मोठ्या प्रमाणावर नोंदणी व क्यूआर",
    nav_satellite: "🛰️ उपग्रह एनडीव्हीआय",
    nav_leaderboard: "गुणतालिका",
    nav_about: "आमच्याबद्दल",
    nav_contact: "संपर्क",

    hero_title_1: "प्रत्येक वृक्षाची एक कथा आहे.",
    hero_title_2: "प्रत्येक रोपाची एआय पडताळणी.",
    hero_subtitle:
      "भारतातील अग्रगण्य जिओ-स्पेशल व एआय आधारित कृषी-वनीकरण प्लॅटफॉर्म. सेंटिनेल-२ उपग्रह एनडीव्हीआय रिमोट सेन्सिंग, कार्बन मोजमाप आणि डिजिटल क्यूआर पासपोर्ट.",
    hero_plant_btn: "🌱 झाड लावा",
    hero_explore_btn: "🛰️ उपग्रह नकाशा पहा",

    plant_hub_title: "आपण वृक्षारोपण कसे करू इच्छिता?",
    plant_hub_subtitle: "आपल्या गरजेनुसार योग्य पर्याय निवडा.",
    plant_indiv_title: "🌱 वैयक्तिक वृक्षारोपण",
    plant_indiv_desc: "मोबाईल कॅमेऱ्याने एका झाडाचा फोटो व सेल्फी घेऊन पडताळणी करा.",
    plant_bulk_title: "📂 बल्क सीएसव्ही व क्यूआर टॅग्ज (मॉड्यूल C)",
    plant_bulk_desc: "एकाच वेळी १०००+ झाडांची नोंदणी आणि प्रिंट करण्यायोग्य क्यूआर पत्रके.",
    plant_ngo_title: "🏢 संस्था / सीएसआर प्रकल्प",
    plant_ngo_desc: "मोठे वनीकरण प्रकल्प, उपग्रह निरीक्षण व सीमा आखणी.",

    feat_satellite_title: "उपग्रह एनडीव्हीआय निरीक्षण",
    feat_satellite_desc: "सेंटिनेल-२ उपग्रहाद्वारे झाडांची वाढ व हिरवेगारपणा ट्रॅक करा",
    feat_scouting_title: "शेत पाहणी व रोग निवारण",
    feat_scouting_desc: "कीड, रोग व पाण्याचा ताण यावर जैविक औषधोपचार सल्ला",
    feat_carbon_title: "कार्बन क्रेडिट मोजणी (IPCC)",
    feat_carbon_desc: "झाडांचे बायोमास व कार्बन शोषणाचे शास्त्रीय मूल्यांकन",
    feat_qr_title: "बल्क क्यूआर पासपोर्ट",
    feat_qr_desc: "झाडांच्या फांदीवर बांधण्यासाठी वॉटरप्रूफ क्यूआर कोड प्रिंट करा",

    action_save: "जतन करा",
    action_cancel: "रद्द करा",
    action_print: "A4 शीट प्रिंट करा",
    action_download: "डाउनलोड",
    action_listen_voice: "🔊 मराठीत ऐका (Audio Guide)",
    action_stop_voice: "⏹️ आवाज थांबवा",
    action_offline_sync: "ऑफलाईन झाडे सिंक करा",
    offline_status_online: "ऑनलाइन · क्लाउड सिंक",
    offline_status_offline: "ऑफलाईन मोड चालू",
    offline_queued_count: "झाडे सिंकसाठी तयार",
  },

  hi: {
    nav_home: "होम",
    nav_tree_map: "🗺️ ट्री मैप व जीआईएस",
    nav_plant: "पेड़ लगाएं",
    nav_dashboard: "डैशबोर्ड",
    nav_intelligence: "एआई इंटेलिजेंस",
    nav_community: "समुदाय",
    nav_scouting: "📍 फील्ड स्काउटिंग",
    nav_bulk: "📂 बल्क सीएसवी व क्यूआर",
    nav_satellite: "🛰️ सैटेलाइट एनडीवीआई",
    nav_leaderboard: "लीडरबोर्ड",
    nav_about: "हमारे बारे में",
    nav_contact: "संपर्क करें",

    hero_title_1: "हर पेड़ की एक कहानी है।",
    hero_title_2: "हर पौधे का एआई सत्यापन।",
    hero_subtitle:
      "भारत का पहला सैटेलाइट व एआई आधारित वृक्षारोपण ऑपरेटिंग सिस्टम। सेंटिनल-2 रिमोट सेंसिंग, कार्बन बायोमास और डिजिटल क्यूआर पासपोर्ट।",
    hero_plant_btn: "🌱 पेड़ लगाएं",
    hero_explore_btn: "🛰️ सैटेलाइट मैप देखें",

    plant_hub_title: "आप पौधारोपण कैसे करना चाहते हैं?",
    plant_hub_subtitle: "अपनी आवश्यकतानुसार विकल्प चुनें।",
    plant_indiv_title: "🌱 व्यक्तिगत पौधारोपण",
    plant_indiv_desc: "मोबाइल कैमरे से एक पेड़ का फोटो और सेल्फी लेकर तुरंत सत्यापित करें।",
    plant_bulk_title: "📂 बल्क सीएसवी व क्यूआर (मॉड्यूल C)",
    plant_bulk_desc: "1,000+ पेड़ों का त्वरित पंजीकरण और प्रिंट करने योग्य क्यूआर शीट्स।",
    plant_ngo_title: "🏢 संस्था / सीएसआर प्रोजेक्ट",
    plant_ngo_desc: "बड़े पैमाने पर पौधारोपण, सैटेलाइट मॉनिटरिंग और जमीन की सीमा निर्धारण।",

    feat_satellite_title: "सैटेलाइट एनडीवीआई ट्रैकिंग",
    feat_satellite_desc: "सेंटिनल-2 उपग्रह द्वारा पेड़ों की वृद्धि और हरियाली की निगरानी",
    feat_scouting_title: "फील्ड स्काउटिंग मैट्रिक्स",
    feat_scouting_desc: "कीट, रोग और सूखे की पहचान के साथ जैविक समाधान",
    feat_carbon_title: "कार्बन क्रेडिट गणना (IPCC)",
    feat_carbon_desc: "पेड़ों के बायोमास और कार्बन अवशोषण का वैज्ञानिक मूल्यांकन",
    feat_qr_title: "बल्क क्यूआर पासपोर्ट",
    feat_qr_desc: "पेड़ों पर लगाने के लिए हाई-क्वालिटी क्यूआर कोड प्रिंट करें",

    action_save: "सहेजें",
    action_cancel: "रद्द करें",
    action_print: "A4 शीट प्रिंट करें",
    action_download: "डाउनलोड",
    action_listen_voice: "🔊 हिंदी में सुनें (Audio Guide)",
    action_stop_voice: "⏹️ ऑडियो रोकें",
    action_offline_sync: "ऑफलाइन पेड़ सिंक करें",
    offline_status_online: "ऑनलाइन · क्लाउड सिंक",
    offline_status_offline: "ऑफलाइन मोड सक्रिय",
    offline_queued_count: "पेड़ सिंक हेतु तैयार",
  },
};
