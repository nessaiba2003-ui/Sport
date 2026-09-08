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
const AUTH_CONFIGURED = process.env.NODE_ENV !== "production" || Boolean(process.env.APP_SESSION_SECRET && process.env.APP_SESSION_SECRET.length >= 32);
const MOROCCO_TZ = "Africa/Casablanca";
const TOKEN_TTL_MS = 1000 * 60 * 30;
const loginAttempts = new Map();

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
  ".webp": "image/webp",
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
  if (!stored || !stored.includes(":")) return false;
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
  try {
    if (!token || !token.includes(".")) return null;
    const [body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
    if (!safeEqualText(sig, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function addDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString();
}

function membershipStatus(membership, now = new Date()) {
  if (membership.archivedAt) return "ARCHIVED";
  if (membership.paymentStatus && membership.paymentStatus !== "PAID") return "PENDING_PAYMENT";
  if (!membership.expiryDate) return "ACTIVE";
  const remainingDays = Math.ceil((new Date(membership.expiryDate) - now) / 86400000);
  if (remainingDays < 0) return "EXPIRED";
  if (remainingDays <= 14) return "EXPIRING_SOON";
  return "ACTIVE";
}

function normalizeDb(db) {
  const arrays = ["coaches", "financialEntries", "auditLogs", "emailTokens", "passwordResetTokens", "documents", "supportRequests"];
  arrays.forEach((key) => { if (!Array.isArray(db[key])) db[key] = []; });
  if (!db.coaches.length) {
    ["Elhabib", "Abderrahmane", "Youssef", "Rachid", "Brahim", "Hicham", "Abdelmajid"].forEach((firstName, index) => db.coaches.push({ id: `coach_${firstName.toLowerCase()}`, firstName, lastName: "", photoUrl: null, specialty: "", groups: [], userId: index === 0 ? "usr_admin" : null, active: true, archivedAt: null, createdAt: todayIso() }));
  }
  db.users.forEach((item) => {
    if (item.active === undefined) item.active = true;
    if (item.emailVerified === undefined) item.emailVerified = item.id.startsWith("usr_demo") || ["usr_admin", "usr_coach", "usr_sara"].includes(item.id);
    if (item.archivedAt === undefined) item.archivedAt = null;
  });
  db.memberships.forEach((item) => { item.status = membershipStatus(item); });
  db.classes.forEach((item) => { if (item.archivedAt === undefined) item.archivedAt = null; });
  db.events.forEach((item) => { if (item.archivedAt === undefined) item.archivedAt = null; });
  return db;
}

function runAutomations(db) {
  let changed = false;
  db.memberships.forEach((membership) => {
    const previous = membership.status;
    const current = membershipStatus(membership);
    if (previous !== current) { membership.status = current; changed = true; }
    if (!["EXPIRING_SOON", "EXPIRED"].includes(current)) return;
    const key = `membership:${membership.id}:${current}`;
    if (db.notifications.some((item) => item.automationKey === key)) return;
    db.notifications.push({ id: id("not"), userId: membership.userId, type: current, title: current === "EXPIRED" ? "Abonnement expiré" : "Abonnement bientôt expiré", body: current === "EXPIRED" ? "Votre abonnement a expiré." : `Votre abonnement expire le ${membership.expiryDate}.`, automationKey: key, readAt: null, createdAt: todayIso() });
    changed = true;
  });
  return changed;
}

function audit(db, actor, action, entityType, entityId, details = {}) {
  db.auditLogs.push({ id: id("audit"), actorId: actor?.id || null, action, entityType, entityId, details, createdAt: todayIso() });
}

function requireText(value, field, min = 1, max = 200) {
  const text = String(value || "").trim();
  if (text.length < min || text.length > max) throw httpError(422, `${field} is invalid`);
  return text;
}

function requireMoney(value, field = "amountMad") {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw httpError(422, `${field} must be a positive MAD amount`);
  return Math.round(amount * 100) / 100;
}

function reportSnapshot(db, year = new Date().getFullYear()) {
  const inYear = (value) => value && new Date(value).getFullYear() === Number(year);
  const payments = db.payments.filter((item) => item.status === "PAID" && inYear(item.paidAt || item.createdAt) && !item.archivedAt);
  const expenses = db.financialEntries.filter((item) => item.type === "EXPENSE" && inYear(item.date) && !item.archivedAt);
  const donations = db.financialEntries.filter((item) => item.type === "DONATION" && inYear(item.date) && !item.archivedAt);
  const otherIncome = db.financialEntries.filter((item) => item.type === "INCOME" && inYear(item.date) && !item.archivedAt);
  const sum = (items, key = "amountMad") => items.reduce((total, item) => total + Number(item[key] || 0), 0);
  const months = Array.from({ length: 12 }, (_, month) => {
    const matchMonth = (value) => inYear(value) && new Date(value).getMonth() === month;
    return {
      month: month + 1,
      members: db.users.filter((item) => item.roles.includes(roles.CLIENT) && matchMonth(item.createdAt)).length,
      sessions: db.attendances.filter((item) => matchMonth(item.checkedAt)).length,
      revenueMad: sum(payments.filter((item) => matchMonth(item.paidAt || item.createdAt))) + sum(otherIncome.filter((item) => matchMonth(item.date))),
      expensesMad: sum(expenses.filter((item) => matchMonth(item.date))),
      donationsMad: sum(donations.filter((item) => matchMonth(item.date)))
    };
  });
  const totalRevenueMad = sum(payments) + sum(otherIncome);
  const totalExpensesMad = sum(expenses);
  const totalDonationsMad = sum(donations);
  return {
    year: Number(year), currency: "MAD", generatedAt: todayIso(),
    totals: {
      members: db.users.filter((item) => item.roles.includes(roles.CLIENT)).length,
      newMembers: db.users.filter((item) => item.roles.includes(roles.CLIENT) && inYear(item.createdAt)).length,
      activeMembers: db.memberships.filter((item) => ["ACTIVE", "EXPIRING_SOON"].includes(membershipStatus(item))).length,
      sessions: db.classes.filter((item) => !item.archivedAt).length,
      bookings: db.bookings.filter((item) => item.status === "BOOKED" && inYear(item.createdAt || item.bookedFor)).length,
      attendance: db.attendances.filter((item) => inYear(item.checkedAt)).length,
      events: db.events.filter((item) => inYear(item.startsAt) && !item.archivedAt).length,
      eventParticipants: db.eventRegistrations.filter((item) => item.status === "REGISTERED").length,
      totalRevenueMad, totalExpensesMad, totalDonationsMad,
      balanceMad: totalRevenueMad - totalExpensesMad - totalDonationsMad
    },
    months,
    coaches: db.coaches.filter((item) => !item.archivedAt).map((item) => ({ name: `${item.firstName} ${item.lastName || ""}`.trim(), specialty: item.specialty, sessions: db.classes.filter((session) => session.coachId === item.id && !session.archivedAt).length })),
    events: db.events.filter((item) => inYear(item.startsAt)).map((item) => ({ title: item.title, date: item.startsAt, participants: item.participants || 0, revenueMad: Number(item.priceMad || 0) * Number(item.participants || 0) }))
  };
}

async function sendReport(res, snapshot, format) {
  const filename = `aljawarih-report-${snapshot.year}`;
  if (format === "json") {
    res.writeHead(200, { ...jsonHeaders, "content-disposition": `attachment; filename="${filename}.json"` });
    return res.end(JSON.stringify(snapshot, null, 2));
  }
  if (format === "xlsx") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet("Résumé");
    summary.columns = [{ header: "Indicateur", key: "label", width: 34 }, { header: "Valeur", key: "value", width: 20 }];
    Object.entries(snapshot.totals).forEach(([label, value]) => summary.addRow({ label, value }));
    const monthly = workbook.addWorksheet("Par mois");
    monthly.columns = Object.keys(snapshot.months[0]).map((key) => ({ header: key, key, width: 18 }));
    monthly.addRows(snapshot.months);
    [summary, monthly].forEach((sheet) => { sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: "frozen", ySplit: 1 }]; });
    const buffer = await workbook.xlsx.writeBuffer();
    res.writeHead(200, { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${filename}.xlsx"` });
    return res.end(Buffer.from(buffer));
  }
  if (format === "pdf") {
    const { default: PDFDocument } = await import("pdfkit");
    res.writeHead(200, { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}.pdf"` });
    const pdf = new PDFDocument({ margin: 48 });
    pdf.pipe(res);
    pdf.fontSize(20).text(`ALJAWARIH — Rapport annuel ${snapshot.year}`).moveDown();
    Object.entries(snapshot.totals).forEach(([label, value]) => pdf.fontSize(11).text(`${label}: ${value}`));
    pdf.addPage().fontSize(16).text("Statistiques mensuelles").moveDown();
    snapshot.months.forEach((month) => pdf.fontSize(10).text(`Mois ${month.month} — membres ${month.members}, présences ${month.sessions}, revenus ${month.revenueMad} MAD, dépenses ${month.expensesMad} MAD, dons ${month.donationsMad} MAD`));
    return pdf.end();
  }
  if (format === "docx") {
    const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
    const children = [new Paragraph({ text: `ALJAWARIH — Rapport annuel ${snapshot.year}`, heading: HeadingLevel.TITLE }), ...Object.entries(snapshot.totals).map(([label, value]) => new Paragraph(`${label}: ${value}`)), new Paragraph({ text: "Statistiques mensuelles", heading: HeadingLevel.HEADING_1 }), ...snapshot.months.map((month) => new Paragraph(`Mois ${month.month} — membres ${month.members}, présences ${month.sessions}, revenus ${month.revenueMad} MAD, dépenses ${month.expensesMad} MAD, dons ${month.donationsMad} MAD`))];
    const buffer = await Packer.toBuffer(new Document({ sections: [{ children }] }));
    res.writeHead(200, { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": `attachment; filename="${filename}.docx"` });
    return res.end(buffer);
  }
  throw httpError(422, "Supported formats: json, xlsx, pdf, docx");
}

function hasRole(user, allowed) {
  return Boolean(user?.roles?.some((role) => allowed.includes(role)));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 1024 * 1024) throw httpError(413, "Request body too large");
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw httpError(400, "Invalid JSON body");
  }
}

async function sendEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
  return { sent: true };
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function loadDb() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    return normalizeDb(JSON.parse(await readFile(DB_PATH, "utf8")));
  } catch {
    const seeded = seedDb();
    await saveDb(seeded);
    return seeded;
  }
}

async function saveDb(db) {
  await mkdir(DATA_DIR, { recursive: true });
  db.meta.updatedAt = new Date().toISOString();
  const temporaryPath = `${DB_PATH}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(normalizeDb(db), null, 2));
  await import("node:fs/promises").then(({ rename }) => rename(temporaryPath, DB_PATH));
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
      roles: [roles.SUPER_ADMIN, roles.COACH],
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
      firstName: "Elhabib",
      lastName: "",
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
    ["Monday", 1, "18:00", "21:00", "Evening Training", 20, "Group Training"],
    ["Wednesday", 3, "18:00", "21:00", "Evening Training", 20, "Group Training"],
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
    coachName: ["Coach Elhabib", "Coach Abderrahmane", "Coach Youssef", "Coach Rachid", "Coach Brahim", "Coach Hicham", "Coach Abdelmajid"][index % 7],
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
      phone: "0668190058",
      email: "",
      address: "Taroudant, Morocco",
      languages: ["fr", "ar", "en"],
      openingHours: "Editable in admin settings",
      social: { instagram: "https://www.instagram.com/aljawarih_gym_maroc?stkn=bG1hZzZmbHo0OGEy", facebook: "Aljawarih Gym Taroudant" }
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
  if (!AUTH_CONFIGURED) return null;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const session = verifySession(token);
  if (!session) return null;
  return db.users.find((u) => u.id === session.sub) || null;
}

function withProfile(db, user) {
  const profile = db.profiles.find((p) => p.userId === user.id);
  const membership = currentMembership(db, user.id);
  return { ...publicUser(user), profile, membership };
}

function clientSummary(db, user) {
  const profile = db.profiles.find((p) => p.userId === user.id);
  const membership = currentMembership(db, user.id);
  const plan = db.membershipPlans.find((p) => p.id === membership?.planId);
  const attendance = db.attendances.filter((a) => a.userId === user.id);
  return { user: publicUser(user), profile, membership, plan, attendanceCount: attendance.length };
}

function currentMembership(db, userId) {
  return db.memberships
    .filter((item) => item.userId === userId && !item.archivedAt)
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0] || null;
}

function requireActiveMembership(db, userId) {
  const membership = currentMembership(db, userId);
  if (!membership || !["ACTIVE", "EXPIRING_SOON"].includes(membershipStatus(membership))) throw httpError(403, "An active membership is required");
  return membership;
}

function classWithAvailability(db, cls) {
  const booked = db.bookings.filter((b) => b.classId === cls.id && b.status === "BOOKED").length;
  const capacity = Number(cls.capacity);
  return { ...cls, booked, available: Number.isFinite(capacity) ? Math.max(capacity - booked, 0) : null, isFull: Number.isFinite(capacity) ? booked >= capacity : false };
}

async function handleApi(req, res, pathname) {
  const db = await loadDb();
  if (runAutomations(db)) await saveDb(db);
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
      classes: db.classes.filter((c) => c.active && !c.archivedAt).map((c) => classWithAvailability(db, c)),
      events: db.events.filter((event) => !event.archivedAt && event.status !== "ARCHIVED"),
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
    if (!AUTH_CONFIGURED) throw httpError(503, "Authentication is temporarily unavailable: APP_SESSION_SECRET is not configured");
    const body = await readBody(req);
    const attemptKey = `${req.socket.remoteAddress}:${String(body.email || "").toLowerCase()}`;
    const attempt = loginAttempts.get(attemptKey) || { count: 0, resetAt: 0 };
    if (attempt.resetAt > Date.now() && attempt.count >= 8) throw httpError(429, "Too many login attempts. Try again later.");
    const found = db.users.find((u) => u.email.toLowerCase() === String(body.email || "").toLowerCase());
    if (!found || !verifyPassword(String(body.password || ""), found.passwordHash)) {
      loginAttempts.set(attemptKey, { count: attempt.count + 1, resetAt: Date.now() + 15 * 60 * 1000 });
      throw httpError(401, "Invalid email or password");
    }
    if (!found.active || found.archivedAt) throw httpError(403, "Account disabled");
    if (!found.emailVerified) throw httpError(403, "Email verification required");
    loginAttempts.delete(attemptKey);
    const token = signSession({ sub: found.id, roles: found.roles, exp: Date.now() + 1000 * 60 * 60 * 12 });
    audit(db, found, "LOGIN", "User", found.id);
    await saveDb(db);
    send(200, { token, user: withProfile(db, found) });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    if (!AUTH_CONFIGURED) throw httpError(503, "Authentication is temporarily unavailable: APP_SESSION_SECRET is not configured");
    const body = await readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || String(body.password || "").length < 10) throw httpError(422, "Valid email and 10+ character password required");
    requireText(body.firstName, "firstName", 2, 80);
    requireText(body.lastName, "lastName", 2, 80);
    requireText(body.phone, "phone", 8, 30);
    requireText(body.cin, "cin", 4, 30);
    if (!body.dateOfBirth) throw httpError(422, "dateOfBirth is required");
    if (!body.gender || !["Male", "Female", "Homme", "Femme"].includes(body.gender)) throw httpError(422, "gender is invalid");
    const selectedPlan = db.membershipPlans.find((plan) => plan.id === body.planId && plan.active);
    if (!selectedPlan) throw httpError(422, "A valid membership plan is required");
    if (db.users.some((u) => u.email.toLowerCase() === email)) throw httpError(409, "Email already registered");
    const newUser = { id: id("usr"), email, passwordHash: hashPassword(body.password), roles: [roles.CLIENT], emailVerified: false, active: true, archivedAt: null, createdAt: todayIso() };
    const profile = {
      id: id("pro"),
      userId: newUser.id,
      firstName: String(body.firstName || ""),
      lastName: String(body.lastName || ""),
      phone: String(body.phone || ""),
      cin: String(body.cin || ""),
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      emergencyContact: body.emergencyContact || "",
      notes: "",
      audience: body.audience || "adult"
    };
    db.users.push(newUser);
    db.profiles.push(profile);
    const membership = { id: id("mem"), userId: newUser.id, planId: selectedPlan.id, startDate: todayIso(), expiryDate: selectedPlan.durationDays ? addDays(todayIso(), selectedPlan.durationDays) : null, status: "PENDING_PAYMENT", paymentStatus: "PENDING", archivedAt: null };
    db.memberships.push(membership);
    const rawToken = crypto.randomBytes(32).toString("hex");
    db.emailTokens.push({ id: id("evtkn"), userId: newUser.id, tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), usedAt: null });
    audit(db, newUser, "REGISTER", "User", newUser.id);
    await saveDb(db);
    const baseUrl = process.env.PUBLIC_BASE_URL || `http://${req.headers.host}`;
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    const mail = await sendEmail({ to: email, subject: "Confirmez votre compte Aljawarih", text: `Confirmez votre adresse : ${verificationUrl}`, html: `<p>Bienvenue chez Aljawarih.</p><p><a href="${verificationUrl}">Confirmer mon adresse e-mail</a></p>` });
    send(201, { verificationRequired: true, emailSent: mail.sent, ...(process.env.NODE_ENV !== "production" && !mail.sent ? { developmentVerificationToken: rawToken } : {}) });
    return;
  }

  if ((method === "GET" || method === "POST") && pathname === "/api/auth/verify-email") {
    if (!AUTH_CONFIGURED) throw httpError(503, "Authentication is temporarily unavailable: APP_SESSION_SECRET is not configured");
    const token = method === "GET" ? new URL(req.url, `http://${req.headers.host}`).searchParams.get("token") : (await readBody(req)).token;
    const record = db.emailTokens.find((item) => !item.usedAt && new Date(item.expiresAt) > new Date() && safeEqualText(item.tokenHash, sha256(token)));
    if (!record) throw httpError(400, "Invalid or expired verification token");
    const account = db.users.find((item) => item.id === record.userId);
    account.emailVerified = true;
    record.usedAt = todayIso();
    audit(db, account, "VERIFY_EMAIL", "User", account.id);
    await saveDb(db);
    send(200, { verified: true });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/forgot-password") {
    if (!AUTH_CONFIGURED) throw httpError(503, "Authentication is temporarily unavailable: APP_SESSION_SECRET is not configured");
    const body = await readBody(req);
    const account = db.users.find((item) => item.email.toLowerCase() === String(body.email || "").trim().toLowerCase());
    if (account) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      db.passwordResetTokens.push({ id: id("prt"), userId: account.id, tokenHash: sha256(rawToken), expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(), usedAt: null });
      await saveDb(db);
      const baseUrl = process.env.PUBLIC_BASE_URL || `http://${req.headers.host}`;
      await sendEmail({ to: account.email, subject: "Réinitialisation du mot de passe Aljawarih", text: `${baseUrl}/reset-password?token=${rawToken}`, html: `<p><a href="${baseUrl}/reset-password?token=${rawToken}">Réinitialiser mon mot de passe</a></p>` });
    }
    send(200, { accepted: true });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/reset-password") {
    if (!AUTH_CONFIGURED) throw httpError(503, "Authentication is temporarily unavailable: APP_SESSION_SECRET is not configured");
    const body = await readBody(req);
    if (String(body.password || "").length < 10) throw httpError(422, "Password must contain at least 10 characters");
    const record = db.passwordResetTokens.find((item) => !item.usedAt && new Date(item.expiresAt) > new Date() && safeEqualText(item.tokenHash, sha256(body.token)));
    if (!record) throw httpError(400, "Invalid or expired reset token");
    const account = db.users.find((item) => item.id === record.userId);
    account.passwordHash = hashPassword(body.password);
    record.usedAt = todayIso();
    audit(db, account, "RESET_PASSWORD", "User", account.id);
    await saveDb(db);
    send(200, { reset: true });
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
    const payments = db.payments.filter((item) => item.userId === current.id && !item.archivedAt);
    const eventRegistrations = db.eventRegistrations.filter((item) => item.userId === current.id).map((item) => ({ ...item, event: db.events.find((event) => event.id === item.eventId) }));
    const achievements = db.userAchievements
      .filter((a) => a.userId === current.id)
      .map((a) => ({ ...a, achievement: db.achievements.find((ach) => ach.id === a.achievementId) }));
    const challengeProgress = db.challengeProgress
      .filter((c) => c.userId === current.id)
      .map((p) => ({ ...p, challenge: db.challenges.find((c) => c.id === p.challengeId) }));
    send(200, { profile: withProfile(db, current), bookings, attendance, workouts, payments, eventRegistrations, notifications, achievements, challengeProgress });
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

  if (method === "GET" && pathname === "/api/coaches") {
    return send(200, db.coaches.filter((item) => !item.archivedAt));
  }
  if (method === "POST" && pathname === "/api/coaches") {
    const actor = requireRole(adminRoles);
    const body = await readBody(req);
    const coach = { id: id("coach"), firstName: requireText(body.firstName, "firstName", 2, 80), lastName: String(body.lastName || ""), photoUrl: body.photoUrl || null, specialty: body.specialty || "", groups: Array.isArray(body.groups) ? body.groups : [], userId: body.userId || null, active: true, archivedAt: null, createdAt: todayIso() };
    db.coaches.push(coach);
    audit(db, actor, "CREATE", "Coach", coach.id);
    await saveDb(db);
    return send(201, coach);
  }
  if (method === "PUT" && pathname.match(/^\/api\/coaches\/[^/]+$/)) {
    const actor = requireRole(adminRoles);
    const coach = db.coaches.find((item) => item.id === pathname.split("/").pop());
    if (!coach) throw httpError(404, "Coach not found");
    Object.assign(coach, await readBody(req), { updatedAt: todayIso() });
    audit(db, actor, "UPDATE", "Coach", coach.id);
    await saveDb(db);
    return send(200, coach);
  }
  if (method === "DELETE" && pathname.match(/^\/api\/coaches\/[^/]+$/)) {
    const actor = requireRole(adminRoles);
    const coach = db.coaches.find((item) => item.id === pathname.split("/").pop());
    if (!coach) throw httpError(404, "Coach not found");
    coach.archivedAt = todayIso();
    coach.active = false;
    audit(db, actor, "ARCHIVE", "Coach", coach.id);
    await saveDb(db);
    return send(200, coach);
  }
  if (method === "POST" && pathname.match(/^\/api\/coaches\/[^/]+\/restore$/)) {
    const actor = requireRole(adminRoles);
    const coach = db.coaches.find((item) => item.id === pathname.split("/")[3]);
    if (!coach) throw httpError(404, "Coach not found");
    coach.archivedAt = null;
    coach.active = true;
    audit(db, actor, "RESTORE", "Coach", coach.id);
    await saveDb(db);
    return send(200, coach);
  }

  if (method === "GET" && pathname === "/api/memberships") {
    const current = requireAuth();
    const source = hasRole(current, adminRoles) ? db.memberships : db.memberships.filter((item) => item.userId === current.id);
    return send(200, source.map((item) => ({ ...item, status: membershipStatus(item), plan: db.membershipPlans.find((plan) => plan.id === item.planId) })));
  }
  if (method === "POST" && pathname === "/api/memberships") {
    const actor = requireRole(adminRoles);
    const body = await readBody(req);
    const member = db.users.find((item) => item.id === body.userId && item.roles.includes(roles.CLIENT));
    const plan = db.membershipPlans.find((item) => item.id === body.planId && item.active);
    if (!member || !plan) throw httpError(422, "Valid member and plan are required");
    const startDate = body.startDate ? new Date(body.startDate).toISOString() : todayIso();
    const membership = { id: id("mem"), userId: member.id, planId: plan.id, startDate, expiryDate: plan.durationDays ? addDays(startDate, plan.durationDays) : null, status: "PENDING_PAYMENT", paymentStatus: "PENDING", archivedAt: null, createdAt: todayIso() };
    db.memberships.push(membership);
    audit(db, actor, "CREATE", "Membership", membership.id);
    await saveDb(db);
    return send(201, membership);
  }
  if (method === "POST" && pathname.match(/^\/api\/memberships\/[^/]+\/renew$/)) {
    const actor = requireRole(adminRoles);
    const source = db.memberships.find((item) => item.id === pathname.split("/")[3]);
    if (!source) throw httpError(404, "Membership not found");
    const body = await readBody(req);
    const plan = db.membershipPlans.find((item) => item.id === (body.planId || source.planId) && item.active);
    if (!plan) throw httpError(422, "Plan not found");
    const startDate = new Date(source.expiryDate) > new Date() ? source.expiryDate : todayIso();
    const renewal = { id: id("mem"), userId: source.userId, planId: plan.id, startDate, expiryDate: plan.durationDays ? addDays(startDate, plan.durationDays) : null, status: "PENDING_PAYMENT", paymentStatus: "PENDING", archivedAt: null, renewedFromId: source.id, createdAt: todayIso() };
    db.memberships.push(renewal);
    db.notifications.push({ id: id("not"), userId: source.userId, type: "MEMBERSHIP_RENEWED", title: "Abonnement renouvelé", body: `Renouvellement ${plan.name}`, readAt: null, createdAt: todayIso() });
    audit(db, actor, "RENEW", "Membership", renewal.id, { renewedFromId: source.id });
    await saveDb(db);
    return send(201, renewal);
  }

  if (method === "POST" && pathname === "/api/payments") {
    const actor = requireRole(adminRoles);
    const body = await readBody(req);
    const membership = db.memberships.find((item) => item.id === body.membershipId);
    if (!membership) throw httpError(404, "Membership not found");
    const plan = db.membershipPlans.find((item) => item.id === membership.planId);
    const payment = { id: id("pay"), userId: membership.userId, membershipId: membership.id, planId: plan.id, amountMad: requireMoney(plan.priceMad), currency: "MAD", method: ["AT_CLUB", "BANK_TRANSFER", "ONLINE"].includes(body.method) ? body.method : "AT_CLUB", status: ["PAID", "PENDING", "CANCELLED"].includes(body.status) ? body.status : "PAID", reference: body.reference || null, paidAt: body.status === "PENDING" ? null : todayIso(), archivedAt: null, createdAt: todayIso() };
    db.payments.push(payment);
    membership.paymentStatus = payment.status;
    membership.status = membershipStatus(membership);
    audit(db, actor, "CREATE", "Payment", payment.id, { amountMad: payment.amountMad });
    await saveDb(db);
    return send(201, payment);
  }

  if (method === "GET" && pathname === "/api/classes") {
    send(200, db.classes.filter((item) => !item.archivedAt).map((c) => classWithAvailability(db, c)));
    return;
  }
  if (method === "POST" && pathname === "/api/classes") {
    const actor = requireRole([...adminRoles, roles.COACH]);
    const body = await readBody(req);
    const cls = { id: id("cls"), active: true, archivedAt: null, name: requireText(body.name, "name", 2, 120), dayName: requireText(body.dayName, "dayName", 2, 20), dayOfWeek: Number(body.dayOfWeek), startsAt: requireText(body.startsAt, "startsAt", 4, 5), endsAt: requireText(body.endsAt, "endsAt", 4, 5), activity: body.activity || body.type || body.name, group: body.group || "", coachId: body.coachId || null, coachName: body.coachName || "", capacity: body.capacity ? Number(body.capacity) : null, type: body.type || body.name, createdAt: todayIso() };
    db.classes.push(cls);
    db.users.filter((item) => item.roles.includes(roles.CLIENT) && item.active).forEach((member) => db.notifications.push({ id: id("not"), userId: member.id, type: "NEW_CLASS", title: "Nouvelle séance", body: `${cls.name} — ${cls.dayName} ${cls.startsAt}`, readAt: null, createdAt: todayIso() }));
    audit(db, actor, "CREATE", "ClassSession", cls.id);
    await saveDb(db);
    send(201, classWithAvailability(db, cls));
    return;
  }
  if (method === "PUT" && pathname.startsWith("/api/classes/")) {
    const actor = requireRole([...adminRoles, roles.COACH]);
    const cls = db.classes.find((c) => c.id === pathname.split("/").pop());
    if (!cls) throw httpError(404, "Class not found");
    Object.assign(cls, await readBody(req));
    audit(db, actor, "UPDATE", "ClassSession", cls.id);
    await saveDb(db);
    send(200, classWithAvailability(db, cls));
    return;
  }
  if (method === "DELETE" && pathname.match(/^\/api\/classes\/[^/]+$/)) {
    const actor = requireRole(adminRoles);
    const cls = db.classes.find((item) => item.id === pathname.split("/").pop());
    if (!cls) throw httpError(404, "Class not found");
    cls.active = false;
    cls.archivedAt = todayIso();
    audit(db, actor, "ARCHIVE", "ClassSession", cls.id);
    await saveDb(db);
    return send(200, cls);
  }
  if (method === "POST" && pathname.match(/^\/api\/classes\/[^/]+\/restore$/)) {
    const actor = requireRole(adminRoles);
    const cls = db.classes.find((item) => item.id === pathname.split("/")[3]);
    if (!cls) throw httpError(404, "Class not found");
    cls.active = true;
    cls.archivedAt = null;
    audit(db, actor, "RESTORE", "ClassSession", cls.id);
    await saveDb(db);
    return send(200, cls);
  }
  if (method === "GET" && pathname.match(/^\/api\/classes\/[^/]+\/participants$/)) {
    requireRole([...adminRoles, roles.COACH]);
    const classId = pathname.split("/")[3];
    const participants = db.bookings.filter((item) => item.classId === classId && item.status === "BOOKED").map((item) => ({ booking: item, profile: db.profiles.find((profile) => profile.userId === item.userId) }));
    return send(200, participants);
  }

  if (method === "GET" && pathname === "/api/bookings") {
    const current = requireAuth();
    const source = hasRole(current, staffRoles) ? db.bookings : db.bookings.filter((b) => b.userId === current.id);
    send(200, source.map((b) => ({ ...b, class: db.classes.find((c) => c.id === b.classId), client: db.profiles.find((p) => p.userId === b.userId) })));
    return;
  }
  if (method === "POST" && pathname === "/api/bookings") {
    const current = requireAuth();
    requireActiveMembership(db, current.id);
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
    if (body.classId && !db.classes.some((item) => item.id === body.classId && item.active && !item.archivedAt)) throw httpError(404, "Class not found");
    if (db.attendances.some((item) => item.userId === client.id && item.classId === (body.classId || null) && new Date(item.checkedAt).toDateString() === new Date().toDateString())) throw httpError(409, "Attendance already recorded");
    const attendance = { id: id("att"), userId: client.id, classId: body.classId || null, staffId: current.id, checkedAt: todayIso(), status: body.status || "PRESENT", source: body.source === "MANUAL" ? "MANUAL" : "QR" };
    db.attendances.push(attendance);
    audit(db, current, "CREATE", "Attendance", attendance.id, { source: attendance.source });
    await saveDb(db);
    send(201, { attendance, client: clientSummary(db, client) });
    return;
  }

  if (method === "GET" && pathname.match(/^\/api\/classes\/[^/]+\/qr$/)) {
    requireRole([...adminRoles, roles.COACH]);
    const classId = pathname.split("/")[3];
    const cls = db.classes.find((item) => item.id === classId && item.active && !item.archivedAt);
    if (!cls) throw httpError(404, "Class not found");
    const token = signSession({ kind: "attendance", classId, exp: Date.now() + 15 * 60 * 1000 });
    return send(200, { classId, token, expiresInSeconds: 900, payload: `/api/attendance/scan?token=${encodeURIComponent(token)}` });
  }

  if (method === "POST" && pathname === "/api/attendance/scan") {
    const current = requireAuth();
    requireActiveMembership(db, current.id);
    const body = await readBody(req);
    const payload = verifySession(body.token);
    if (!payload || payload.kind !== "attendance") throw httpError(400, "Invalid or expired attendance QR code");
    const cls = db.classes.find((item) => item.id === payload.classId && item.active && !item.archivedAt);
    if (!cls) throw httpError(404, "Class not found");
    if (db.attendances.some((item) => item.userId === current.id && item.classId === cls.id && new Date(item.checkedAt).toDateString() === new Date().toDateString())) throw httpError(409, "Attendance already recorded");
    const attendance = { id: id("att"), userId: current.id, classId: cls.id, staffId: null, checkedAt: todayIso(), status: "PRESENT", source: "QR" };
    db.attendances.push(attendance);
    await saveDb(db);
    return send(201, attendance);
  }

  if (method === "GET" && pathname === "/api/admin/clients") {
    requireRole(adminRoles);
    send(200, db.users.filter((u) => u.roles.includes(roles.CLIENT)).map((u) => clientSummary(db, u)));
    return;
  }
  if (method === "PUT" && pathname.match(/^\/api\/admin\/clients\/[^/]+$/)) {
    const actor = requireRole(adminRoles);
    const clientId = pathname.split("/").pop();
    const client = db.users.find((item) => item.id === clientId && item.roles.includes(roles.CLIENT));
    if (!client) throw httpError(404, "Client not found");
    const profile = db.profiles.find((item) => item.userId === client.id);
    const body = await readBody(req);
    const allowed = ["firstName", "lastName", "phone", "cin", "dateOfBirth", "gender", "emergencyContact", "notes", "audience"];
    allowed.forEach((key) => { if (body[key] !== undefined) profile[key] = body[key]; });
    audit(db, actor, "UPDATE", "Client", client.id);
    await saveDb(db);
    return send(200, clientSummary(db, client));
  }
  if (method === "DELETE" && pathname.match(/^\/api\/admin\/clients\/[^/]+$/)) {
    const actor = requireRole(adminRoles);
    const client = db.users.find((item) => item.id === pathname.split("/").pop() && item.roles.includes(roles.CLIENT));
    if (!client) throw httpError(404, "Client not found");
    client.active = false;
    client.archivedAt = todayIso();
    audit(db, actor, "ARCHIVE", "Client", client.id);
    await saveDb(db);
    return send(200, publicUser(client));
  }
  if (method === "POST" && pathname.match(/^\/api\/admin\/clients\/[^/]+\/restore$/)) {
    const actor = requireRole(adminRoles);
    const client = db.users.find((item) => item.id === pathname.split("/")[4] && item.roles.includes(roles.CLIENT));
    if (!client) throw httpError(404, "Client not found");
    client.active = true;
    client.archivedAt = null;
    audit(db, actor, "RESTORE", "Client", client.id);
    await saveDb(db);
    return send(200, publicUser(client));
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
    const finance = reportSnapshot(db, new Date().getFullYear());
    send(200, {
      totalMembers: clients.length,
      activeMembers: db.memberships.filter((m) => ["ACTIVE", "EXPIRING_SOON"].includes(membershipStatus(m))).length,
      inactiveMembers: clients.filter((item) => !item.active || item.archivedAt).length,
      expiringMemberships: db.memberships.filter((m) => membershipStatus(m) === "EXPIRING_SOON").length,
      expiredMemberships: db.memberships.filter((m) => membershipStatus(m) === "EXPIRED").length,
      newMembers: clients.filter((u) => Date.now() - new Date(u.createdAt).getTime() < 1000 * 60 * 60 * 24 * 30).length,
      todayAttendance: db.attendances.filter((a) => new Date(a.checkedAt).toDateString() === new Date().toDateString()).length,
      todayBookings: db.bookings.filter((b) => b.status === "BOOKED").length,
      monthlyRevenue: paid.reduce((sum, p) => sum + p.amountMad, 0),
      pendingPayments: db.payments.filter((p) => p.status !== "PAID").length,
      totalSessions: db.classes.filter((item) => !item.archivedAt).length,
      totalBookings: db.bookings.filter((item) => item.status === "BOOKED").length,
      totalPresent: db.attendances.filter((item) => item.status !== "ABSENT").length,
      totalAbsent: db.attendances.filter((item) => item.status === "ABSENT").length,
      upcomingEvents: db.events.filter((item) => !item.archivedAt && new Date(item.startsAt) > new Date()).length,
      eventRegistrations: db.eventRegistrations.filter((item) => item.status === "REGISTERED").length,
      expensesMad: finance.totals.totalExpensesMad,
      donationsMad: finance.totals.totalDonationsMad,
      balanceMad: finance.totals.balanceMad,
      monthly: finance.months,
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

  if (method === "GET" && pathname === "/api/events") return send(200, db.events.filter((item) => !item.archivedAt));
  if (method === "POST" && pathname === "/api/events") {
    const actor = requireRole([...adminRoles, roles.CONTENT_MANAGER]);
    const body = await readBody(req);
    const event = { id: id("evt"), title: requireText(body.title, "title", 2, 160), description: String(body.description || ""), coverImageUrl: body.coverImageUrl || null, startsAt: new Date(body.startsAt).toISOString(), time: body.time || null, location: requireText(body.location, "location", 2, 200), priceMad: requireMoney(body.priceMad || 0, "priceMad"), currency: "MAD", capacity: body.capacity ? Number(body.capacity) : null, registrationDeadline: body.registrationDeadline || null, additionalInfo: body.additionalInfo || "", bringItems: Array.isArray(body.bringItems) ? body.bringItems : [], status: body.status || "PUBLISHED", category: body.category || "Club", participants: 0, registrationOpen: true, archivedAt: null, createdAt: todayIso() };
    db.events.push(event);
    db.users.filter((item) => item.roles.includes(roles.CLIENT) && item.active).forEach((member) => db.notifications.push({ id: id("not"), userId: member.id, type: "NEW_EVENT", title: event.title, body: `${event.description}\n${event.startsAt} — ${event.location}`, readAt: null, createdAt: todayIso() }));
    audit(db, actor, "CREATE", "Event", event.id);
    await saveDb(db);
    return send(201, event);
  }
  if (method === "PUT" && pathname.match(/^\/api\/events\/[^/]+$/)) {
    const actor = requireRole([...adminRoles, roles.CONTENT_MANAGER]);
    const event = db.events.find((item) => item.id === pathname.split("/").pop());
    if (!event) throw httpError(404, "Event not found");
    Object.assign(event, await readBody(req), { updatedAt: todayIso() });
    if (event.priceMad !== undefined) event.priceMad = requireMoney(event.priceMad, "priceMad");
    audit(db, actor, "UPDATE", "Event", event.id);
    await saveDb(db);
    return send(200, event);
  }
  if (method === "DELETE" && pathname.match(/^\/api\/events\/[^/]+$/)) {
    const actor = requireRole([...adminRoles, roles.CONTENT_MANAGER]);
    const event = db.events.find((item) => item.id === pathname.split("/").pop());
    if (!event) throw httpError(404, "Event not found");
    event.archivedAt = todayIso();
    event.status = "ARCHIVED";
    audit(db, actor, "ARCHIVE", "Event", event.id);
    await saveDb(db);
    return send(200, event);
  }
  if (method === "POST" && pathname.match(/^\/api\/events\/[^/]+\/restore$/)) {
    const actor = requireRole([...adminRoles, roles.CONTENT_MANAGER]);
    const event = db.events.find((item) => item.id === pathname.split("/")[3]);
    if (!event) throw httpError(404, "Event not found");
    event.archivedAt = null;
    event.status = "PUBLISHED";
    audit(db, actor, "RESTORE", "Event", event.id);
    await saveDb(db);
    return send(200, event);
  }
  if (method === "POST" && pathname.match(/^\/api\/events\/[^/]+\/register$/)) {
    const current = requireAuth();
    const eventId = pathname.split("/")[3];
    const event = db.events.find((e) => e.id === eventId);
    if (!event || event.archivedAt || !event.registrationOpen) throw httpError(404, "Event not available");
    if (event.registrationDeadline && new Date(event.registrationDeadline) < new Date()) throw httpError(409, "Registration deadline has passed");
    if (event.capacity && event.participants >= event.capacity) throw httpError(409, "Event full");
    if (!db.eventRegistrations.some((r) => r.eventId === eventId && r.userId === current.id)) {
      db.eventRegistrations.push({ id: id("ereg"), eventId, userId: current.id, status: "REGISTERED" });
      event.participants += 1;
      await saveDb(db);
    }
    return send(201, event);
  }
  if (method === "DELETE" && pathname.match(/^\/api\/events\/[^/]+\/register$/)) {
    const current = requireAuth();
    const eventId = pathname.split("/")[3];
    const registration = db.eventRegistrations.find((item) => item.eventId === eventId && item.userId === current.id && item.status === "REGISTERED");
    if (!registration) throw httpError(404, "Registration not found");
    registration.status = "CANCELLED";
    registration.cancelledAt = todayIso();
    const event = db.events.find((item) => item.id === eventId);
    event.participants = Math.max(0, Number(event.participants || 0) - 1);
    await saveDb(db);
    return send(200, registration);
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

  if (method === "POST" && pathname === "/api/support-requests") {
    const current = requireAuth();
    const body = await readBody(req);
    const request = { id: id("support"), userId: current.id, type: ["PROBLEM", "QUESTION", "CHANGE_REQUEST"].includes(body.type) ? body.type : "QUESTION", subject: requireText(body.subject, "subject", 2, 160), message: requireText(body.message, "message", 2, 4000), classId: body.classId || null, eventId: body.eventId || null, status: "OPEN", createdAt: todayIso(), archivedAt: null };
    db.supportRequests.push(request);
    audit(db, current, "CREATE", "SupportRequest", request.id);
    await saveDb(db);
    return send(201, request);
  }

  if (method === "GET" && pathname === "/api/admin/finance") {
    requireRole(adminRoles);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    const quarter = Number(url.searchParams.get("quarter") || 0);
    const entries = db.financialEntries.filter((item) => !item.archivedAt && new Date(item.date).getFullYear() === year && (!quarter || Math.floor(new Date(item.date).getMonth() / 3) + 1 === quarter));
    return send(200, { entries, report: reportSnapshot(db, year) });
  }
  if (method === "POST" && pathname === "/api/admin/finance") {
    const actor = requireRole(adminRoles);
    const body = await readBody(req);
    if (!["INCOME", "EXPENSE", "DONATION"].includes(body.type)) throw httpError(422, "type must be INCOME, EXPENSE or DONATION");
    const entry = { id: id("fin"), type: body.type, date: body.date ? new Date(body.date).toISOString() : todayIso(), amountMad: requireMoney(body.amountMad), currency: "MAD", category: requireText(body.category, "category", 2, 100), description: String(body.description || ""), beneficiary: body.type === "DONATION" ? String(body.beneficiary || "") : null, receiptUrl: body.receiptUrl || null, createdBy: actor.id, createdAt: todayIso(), archivedAt: null };
    db.financialEntries.push(entry);
    audit(db, actor, "CREATE", "FinancialEntry", entry.id, { type: entry.type, amountMad: entry.amountMad });
    await saveDb(db);
    return send(201, entry);
  }
  if (method === "PUT" && pathname.match(/^\/api\/admin\/finance\/[^/]+$/)) {
    const actor = requireRole(adminRoles);
    const entry = db.financialEntries.find((item) => item.id === pathname.split("/").pop());
    if (!entry) throw httpError(404, "Financial entry not found");
    const body = await readBody(req);
    Object.assign(entry, body, { updatedAt: todayIso() });
    if (body.amountMad !== undefined) entry.amountMad = requireMoney(body.amountMad);
    audit(db, actor, "UPDATE", "FinancialEntry", entry.id);
    await saveDb(db);
    return send(200, entry);
  }
  if (method === "DELETE" && pathname.match(/^\/api\/admin\/finance\/[^/]+$/)) {
    const actor = requireRole(adminRoles);
    const entry = db.financialEntries.find((item) => item.id === pathname.split("/").pop());
    if (!entry) throw httpError(404, "Financial entry not found");
    entry.archivedAt = todayIso();
    audit(db, actor, "ARCHIVE", "FinancialEntry", entry.id);
    await saveDb(db);
    return send(200, entry);
  }

  if (method === "GET" && pathname === "/api/admin/audit-logs") {
    requireRole([roles.SUPER_ADMIN, roles.ADMIN]);
    return send(200, db.auditLogs.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 1000));
  }

  if (method === "POST" && pathname === "/api/admin/media") {
    const actor = requireRole(adminRoles);
    const body = await readBody(req);
    const allowed = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
    const extension = allowed[body.mimeType];
    if (!extension || !body.dataBase64) throw httpError(422, "Supported media: JPEG, PNG, WEBP and PDF");
    const data = Buffer.from(String(body.dataBase64).replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!data.length || data.length > 5 * 1024 * 1024) throw httpError(413, "Media must not exceed 5 MB");
    const fileName = `${crypto.randomUUID()}${extension}`;
    const uploadDirectory = path.join(PUBLIC_DIR, "uploads");
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(path.join(uploadDirectory, fileName), data);
    const media = { id: id("media"), type: body.mimeType, url: `/uploads/${fileName}`, originalName: String(body.fileName || "upload"), uploadedBy: actor.id, createdAt: todayIso(), archivedAt: null };
    db.documents.push(media);
    audit(db, actor, "UPLOAD", "MediaAsset", media.id);
    await saveDb(db);
    return send(201, media);
  }

  if (method === "GET" && pathname === "/api/admin/report") {
    requireRole(adminRoles);
    const url = new URL(req.url, `http://${req.headers.host}`);
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    const format = String(url.searchParams.get("format") || "json").toLowerCase();
    return sendReport(res, reportSnapshot(db, year), format);
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
      res.setHeader("x-content-type-options", "nosniff");
      res.setHeader("x-frame-options", "DENY");
      res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
      res.setHeader("permissions-policy", "camera=(self), geolocation=()");
      res.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data: https://images.unsplash.com; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'");
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
