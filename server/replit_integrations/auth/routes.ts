import type { Express } from "express";
import { authStorage } from "./storage";
import { storage } from "../../storage";
import { isAuthenticated, getFirebaseAuth } from "../../firebase";

export function registerAuthRoutes(app: Express): void {
  // Speichert die bevorzugte Sprache des angemeldeten Nutzers (da/de/en),
  // u. a. für lokalisierte E-Mails. Wird vom Client bei Sprachwechsel aufgerufen.
  app.post("/api/auth/language", isAuthenticated, async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const language = String(req.body?.language ?? "");
      await storage.setUserLanguage(uid, language);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error setting user language:", error);
      res.status(500).json({ message: "Failed to set language" });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const email = req.user.email ?? null;
      const name = req.user.name ?? "";
      const picture = req.user.picture ?? null;

      const nameParts = name.split(" ");
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      const user = await authStorage.upsertUser({
        id: uid,
        email,
        firstName,
        lastName,
        profileImageUrl: picture,
      });

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
