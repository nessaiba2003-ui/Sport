import pg from "pg";

const email = String(process.env.NEW_ADMIN_EMAIL || "").trim().toLowerCase();
if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("NEW_ADMIN_EMAIL is invalid");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const sslDisabled = process.env.PGSSLMODE === "disable" || process.env.DATABASE_URL.includes(".railway.internal");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 15000
});

try {
  const result = await pool.query("SELECT data FROM aljawarih_app_state WHERE id = $1", ["main"]);
  const data = result.rows[0]?.data;
  if (!data) throw new Error("Application state was not found");
  const admin = data.users?.find((user) => user.id === "usr_admin");
  if (!admin) throw new Error("Admin account was not found");
  const conflict = data.users.some((user) => user.id !== admin.id && String(user.email).toLowerCase() === email);
  if (conflict) throw new Error("The requested email already belongs to another account");
  const changed = String(admin.email).toLowerCase() !== email;
  admin.email = email;
  admin.emailVerified = true;
  data.meta = { ...(data.meta || {}), updatedAt: new Date().toISOString() };
  await pool.query("UPDATE aljawarih_app_state SET data = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(data), "main"]);
  console.log(JSON.stringify({ updated: true, changed }));
} finally {
  await pool.end();
}
