// Setzt die benutzerdefinierte Aktions-URL der Firebase-Auth-E-Mails über die
// Identity-Platform-Admin-API — Umweg um den "Es ist ein Fehler aufgetreten"-
// Bug der Console. In der REPLIT-Shell ausführen (dort liegt das Secret):
//
//   node scripts/set-auth-action-url.cjs
//   node scripts/set-auth-action-url.cjs https://andere-url.example/pfad
//
// Zeigt vorher die aktuelle Server-Konfiguration (inkl. authorizedDomains),
// damit man im Fehlerfall die echte Ursache sieht.
const admin = require("firebase-admin");

const TARGET_URL = process.argv[2] || "https://mormorsbreve.com/__/auth/action";

async function main() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error("FIREBASE_SERVICE_ACCOUNT ist nicht gesetzt (in der Replit-Shell ausführen).");
    process.exit(1);
  }
  const sa = JSON.parse(raw);
  const projectId = sa.project_id;
  console.log(`Projekt: ${projectId}`);
  console.log(`Ziel-Aktions-URL: ${TARGET_URL}\n`);

  const cred = admin.credential.cert(sa);
  const { access_token: token } = await cred.getAccessToken();
  const base = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const current = await fetch(base, { headers });
  if (!current.ok) {
    console.error(`GET config fehlgeschlagen: ${current.status}\n${await current.text()}`);
    process.exit(1);
  }
  const cfg = await current.json();
  console.log("Aktuelle authorizedDomains:", JSON.stringify(cfg.authorizedDomains ?? [], null, 2));
  console.log("Aktuelle callbackUri:", cfg.notification?.sendEmail?.callbackUri ?? "(Standard)");
  // Voller Server-Zustand der E-Mail-Konfiguration (Custom-Domain-Status!),
  // SMTP-Passwort sicherheitshalber maskieren.
  const sendEmail = JSON.parse(JSON.stringify(cfg.notification?.sendEmail ?? {}));
  if (sendEmail.smtp?.password) sendEmail.smtp.password = "***";
  console.log("Server-Zustand notification.sendEmail:", JSON.stringify(sendEmail, null, 2));

  const res = await fetch(`${base}?updateMask=notification.sendEmail.callbackUri`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ notification: { sendEmail: { callbackUri: TARGET_URL } } }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`\nPATCH fehlgeschlagen: ${res.status}`);
    console.error(body);
    process.exit(1);
  }
  const updated = JSON.parse(body);
  console.log("\nERFOLG. Neue callbackUri:", updated.notification?.sendEmail?.callbackUri);
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
