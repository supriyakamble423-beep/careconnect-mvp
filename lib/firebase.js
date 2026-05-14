import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAFaYl9fJtmBDntPo_qxapyQ9VC-J8B0Rs",
  authDomain: "careconnect-fresh.firebaseapp.com",
  projectId: "careconnect-fresh",
  storageBucket: "careconnect-fresh.firebasestorage.app",
  messagingSenderId: "485527200202",
  appId: "1:485527200202:web:3cb125aebbc38c4508af33"
};

// 100% Bulletproof Initialization for Vercel Build
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Engine ko directly 'app' se connect karna sabse zaroori hai
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };