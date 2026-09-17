const app = document.querySelector("#app");
const state = {
  lang: localStorage.getItem("lang") || "fr",
  token: localStorage.getItem("token") || "",
  me: null,
  data: null,
  portal: null,
  admin: null,
  adminEdit: null,
  route: location.pathname,
  theme: localStorage.getItem("theme") || "dark",
  mobileMenu: false,
  toast: ""
};

const copy = {
  fr: {
    about: "À propos", heroTag: "Force • Discipline • Communauté", heroText: "À Taroudant, Aljawarih est plus qu'une salle : un lieu pour s'entraîner, progresser et appartenir à une vraie communauté sportive.",
    storyTitle: "L'esprit Aljawarih", storyLead: "Une identité marocaine forte, inspirée par l'aigle : concentration, discipline, accueil et dépassement de soi.", community: "Communauté", communityText: "Entraînements, sorties, compétitions et souvenirs créent un club où chacun trouve sa place.", coaching: "Encadrement", coachingText: "Des coachs présents pour vous accompagner avec attention, quel que soit votre niveau.", progress: "Progression", progressText: "Des espaces variés et des séances structurées pour rendre chaque progrès visible.",
    pricing: "Abonnements & tarifs", pricingLead: "Des formules simples pour adultes, enfants et séances privées.", viewPlans: "Voir les formules", scheduleTitle: "Planning des entraînements", noSession: "Aucune séance", available: "places disponibles", reserve: "Réserver", full: "COMPLET",
    galleryTitle: "Découvrez le club", galleryLead: "Explorez l'accueil, le hammam beldi, la salle d'aérobic et l'espace cinéma, puis les machines, la boxe et le stretching au sous-sol.",
    eventsTitle: "Événements du club", participants: "participants", register: "S'inscrire", memoriesTitle: "Souvenirs Aljawarih", memoriesLead: "Nos sorties, tournois, activités pour enfants et moments partagés.", photos: "photos", videos: "vidéos",
    coachesTitle: "Vos coachs", coachesLead: "Une équipe proche, motivante et engagée dans votre progression.", clubQuote: "Notre club, notre force.", quote: "Chaque séance est une nouvelle occasion de progresser ensemble.",
    aboutTitle: "À propos d'Aljawarih", aboutText: "ALJAWARIH GYM TAROUDANT est un club sportif où les membres s'entraînent, progressent et représentent fièrement leur communauté.", membershipPageLead: "Choisissez la formule adaptée à votre objectif.", scheduleLead: "Consultez le planning et réservez votre séance.", exploreTitle: "Explorez Aljawarih Gym", exploreLead: "Découvrez en images tous les espaces du club, du rez-de-chaussée au sous-sol.", equipment: "Équipements", difficulty: "Niveau", targets: "Muscles ciblés", viewQr: "Voir la fiche",
    contactTitle: "Contact", club: "Club", phone: "Téléphone", instagram: "Instagram", name: "Nom", message: "Message", send: "Envoyer", contactLead: "Une question ? Contactez-nous directement ou venez nous rencontrer à Taroudant.", light: "Mode clair", dark: "Mode sombre"
  },
  en: {
    about: "About", heroTag: "Strength • Discipline • Community", heroText: "In Taroudant, Aljawarih is more than a gym: a place to train, grow and belong to a true sports community.",
    storyTitle: "The Aljawarih spirit", storyLead: "A strong Moroccan identity inspired by the eagle: focus, discipline, hospitality and self-improvement.", community: "Community", communityText: "Training, outings, competitions and memories create a club where everyone belongs.", coaching: "Coaching", coachingText: "Attentive coaches support you at every level.", progress: "Progress", progressText: "Varied spaces and structured sessions make every improvement visible.",
    pricing: "Memberships & pricing", pricingLead: "Simple plans for adults, children and private sessions.", viewPlans: "View plans", scheduleTitle: "Training schedule", noSession: "No session", available: "spots available", reserve: "Reserve", full: "FULL",
    galleryTitle: "Discover the club", galleryLead: "Explore reception, the traditional hammam, aerobics and cinema space, then machines, boxing and stretching downstairs.",
    eventsTitle: "Club events", participants: "participants", register: "Register", memoriesTitle: "Aljawarih memories", memoriesLead: "Our outings, tournaments, children's activities and shared moments.", photos: "photos", videos: "videos",
    coachesTitle: "Meet your coaches", coachesLead: "A supportive, motivating team committed to your progress.", clubQuote: "Our club, our strength.", quote: "Every session is a new opportunity to grow together.",
    aboutTitle: "About Aljawarih", aboutText: "ALJAWARIH GYM TAROUDANT is a sports club where members train, improve and proudly represent their community.", membershipPageLead: "Choose the plan that fits your goal.", scheduleLead: "Check the timetable and reserve your session.", exploreTitle: "Explore Aljawarih Gym", exploreLead: "Discover every club space, from the ground floor to the basement.", equipment: "Equipment", difficulty: "Level", targets: "Target muscles", viewQr: "View details",
    contactTitle: "Contact", club: "Club", phone: "Phone", instagram: "Instagram", name: "Name", message: "Message", send: "Send", contactLead: "Have a question? Contact us directly or visit us in Taroudant.", light: "Light mode", dark: "Dark mode"
  },
  ar: {
    about: "من نحن", heroTag: "قوة • انضباط • مجتمع", heroText: "في تارودانت، الجوارح أكثر من مجرد نادٍ رياضي؛ إنه مكان للتدريب والتطور والانتماء إلى مجتمع رياضي حقيقي.",
    storyTitle: "روح الجوارح", storyLead: "هوية مغربية قوية مستوحاة من النسر: التركيز والانضباط وحسن الاستقبال وتطوير الذات.", community: "المجتمع", communityText: "التدريبات والرحلات والمنافسات والذكريات تصنع نادياً يجد فيه الجميع مكانهم.", coaching: "التأطير", coachingText: "مدربون حاضرون لمرافقتكم باهتمام مهما كان مستواكم.", progress: "التطور", progressText: "فضاءات متنوعة وحصص منظمة تجعل كل تقدم واضحاً.",
    pricing: "الاشتراكات والأسعار", pricingLead: "عروض بسيطة للكبار والأطفال والحصص الخاصة.", viewPlans: "عرض الاشتراكات", scheduleTitle: "برنامج التدريبات", noSession: "لا توجد حصة", available: "أماكن متاحة", reserve: "احجز", full: "ممتلئ",
    galleryTitle: "اكتشف النادي", galleryLead: "اكتشف الاستقبال والحمام البلدي وقاعة الأيروبيك وفضاء السينما، ثم الآلات والملاكمة والتمدد في الطابق السفلي.",
    eventsTitle: "أنشطة النادي", participants: "مشارك", register: "سجل", memoriesTitle: "ذكريات الجوارح", memoriesLead: "رحلاتنا وبطولاتنا وأنشطة الأطفال ولحظاتنا المشتركة.", photos: "صور", videos: "فيديوهات",
    coachesTitle: "مدربوكم", coachesLead: "فريق قريب ومحفز وملتزم بتطوركم.", clubQuote: "نادينا، قوتنا.", quote: "كل حصة فرصة جديدة لنتطور معاً.",
    aboutTitle: "عن نادي الجوارح", aboutText: "نادي الجوارح تارودانت فضاء رياضي يتدرب فيه الأعضاء ويتطورون ويمثلون مجتمعهم بفخر.", membershipPageLead: "اختر العرض المناسب لهدفك.", scheduleLead: "اطلع على البرنامج واحجز حصتك.", exploreTitle: "اكتشف نادي الجوارح", exploreLead: "شاهد جميع فضاءات النادي من الطابق الأرضي إلى الطابق السفلي.", equipment: "المعدات", difficulty: "المستوى", targets: "العضلات المستهدفة", viewQr: "عرض التفاصيل",
    contactTitle: "اتصل بنا", club: "النادي", phone: "الهاتف", instagram: "إنستغرام", name: "الاسم", message: "الرسالة", send: "إرسال", contactLead: "لديك سؤال؟ تواصل معنا مباشرة أو زرنا في تارودانت.", light: "الوضع الفاتح", dark: "الوضع الداكن"
  }
};

function tx(key) { return copy[state.lang]?.[key] || copy.fr[key] || key; }

const arabicUi = {
  "ALJAWARIH GYM": "نادي الجوارح", "Taroudant, Morocco": "تارودانت، المغرب", "MENU": "القائمة",
  "Home": "الرئيسية", "About": "من نحن", "Memberships": "الاشتراكات", "Schedule": "البرنامج", "Events": "الأنشطة", "Memories": "الذكريات", "Virtual Gym": "الجيم الافتراضي", "Contact": "اتصال",
  "My portal": "فضائي", "Logout": "خروج", "Login": "تسجيل الدخول", "Join the Club": "انضم للنادي",
  "Admin Dashboard": "لوحة تحكم الإدارة", "Staff Dashboard": "لوحة تحكم المدربين", "Client Portal": "فضاء العضو",
  "Overview": "نظرة عامة", "Dashboard": "لوحة التحكم", "Today": "اليوم", "Members": "الأعضاء", "Payments": "المدفوعات", "Bookings": "الحجوزات", "Attendance": "الحضور", "Gym": "القاعة", "Equipment": "المعدات", "Analytics": "الإحصائيات", "Settings": "الإعدادات",
  "Total Members": "مجموع الأعضاء", "Active Members": "الأعضاء النشطون", "Expired": "الاشتراكات المنتهية", "New Members": "الأعضاء الجدد", "Today Attendance": "حضور اليوم", "Monthly Revenue": "الدخل الشهري", "Pending Payments": "المدفوعات المعلقة", "Revenue growth": "تطور المداخيل",
  "Member": "العضو", "Plan": "الاشتراك", "Expiry": "تاريخ الانتهاء", "Status": "الحالة", "Amount": "المبلغ", "Method": "طريقة الدفع", "Date": "التاريخ", "Source": "المصدر", "Client": "العضو", "Session": "الحصة", "Time": "الوقت", "Visits": "الزيارات",
  "Membership": "الاشتراك", "Paiements": "المدفوعات", "Progress": "التقدم", "Workouts": "التدريبات", "Achievements": "الإنجازات", "Challenges": "التحديات", "Notifications": "الإشعارات", "Profile": "الملف الشخصي",
  "Welcome back": "مرحباً بعودتك", "No membership": "لا يوجد اشتراك", "days remaining": "يوماً متبقياً", "Expires": "ينتهي في", "Total visits": "مجموع الزيارات", "Current streak": "الاستمرارية الحالية", "This month": "هذا الشهر", "Workouts completed": "التدريبات المنجزة", "Hours trained": "ساعات التدريب", "Strength progression": "تطور القوة", "Upcoming Bookings": "الحجوزات القادمة", "Quick actions": "إجراءات سريعة",
  "Book a Session": "احجز حصة", "Explore Gym": "اكتشف القاعة", "Track Workout": "سجّل تمريناً", "Cancel": "إلغاء", "Mark as read": "تحديد كمقروء", "Reserve": "احجز", "FULL": "ممتلئ",
  "Monday": "الاثنين", "Tuesday": "الثلاثاء", "Wednesday": "الأربعاء", "Thursday": "الخميس", "Friday": "الجمعة", "Saturday": "السبت", "Sunday": "الأحد",
  "Morning Training": "تدريب صباحي", "Evening Training": "تدريب مسائي", "Kids Training": "تدريب الأطفال", "Group Training": "تدريب جماعي", "Private Session": "حصة خاصة",
  "Adults": "الكبار", "Children": "الأطفال", "Private": "خاص", "Registration": "واجب التسجيل", "Monthly": "شهري", "4 Months": "4 أشهر", "11 Months": "11 شهراً", "Single Session": "حصة واحدة", "Individual Session": "حصة فردية", "Private coaching": "تدريب خاص", "View plans": "عرض الاشتراكات",
  "Assigned sessions": "الحصص المسندة", "Coach tools": "أدوات المدرب", "Check-in": "تسجيل الحضور", "Sessions": "الحصص", "Participants": "المشاركون", "QR Check-in": "تسجيل الحضور بالرمز", "QR token or client id": "رمز QR أو رقم العضو", "Record attendance": "تسجيل الحضور",
  "Add membership plan": "إضافة اشتراك", "Audience": "الفئة", "Name": "الاسم", "Price DH": "السعر بالدرهم", "Duration days": "المدة بالأيام", "Create plan": "إنشاء الاشتراك", "Create class": "إنشاء حصة", "Day": "اليوم", "Starts": "البداية", "Ends": "النهاية", "Capacity": "السعة", "Create event": "إنشاء نشاط", "Title": "العنوان", "Category": "الفئة", "Description": "الوصف", "Create memory album": "إنشاء ألبوم ذكريات", "Year": "السنة", "Create album": "إنشاء الألبوم", "Add equipment": "إضافة معدات", "Difficulty": "المستوى", "Add equipment": "إضافة المعدات",
  "Club settings": "إعدادات النادي", "Search": "بحث", "Load bookings": "تحميل الحجوزات", "Create Account": "إنشاء حساب", "Créer un compte": "إنشاء حساب", "Connexion": "تسجيل الدخول", "Prénom": "الاسم الشخصي", "Nom": "الاسم العائلي", "Téléphone": "الهاتف", "CIN / Carte Nationale": "البطاقة الوطنية", "Date de naissance": "تاريخ الازدياد", "Sexe / catégorie": "الجنس / الفئة", "Homme": "رجل", "Femme": "امرأة", "Type d'abonnement": "نوع الاشتراك", "Mot de passe": "كلمة المرور", "Créer le compte": "إنشاء الحساب", "Se connecter": "تسجيل الدخول", "Accès sécurisé": "ولوج آمن", "Après l'inscription, un message de confirmation est envoyé à votre adresse e-mail.": "بعد التسجيل، ستصلك رسالة لتأكيد بريدك الإلكتروني.", "Les comptes de démonstration restent configurables par l'administrateur.": "يمكن للإدارة ضبط الحسابات التجريبية.",
  "Vous n'avez pas reçu le message ?": "لم تتوصل برسالة التأكيد؟", "Email du compte": "البريد الإلكتروني للحساب", "Renvoyer l'e-mail de confirmation": "إعادة إرسال رسالة التأكيد", "Un nouveau message de confirmation a été envoyé.": "تم إرسال رسالة تأكيد جديدة.", "Impossible d'envoyer le message. Vérifiez la configuration SMTP.": "تعذر إرسال الرسالة. يرجى التحقق من إعدادات البريد.",
  "Changer le mot de passe": "تغيير كلمة المرور", "Mot de passe actuel": "كلمة المرور الحالية", "Nouveau mot de passe": "كلمة المرور الجديدة", "Confirmer le nouveau mot de passe": "تأكيد كلمة المرور الجديدة", "Enregistrer le nouveau mot de passe": "حفظ كلمة المرور الجديدة", "Le mot de passe a été modifié.": "تم تغيير كلمة المرور.", "Les nouveaux mots de passe ne correspondent pas.": "كلمتا المرور الجديدتان غير متطابقتين.",
  "First name": "الاسم الشخصي", "Last name": "الاسم العائلي", "Phone": "الهاتف", "Emergency contact": "رقم الطوارئ", "Save profile": "حفظ الملف", "Exercise": "التمرين", "Sets": "الجولات", "Reps": "التكرارات", "Weight kg": "الوزن بالكيلوغرام", "Save workout": "حفظ التمرين", "Track workout": "تسجيل تمرين",
  "ACTIVE": "نشط", "EXPIRING_SOON": "قريب الانتهاء", "EXPIRED": "منتهي", "PENDING_PAYMENT": "في انتظار الدفع", "PAID": "مدفوع", "PENDING": "معلق", "CANCELLED": "ملغى",
  "How to use": "طريقة الاستعمال", "Safety": "السلامة", "Beginner": "مبتدئ", "Intermediate": "متوسط", "Strength": "القوة", "Workshop": "ورشة", "Ramadan": "رمضان",
  "Premium Monthly": "اشتراك شهري مميز", "Workshop Nutrition": "ورشة التغذية", "Cable Machine": "آلة الكابلات", "Bench Press": "تمرين ضغط الصدر", "Session education et performance.": "حصة للتوعية وتحسين الأداء.", "Machine polyvalente pour exercices guides.": "آلة متعددة الاستعمالات للتمارين الموجّهة.",
  "Signed out": "تم تسجيل الخروج", "Reservation confirmed": "تم تأكيد الحجز", "Booking cancelled": "تم إلغاء الحجز", "Event registration saved": "تم التسجيل في النشاط", "Notification marked as read": "تم تحديد الإشعار كمقروء", "Profile updated": "تم تحديث الملف الشخصي", "Workout tracked": "تم تسجيل التمرين", "Plan created": "تم إنشاء الاشتراك", "Class created": "تم إنشاء الحصة", "Event created": "تم إنشاء النشاط", "Album created": "تم إنشاء الألبوم", "Equipment added": "تمت إضافة المعدات",
  "No data yet.": "لا توجد بيانات بعد.", "No scheduled session": "لا توجد حصة مبرمجة", "No notifications.": "لا توجد إشعارات.", "No achievements yet.": "لا توجد إنجازات بعد.", "Equipment not found.": "المعدة غير موجودة.", "Something needs attention": "حدث خطأ", "Authentication required": "يجب تسجيل الدخول", "Insufficient permissions": "ليست لديك الصلاحية", "Invalid email or password": "البريد الإلكتروني أو كلمة المرور غير صحيحة", "Email verification required": "يجب تأكيد البريد الإلكتروني",
  "Settings API is prepared for production CMS expansion.": "إعدادات النظام جاهزة للإدارة والتطوير.", "Booking data is available through /api/bookings with staff scoping.": "بيانات الحجوزات متاحة حسب صلاحيات المستخدم.", "Mark attendance, view participants and add workout notes.": "سجّل الحضور واطلع على المشاركين وأضف ملاحظات التدريب.", "Use client QR token format: qr:usr_sara. Camera scanner can be connected to this endpoint.": "استخدم رمز العضو أو امسح رمز QR لتسجيل الحضور.",
  "Entrée principale d'Aljawarih Gym": "المدخل الرئيسي لنادي الجوارح", "Tableau d'affichage et emploi du temps": "لوحة الإعلانات والبرنامج", "Vestiaires du hammam beldi": "غرف تبديل الملابس بالحمام البلدي", "Cabines du hammam beldi": "مرافق الحمام البلدي", "Espace de préparation du hammam beldi": "فضاء الاستعداد بالحمام البلدي", "Salle d'aérobic au rez-de-chaussée": "قاعة الأيروبيك بالطابق الأرضي", "Espace d'entraînement et matériel d'aérobic": "فضاء ومعدات الأيروبيك", "Espace cinéma avec écran et vidéoprojecteur": "فضاء السينما مع الشاشة وجهاز العرض", "Vue générale de la salle du rez-de-chaussée": "منظر عام لقاعة الطابق الأرضي", "Espace boxe au sous-sol": "فضاء الملاكمة بالطابق السفلي", "Sacs de frappe et zone d'entraînement": "أكياس الملاكمة ومنطقة التدريب", "Machines et zone de musculation": "الآلات ومنطقة كمال الأجسام", "Zone de stretching et renforcement": "منطقة التمدد والتقوية", "Équipements de musculation au sous-sol": "معدات كمال الأجسام بالطابق السفلي"
};

function localizeArabic(root) {
  if (state.lang !== "ar") return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const original = node.nodeValue;
    const trimmed = original.trim();
    if (!trimmed) return;
    let translated = arabicUi[trimmed];
    if (!translated) {
      translated = trimmed
        .replace(/^Welcome back,\s*/i, "مرحباً بعودتك، ")
        .replace(/\s+days remaining$/i, " يوماً متبقياً")
        .replace(/^Expires:\s*/i, "ينتهي في: ");
    }
    if (translated !== trimmed) node.nodeValue = original.replace(trimmed, translated);
  });
  root.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((element) => {
    if (arabicUi[element.placeholder]) element.placeholder = arabicUi[element.placeholder];
  });
  root.querySelectorAll("input:not([type='password']), textarea").forEach((element) => {
    if (arabicUi[element.value]) element.value = arabicUi[element.value];
  });
  root.querySelectorAll("[title], [aria-label]").forEach((element) => {
    if (element.title && arabicUi[element.title]) element.title = arabicUi[element.title];
    const label = element.getAttribute("aria-label");
    if (label && arabicUi[label]) element.setAttribute("aria-label", arabicUi[label]);
  });
}

const t = {
  fr: {
    join: "Rejoindre le club",
    explore: "Explorer le gym",
    login: "Connexion",
    logout: "Deconnexion",
    portal: "Mon espace",
    admin: "Admin",
    staff: "Staff",
    home: "Accueil",
    memberships: "Abonnements",
    schedule: "Planning",
    events: "Evenements",
    memories: "Memories",
    gym: "Virtual Gym",
    contact: "Contact"
  },
  ar: {
    join: "انضم للنادي",
    explore: "استكشف القاعة",
    login: "تسجيل الدخول",
    logout: "خروج",
    portal: "فضائي",
    admin: "الإدارة",
    staff: "الطاقم",
    home: "الرئيسية",
    memberships: "الاشتراكات",
    schedule: "البرنامج",
    events: "الأنشطة",
    memories: "الذكريات",
    gym: "الجيم الافتراضي",
    contact: "اتصال"
  },
  en: {
    join: "Join the Club",
    explore: "Explore the Gym",
    login: "Login",
    logout: "Logout",
    portal: "My portal",
    admin: "Admin",
    staff: "Staff",
    home: "Home",
    memberships: "Memberships",
    schedule: "Schedule",
    events: "Events",
    memories: "Memories",
    gym: "Virtual Gym",
    contact: "Contact"
  }
};

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function money(value) {
  return `${value} DH`;
}

function date(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(state.lang === "ar" ? "ar-MA" : "fr-MA", {
    dateStyle: "medium",
    timeZone: "Africa/Casablanca"
  }).format(new Date(value));
}

function navigate(path) {
  history.pushState({}, "", path);
  state.route = path;
  render();
}

function toast(message) {
  state.toast = message;
  render();
  setTimeout(() => {
    state.toast = "";
    render();
  }, 2600);
}

function tr(key) {
  return t[state.lang][key] || key;
}

function roleHome() {
  if (!state.me) return "/login";
  if (state.me.roles.includes("SUPER_ADMIN") || state.me.roles.includes("ADMIN") || state.me.roles.includes("MANAGER")) return "/admin";
  if (state.me.roles.includes("COACH") || state.me.roles.includes("CONTENT_MANAGER")) return "/staff";
  return "/portal";
}

async function refresh() {
  state.data = await api("/api/bootstrap");
  state.me = state.data.me;
  if (state.me && state.route.startsWith("/portal")) state.portal = await api("/api/portal");
  if (state.me && state.route.startsWith("/admin") && isAdmin()) state.admin = await api("/api/admin/analytics");
}

function isAdmin() {
  return state.me?.roles?.some((r) => ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(r));
}

function isStaff() {
  return state.me?.roles?.some((r) => ["SUPER_ADMIN", "ADMIN", "MANAGER", "COACH", "CONTENT_MANAGER"].includes(r));
}

function eagleMark() {
  return `<div class="brand-mark" aria-label="Logo Aljawarih"><img src="/assets/club/logo-aigle.jpg" alt="Aigle Aljawarih Gym"></div>`;
}

function shell(content) {
  const publicNav = [
    ["/", tr("home")], ["/about", tx("about")], ["/memberships", tr("memberships")], ["/schedule", tr("schedule")],
    ["/events", tr("events")], ["/memories", tr("memories")], ["/virtual-gym", tr("gym")], ["/contact", tr("contact")]
  ];
  const logged = Boolean(state.me);
  document.documentElement.lang = state.lang;
  document.documentElement.dataset.theme = state.theme;
  document.body.dir = state.lang === "ar" ? "rtl" : "ltr";
  return `
    <div class="app-shell">
      <header class="topbar">
        <button class="brand icon-btn" data-nav="/">
          ${eagleMark()}
          <span><strong>${state.lang === "ar" ? "نادي الجوارح" : "ALJAWARIH GYM"}</strong><small>${state.lang === "ar" ? "تارودانت، المغرب" : "Taroudant, Morocco"}</small></span>
        </button>
        <nav class="nav ${state.mobileMenu ? "open" : ""}" aria-label="Public navigation">
          <div class="mobile-nav-head"><strong>MENU</strong><button class="nav-close" data-menu aria-label="Fermer le menu">×</button></div>
          ${publicNav.map(([href, label]) => `<button class="${state.route === href ? "active" : ""}" data-nav="${href}">${label}</button>`).join("")}
          <div class="mobile-account">${logged ? `<button class="btn secondary" data-nav="${roleHome()}">${tr("portal")}</button><button class="btn danger" data-logout>${tr("logout")}</button>` : `<button class="btn secondary" data-nav="/login">${tr("login")}</button><button class="btn" data-nav="/register">${tr("join")}</button>`}</div>
        </nav>
        <button class="menu-toggle" data-menu aria-label="Ouvrir le menu" aria-expanded="${state.mobileMenu}"><span></span><span></span><span></span></button>
        ${state.mobileMenu ? `<button class="nav-backdrop" data-menu aria-label="Fermer le menu"></button>` : ""}
        <div class="actions">
          <div class="lang">
            ${["fr", "ar", "en"].map((lang) => `<button class="${state.lang === lang ? "active" : ""}" data-lang="${lang}">${lang.toUpperCase()}</button>`).join("")}
          </div>
          <button class="theme-toggle" data-theme aria-label="${state.theme === "dark" ? tx("light") : tx("dark")}" title="${state.theme === "dark" ? tx("light") : tx("dark")}">${state.theme === "dark" ? "☀" : "☾"}</button>
          ${logged ? `<button class="btn secondary" data-nav="${roleHome()}">${tr("portal")}</button><button class="btn danger" data-logout>${tr("logout")}</button>` : `<button class="btn secondary" data-nav="/login">${tr("login")}</button><button class="btn" data-nav="/register">${tr("join")}</button>`}
        </div>
      </header>
      <main class="main fade-in">${content}</main>
      ${logged ? bottomNav() : ""}
      ${state.toast ? `<div class="toast">${state.toast}</div>` : ""}
    </div>`;
}

function bottomNav() {
  const items = [["/portal", "Home"], ["/portal/schedule", "Schedule"], ["/portal/gym", "Gym"], ["/portal/memories", "Memories"], ["/portal/profile", "Profile"]];
  return `<nav class="bottom-nav">${items.map(([href, label]) => `<button class="${state.route === href ? "active" : ""}" data-nav="${href}">${label}</button>`).join("")}</nav>`;
}

function publicHome() {
  return `
    <section class="hero">
      <div>
        <div class="hero-lockup"><img src="/assets/club/logo-association.jpg" alt="Association El Jawarih Taroudant"></div>
        <div class="eyebrow">${tx("heroTag")}</div>
        <h1>ALJAWARIH GYM</h1>
        <p>${tx("heroText")}</p>
        <div class="actions"><button class="btn" data-nav="/register">${tr("join")}</button><button class="btn secondary" data-nav="/virtual-gym">${tr("explore")}</button></div>
      </div>
      <div class="hero-media" role="img" aria-label="Entrée d'Aljawarih Gym"></div>
    </section>
    ${storySection()}
    ${coachesSection()}
    ${membershipPreview()}
    ${schedulePreview()}
    ${virtualGymPreview()}
    ${eventsSection(true)}
    ${memoriesSection(true)}
    ${testimonials()}
  `;
}

function storySection() {
  const features = [
    [tx("community"), tx("communityText")],
    [tx("coaching"), tx("coachingText")],
    [tx("progress"), tx("progressText")]
  ];
  return `<section class="section"><h2>${tx("storyTitle")}</h2><p class="section-lead">${tx("storyLead")}</p><div class="grid">${features.map(([h, p], i) => `<article class="card feature-card"><span class="feature-number">0${i + 1}</span><h3>${h}</h3><p class="muted">${p}</p></article>`).join("")}</div></section>`;
}

function coachesSection() {
  const coaches = [
    { name: "Elhabib" },
    { name: "Abderrahmane", photo: "/assets/coaches/abderrahmane.jpg" },
    { name: "Youssef", photo: "/assets/coaches/youssef.jpg" },
    { name: "Rachid" },
    { name: "Brahim", photo: "/assets/coaches/brahim.jpg" },
    { name: "Hicham", photo: "/assets/coaches/hicham.jpg" },
    { name: "Abdelmajid", photo: "/assets/coaches/abdelmajid.jpg" }
  ];
  return `<section class="section coaches"><div><h2>${tx("coachesTitle")}</h2><p class="section-lead">${tx("coachesLead")}</p></div><div class="coach-list">${coaches.map((coach, i) => `<article class="coach-card">${coach.photo ? `<img src="${coach.photo}" alt="Coach ${coach.name}" loading="lazy">` : `<div class="coach-placeholder" aria-hidden="true">${coach.name.charAt(0)}</div>`}<div class="coach-overlay"></div><span>0${i + 1}</span><div class="coach-info"><h3>${coach.name}</h3><p>COACH</p></div></article>`).join("")}</div></section>`;
}

function membershipPreview(showHeading = true) {
  const groups = Object.groupBy ? Object.groupBy(state.data.membershipPlans, (p) => p.audience) : state.data.membershipPlans.reduce((a, p) => ((a[p.audience] ||= []).push(p), a), {});
  return `<section class="section">${showHeading ? `<h2>${tx("pricing")}</h2><p class="section-lead">${tx("pricingLead")}</p>` : ""}<div class="grid">${Object.entries(groups).map(([audience, plans]) => `<article class="card span-4"><span class="pill">${audience}</span><h3>${audience}</h3>${plans.map((p) => `<div><strong>${p.name}</strong><div class="price">${money(p.priceMad)}</div></div>`).join("")}<button class="btn" data-nav="/memberships">${tx("viewPlans")}</button></article>`).join("")}</div></section>`;
}

function schedulePreview() {
  return `<section class="section"><h2>${tx("scheduleTitle")}</h2>${scheduleGrid(state.data.classes.slice(0, 12), false)}</section>`;
}

function scheduleGrid(classes, bookable = true) {
  return `<div class="schedule">${days.slice(1).concat("Sunday").map((day) => {
    const list = classes.filter((c) => c.dayName === day);
    return `<div class="day"><strong>${day}</strong>${list.length ? list.map((c) => `<div class="class-item"><span class="pill">${c.type}</span><h3>${c.startsAt} - ${c.endsAt}</h3><p class="muted">${c.name}</p>${bookable ? `<button class="btn" data-book="${c.id}">${tx("reserve")}</button>` : ""}</div>`).join("") : `<p class="muted">${tx("noSession")}</p>`}</div>`;
  }).join("")}</div>`;
}

function virtualGymPreview() {
  return `<section class="section"><h2>${tx("galleryTitle")}</h2><p class="section-lead">${tx("galleryLead")}</p>${clubGallery()}</section>`;
}

function clubGallery() {
  const labels = {
    fr: [["Accueil du club", "L'entrée et le tableau d'affichage."], ["Hammam beldi", "Le hammam traditionnel et ses vestiaires."], ["Rez-de-chaussée — Aérobic & cinéma", "Cours collectifs et projections avec vidéoprojecteur."], ["Sous-sol — Machines, boxe & stretching", "Musculation, boxe, renforcement et stretching."]],
    en: [["Club reception", "The entrance and information board."], ["Traditional hammam", "The traditional hammam and changing area."], ["Ground floor — Aerobics & cinema", "Group classes and screenings with a video projector."], ["Basement — Machines, boxing & stretching", "Strength training, boxing and stretching."]],
    ar: [["استقبال النادي", "المدخل ولوحة الإعلانات."], ["الحمام البلدي", "الحمام التقليدي وغرف تبديل الملابس."], ["الطابق الأرضي — أيروبيك وسينما", "حصص جماعية وعروض بجهاز الإسقاط."], ["الطابق السفلي — آلات وملاكمة وتمدد", "كمال الأجسام والملاكمة والتقوية والتمدد."]]
  }[state.lang];
  const sections = [
    {
      title: labels[0][0],
      description: labels[0][1],
      photos: [
        ["/assets/club/entree.jpg", "Entrée principale d'Aljawarih Gym"],
        ["/assets/club/emploi-du-temps.jpg", "Tableau d'affichage et emploi du temps"]
      ]
    },
    {
      title: labels[1][0],
      description: labels[1][1],
      photos: [
        ["/assets/club/hammam-1.jpg", "Vestiaires du hammam beldi"],
        ["/assets/club/hammam-2.jpg", "Cabines du hammam beldi"],
        ["/assets/club/hammam-3.jpg", "Espace de préparation du hammam beldi"]
      ]
    },
    {
      title: labels[2][0],
      description: labels[2][1],
      photos: [
        ["/assets/club/rdc-aerobic-1.jpg", "Salle d'aérobic au rez-de-chaussée"],
        ["/assets/club/rdc-aerobic-2.jpg", "Espace d'entraînement et matériel d'aérobic"],
        ["/assets/club/rdc-cinema.jpg", "Espace cinéma avec écran et vidéoprojecteur"],
        ["/assets/club/rdc-aerobic-3.jpg", "Vue générale de la salle du rez-de-chaussée"]
      ]
    },
    {
      title: labels[3][0],
      description: labels[3][1],
      photos: [
        ["/assets/club/sous-sol-boxe-1.jpg", "Espace boxe au sous-sol"],
        ["/assets/club/sous-sol-boxe-2.jpg", "Sacs de frappe et zone d'entraînement"],
        ["/assets/club/sous-sol-machines-1.jpg", "Machines et zone de musculation"],
        ["/assets/club/sous-sol-stretching.jpg", "Zone de stretching et renforcement"],
        ["/assets/club/sous-sol-machines-2.jpg", "Équipements de musculation au sous-sol"]
      ]
    }
  ];
  return `<div class="club-gallery">${sections.map((section) => `<section class="gallery-section"><div class="gallery-heading"><h3>${section.title}</h3><p class="muted">${section.description}</p></div><div class="photo-grid photo-grid-${section.photos.length}">${section.photos.map(([src, alt], index) => `<figure class="club-photo ${index === 0 ? "featured" : ""}"><img src="${src}" alt="${alt}" loading="lazy"><figcaption>${alt}</figcaption></figure>`).join("")}</div></section>`).join("")}</div>`;
}

function gymMap(floorId = "floor_1") {
  const floor = state.data.floors.find((f) => f.id === floorId) || state.data.floors[0];
  const zones = state.data.zones.filter((z) => z.floorId === floor.id);
  return `<div class="grid"><div class="card span-4"><h3>${floor.name}</h3><p class="muted">${floor.description}</p>${state.data.floors.map((f) => `<button class="btn secondary" data-floor="${f.id}">${f.name}</button>`).join(" ")}</div><div class="span-8 gym-map">${zones.map((z) => `<div class="zone-dot" style="left:${z.x}%;top:${z.y}%"></div><div class="zone-label" style="left:${z.x}%;top:${z.y}%"><strong>${z.name}</strong><br><small>${z.description}</small></div>`).join("")}</div></div>`;
}

function eventsSection(preview = false) {
  const items = preview ? state.data.events.slice(0, 3) : state.data.events;
  return `<section class="section"><h2>${tx("eventsTitle")}</h2><div class="grid">${items.map((e) => `<article class="card span-4"><span class="pill">${e.category}</span><h3>${e.title}</h3><p class="muted">${e.description}</p><p>${date(e.startsAt)} - ${e.location}</p><p class="muted">${e.participants}/${e.capacity} ${tx("participants")}</p>${state.me ? `<button class="btn secondary" data-event-register="${e.id}">${tx("register")}</button>` : ""}</article>`).join("")}</div></section>`;
}

function memoriesSection(preview = false) {
  const items = preview ? state.data.memories.slice(0, 3) : state.data.memories;
  return `<section class="section"><h2>${tx("memoriesTitle")}</h2><p class="section-lead">${tx("memoriesLead")}</p><div class="grid">${items.map((m) => `<article class="card span-4 memory-card" style="background-image:linear-gradient(180deg,rgba(8,10,15,.2),rgba(8,10,15,.94)),url('${safe(m.coverUrl || "")}')"><span class="pill">${m.year}</span><h3>${safe(m.title)}</h3><p>${safe(m.story)}</p><p>${Number(m.items || 0)} ${tx("photos")} ${m.videos ? `- ${Number(m.videos)} ${tx("videos")}` : ""}</p>${m.media?.length ? `<div class="memory-media">${m.media.slice(0, 4).map(memoryMedia).join("")}</div>${preview ? "" : `<details class="memory-gallery"><summary>Voir toutes les photos</summary><div class="memory-media memory-media-all">${m.media.map(memoryMedia).join("")}</div></details>`}` : ""}</article>`).join("")}</div></section>`;
}

function memoryMedia(media) {
  return media.type?.startsWith("video/") ? `<video controls preload="metadata" src="${safe(media.url)}"></video>` : `<img src="${safe(media.url)}" alt="Photo du club Aljawarih" loading="lazy">`;
}

function testimonials() {
  return `<section class="section quote-section"><span class="eyebrow">ALJAWARIH GYM</span><h2>${tx("clubQuote")}</h2><p>${tx("quote")}</p></section>`;
}

function aboutPage() {
  return `<div class="page-title"><h1>${tx("aboutTitle")}</h1><p>${tx("aboutText")}</p></div>${storySection()}${coachesSection()}`;
}

function membershipsPage() {
  return `<div class="page-title"><h1>${tx("pricing")}</h1><p>${tx("membershipPageLead")}</p></div>${membershipPreview(false)}`;
}

function schedulePage() {
  return `<div class="page-title"><h1>${tx("scheduleTitle")}</h1><p>${tx("scheduleLead")}</p></div>${scheduleGrid(state.data.classes, true)}`;
}

function virtualGymPage() {
  return `<div class="page-title"><h1>${tx("exploreTitle")}</h1><p>${tx("exploreLead")}</p></div>${clubGallery()}<section class="section"><h2>${tx("equipment")}</h2><div class="grid">${state.data.equipment.map(equipmentCard).join("")}</div></section>`;
}

function equipmentCard(eq) {
  return `<article class="card span-6"><span class="pill">${eq.category}</span><h3>${eq.name}</h3><p class="muted">${eq.description}</p><p><strong>${tx("difficulty")}:</strong> ${eq.difficulty}</p><p><strong>${tx("targets")}:</strong> ${eq.muscles.join(", ")}</p><div class="qr" title="${location.origin}${eq.qrPath}"></div><button class="btn secondary" data-nav="${eq.qrPath}">${tx("viewQr")}</button></article>`;
}

function contactPage() {
  const instagram = "https://www.instagram.com/aljawarih_gym_maroc?stkn=bG1hZzZmbHo0OGEy";
  return `<div class="page-title"><h1>${tx("contactTitle")}</h1><p>${tx("contactLead")}</p></div><div class="grid contact-grid"><article class="card span-6 contact-card"><span class="eyebrow">${tx("club")}</span><a class="contact-link" href="tel:+212668190058"><small>${tx("phone")}</small><strong>06 68 19 00 58</strong></a><a class="contact-link" href="${instagram}" target="_blank" rel="noopener"><small>${tx("instagram")}</small><strong>@aljawarih_gym_maroc ↗</strong></a><p class="muted">Taroudant, Maroc</p></article><form class="card span-6 form"><div class="field"><label>${tx("name")}</label><input required></div><div class="field"><label>${tx("message")}</label><textarea rows="5"></textarea></div><button class="btn" type="button" data-toast="WhatsApp / Instagram">${tx("send")}</button></form></div>`;
}

function loginPage(register = false) {
  return `<div class="grid"><section class="card span-5"><h1>${register ? "Créer un compte" : "Connexion"}</h1><form class="form" data-auth="${register ? "register" : "login"}">${register ? `<div class="field"><label>Prénom</label><input name="firstName" required></div><div class="field"><label>Nom</label><input name="lastName" required></div><div class="field"><label>Téléphone</label><input name="phone" placeholder="06..." required></div><div class="field"><label>CIN / Carte Nationale</label><input name="cin" required></div><div class="field"><label>Date de naissance</label><input name="dateOfBirth" type="date" required></div><div class="field"><label>Sexe / catégorie</label><select name="gender" required><option value="Male">Homme</option><option value="Female">Femme</option></select></div><div class="field"><label>Type d'abonnement</label><select name="planId" required>${state.data.membershipPlans.map((plan) => `<option value="${plan.id}">${plan.audience} — ${plan.name} — ${money(plan.priceMad)}</option>`).join("")}</select></div>` : ""}<div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="field"><label>Mot de passe</label><input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" minlength="10" required></div><button class="btn">${register ? "Créer le compte" : "Se connecter"}</button></form></section><section class="card span-7"><h2>Accès sécurisé</h2><p class="muted">Après l'inscription, un message de confirmation est envoyé à votre adresse e-mail.</p>${!register ? `<form class="form" data-resend-verification><h3>Vous n'avez pas reçu le message ?</h3><div class="field"><label>Email du compte</label><input name="email" type="email" autocomplete="email" required></div><button class="btn secondary">Renvoyer l'e-mail de confirmation</button></form>` : ""}</section></div>`;
}

async function portalPage(section = "home") {
  if (!state.me) return loginPage();
  if (!state.portal) state.portal = await api("/api/portal");
  const nav = [["home", "Home"], ["membership", "Membership"], ["payments", "Paiements"], ["schedule", "Schedule"], ["bookings", "Bookings"], ["attendance", "Attendance"], ["progress", "Progress"], ["workouts", "Workouts"], ["achievements", "Achievements"], ["challenges", "Challenges"], ["memories", "Memories"], ["gym", "Virtual Gym"], ["notifications", "Notifications"], ["profile", "Profile"]];
  return dashboardLayout(nav, section, "Client Portal", renderPortalSection(section));
}

function dashboardLayout(nav, active, title, body) {
  return `<div class="layout"><aside class="sidebar">${nav.map(([key, label]) => `<button class="${active === key ? "active" : ""}" data-nav="${title === "Admin Dashboard" ? `/admin/${key === "overview" ? "" : key}` : title === "Staff Dashboard" ? `/staff/${key === "overview" ? "" : key}` : `/portal/${key === "home" ? "" : key}`}">${label}</button>`).join("")}</aside><section><div class="dashboard-head"><div><div class="eyebrow">${title}</div><h1>${active[0].toUpperCase() + active.slice(1)}</h1></div></div>${body}</section></div>`;
}

function renderPortalSection(section) {
  const p = state.portal;
  const profile = p.profile.profile;
  const membership = p.profile.membership;
  const plan = state.data.membershipPlans.find((x) => x.id === membership?.planId);
  const daysLeft = membership?.expiryDate ? Math.ceil((new Date(membership.expiryDate) - new Date()) / 86400000) : 0;
  if (section === "schedule") return scheduleGrid(state.data.classes, true);
  if (section === "bookings") return cardsOrEmpty(p.bookings.filter((b) => b.status === "BOOKED"), (b) => `<article class="card span-6"><h3>${b.class.name}</h3><p>${b.class.dayName} ${b.class.startsAt}-${b.class.endsAt}</p><button class="btn danger" data-cancel-booking="${b.id}">Cancel</button></article>`, "You haven't booked a session yet.");
  if (section === "attendance") return `<div class="grid"><article class="card span-4"><div class="stat">${p.attendance.length}</div><p>Total visits</p></article><article class="card span-4"><div class="stat">6</div><p>Current streak</p></article><article class="card span-4"><div class="stat">12</div><p>This month</p></article></div>${table(p.attendance, ["Date", "Source"], (a) => [date(a.checkedAt), a.source])}`;
  if (section === "payments") return table(p.payments || [], ["Date", "Montant", "Méthode", "Statut"], (payment) => [date(payment.paidAt || payment.createdAt), `${payment.amountMad} MAD`, payment.method, payment.status]);
  if (section === "progress" || section === "workouts") return `<div class="grid"><article class="card span-4"><div class="stat">${p.workouts.length}</div><p>Workouts completed</p></article><article class="card span-4"><div class="stat">38h</div><p>Hours trained</p></article><article class="card span-4"><div class="stat">5</div><p>Achievements</p></article><article class="card span-12"><h3>Strength progression</h3>${chart([30, 35, 40, 45, 48, 52, 56])}</article></div>${workoutForm()}`;
  if (section === "achievements") return cardsOrEmpty(p.achievements, (a) => `<article class="card span-4"><span class="pill ok">+${a.achievement.xp} XP</span><h3>${a.achievement.name}</h3><p class="muted">${a.achievement.description}</p></article>`, "No achievements yet.");
  if (section === "challenges") return `<div class="grid">${p.challengeProgress.map((c) => `<article class="card span-6"><h3>${c.challenge.title}</h3><p>${c.challenge.goal}</p><div class="progress"><span style="width:${Math.min(100, c.progress / c.challenge.target * 100)}%"></span></div><p>${c.progress} / ${c.challenge.target} completed</p></article>`).join("")}</div>`;
  if (section === "memories") return memoriesSection(false);
  if (section === "gym") return virtualGymPage();
  if (section === "notifications") return cardsOrEmpty(p.notifications, (n) => `<article class="card span-6"><span class="pill ${n.readAt ? "" : "warn"}">${n.type}</span><h3>${n.title}</h3><p class="muted">${n.body}</p>${!n.readAt ? `<button class="btn secondary" data-read-notification="${n.id}">Mark as read</button>` : ""}</article>`, "No notifications.");
  if (section === "profile") return profileForm(profile);
  if (section === "membership") return membershipCard(profile, membership, plan, daysLeft);
  return `<div class="grid">${membershipCard(profile, membership, plan, daysLeft)}<article class="card span-4"><div class="stat">${p.workouts.length + 22}</div><p>Workouts Completed</p></article><article class="card span-4"><div class="stat">38</div><p>Hours Trained</p></article><article class="card span-4"><div class="stat">${p.bookings.filter((b) => b.status === "BOOKED").length}</div><p>Upcoming Bookings</p></article><article class="card span-12"><h3>Quick actions</h3><div class="actions"><button class="btn" data-nav="/portal/schedule">Book a Session</button><button class="btn secondary" data-nav="/portal/gym">Explore Gym</button><button class="btn secondary" data-nav="/portal/workouts">Track Workout</button></div></article></div>`;
}

function membershipCard(profile, membership, plan, daysLeft) {
  return `<article class="card span-12"><span class="pill ${membership?.status === "ACTIVE" ? "ok" : membership?.status === "EXPIRED" ? "bad" : "warn"}">${membership?.status || "PENDING PAYMENT"}</span><h2>Welcome back, ${profile?.firstName || "Member"}</h2><p>${plan?.name || "No membership"} - ${Math.max(daysLeft, 0)} days remaining</p><p>Expires: ${date(membership?.expiryDate)}</p></article>`;
}

function workoutForm() {
  return `<form class="card span-12 form" data-workout><h3>Track workout</h3><div class="grid"><div class="field span-4"><label>Exercise</label><input name="exercise" value="Bench Press"></div><div class="field span-3"><label>Sets</label><input name="sets" type="number" value="3"></div><div class="field span-3"><label>Reps</label><input name="reps" type="number" value="8"></div><div class="field span-3"><label>Weight kg</label><input name="weightKg" type="number" value="45"></div></div><button class="btn">Save workout</button></form>`;
}

function profileForm(profile) {
  return `<form class="card span-12 form" data-profile><div class="grid"><div class="field span-6"><label>First name</label><input name="firstName" value="${profile.firstName || ""}"></div><div class="field span-6"><label>Last name</label><input name="lastName" value="${profile.lastName || ""}"></div><div class="field span-6"><label>Phone</label><input name="phone" value="${profile.phone || ""}"></div><div class="field span-6"><label>Emergency contact</label><input name="emergencyContact" value="${profile.emergencyContact || ""}"></div></div><button class="btn">Save profile</button></form>`;
}

async function adminPage(section = "overview") {
  if (!isAdmin()) return loginPage();
  const [analytics, clients, payments] = await Promise.all([api("/api/admin/analytics"), api("/api/admin/clients"), api("/api/admin/payments")]);
  state.admin = analytics;
  const nav = [["overview", "Dashboard"], ["members", "Members"], ["memberships", "Memberships"], ["payments", "Payments"], ["bookings", "Bookings"], ["attendance", "Attendance"], ["schedule", "Schedule"], ["events", "Events"], ["memories", "Memories"], ["gym", "Gym"], ["equipment", "Equipment"], ["analytics", "Analytics"], ["settings", "Settings"]];
  return dashboardLayout(nav, section, "Admin Dashboard", renderAdminSection(section, analytics, clients, payments));
}

function renderAdminSection(section, analytics, clients, payments) {
  if (section === "members") return table(clients, ["Client", "Status", "Plan", "Visits"], (c) => [`${c.profile.firstName} ${c.profile.lastName}`, c.membership?.status, c.plan?.name, c.attendanceCount]);
  if (section === "payments") return table(payments, ["Client", "Amount", "Method", "Status"], (p) => [`${p.client?.firstName} ${p.client?.lastName}`, money(p.amountMad), p.method, p.status]);
  if (section === "schedule") return `${adminClassForm(editing("class", state.data.classes))}${adminItems("Séances existantes", "class", state.data.classes, (item) => `<strong>${safe(item.name)}</strong><span>${safe(item.dayName)} · ${safe(item.startsAt)}–${safe(item.endsAt)}</span>`)}`;
  if (section === "memberships") return `${planForm(editing("plan", state.data.membershipPlans))}${adminItems("Formules existantes", "plan", state.data.membershipPlans, (item) => `<strong>${safe(item.name)}</strong><span>${safe(item.audience)} · ${money(item.priceMad)}</span>`)}`;
  if (section === "bookings") return adminBookings();
  if (section === "attendance") return staffCheckin();
  if (section === "events") return `${eventForm(editing("event", state.data.events))}${adminItems("Activités existantes", "event", state.data.events, (item) => `<strong>${safe(item.title)}</strong><span>${safe(item.category)} · ${date(item.startsAt)}</span>`)}`;
  if (section === "memories") return `${memoryForm(editing("memory", state.data.memories))}${adminItems("Albums existants", "memory", state.data.memories, (item) => `<strong>${safe(item.title)}</strong><span>${Number(item.items || 0)} photos · ${Number(item.videos || 0)} vidéos</span>`)}`;
  if (section === "gym") return virtualGymPage();
  if (section === "equipment") return `${equipmentForm(editing("equipment", state.data.equipment))}${adminItems("Équipements existants", "equipment", state.data.equipment, (item) => `<strong>${safe(item.name)}</strong><span>${safe(item.category)} · ${safe(item.difficulty)}</span>`)}`;
  if (section === "analytics") return analyticsView(analytics);
  if (section === "settings") return `<div class="grid"><article class="card span-6"><h3>Club settings</h3><p>${state.data.settings.clubName}</p><p>${state.data.settings.arabicName}</p><p class="muted">Settings API is prepared for production CMS expansion.</p></article><form class="card span-6 form" data-change-password><h3>Changer le mot de passe</h3><div class="field"><label>Mot de passe actuel</label><input name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label>Nouveau mot de passe</label><input name="newPassword" type="password" minlength="12" autocomplete="new-password" required></div><div class="field"><label>Confirmer le nouveau mot de passe</label><input name="confirmPassword" type="password" minlength="12" autocomplete="new-password" required></div><button class="btn">Enregistrer le nouveau mot de passe</button></form></div>`;
  return `${adminQuickActions()}${analyticsView(analytics)}`;
}

function adminQuickActions() {
  return `<section class="card admin-quick"><div><span class="eyebrow">GESTION DU CONTENU</span><h2>Que voulez-vous gérer ?</h2></div><div class="admin-quick-grid"><button class="btn" data-nav="/admin/events">+ Activité</button><button class="btn" data-nav="/admin/memories">+ Photos / vidéos</button><button class="btn secondary" data-nav="/admin/schedule">Planning</button><button class="btn secondary" data-nav="/admin/memberships">Abonnements</button><button class="btn secondary" data-nav="/admin/equipment">Équipements</button></div></section>`;
}

function safe(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function editing(type, items) {
  return state.adminEdit?.type === type ? items.find((item) => item.id === state.adminEdit.id) || null : null;
}

function adminItems(title, type, items, summary) {
  return `<section class="admin-manager"><div class="dashboard-head"><h2>${title}</h2><span class="pill">${items.length}</span></div>${items.length ? `<div class="admin-list">${items.map((item) => `<article class="admin-row"><div>${summary(item)}</div><div class="actions"><button class="btn secondary" data-admin-edit="${type}" data-id="${item.id}">Modifier</button><button class="btn danger" data-admin-delete="${type}" data-id="${item.id}">Supprimer</button></div></article>`).join("")}</div>` : `<div class="empty">Aucun élément pour le moment.</div>`}</section>`;
}

function analyticsView(a) {
  const stats = [["Total Members", a.totalMembers], ["Active Members", a.activeMembers], ["Expired", a.expiredMemberships], ["New Members", a.newMembers], ["Today Attendance", a.todayAttendance], ["Bookings", a.todayBookings], ["Monthly Revenue", money(a.monthlyRevenue)], ["Pending Payments", a.pendingPayments]];
  return `<div class="grid">${stats.map(([label, value]) => `<article class="card span-3"><div class="stat">${value}</div><p>${label}</p></article>`).join("")}<article class="card span-6"><h3>Revenue growth</h3>${chart(a.revenueTrend)}</article><article class="card span-6"><h3>Attendance</h3>${chart(a.attendanceTrend)}</article></div>`;
}

function adminBookings() {
  return `<section>${apiDataNote("Booking data is available through /api/bookings with staff scoping.")}<button class="btn secondary" data-load-bookings>Load bookings</button><div id="bookingTarget"></div></section>`;
}

async function staffPage(section = "overview") {
  if (!isStaff()) return loginPage();
  const nav = [["overview", "Today"], ["sessions", "Sessions"], ["check-in", "Check-in"], ["participants", "Participants"]];
  const body = section === "check-in" ? staffCheckin() : section === "sessions" ? scheduleGrid(state.data.classes, false) : `<div class="grid"><article class="card span-6"><h3>Assigned sessions</h3><p class="stat">${state.data.classes.length}</p></article><article class="card span-6"><h3>Coach tools</h3><p class="muted">Mark attendance, view participants and add workout notes.</p></article></div>`;
  return dashboardLayout(nav, section, "Staff Dashboard", body);
}

function staffCheckin() {
  const clients = state.adminClients || [];
  return `<form class="card span-12 form" data-checkin><h3>QR Check-in</h3><p class="muted">Use client QR token format: qr:usr_sara. Camera scanner can be connected to this endpoint.</p><div class="field"><label>QR token or client id</label><input name="qrToken" value="qr:usr_sara"></div><button class="btn">Record attendance</button></form>`;
}

function formActions(item, createLabel) {
  return `<div class="actions"><button class="btn">${item ? "Enregistrer les modifications" : createLabel}</button>${item ? `<button class="btn secondary" type="button" data-admin-cancel>Annuler</button>` : ""}</div>`;
}

function planForm(item) {
  return `<form class="card span-12 form" data-plan data-id="${item?.id || ""}"><h3>${item ? "Modifier la formule" : "Ajouter une formule"}</h3><div class="grid"><div class="field span-3"><label>Public</label><input name="audience" value="${safe(item?.audience || "Adultes")}" required></div><div class="field span-3"><label>Nom</label><input name="name" value="${safe(item?.name || "Abonnement mensuel")}" required></div><div class="field span-3"><label>Prix DH</label><input name="priceMad" type="number" min="0" value="${Number(item?.priceMad ?? 350)}" required></div><div class="field span-3"><label>Durée en jours</label><input name="durationDays" type="number" min="1" value="${Number(item?.durationDays ?? 30)}" required></div></div>${formActions(item, "Ajouter la formule")}</form>`;
}

function adminClassForm(item) {
  return `<form class="card span-12 form" data-class data-id="${item?.id || ""}"><h3>${item ? "Modifier la séance" : "Ajouter une séance"}</h3><div class="grid"><div class="field span-3"><label>Nom</label><input name="name" value="${safe(item?.name || "Entraînement de groupe")}" required></div><div class="field span-2"><label>Jour</label><select name="dayName">${days.slice(1).map((d) => `<option value="${d}" ${item?.dayName === d ? "selected" : ""}>${d}</option>`)}</select></div><div class="field span-2"><label>Début</label><input name="startsAt" type="time" value="${safe(item?.startsAt || "10:00")}" required></div><div class="field span-2"><label>Fin</label><input name="endsAt" type="time" value="${safe(item?.endsAt || "11:00")}" required></div><div class="field span-2"><label>Capacité</label><input name="capacity" type="number" min="1" value="${Number(item?.capacity ?? 20)}"></div></div>${formActions(item, "Ajouter la séance")}</form>`;
}

function eventForm(item) {
  const eventDate = item?.startsAt ? new Date(item.startsAt).toISOString().slice(0, 10) : new Date(Date.now() + 86400000 * 20).toISOString().slice(0, 10);
  return `<form class="card span-12 form" data-event data-id="${item?.id || ""}"><h3>${item ? "Modifier l'activité" : "Ajouter une activité"}</h3><div class="grid"><div class="field span-4"><label>Titre</label><input name="title" value="${safe(item?.title || "Nouvelle activité")}" required></div><div class="field span-3"><label>Catégorie</label><input name="category" value="${safe(item?.category || "Club")}" required></div><div class="field span-2"><label>Date</label><input name="eventDate" type="date" value="${eventDate}" required></div><div class="field span-2"><label>Heure</label><input name="time" type="time" value="${safe(item?.time || "19:00")}"></div><div class="field span-3"><label>Capacité</label><input name="capacity" type="number" min="1" value="${Number(item?.capacity ?? 30)}"></div><div class="field span-5"><label>Lieu</label><input name="location" value="${safe(item?.location || "Taroudant, Morocco")}" required></div></div><div class="field"><label>Description</label><textarea name="description" required>${safe(item?.description || "")}</textarea></div>${formActions(item, "Ajouter l'activité")}</form>`;
}

function memoryForm(item) {
  return `<form class="card span-12 form" data-memory data-id="${item?.id || ""}"><h3>${item ? "Modifier l'album" : "Créer un album souvenir"}</h3><div class="grid"><div class="field span-4"><label>Titre</label><input name="title" value="${safe(item?.title || "Nouvel album")}" required></div><div class="field span-2"><label>Année</label><input name="year" type="number" min="2000" value="${Number(item?.year || new Date().getFullYear())}" required></div><div class="field span-3"><label>Catégorie</label><input name="category" value="${safe(item?.category || "Club")}"></div></div><div class="field"><label>Histoire / description</label><textarea name="story">${safe(item?.story || "")}</textarea></div><div class="grid"><div class="field span-6"><label>Photo de couverture (5 Mo max.)</label><input name="coverFile" type="file" accept="image/jpeg,image/png,image/webp"></div><div class="field span-6"><label>Photos et vidéos (25 Mo max. par fichier)</label><input name="mediaFiles" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple></div></div><p class="muted">Les fichiers sélectionnés seront envoyés et conservés dans l'espace de stockage du club.</p>${formActions(item, "Créer l'album")}</form>`;
}

function equipmentForm(item) {
  return `<form class="card span-12 form" data-equipment data-id="${item?.id || ""}"><h3>${item ? "Modifier l'équipement" : "Ajouter un équipement"}</h3><div class="grid"><div class="field span-4"><label>Nom</label><input name="name" value="${safe(item?.name || "Nouvel équipement")}" required></div><div class="field span-3"><label>Catégorie</label><input name="category" value="${safe(item?.category || "Musculation")}" required></div><div class="field span-3"><label>Niveau</label><input name="difficulty" value="${safe(item?.difficulty || "Débutant")}"></div></div><div class="field"><label>Description</label><textarea name="description">${safe(item?.description || "")}</textarea></div>${formActions(item, "Ajouter l'équipement")}</form>`;
}

function chart(values) {
  const max = Math.max(...values, 1);
  return `<div class="chart">${values.map((v) => `<span class="bar" style="height:${Math.max(8, v / max * 100)}%" title="${v}"></span>`).join("")}</div>`;
}

function table(rows, headings, mapper) {
  if (!rows.length) return `<div class="empty">No data yet.</div>`;
  return `<table class="table"><thead><tr>${headings.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${mapper(row).map((cell) => `<td>${cell ?? "-"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function cardsOrEmpty(rows, renderer, empty) {
  return rows.length ? `<div class="grid">${rows.map(renderer).join("")}</div>` : `<div class="empty">${empty}</div>`;
}

function apiDataNote(text) {
  return `<div class="empty">${text}</div>`;
}

function routeSection(base) {
  const part = state.route.replace(base, "").replace("/", "");
  return part || (base === "/portal" ? "home" : "overview");
}

async function screen() {
  if (!state.data) await refresh();
  if (state.route === "/") return publicHome();
  if (state.route === "/about") return aboutPage();
  if (state.route === "/memberships") return membershipsPage();
  if (state.route === "/schedule") return schedulePage();
  if (state.route === "/events") return eventsSection(false);
  if (state.route === "/memories") return memoriesSection(false);
  if (state.route === "/virtual-gym") return virtualGymPage();
  if (state.route === "/contact") return contactPage();
  if (state.route === "/login") return loginPage(false);
  if (state.route === "/register") return loginPage(true);
  if (state.route.startsWith("/portal")) return portalPage(routeSection("/portal"));
  if (state.route.startsWith("/admin")) return adminPage(routeSection("/admin"));
  if (state.route.startsWith("/staff")) return staffPage(routeSection("/staff"));
  if (state.route.startsWith("/equipment/")) {
    const eq = state.data.equipment.find((item) => item.id === state.route.split("/").pop());
    return eq ? `<div class="page-title"><h1>${eq.name}</h1><p>${eq.description}</p></div><div class="grid">${equipmentCard(eq)}<article class="card span-6"><h3>How to use</h3>${eq.instructions.map((x) => `<p>${x}</p>`).join("")}<h3>Safety</h3>${eq.safety.map((x) => `<p class="muted">${x}</p>`).join("")}</article></div>` : `<div class="empty">Equipment not found.</div>`;
  }
  return publicHome();
}

async function render() {
  try {
    app.innerHTML = shell(await screen());
    localizeArabic(app);
  } catch (err) {
    app.innerHTML = shell(`<div class="empty"><h2>Something needs attention</h2><p>${err.message}</p><button class="btn" data-nav="/login">Login</button></div>`);
    localizeArabic(app);
  }
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.nav) {
    state.mobileMenu = false;
    navigate(target.dataset.nav);
  }
  if (target.dataset.menu !== undefined) {
    state.mobileMenu = !state.mobileMenu;
    render();
  }
  if (target.dataset.lang) {
    state.lang = target.dataset.lang;
    localStorage.setItem("lang", state.lang);
    render();
  }
  if (target.dataset.theme !== undefined) {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    render();
  }
  if (target.dataset.adminEdit) {
    state.adminEdit = { type: target.dataset.adminEdit, id: target.dataset.id };
    await render();
    document.querySelector("form[data-id]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (target.dataset.adminCancel !== undefined) {
    state.adminEdit = null;
    render();
  }
  if (target.dataset.adminDelete) {
    const labels = { event: "cette activité", class: "cette séance", plan: "cette formule", memory: "cet album et ses références", equipment: "cet équipement" };
    if (!confirm(`Supprimer ${labels[target.dataset.adminDelete] || "cet élément"} ?`)) return;
    const roots = { event: "events", class: "classes", plan: "membership-plans", memory: "memories", equipment: "equipment" };
    try {
      await api(`/api/${roots[target.dataset.adminDelete]}/${target.dataset.id}`, { method: "DELETE" });
      state.adminEdit = null;
      state.data = null;
      await refresh();
      toast("Élément supprimé.");
    } catch (err) { toast(err.message); }
  }
  if (target.dataset.logout !== undefined) {
    localStorage.removeItem("token");
    state.token = "";
    state.me = null;
    state.portal = null;
    toast("Signed out");
    navigate("/");
  }
  if (target.dataset.toast) toast(target.dataset.toast);
  if (target.dataset.book) {
    try {
      await api("/api/bookings", { method: "POST", body: JSON.stringify({ classId: target.dataset.book }) });
      state.data = null;
      state.portal = null;
      await refresh();
      toast("Reservation confirmed");
    } catch (err) { toast(err.message); }
  }
  if (target.dataset.cancelBooking) {
    await api(`/api/bookings/${target.dataset.cancelBooking}`, { method: "DELETE" });
    state.portal = null;
    await refresh();
    toast("Booking cancelled");
  }
  if (target.dataset.eventRegister) {
    await api(`/api/events/${target.dataset.eventRegister}/register`, { method: "POST" });
    state.data = null;
    await refresh();
    toast("Event registration saved");
  }
  if (target.dataset.readNotification) {
    await api(`/api/notifications/${target.dataset.readNotification}`, { method: "PUT" });
    state.portal = null;
    await refresh();
    toast("Notification marked as read");
  }
  if (target.dataset.loadBookings !== undefined) {
    try {
      const rows = await api("/api/bookings");
      const mount = document.querySelector("#bookingTarget");
      if (mount) mount.innerHTML = table(rows, ["Client", "Session", "Time", "Status"], (b) => [`${b.client?.firstName || ""} ${b.client?.lastName || ""}`, b.class?.name, `${b.class?.dayName} ${b.class?.startsAt}-${b.class?.endsAt}`, b.status]);
    } catch (err) { toast(err.message); }
  }
});

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Impossible de lire ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function uploadMedia(file) {
  const isVideo = file.type.startsWith("video/");
  const maxBytes = (isVideo ? 25 : 5) * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`${file.name} dépasse la limite de ${isVideo ? 25 : 5} Mo.`);
  return api("/api/admin/media", { method: "POST", body: JSON.stringify({ fileName: file.name, mimeType: file.type, dataBase64: await fileAsDataUrl(file) }) });
}

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    if (form.dataset.auth) {
      const endpoint = form.dataset.auth === "register" ? "/api/auth/register" : "/api/auth/login";
      const result = await api(endpoint, { method: "POST", body: JSON.stringify(values) });
      if (result.verificationRequired) {
        toast(result.emailSent ? "Consultez votre e-mail pour confirmer votre compte." : "Compte créé. La configuration SMTP doit être terminée par l'administrateur.");
        navigate("/login");
        return;
      }
      localStorage.setItem("token", result.token);
      state.token = result.token;
      state.me = result.user;
      state.data = null;
      state.portal = null;
      await refresh();
      navigate(roleHome());
      return;
    }
    if (form.dataset.resendVerification !== undefined) {
      const result = await api("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email: values.email }) });
      toast(result.emailSent ? "Un nouveau message de confirmation a été envoyé." : "Impossible d'envoyer le message. Vérifiez la configuration SMTP.");
    }
    if (form.dataset.changePassword !== undefined) {
      if (values.newPassword !== values.confirmPassword) throw new Error("Les nouveaux mots de passe ne correspondent pas.");
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
      form.reset();
      toast("Le mot de passe a été modifié.");
    }
    if (form.dataset.profile !== undefined) {
      await api("/api/profile", { method: "PUT", body: JSON.stringify(values) });
      state.portal = null;
      await refresh();
      toast("Profile updated");
    }
    if (form.dataset.workout !== undefined) {
      await api("/api/workouts", { method: "POST", body: JSON.stringify({ duration: 60, exercises: [{ name: values.exercise, sets: Number(values.sets), reps: Number(values.reps), weightKg: Number(values.weightKg) }] }) });
      state.portal = null;
      await refresh();
      toast("Workout tracked");
    }
    if (form.dataset.checkin !== undefined) {
      const result = await api("/api/attendance", { method: "POST", body: JSON.stringify(values) });
      toast(`Checked in ${result.client.profile.firstName}`);
    }
    if (form.dataset.plan !== undefined) {
      const editingId = form.dataset.id;
      await api(`/api/membership-plans${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", body: JSON.stringify({ ...values, priceMad: Number(values.priceMad), durationDays: Number(values.durationDays), benefits: ["Admin editable"], currency: "DH" }) });
      state.adminEdit = null;
      state.data = null;
      await refresh();
      toast(editingId ? "Formule modifiée." : "Formule ajoutée.");
    }
    if (form.dataset.class !== undefined) {
      const dayName = values.dayName;
      const editingId = form.dataset.id;
      await api(`/api/classes${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", body: JSON.stringify({ ...values, dayName, dayOfWeek: days.indexOf(dayName), capacity: Number(values.capacity), type: values.name }) });
      state.adminEdit = null;
      state.data = null;
      await refresh();
      toast(editingId ? "Séance modifiée." : "Séance ajoutée.");
    }
    if (form.dataset.event !== undefined) {
      const editingId = form.dataset.id;
      await api(`/api/events${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", body: JSON.stringify({ ...values, capacity: Number(values.capacity), startsAt: new Date(`${values.eventDate}T${values.time || "19:00"}:00`).toISOString(), coverImageUrl: editingId ? undefined : "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80" }) });
      state.adminEdit = null;
      state.data = null;
      await refresh();
      toast(editingId ? "Activité modifiée." : "Activité ajoutée.");
    }
    if (form.dataset.memory !== undefined) {
      const editingId = form.dataset.id;
      const current = editingId ? state.data.memories.find((item) => item.id === editingId) : null;
      const coverFile = form.elements.coverFile.files[0];
      const mediaFiles = [...form.elements.mediaFiles.files];
      const cover = coverFile ? await uploadMedia(coverFile) : null;
      const uploadedMedia = [];
      for (const file of mediaFiles) uploadedMedia.push(await uploadMedia(file));
      const media = [...(current?.media || []), ...uploadedMedia];
      const payload = { title: values.title, year: Number(values.year), category: values.category, story: values.story, location: current?.location || "Taroudant", coverUrl: cover?.url || current?.coverUrl || media.find((asset) => asset.type.startsWith("image/"))?.url || "", media, items: media.filter((asset) => asset.type.startsWith("image/")).length, videos: media.filter((asset) => asset.type.startsWith("video/")).length };
      await api(`/api/memories${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) });
      state.adminEdit = null;
      state.data = null;
      await refresh();
      toast(editingId ? "Album modifié." : "Album créé avec ses médias.");
    }
    if (form.dataset.equipment !== undefined) {
      const editingId = form.dataset.id;
      await api(`/api/equipment${editingId ? `/${editingId}` : ""}`, { method: editingId ? "PUT" : "POST", body: JSON.stringify({ ...values, floorId: "floor_1", zoneId: "zone_placeholder_1", imageUrl: "https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=900&q=80", muscles: ["Full body"], instructions: ["Configure instructions"], safety: ["Configure safety notes"] }) });
      state.adminEdit = null;
      state.data = null;
      await refresh();
      toast(editingId ? "Équipement modifié." : "Équipement ajouté.");
    }
    render();
  } catch (err) {
    toast(err.message);
  }
});

window.addEventListener("popstate", () => {
  state.route = location.pathname;
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

render();
