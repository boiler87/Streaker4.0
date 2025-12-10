import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxPG9RfxihL-Rfhu7fPSP95QDld6QMuik",
  authDomain: "streaker-1658d.firebaseapp.com",
  projectId: "streaker-1658d",
  storageBucket: "streaker-1658d.firebasestorage.app",
  messagingSenderId: "12701860115",
  appId: "1:12701860115:web:0d4dcba33fd234df97dae6",
  measurementId: "G-XKE790N7ZL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
