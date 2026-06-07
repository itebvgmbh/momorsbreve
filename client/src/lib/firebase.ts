import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyClsmqsn_J7sPxPXz3B8AkgeDNFj9AnUqU",
  authDomain: "retrans-d9675.firebaseapp.com",
  projectId: "retrans-d9675",
  storageBucket: "retrans-d9675.firebasestorage.app",
  messagingSenderId: "464096403012",
  appId: "1:464096403012:web:dcc16cc9f770271df3e611",
  measurementId: "G-XJ82F9QZYY",
};

const isServer = typeof window === "undefined";
const app = isServer ? null : initializeApp(firebaseConfig);
export const auth: Auth = isServer
  ? (null as unknown as Auth)
  : getAuth(app!);
