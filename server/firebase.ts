import { initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import type { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

let app: App;

function getFirebaseApp(): App {
  if (!app) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
    }
    app = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
    });
  }
  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    if (!decoded.email_verified) {
      return res.status(403).json({ message: "E-Mail nicht verifiziert" });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

/**
 * Optional auth: if a valid Bearer token is present, sets req.user. Otherwise just
 * calls next() without error. Use for endpoints that work both for anonymous and
 * logged-in users (e.g. the free /api/analyze preview, where authed users should
 * bypass anonymous rate limits).
 */
export const tryAuthenticate: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    if (decoded.email_verified) {
      req.user = decoded;
    }
  } catch {
    // Invalid/expired token: treat as anonymous, do NOT block the request.
  }
  next();
};
