"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";

export default function SOSPage() {
  const [user, setUser] = useState<any>(null);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push("/");
      else setUser(currentUser);
    });
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (user) {
      triggerEmergency();
    }
  }, [countdown, user]);

  const triggerEmergency = async () => {
    const userRef = doc(db, "users", user.uid);
    const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    await setDoc(userRef, { 
      status: "🚨 EMERGENCY: I NEED HELP!", 
      lastUpdated: timeNow 
    }, { merge: true });

    setTimeout(() => {
      router.push("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-white text-5xl mb-6">🚨</h1>
      <h1 className="text-4xl font-black text-white mb-4 uppercase tracking-wider">Sending SOS Alert</h1>
      <p className="text-red-100 text-lg mb-10">Alerting your family members...</p>
      
      {countdown > 0 ? (
        <div className="w-32 h-32 border-4 border-white rounded-full flex items-center justify-center text-white text-5xl font-bold animate-pulse">
          {countdown}
        </div>
      ) : (
        <div className="bg-white text-red-600 font-bold py-3 px-8 rounded-full text-xl shadow-lg">
          Alert Sent!
        </div>
      )}
    </div>
  );
}