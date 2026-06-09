import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA6nlrACg-zS77cOqCe0LEyIFkqsMoL2cg",
  authDomain: "momorsbreve.firebaseapp.com",
  projectId: "momorsbreve",
  storageBucket: "momorsbreve.firebasestorage.app",
  messagingSenderId: "378778614916",
  appId: "1:378778614916:web:2ee807265c21f90f5a16d1",
  measurementId: "G-ZFBNW4FEC9",
};

const isServer = typeof window === "undefined";
const app = isServer ? null : initializeApp(firebaseConfig);
export const auth: Auth = isServer
  ? (null as unknown as Auth)
  : getAuth(app!);
