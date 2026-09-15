import { defineRailway, preserve, project, service, volume } from "railway/iac";

// Last resort for a per-service CaC repo. Prefer one .railway file for the
// project and drop this if you later combine services into that file.
export const partial = "web";

export default defineRailway(() => {
  const uploads = volume("web-volume", { sizeMB: 5000, region: "sfo" });
  const web = service("web", {
    start: "npm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    replicas: 1,
    env: {
      NODE_ENV: preserve(),
      APP_SESSION_SECRET: preserve(),
      DATABASE_URL: preserve(),
      DEMO_ADMIN_EMAIL: preserve(),
      DEMO_ADMIN_PASSWORD: preserve(),
      SMTP_HOST: preserve(),
      SMTP_PORT: preserve(),
      SMTP_SECURE: preserve(),
      SMTP_USER: preserve(),
      SMTP_PASS: preserve(),
      SMTP_FROM: preserve(),
      PUBLIC_BASE_URL: preserve(),
      UPLOAD_DIR: preserve(),
    },
    volumeMounts: {
      "/app/storage": uploads,
    },
  });
  return project("aljawarih-gym", {
    resources: [web, uploads],
  });
});
