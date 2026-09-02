import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3100);
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const SESSION_SECRET = process.env.APP_SESSION_SECRET || "development-aljawarih-session-secret-change-me";
const MOROCCO_TZ = "Africa/Casablanca";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const roles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  COACH: "COACH",
  CONTENT_MANAGER: "CONTENT_MANAGER",
  CLIENT: "CLIENT"
};

const adminRoles = [roles.SUPER_ADMIN, roles.ADMIN, roles.MANAGER];
const staffRoles = [...adminRoles, roles.COACH, roles.CONTENT_MANAGER];

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function todayIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(":");
  const actual = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (payload.exp < Date.now()) return null;
  return payload;
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function hasRole(user, allowed) {
  return Boolean(user?.roles?.some((role) => allowed.includes(role)));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw httpError(400, "Invalid JSON body");
  }
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function loadDb() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await readFile(DB_PATH, "utf8"));
  } catch {
    const seeded = seedDb();
    await saveDb(seeded);
    return seeded;
  }
}

async function saveDb(db) {
  await mkdir(DATA_DIR, { recursive: true });
  db.meta.updatedAt = new Date().toISOString();
  await writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

function seedDb() {
  const adminId = "usr_admin";
  const coachId = "usr_coach";
  const saraId = "usr_sara";
  const users = [
    {
      id: adminId,
      email: process.env.DEMO_ADMIN_EMAIL || "admin@aljawarih.demo",
      passwordHash: hashPassword(process.env.DEMO_ADMIN_PASSWORD || "AdminDemo2026!"),
      roles: [roles.SUPER_ADMIN],
      createdAt: todayIso(-100)
    },
    {
      id: coachId,
      email: process.env.DEMO_COACH_EMAIL || "coach@aljawarih.demo",
      passwordHash: hashPassword(process.env.DEMO_COACH_PASSWORD || "CoachDemo2026!"),
      roles: [roles.COACH],
      createdAt: todayIso(-90)
    },
    {
      id: saraId,
      email: "sara@aljawarih.demo",
      passwordHash: hashPassword("ClientDemo2026!"),
      roles: [roles.CLIENT],
      createdAt: todayIso(-70)
    }
  ];

  const names = [
    ["Youssef", "El Amrani", "adult"], ["Lina", "Bennani", "child"], ["Adam", "Ait Taleb", "child"],
    ["Nadia", "Mansouri", "adult"], ["Karim", "Idrissi", "adult"], ["Hajar", "Ouardi", "adult"],
    ["Imane", "Raji", "adult"], ["Mehdi", "Bakkali", "adult"], ["Aya", "Tazi", "child"],
    ["Omar", "Chakir", "adult"], ["Salma", "El Fassi", "adult"], ["Anas", "Rochdi", "child"],
    ["Mariam", "Alaoui", "adult"], ["Bilal", "Sbai", "adult"], ["Nour", "Ziani", "child"],
    ["Hamza", "Kettani", "adult"], ["Sofia", "Naciri", "adult"], ["Rayan", "Hilali", "child"],
    ["Amal", "Lahlou", "adult"], ["Ilyas", "Baroudi", "adult"]
  ];

  names.forEach(([firstName, lastName, audience], index) => {
    const userId = `usr_demo_${index}`;
    users.push({
      id: userId,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(" ", "")}@demo.ma`,
      passwordHash: hashPassword("ClientDemo2026!"),
      roles: [roles.CLIENT],
      createdAt: todayIso(-index * 3)
    });
  });

  const profiles = [
    {
      id: "pro_sara",
      userId: saraId,
      firstName: "Sara",
      lastName: "X",
      phone: "+212 6 12 34 56 78",
      dateOfBirth: "1998-05-18",
      gender: "Female",
      emergencyContact: "+212 6 44 00 11 22",
      notes: "Prefers evening group training.",
      audience: "adult",
      avatar: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "pro_admin",
      userId: adminId,
      firstName: "Admin",
      lastName: "Aljawarih",
      phone: "+212 5 28 00 00 00",
      gender: "Staff",
      audience: "adult"
    },
    {
      id: "pro_coach",
      userId: coachId,
      firstName: "Coach",
      lastName: "Rachid",
      phone: "+212 6 77 88 99 00",
      gender: "Staff",
      audience: "adult"
    }
  ];

  names.forEach(([firstName, lastName, audience], index) => {
    profiles.push({
      id: `pro_demo_${index}`,
      userId: `usr_demo_${index}`,
      firstName,
      lastName,
      phone: `+212 6 30 20 ${String(1000 + index).slice(0, 4)}`,
      dateOfBirth: audience === "child" ? "2014-04-10" : "1995-09-12",
      gender: index % 2 ? "Female" : "Male",
      emergencyContact: "+212 6 00 00 00 00",
      audience
    });
  });

  const plans = [
    ["plan_adult_reg", "Adults", "Registration", null, 500, true],
    ["plan_adult_month", "Adults", "Monthly", 30, 250, false],
    ["plan_adult_4", "Adults", "4 Months", 120, 900, false],
    ["plan_adult_11", "Adults", "11 Months", 330, 2200, false],
    ["plan_adult_single", "Adults", "Single Session", 1, 50, false],
    ["plan_child_reg", "Children", "Registration", null, 400, true],
    ["plan_child_month", "Children", "Monthly", 30, 150, false],
    ["plan_child_4", "Children", "4 Months", 120, 600, false],
    ["plan_child_11", "Children", "11 Months", 330, 1650, false],
    ["plan_child_single", "Children", "Single Session", 1, 50, false],
    ["plan_private", "Private", "Individual Session", 1, 100, false]
  ].map(([pid, audience, name, durationDays, priceMad, registration]) => ({
    id: pid,
    audience,
    name,
    durationDays,
    priceMad,
    registration,
    currency: "DH",
    benefits: ["Acces club", "Suivi progression", "Reservations digitales"],
    active: true
  }));

  const classes = [
    ["Monday", 1, "06:00", "07:00", "Morning Training", 20, "Group Training"],
    ["Monday", 1, "18:00", "21:00", "Evening Training", 20, "Group Training"],
    ["Wednesday", 3, "06:00", "07:00", "Morning Training", 20, "Group Training"],
    ["Wednesday", 3, "18:00", "21:00", "Evening Training", 20, "Group Training"],
    ["Friday", 5, "06:00", "07:00", "Morning Training", 20, "Group Training"],
    ["Friday", 5, "18:00", "21:00", "Evening Training", 20, "Group Training"],
    ["Tuesday", 2, "13:00", "14:00", "Kids Training", 16, "Kids Training"],
    ["Tuesday", 2, "19:00", "21:00", "Evening Training", 20, "Group Training"],
    ["Thursday", 4, "13:00", "14:00", "Kids Training", 16, "Kids Training"],
    ["Thursday", 4, "19:00", "21:00", "Evening Training", 20, "Group Training"],
    ["Saturday", 6, "13:00", "14:00", "Kids Training", 16, "Kids Training"],
    ["Saturday", 6, "19:00", "21:00", "Evening Training", 20, "Group Training"]
  ].map(([dayName, dayOfWeek, startsAt, endsAt, name, capacity, type], index) => ({
    id: `cls_${index}`,
    dayName,
    dayOfWeek,
    startsAt,
    endsAt,
    name,
    coachId,
    coachName: "Coach Rachid",
    capacity,
    type,
    active: true
  }));

  const memberships = users
    .filter((u) => u.roles.includes(roles.CLIENT))
    .map((user, index) => {
      const status = index % 7 === 0 ? "EXPIRED" : index % 5 === 0 ? "EXPIRING_SOON" : "ACTIVE";
      const startOffset = -60 - index;
      const expiryOffset = status === "EXPIRED" ? -5 : status === "EXPIRING_SOON" ? 6 : 28 + index;
      return {
        id: `mem_${index}`,
        userId: user.id,
        planId: index % 4 === 0 ? "plan_adult_4" : "plan_adult_month",
        startDate: todayIso(startOffset),
        expiryDate: todayIso(expiryOffset),
        status,
        paymentStatus: status === "EXPIRED" ? "OVERDUE" : "PAID"
      };
    });

  const bookings = [];
  users.filter((u) => u.roles.includes(roles.CLIENT)).slice(0, 16).forEach((user, index) => {
    bookings.push({
      id: `book_${index}`,
      userId: user.id,
      classId: classes[index % classes.length].id,
      status: index % 6 === 0 ? "CANCELLED" : "BOOKED",
      bookedFor: todayIso(index % 5),
      createdAt: todayIso(-index)
    });
  });

  const attendances = users.filter((u) => u.roles.includes(roles.CLIENT)).flatMap((user, userIndex) =>
    Array.from({ length: userIndex % 8 }, (_, index) => ({
      id: `att_${userIndex}_${index}`,
      userId: user.id,
      classId: classes[(userIndex + index) % classes.length].id,
      staffId: coachId,
      checkedAt: todayIso(-(index + userIndex)),
      source: "QR"
    }))
  );

  const payments = memberships.map((membership, index) => ({
    id: `pay_${index}`,
    userId: membership.userId,
    membershipId: membership.id,
    planId: membership.planId,
    amountMad: plans.find((p) => p.id === membership.planId)?.priceMad || 250,
    method: index % 3 === 0 ? "Cash" : index % 3 === 1 ? "Bank transfer" : "Online payment",
    status: membership.paymentStatus,
    reference: `AJ-${2026}-${String(index + 1).padStart(4, "0")}`,
    paidAt: membership.paymentStatus === "PAID" ? todayIso(-index) : null
  }));

  const events = [
    ["evt_trip", "Sortie club Anti-Atlas", "Trip", "Une journee de communaute, marche et souvenirs.", 60, 18],
    ["evt_tournament", "Tournoi Aljawarih Warrior", "Competition", "Defis sportifs, equipe, energie et recompenses.", 48, 35],
    ["evt_ramadan", "Ramadan Training Night", "Ramadan event", "Session nocturne speciale avec ambiance club.", 40, 52],
    ["evt_kids", "Kids Activity Day", "Kids activity", "Activites encadrees pour les jeunes athletes.", 35, 12]
  ].map(([eid, title, category, description, capacity, days], index) => ({
    id: eid,
    title,
    category,
    description,
    startsAt: todayIso(days),
    time: index % 2 ? "19:00" : "09:30",
    location: "Taroudant, Morocco",
    capacity,
    coverImageUrl: `https://images.unsplash.com/photo-${["1517963879433-6ad2b056d712", "1571019613454-1cb2f99b2d8b", "1540497077202-7c8a3999166f", "1599058917212-d750089bc07e"][index]}?auto=format&fit=crop&w=1200&q=80`,
    registrationOpen: true,
    participants: index * 7 + 10
  }));

  const memories = [
    {
      id: "alb_summer",
      title: "Summer Trip",
      year: 2026,
      category: "Trip",
      location: "Taroudant",
      coverUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
      items: 87,
      videos: 12,
      story: "Moments de voyage, effort et fierte partagee."
    },
    {
      id: "alb_tournament",
      title: "Tournament",
      year: 2026,
      category: "Competition",
      location: "ALJAWARIH GYM",
      coverUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
      items: 54,
      videos: 8,
      story: "La communaute en mode competition."
    },
    {
      id: "alb_kids",
      title: "Kids Activity",
      year: 2026,
      category: "Kids",
      location: "ALJAWARIH GYM",
      coverUrl: "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=1200&q=80",
      items: 42,
      videos: 0,
      story: "Les jeunes athletes construisent leurs premiers souvenirs."
    }
  ];

  const floors = [
    { id: "floor_1", name: "Floor 1", level: 1, description: "Configurable floor awaiting real photos and zone mapping.", zones: [] },
    { id: "floor_2", name: "Floor 2", level: 2, description: "Configurable floor awaiting real photos and zone mapping.", zones: [] }
  ];

  const zones = [
    { id: "zone_placeholder_1", floorId: "floor_1", name: "Zone a configurer", description: "Real layout will be added after photos are provided.", x: 38, y: 46 },
    { id: "zone_placeholder_2", floorId: "floor_2", name: "Zone a configurer", description: "Real layout will be added after photos are provided.", x: 58, y: 40 }
  ];

  const equipment = [
    {
      id: "eq_leg_press",
      name: "Leg Press",
      category: "Legs",
      floorId: "floor_1",
      zoneId: "zone_placeholder_1",
      imageUrl: "https://images.unsplash.com/photo-1534368420009-621bfab424a8?auto=format&fit=crop&w=900&q=80",
      description: "Machine guidee pour developper quadriceps et fessiers.",
      difficulty: "Beginner",
      muscles: ["Quadriceps", "Glutes"],
      instructions: ["Regler le siege", "Placer les pieds", "Pousser sans verrouiller les genoux"],
      safety: ["Garder le dos colle", "Commencer leger", "Eviter l'amplitude douloureuse"],
      qrPath: "/equipment/eq_leg_press"
    },
    {
      id: "eq_bench",
      name: "Bench Press",
      category: "Chest",
      floorId: "floor_1",
      zoneId: "zone_placeholder_1",
      imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=80",
      description: "Mouvement fondamental pour poitrine, epaules et triceps.",
      difficulty: "Intermediate",
      muscles: ["Chest", "Triceps", "Shoulders"],
      instructions: ["Stabiliser les omoplates", "Descendre controle", "Pousser droit"],
      safety: ["Utiliser un spotter", "Ne pas rebondir sur la poitrine"],
      qrPath: "/equipment/eq_bench"
    }
  ];

  const workouts = [
    {
      id: "wrk_sara_1",
      userId: saraId,
      date: todayIso(-1),
      duration: 75,
      notes: "Seance jambes solide.",
      exercises: [
        { name: "Leg Press", sets: 3, reps: 10, weightKg: 70 },
        { name: "Squat", sets: 4, reps: 8, weightKg: 45 }
      ]
    },
    {
      id: "wrk_sara_2",
      userId: saraId,
      date: todayIso(-4),
      duration: 60,
      notes: "Progression haut du corps.",
      exercises: [
        { name: "Bench Press", sets: 3, reps: 8, weightKg: 35 },
        { name: "Row", sets: 3, reps: 12, weightKg: 30 }
      ]
    }
  ];

  return {
    meta: {
      version: 1,
      seededAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timezone: MOROCCO_TZ
    },
    settings: {
      clubName: "ALJAWARIH GYM TAROUDANT",
      arabicName: "نادي الجوارح",
      city: "Taroudant",
      country: "Morocco",
      currency: "DH",
      phone: "+212 5 28 00 00 00",
      email: "contact@aljawarih-gym.ma",
      address: "Taroudant, Morocco",
      languages: ["fr", "ar", "en"],
      openingHours: "Editable in admin settings",
      social: { instagram: "@aljawarih.gym", facebook: "Aljawarih Gym Taroudant" }
    },
    users,
    profiles,
    membershipPlans: plans,
    memberships,
    payments,
    classes,
    bookings,
    attendances,
    events,
    eventRegistrations: [],
    memories,
    posts: [
      { id: "post_1", title: "Congratulations to our athletes", body: "Fierte pour toute la famille Aljawarih.", mediaUrl: null, likes: 34, comments: 7, createdAt: todayIso(-2) },
      { id: "post_2", title: "New equipment has arrived", body: "Une nouvelle experience training arrive au club.", mediaUrl: null, likes: 22, comments: 3, createdAt: todayIso(-5) }
    ],
    floors,
    zones,
    equipment,
    workouts,
    achievements: [
      { id: "ach_first", name: "First Workout", description: "Complete the first tracked workout.", xp: 10 },
      { id: "ach_streak7", name: "7 Day Streak", description: "Train consistently for seven days.", xp: 20 },
      { id: "ach_pr", name: "Personal Record", description: "Set a new personal record.", xp: 50 },
      { id: "ach_event", name: "Event Participant", description: "Join a club event.", xp: 30 }
    ],
    userAchievements: [
      { id: "ua_1", userId: saraId, achievementId: "ach_first", earnedAt: todayIso(-40) },
      { id: "ua_2", userId: saraId, achievementId: "ach_pr", earnedAt: todayIso(-8) }
    ],
    challenges: [
      { id: "chg_30", title: "30 DAYS WARRIOR", goal: "20 workouts in 30 days", target: 20, xpReward: 100, active: true }
    ],
    challengeProgress: [
      { id: "cp_sara", userId: saraId, challengeId: "chg_30", progress: 17, completed: false }
    ],
    notifications: [
      { id: "not_1", userId: saraId, type: "Membership reminder", title: "Membership active", body: "Votre abonnement expire bientot. Pensez au renouvellement.", readAt: null, createdAt: todayIso(-1) },
      { id: "not_2", userId: saraId, type: "New memory", title: "Summer trip photos", body: "Les photos de la sortie sont disponibles.", readAt: null, createdAt: todayIso(-3) },
      { id: "not_3", userId: saraId, type: "Achievement unlocked", title: "Personal Record", body: "Bravo, nouveau record personnel.", readAt: todayIso(-2), createdAt: todayIso(-8) }
    ],
    families: [
      { id: "fam_ahmed", name: "Famille Ahmed" }
    ],
    familyMembers: [
      { id: "fm_1", familyId: "fam_ahmed", profileId: "pro_demo_0", relation: "Parent" },
      { id: "fm_2", familyId: "fam_ahmed", profileId: "pro_demo_1", relation: "Child" },
      { id: "fm_3", familyId: "fam_ahmed", profileId: "pro_demo_2", relation: "Child" }
    ]
  };
}

async function getAuth(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const session = verifySession(token);
  if (!session) return null;
  return db.users.find((u) => u.id === session.sub) || null;
}

function withProfile(db, user) {
  const profile = db.profiles.find((p) => p.userId === user.id);
  const membership = db.memberships.find((m) => m.userId === user.id);
  return { ...publicUser(user), profile, membership };
}

function clientSummary(db, user) {
  const profile = db.profiles.find((p) => p.userId === user.id);
  const membership = db.memberships.find((m) => m.userId === user.id);
  const plan = db.membershipPlans.find((p) => p.id === membership?.planId);
  const attendance = db.attendances.filter((a) => a.userId === user.id);
  return { user: publicUser(user), profile, membership, plan, attendanceCount: attendance.length };
}

function classWithAvailability(db, cls) {
  const booked = db.bookings.filter((b) => b.classId === cls.id && b.status === "BOOKED").length;
  return { ...cls, booked, available: Math.max(cls.capacity - booked, 0), isFull: booked >= cls.capacity };
}

async function handleApi(req, res, pathname) {
  const db = await loadDb();
  const user = await getAuth(req, db);
  const method = req.method;

  const send = (status, data) => {
    res.writeHead(status, jsonHeaders);
    res.end(JSON.stringify(data));
  };
  const requireAuth = () => {
    if (!user) throw httpError(401, "Authentication required");
    return user;
  };
  const requireRole = (allowed) => {
    const current = requireAuth();
    if (!hasRole(current, allowed)) throw httpError(403, "Insufficient permissions");
    return current;
  };

  if (method === "GET" && pathname === "/api/bootstrap") {
    send(200, {
      settings: db.settings,
      membershipPlans: db.membershipPlans.filter((p) => p.active),
      classes: db.classes.filter((c) => c.active).map((c) => classWithAvailability(db, c)),
      events: db.events,
      memories: db.memories,
      posts: db.posts,
      floors: db.floors,
      zones: db.zones,
      equipment: db.equipment,
      challenges: db.challenges,
      achievements: db.achievements,
      me: user ? withProfile(db, user) : null
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await readBody(req);
    const found = db.users.find((u) => u.email.toLowerCase() === String(body.email || "").toLowerCase());
    if (!found || !verifyPassword(String(body.password || ""), found.passwordHash)) throw httpError(401, "Invalid email or password");
    const token = signSession({ sub: found.id, roles: found.roles, exp: Date.now() + 1000 * 60 * 60 * 12 });
    send(200, { token, user: withProfile(db, found) });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!email.includes("@") || String(body.password || "").length < 10) throw httpError(422, "Valid email and 10+ character password required");
    if (db.users.some((u) => u.email.toLowerCase() === email)) throw httpError(409, "Email already registered");
    const newUser = { id: id("usr"), email, passwordHash: hashPassword(body.password), roles: [roles.CLIENT], createdAt: todayIso() };
    const profile = {
      id: id("pro"),
      userId: newUser.id,
      firstName: String(body.firstName || ""),
      lastName: String(body.lastName || ""),
      phone: String(body.phone || ""),
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      emergencyContact: body.emergencyContact || "",
      notes: "",
      audience: body.audience || "adult"
    };
    db.users.push(newUser);
    db.profiles.push(profile);
    await saveDb(db);
    const token = signSession({ sub: newUser.id, roles: newUser.roles, exp: Date.now() + 1000 * 60 * 60 * 12 });
    send(201, { token, user: withProfile(db, newUser) });
    return;
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    send(200, { user: user ? withProfile(db, user) : null });
    return;
  }

  if (method === "PUT" && pathname === "/api/profile") {
    const current = requireAuth();
    const body = await readBody(req);
    const profile = db.profiles.find((p) => p.userId === current.id);
    Object.assign(profile, {
      firstName: body.firstName ?? profile.firstName,
      lastName: body.lastName ?? profile.lastName,
      phone: body.phone ?? profile.phone,
      emergencyContact: body.emergencyContact ?? profile.emergencyContact,
      notes: body.notes ?? profile.notes
    });
    await saveDb(db);
    send(200, { user: withProfile(db, current) });
    return;
  }

  if (method === "GET" && pathname === "/api/portal") {
    const current = requireAuth();
    const bookings = db.bookings.filter((b) => b.userId === current.id).map((booking) => ({ ...booking, class: db.classes.find((c) => c.id === booking.classId) }));
    const attendance = db.attendances.filter((a) => a.userId === current.id);
    const workouts = db.workouts.filter((w) => w.userId === current.id);
    const notifications = db.notifications.filter((n) => !n.userId || n.userId === current.id);
    const achievements = db.userAchievements
      .filter((a) => a.userId === current.id)
      .map((a) => ({ ...a, achievement: db.achievements.find((ach) => ach.id === a.achievementId) }));
    const challengeProgress = db.challengeProgress
      .filter((c) => c.userId === current.id)
      .map((p) => ({ ...p, challenge: db.challenges.find((c) => c.id === p.challengeId) }));
    send(200, { profile: withProfile(db, current), bookings, attendance, workouts, notifications, achievements, challengeProgress });
    return;
  }

  if (method === "GET" && pathname === "/api/membership-plans") {
    send(200, db.membershipPlans);
    return;
  }
  if (method === "POST" && pathname === "/api/membership-plans") {
    requireRole(adminRoles);
    const body = await readBody(req);
    const plan = { id: id("plan"), active: true, benefits: [], currency: "DH", ...body };
    db.membershipPlans.push(plan);
    await saveDb(db);
    send(201, plan);
    return;
  }
  if (method === "PUT" && pathname.startsWith("/api/membership-plans/")) {
    requireRole(adminRoles);
    const plan = db.membershipPlans.find((p) => p.id === pathname.split("/").pop());
    if (!plan) throw httpError(404, "Plan not found");
    Object.assign(plan, await readBody(req));
    await saveDb(db);
    send(200, plan);
    return;
  }

  if (method === "GET" && pathname === "/api/classes") {
    send(200, db.classes.map((c) => classWithAvailability(db, c)));
    return;
  }
  if (method === "POST" && pathname === "/api/classes") {
    requireRole([...adminRoles, roles.COACH]);
    const cls = { id: id("cls"), active: true, ...(await readBody(req)) };
    db.classes.push(cls);
    await saveDb(db);
    send(201, classWithAvailability(db, cls));
    return;
  }
  if (method === "PUT" && pathname.startsWith("/api/classes/")) {
    requireRole([...adminRoles, roles.COACH]);
    const cls = db.classes.find((c) => c.id === pathname.split("/").pop());
    if (!cls) throw httpError(404, "Class not found");
    Object.assign(cls, await readBody(req));
    await saveDb(db);
    send(200, classWithAvailability(db, cls));
    return;
  }

  if (method === "GET" && pathname === "/api/bookings") {
    const current = requireAuth();
    const source = hasRole(current, staffRoles) ? db.bookings : db.bookings.filter((b) => b.userId === current.id);
    send(200, source.map((b) => ({ ...b, class: db.classes.find((c) => c.id === b.classId), client: db.profiles.find((p) => p.userId === b.userId) })));
    return;
  }
  if (method === "POST" && pathname === "/api/bookings") {
    const current = requireAuth();
    const body = await readBody(req);
    const classId = body.classId;
    const cls = db.classes.find((c) => c.id === classId && c.active);
    if (!cls) throw httpError(404, "Class not found");
    if (db.bookings.some((b) => b.userId === current.id && b.classId === classId && b.status === "BOOKED")) throw httpError(409, "Already booked");
    const availability = classWithAvailability(db, cls);
    if (availability.isFull) throw httpError(409, "Class is full");
    const booking = { id: id("book"), userId: current.id, classId, status: "BOOKED", bookedFor: body.bookedFor || todayIso(), createdAt: todayIso() };
    db.bookings.push(booking);
    db.notifications.push({ id: id("not"), userId: current.id, type: "Booking confirmation", title: "Reservation confirmee", body: `${cls.name} ${cls.startsAt}-${cls.endsAt}`, readAt: null, createdAt: todayIso() });
    await saveDb(db);
    send(201, { ...booking, class: cls });
    return;
  }
  if (method === "DELETE" && pathname.startsWith("/api/bookings/")) {
    const current = requireAuth();
    const booking = db.bookings.find((b) => b.id === pathname.split("/").pop());
    if (!booking) throw httpError(404, "Booking not found");
    if (booking.userId !== current.id && !hasRole(current, staffRoles)) throw httpError(403, "Cannot cancel this booking");
    booking.status = "CANCELLED";
    await saveDb(db);
    send(200, booking);
    return;
  }

  if (method === "GET" && pathname === "/api/attendance") {
    const current = requireAuth();
    const source = hasRole(current, staffRoles) ? db.attendances : db.attendances.filter((a) => a.userId === current.id);
    send(200, source.map((a) => ({ ...a, client: db.profiles.find((p) => p.userId === a.userId), class: db.classes.find((c) => c.id === a.classId) })));
    return;
  }
  if (method === "POST" && pathname === "/api/attendance") {
    const current = requireRole(staffRoles);
    const body = await readBody(req);
    const clientId = String(body.clientId || body.qrToken || "").replace("qr:", "");
    const client = db.users.find((u) => u.id === clientId);
    if (!client) throw httpError(404, "Client not found");
    const attendance = { id: id("att"), userId: client.id, classId: body.classId || null, staffId: current.id, checkedAt: todayIso(), source: "QR" };
    db.attendances.push(attendance);
    await saveDb(db);
    send(201, { attendance, client: clientSummary(db, client) });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/clients") {
    requireRole(adminRoles);
    send(200, db.users.filter((u) => u.roles.includes(roles.CLIENT)).map((u) => clientSummary(db, u)));
    return;
  }
  if (method === "GET" && pathname === "/api/admin/payments") {
    requireRole(adminRoles);
    send(200, db.payments.map((p) => ({ ...p, client: db.profiles.find((profile) => profile.userId === p.userId), plan: db.membershipPlans.find((plan) => plan.id === p.planId) })));
    return;
  }
  if (method === "GET" && pathname === "/api/admin/analytics") {
    requireRole(adminRoles);
    const clients = db.users.filter((u) => u.roles.includes(roles.CLIENT));
    const paid = db.payments.filter((p) => p.status === "PAID");
    send(200, {
      totalMembers: clients.length,
      activeMembers: db.memberships.filter((m) => m.status === "ACTIVE").length,
      expiredMemberships: db.memberships.filter((m) => m.status === "EXPIRED").length,
      newMembers: clients.filter((u) => Date.now() - new Date(u.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30).length,
      todayAttendance: db.attendances.filter((a) => new Date(a.checkedAt).toDateString() === new Date().toDateString()).length,
      todayBookings: db.bookings.filter((b) => b.status === "BOOKED").length,
      monthlyRevenue: paid.reduce((sum, p) => sum + p.amountMad, 0),
      pendingPayments: db.payments.filter((p) => p.status !== "PAID").length,
      attendanceTrend: [8, 11, 13, 18, 16, 21, 19],
      revenueTrend: [1800, 2400, 3100, 2800, 4200, 4600],
      popularSessions: db.classes.slice(0, 5).map((c) => ({ name: c.name, bookings: db.bookings.filter((b) => b.classId === c.id).length })),
      adultsVsChildren: {
        adults: db.profiles.filter((p) => p.audience === "adult").length,
        children: db.profiles.filter((p) => p.audience === "child").length
      }
    });
    return;
  }

  if (method === "GET" && pathname === "/api/events") return send(200, db.events);
  if (method === "POST" && pathname === "/api/events") {
    requireRole([...adminRoles, roles.CONTENT_MANAGER]);
    const event = { id: id("evt"), participants: 0, registrationOpen: true, ...(await readBody(req)) };
    db.events.push(event);
    await saveDb(db);
    return send(201, event);
  }
  if (method === "POST" && pathname.match(/^\/api\/events\/[^/]+\/register$/)) {
    const current = requireAuth();
    const eventId = pathname.split("/")[3];
    const event = db.events.find((e) => e.id === eventId);
    if (!event) throw httpError(404, "Event not found");
    if (event.capacity && event.participants >= event.capacity) throw httpError(409, "Event full");
    if (!db.eventRegistrations.some((r) => r.eventId === eventId && r.userId === current.id)) {
      db.eventRegistrations.push({ id: id("ereg"), eventId, userId: current.id, status: "REGISTERED" });
      event.participants += 1;
      await saveDb(db);
    }
    return send(201, event);
  }

  if (method === "GET" && pathname === "/api/memories") return send(200, db.memories);
  if (method === "POST" && pathname === "/api/memories") {
    requireRole([...adminRoles, roles.CONTENT_MANAGER]);
    const memory = { id: id("alb"), items: 0, videos: 0, ...(await readBody(req)) };
    db.memories.push(memory);
    await saveDb(db);
    return send(201, memory);
  }

  if (method === "GET" && pathname === "/api/gym/floors") return send(200, { floors: db.floors, zones: db.zones });
  if (method === "POST" && pathname === "/api/gym/zones") {
    requireRole([...adminRoles, roles.CONTENT_MANAGER]);
    const zone = { id: id("zone"), ...(await readBody(req)) };
    db.zones.push(zone);
    await saveDb(db);
    return send(201, zone);
  }
  if (method === "GET" && pathname === "/api/equipment") return send(200, db.equipment);
  if (method === "POST" && pathname === "/api/equipment") {
    requireRole([...adminRoles, roles.CONTENT_MANAGER, roles.COACH]);
    const item = { id: id("eq"), ...(await readBody(req)) };
    item.qrPath = `/equipment/${item.id}`;
    db.equipment.push(item);
    await saveDb(db);
    return send(201, item);
  }

  if (method === "GET" && pathname === "/api/workouts") {
    const current = requireAuth();
    return send(200, db.workouts.filter((w) => w.userId === current.id));
  }
  if (method === "POST" && pathname === "/api/workouts") {
    const current = requireAuth();
    const workout = { id: id("wrk"), userId: current.id, date: todayIso(), ...(await readBody(req)) };
    db.workouts.push(workout);
    await saveDb(db);
    return send(201, workout);
  }

  if (method === "GET" && pathname === "/api/notifications") {
    const current = requireAuth();
    return send(200, db.notifications.filter((n) => !n.userId || n.userId === current.id));
  }
  if (method === "PUT" && pathname.startsWith("/api/notifications/")) {
    const current = requireAuth();
    const notification = db.notifications.find((n) => n.id === pathname.split("/").pop() && (!n.userId || n.userId === current.id));
    if (!notification) throw httpError(404, "Notification not found");
    notification.readAt = todayIso();
    await saveDb(db);
    return send(200, notification);
  }

  if (method === "GET" && pathname === "/api/search") {
    requireRole(staffRoles);
    const query = new URL(req.url, `http://${req.headers.host}`).searchParams.get("q")?.toLowerCase() || "";
    const clients = db.profiles.filter((p) => `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(query));
    const events = db.events.filter((e) => `${e.title} ${e.category}`.toLowerCase().includes(query));
    const equipment = db.equipment.filter((e) => `${e.name} ${e.category}`.toLowerCase().includes(query));
    return send(200, { clients, events, equipment });
  }

  throw httpError(404, "API route not found");
}

async function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) throw httpError(403, "Forbidden");
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    "content-type": mime[ext] || "application/octet-stream",
    "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600"
  });
  createReadStream(filePath).pipe(res);
}

async function main() {
  const reqSeedOnly = process.argv.includes("--seed-only");
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });
  const db = seedDb();
  try {
    await stat(DB_PATH);
  } catch {
    await saveDb(db);
  }
  if (reqSeedOnly) {
    await saveDb(db);
    console.log(`Seeded ${DB_PATH}`);
    return;
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url.pathname);
      } else {
        await serveStatic(req, res, url.pathname);
      }
    } catch (err) {
      const status = err.status || 500;
      res.writeHead(status, jsonHeaders);
      res.end(JSON.stringify({ error: err.message || "Internal server error" }));
    }
  });

  server.listen(PORT, () => {
    console.log(`ALJAWARIH GYM platform running at http://localhost:${PORT}`);
  });
}

main();
