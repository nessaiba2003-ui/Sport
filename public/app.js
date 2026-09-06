const app = document.querySelector("#app");
const state = {
  lang: localStorage.getItem("lang") || "fr",
  token: localStorage.getItem("token") || "",
  me: null,
  data: null,
  portal: null,
  admin: null,
  route: location.pathname,
  toast: ""
};

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
  return `<div class="brand-mark" aria-label="Aljawarih eagle mark">AJ</div>`;
}

function shell(content) {
  const publicNav = [
    ["/", tr("home")], ["/about", "About"], ["/memberships", tr("memberships")], ["/schedule", tr("schedule")],
    ["/events", tr("events")], ["/memories", tr("memories")], ["/virtual-gym", tr("gym")], ["/contact", tr("contact")]
  ];
  const logged = Boolean(state.me);
  document.documentElement.lang = state.lang;
  document.body.dir = state.lang === "ar" ? "rtl" : "ltr";
  return `
    <div class="app-shell">
      <header class="topbar">
        <button class="brand icon-btn" data-nav="/">
          ${eagleMark()}
          <span><strong>ALJAWARIH GYM</strong><small>Taroudant, Morocco</small></span>
        </button>
        <nav class="nav" aria-label="Public navigation">
          ${publicNav.map(([href, label]) => `<button class="${state.route === href ? "active" : ""}" data-nav="${href}">${label}</button>`).join("")}
        </nav>
        <div class="actions">
          <div class="lang">
            ${["fr", "ar", "en"].map((lang) => `<button class="${state.lang === lang ? "active" : ""}" data-lang="${lang}">${lang.toUpperCase()}</button>`).join("")}
          </div>
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
        <div class="eyebrow">Luxury Fitness Club + Modern Technology + Moroccan Identity</div>
        <h1>ALJAWARIH GYM</h1>
        <p>Train. Grow. Belong. A Taroudant, Aljawarih est plus qu'une salle: c'est une communaute sportive, un espace de progression et une memoire collective.</p>
        <div class="actions"><button class="btn" data-nav="/register">${tr("join")}</button><button class="btn secondary" data-nav="/virtual-gym">${tr("explore")}</button></div>
      </div>
      <div class="hero-media" role="img" aria-label="Premium gym training visual"></div>
    </section>
    ${storySection()}
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
    ["Club community", "Training, outings, competitions and memories create a place members belong to."],
    ["Smart operations", "Memberships, booking, check-ins, notifications and payments are managed from one system."],
    ["Progress culture", "Workouts, achievements, challenges and attendance make improvement visible."]
  ];
  return `<section class="section"><h2>What is Aljawarih?</h2><p class="section-lead">A strong Moroccan club identity inspired by the eagle: focused, disciplined, welcoming and built for real athletes and families.</p><div class="grid">${features.map(([h, p]) => `<article class="card"><h3>${h}</h3><p class="muted">${p}</p></article>`).join("")}</div></section>`;
}

function membershipPreview() {
  const groups = Object.groupBy ? Object.groupBy(state.data.membershipPlans, (p) => p.audience) : state.data.membershipPlans.reduce((a, p) => ((a[p.audience] ||= []).push(p), a), {});
  return `<section class="section"><h2>Memberships & Pricing</h2><p class="section-lead">All plans are data-driven and editable by admin.</p><div class="grid">${Object.entries(groups).map(([audience, plans]) => `<article class="card span-4"><span class="pill">${audience}</span><h3>${audience === "Private" ? "Private coaching" : audience}</h3>${plans.map((p) => `<div><strong>${p.name}</strong><div class="price">${money(p.priceMad)}</div></div>`).join("")}<button class="btn" data-nav="/memberships">View plans</button></article>`).join("")}</div></section>`;
}

function schedulePreview() {
  return `<section class="section"><h2>Training Schedule</h2>${scheduleGrid(state.data.classes.slice(0, 12), false)}</section>`;
}

function scheduleGrid(classes, bookable = true) {
  return `<div class="schedule">${days.slice(1).concat("Sunday").map((day) => {
    const list = classes.filter((c) => c.dayName === day);
    return `<div class="day"><strong>${day}</strong>${list.length ? list.map((c) => `<div class="class-item"><span class="pill">${c.type}</span><h3>${c.startsAt} - ${c.endsAt}</h3><p class="muted">${c.name}<br>${c.coachName || "Coach"}<br>${c.available} / ${c.capacity} available</p>${bookable ? `<button class="btn ${c.isFull ? "secondary" : ""}" data-book="${c.id}" ${c.isFull ? "disabled" : ""}>${c.isFull ? "FULL" : "Reserve"}</button>` : ""}</div>`).join("") : `<p class="muted">No scheduled session</p>`}</div>`;
  }).join("")}</div>`;
}

function virtualGymPreview() {
  return `<section class="section"><h2>Découvrez le club</h2><p class="section-lead">Visitez les différents espaces d'Aljawarih Gym : accueil, hammam beldi, salle d'aérobic et espace cinéma au rez-de-chaussée, puis machines, boxe et stretching au sous-sol.</p>${clubGallery()}</section>`;
}

function clubGallery() {
  const sections = [
    {
      title: "Accueil du club",
      description: "L'entrée d'Aljawarih Gym et le tableau d'affichage avec l'emploi du temps.",
      photos: [
        ["/assets/club/entree.jpg", "Entrée principale d'Aljawarih Gym"],
        ["/assets/club/emploi-du-temps.jpg", "Tableau d'affichage et emploi du temps"]
      ]
    },
    {
      title: "Hammam beldi",
      description: "L'espace hammam traditionnel et ses vestiaires.",
      photos: [
        ["/assets/club/hammam-1.jpg", "Vestiaires du hammam beldi"],
        ["/assets/club/hammam-2.jpg", "Cabines du hammam beldi"],
        ["/assets/club/hammam-3.jpg", "Espace de préparation du hammam beldi"]
      ]
    },
    {
      title: "Rez-de-chaussée — Aérobic & cinéma",
      description: "Une grande salle polyvalente pour l'aérobic, les cours collectifs et les projections avec vidéoprojecteur.",
      photos: [
        ["/assets/club/rdc-aerobic-1.jpg", "Salle d'aérobic au rez-de-chaussée"],
        ["/assets/club/rdc-aerobic-2.jpg", "Espace d'entraînement et matériel d'aérobic"],
        ["/assets/club/rdc-cinema.jpg", "Espace cinéma avec écran et vidéoprojecteur"],
        ["/assets/club/rdc-aerobic-3.jpg", "Vue générale de la salle du rez-de-chaussée"]
      ]
    },
    {
      title: "Sous-sol — Machines, boxe & stretching",
      description: "Un espace complet équipé pour la musculation, la boxe, le renforcement et le stretching.",
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
  return `<section class="section"><h2>Club Events</h2><div class="grid">${items.map((e) => `<article class="card span-4"><span class="pill">${e.category}</span><h3>${e.title}</h3><p class="muted">${e.description}</p><p>${date(e.startsAt)} - ${e.location}</p><p class="muted">${e.participants}/${e.capacity} participants</p>${state.me ? `<button class="btn secondary" data-event-register="${e.id}">Register</button>` : ""}</article>`).join("")}</div></section>`;
}

function memoriesSection(preview = false) {
  const items = preview ? state.data.memories.slice(0, 3) : state.data.memories;
  return `<section class="section"><h2>ALJAWARIH Memories</h2><p class="section-lead">A living archive of trips, tournaments, kids activities and shared club moments.</p><div class="grid">${items.map((m) => `<article class="card span-4" style="min-height:18rem;background:linear-gradient(180deg,rgba(8,10,15,.25),rgba(8,10,15,.9)),url('${m.coverUrl}') center/cover"><span class="pill">${m.year}</span><h3>${m.title}</h3><p>${m.story}</p><p>${m.items} Photos ${m.videos ? `- ${m.videos} Videos` : ""}</p></article>`).join("")}</div></section>`;
}

function testimonials() {
  return `<section class="section"><h2>This is my club.</h2><div class="grid"><article class="card span-6"><p>"Le planning, les souvenirs et le suivi me donnent envie de rester constant."</p><span class="muted">Sara, member</span></article><article class="card span-6"><p>"Les familles peuvent suivre les enfants, les coachs voient mieux les presences."</p><span class="muted">Coach Rachid</span></article></div></section>`;
}

function aboutPage() {
  return `<div class="page-title"><h1>About Aljawarih</h1><p>ALJAWARIH GYM TAROUDANT is a sports club where members train, improve, attend events, build relationships, join outings and represent the club in competitions.</p></div>${storySection()}`;
}

function membershipsPage() {
  return `<div class="page-title"><h1>Memberships & Pricing</h1><p>Editable plans for adults, children and private sessions.</p></div>${membershipPreview()}`;
}

function schedulePage() {
  return `<div class="page-title"><h1>Training Schedule</h1><p>Reserve your session. Capacity is enforced by the backend.</p></div>${scheduleGrid(state.data.classes, true)}`;
}

function virtualGymPage() {
  return `<div class="page-title"><h1>Explorez Aljawarih Gym</h1><p>Découvrez en images tous les espaces du club, du rez-de-chaussée au sous-sol.</p></div>${clubGallery()}<section class="section"><h2>Équipements</h2><div class="grid">${state.data.equipment.map(equipmentCard).join("")}</div></section>`;
}

function equipmentCard(eq) {
  return `<article class="card span-6"><span class="pill">${eq.category}</span><h3>${eq.name}</h3><p class="muted">${eq.description}</p><p><strong>Difficulty:</strong> ${eq.difficulty}</p><p><strong>Targets:</strong> ${eq.muscles.join(", ")}</p><div class="qr" title="${location.origin}${eq.qrPath}"></div><button class="btn secondary" data-nav="${eq.qrPath}">View QR page</button></article>`;
}

function contactPage() {
  return `<div class="page-title"><h1>Contact</h1><p>${state.data.settings.address}</p></div><div class="grid"><article class="card span-6"><h3>Club</h3><p>Phone: ${state.data.settings.phone}</p><p>Email: ${state.data.settings.email}</p><p>Instagram: ${state.data.settings.social.instagram}</p></article><form class="card span-6 form"><div class="field"><label>Name</label><input required></div><div class="field"><label>Message</label><textarea rows="5"></textarea></div><button class="btn" type="button" data-toast="Message prepared for CMS integration">Send</button></form></div>`;
}

function loginPage(register = false) {
  return `<div class="grid"><section class="card span-5"><h1>${register ? "Create Account" : "Login"}</h1><form class="form" data-auth="${register ? "register" : "login"}">${register ? `<div class="field"><label>First name</label><input name="firstName" required></div><div class="field"><label>Last name</label><input name="lastName" required></div><div class="field"><label>Phone</label><input name="phone" placeholder="+212 6 ..."></div>` : ""}<div class="field"><label>Email</label><input name="email" type="email" value="${register ? "" : "admin@aljawarih.demo"}" required></div><div class="field"><label>Password</label><input name="password" type="password" value="${register ? "" : "AdminDemo2026!"}" required></div><button class="btn">${register ? "Create account" : "Login"}</button></form></section><section class="card span-7"><h2>Demo access</h2><p class="muted">Admin: admin@aljawarih.demo / AdminDemo2026!</p><p class="muted">Coach: coach@aljawarih.demo / CoachDemo2026!</p><p class="muted">Client: sara@aljawarih.demo / ClientDemo2026!</p><p>Production credentials are configured by environment variables.</p></section></div>`;
}

async function portalPage(section = "home") {
  if (!state.me) return loginPage();
  if (!state.portal) state.portal = await api("/api/portal");
  const nav = [["home", "Home"], ["membership", "Membership"], ["schedule", "Schedule"], ["bookings", "Bookings"], ["attendance", "Attendance"], ["progress", "Progress"], ["workouts", "Workouts"], ["achievements", "Achievements"], ["challenges", "Challenges"], ["memories", "Memories"], ["gym", "Virtual Gym"], ["notifications", "Notifications"], ["profile", "Profile"]];
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
  if (section === "schedule") return `${scheduleGrid(state.data.classes, false)}${adminClassForm()}`;
  if (section === "memberships") return `${membershipPreview()}${planForm()}`;
  if (section === "bookings") return adminBookings();
  if (section === "attendance") return staffCheckin();
  if (section === "events") return `${eventsSection(false)}${eventForm()}`;
  if (section === "memories") return `${memoriesSection(false)}${memoryForm()}`;
  if (section === "gym") return virtualGymPage();
  if (section === "equipment") return `<div class="grid">${state.data.equipment.map(equipmentCard).join("")}</div>${equipmentForm()}`;
  if (section === "analytics") return analyticsView(analytics);
  if (section === "settings") return `<article class="card span-12"><h3>Club settings</h3><p>${state.data.settings.clubName}</p><p>${state.data.settings.arabicName}</p><p class="muted">Settings API is prepared for production CMS expansion.</p></article>`;
  return analyticsView(analytics);
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

function planForm() {
  return `<form class="card span-12 form" data-plan><h3>Add membership plan</h3><div class="grid"><div class="field span-3"><label>Audience</label><input name="audience" value="Adults"></div><div class="field span-3"><label>Name</label><input name="name" value="Premium Monthly"></div><div class="field span-3"><label>Price DH</label><input name="priceMad" type="number" value="350"></div><div class="field span-3"><label>Duration days</label><input name="durationDays" type="number" value="30"></div></div><button class="btn">Create plan</button></form>`;
}

function adminClassForm() {
  return `<form class="card span-12 form" data-class><h3>Create class</h3><div class="grid"><div class="field span-3"><label>Name</label><input name="name" value="Private Session"></div><div class="field span-2"><label>Day</label><select name="dayName">${days.slice(1).map((d, i) => `<option value="${d}" data-day="${i + 1}">${d}</option>`)}</select></div><div class="field span-2"><label>Starts</label><input name="startsAt" value="10:00"></div><div class="field span-2"><label>Ends</label><input name="endsAt" value="11:00"></div><div class="field span-2"><label>Capacity</label><input name="capacity" type="number" value="1"></div></div><button class="btn">Create class</button></form>`;
}

function eventForm() {
  return `<form class="card span-12 form" data-event><h3>Create event</h3><div class="grid"><div class="field span-4"><label>Title</label><input name="title" value="Workshop Nutrition"></div><div class="field span-3"><label>Category</label><input name="category" value="Workshop"></div><div class="field span-3"><label>Capacity</label><input name="capacity" type="number" value="30"></div></div><div class="field"><label>Description</label><textarea name="description">Session education et performance.</textarea></div><button class="btn">Create event</button></form>`;
}

function memoryForm() {
  return `<form class="card span-12 form" data-memory><h3>Create memory album</h3><div class="grid"><div class="field span-4"><label>Title</label><input name="title" value="Ramadan Event"></div><div class="field span-2"><label>Year</label><input name="year" type="number" value="2026"></div><div class="field span-3"><label>Category</label><input name="category" value="Ramadan"></div></div><button class="btn">Create album</button></form>`;
}

function equipmentForm() {
  return `<form class="card span-12 form" data-equipment><h3>Add equipment</h3><div class="grid"><div class="field span-4"><label>Name</label><input name="name" value="Cable Machine"></div><div class="field span-3"><label>Category</label><input name="category" value="Strength"></div><div class="field span-3"><label>Difficulty</label><input name="difficulty" value="Beginner"></div></div><div class="field"><label>Description</label><textarea name="description">Machine polyvalente pour exercices guides.</textarea></div><button class="btn">Add equipment</button></form>`;
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
  } catch (err) {
    app.innerHTML = shell(`<div class="empty"><h2>Something needs attention</h2><p>${err.message}</p><button class="btn" data-nav="/login">Login</button></div>`);
  }
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.nav) navigate(target.dataset.nav);
  if (target.dataset.lang) {
    state.lang = target.dataset.lang;
    localStorage.setItem("lang", state.lang);
    render();
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

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    if (form.dataset.auth) {
      const endpoint = form.dataset.auth === "register" ? "/api/auth/register" : "/api/auth/login";
      const result = await api(endpoint, { method: "POST", body: JSON.stringify(values) });
      localStorage.setItem("token", result.token);
      state.token = result.token;
      state.me = result.user;
      state.data = null;
      state.portal = null;
      await refresh();
      navigate(roleHome());
      return;
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
      await api("/api/membership-plans", { method: "POST", body: JSON.stringify({ ...values, priceMad: Number(values.priceMad), durationDays: Number(values.durationDays), benefits: ["Admin editable"], currency: "DH" }) });
      state.data = null;
      await refresh();
      toast("Plan created");
    }
    if (form.dataset.class !== undefined) {
      const dayName = values.dayName;
      await api("/api/classes", { method: "POST", body: JSON.stringify({ ...values, dayName, dayOfWeek: days.indexOf(dayName), capacity: Number(values.capacity), type: values.name, coachName: "Coach Rachid" }) });
      state.data = null;
      await refresh();
      toast("Class created");
    }
    if (form.dataset.event !== undefined) {
      await api("/api/events", { method: "POST", body: JSON.stringify({ ...values, capacity: Number(values.capacity), startsAt: new Date(Date.now() + 86400000 * 20).toISOString(), time: "19:00", location: "Taroudant, Morocco", coverImageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80" }) });
      state.data = null;
      await refresh();
      toast("Event created");
    }
    if (form.dataset.memory !== undefined) {
      await api("/api/memories", { method: "POST", body: JSON.stringify({ ...values, year: Number(values.year), coverUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80", location: "Taroudant", story: "New club memory album." }) });
      state.data = null;
      await refresh();
      toast("Album created");
    }
    if (form.dataset.equipment !== undefined) {
      await api("/api/equipment", { method: "POST", body: JSON.stringify({ ...values, floorId: "floor_1", zoneId: "zone_placeholder_1", imageUrl: "https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=900&q=80", muscles: ["Full body"], instructions: ["Configure instructions"], safety: ["Configure safety notes"] }) });
      state.data = null;
      await refresh();
      toast("Equipment added");
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
