import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// YEH RAHI AAPKI 100% ASLI AUR PERFECT CONFIGURATION!
const firebaseConfig = {
  apiKey: "AIzaSyAFaYL9fjtmBDNTPo_qxapYQ9VC-J8BORs",
  authDomain: "careconnect-fresh.firebaseapp.com",
  databaseURL: "https://careconnect-fresh-default-rtdb.firebaseio.com",
  projectId: "careconnect-fresh",
  storageBucket: "careconnect-fresh.firebasestorage.app",
  messagingSenderId: "485527200202",
  appId: "1:485527200202:web:3cb125aebbc38c4508af33",
  measurementId: "G-QCL1FDDXSP"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Google Login force prompt
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, db, googleProvider };