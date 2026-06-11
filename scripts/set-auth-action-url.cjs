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

const urlArg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : undefined;
const TARGET_URL = urlArg || "https://mormorsbreve.dk/__/auth/action";

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

  async function patch(mask, payload, label) {
    const r = await fetch(`${base}?updateMask=${encodeURIComponent(mask)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    if (!r.ok) {
      console.error(`\n${label} fehlgeschlagen: ${r.status}\n${text}`);
      return null;
    }
    console.log(`\n${label}: OK`);
    return JSON.parse(text);
  }

  // Reparatur-Modus: Domain-Verifizierung im Backend zuruecksetzen und neu
  // anstossen (Console laesst customDomainState auf NOT_STARTED haengen).
  //   node scripts/set-auth-action-url.cjs --fix-domain mormorsbreve.com
  if (process.argv[2] === "--fix-domain") {
    const domain = process.argv[3];
    if (!domain) {
      console.error("Aufruf: node scripts/set-auth-action-url.cjs --fix-domain <domain>");
      process.exit(1);
    }
    await patch(
      "notification.sendEmail.dnsInfo.useCustomDomain",
      { notification: { sendEmail: { dnsInfo: { useCustomDomain: false } } } },
      "Schritt 1/2: Custom-Domain deaktivieren"
    );
    const after = await patch(
      "notification.sendEmail.dnsInfo",
      { notification: { sendEmail: { dnsInfo: { customDomain: domain, useCustomDomain: true } } } },
      "Schritt 2/2: Custom-Domain neu setzen (startet Verifizierung)"
    );
    if (after) {
      console.log(
        "Neuer dnsInfo-Zustand:",
        JSON.stringify(after.notification?.sendEmail?.dnsInfo ?? {}, null, 2)
      );
      console.log(
        "\nWenn customDomainState jetzt PENDING/VERIFIED ist: ein paar Minuten warten," +
          "\ndann normal ausfuehren: node scripts/set-auth-action-url.cjs " + TARGET_URL
      );
    }
    return;
  }

  const updated = await patch(
    "notification.sendEmail.callbackUri",
    { notification: { sendEmail: { callbackUri: TARGET_URL } } },
    "Aktions-URL setzen"
  );
  if (!updated) process.exit(1);
  console.log("ERFOLG. Neue callbackUri:", updated.notification?.sendEmail?.callbackUri);
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
