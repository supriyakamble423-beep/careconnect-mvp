"use client";

import { useState, useEffect } from "react";
// Yahan humne popup hata kar Redirect aur getRedirectResult add kiya hai
import { signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, collection, query } from "firebase/firestore";
import Link from "next/link";
import { auth, db, googleProvider } from "../lib/firebase";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [statusInput, setStatusInput] = useState("");
  const [myStatus, setMyStatus] = useState("Loading...");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  useEffect(() => {
    // Mobile redirect error handle karne ke liye
    getRedirectResult(auth).catch((error) => console.error("Redirect Error:", error));

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        
        await setDoc(userRef, {
          name: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        }, { merge: true });

        const q = query(collection(db, "users"));
        const unsubscribeDB = onSnapshot(q, (snapshot) => {
          let membersData: any[] = [];
          snapshot.forEach((doc) => {
            membersData.push({ id: doc.id, ...doc.data() });
            if (doc.id === currentUser.uid && doc.data().status) {
              setMyStatus(doc.data().status);
            }
          });
          setFamilyMembers(membersData);
        });
        return () => unsubscribeDB();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // MOBILE FIX: Ab popup nahi khulega, seedha page redirect hoga!
  const handleLogin = async () => {
    try { 
      await signInWithRedirect(auth, googleProvider); 
    } 
    catch (error) { 
      console.error("Login Error:", error); 
    }
  };

  const updateStatus = async () => {
    if (!statusInput.trim() || !user) return;
    const userRef = doc(db, "users", user.uid);
    const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    await setDoc(userRef, { status: statusInput, lastUpdated: timeNow }, { merge: true });
    setStatusInput(""); 
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-800 mb-2">CareConnect</h1>
          <p className="text-slate-500 mb-8 font-medium">Keep your family updated, instantly.</p>
          <button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all">
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-10">
      <div className="max-w-lg mx-auto bg-white min-h-screen shadow-lg">
        <div className="bg-blue-600 text-white p-5 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <img src={user.photoURL} alt="Me" className="w-10 h-10 rounded-full border-2 border-white" />
            <h1 className="text-xl font-bold">CareConnect</h1>
          </div>
          <button onClick={() => signOut(auth)} className="bg-blue-800 hover:bg-blue-900 text-xs font-bold px-3 py-2 rounded-lg transition-all">LOGOUT</button>
        </div>

        <div className="p-5 space-y-6">
          <Link href="/sos">
            <div className="bg-red-500 hover:bg-red-600 text-white text-center py-4 rounded-2xl shadow-md font-bold text-lg cursor-pointer transition-all flex justify-center items-center gap-2">
              <span>🚨</span> EMERGENCY SOS
            </div>
          </Link>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-blue-800 uppercase mb-1">My Current Status</p>
            <p className="text-xl font-bold text-blue-900 mb-4">{myStatus}</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Where are you?" 
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                className="flex-1 border border-blue-200 rounded-xl px-4 py-2 focus:outline-none"
              />
              <button onClick={updateStatus} className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl">Update</button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">👨‍👩‍👧‍👦 Family Feed</h2>
            <div className="space-y-3">
              {familyMembers.map((member) => (
                <div key={member.id} className={`border rounded-2xl p-4 flex items-start gap-4 shadow-sm ${member.status?.includes("EMERGENCY") ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                  <img src={member.photoURL} alt={member.name} className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h3 className="font-bold">{member.name} {member.id === user.uid && "(You)"}</h3>
                      <span className="text-xs font-bold text-slate-400">{member.lastUpdated}</span>
                    </div>
                    <p className={`font-medium p-2 rounded-lg border inline-block w-full ${member.status?.includes("EMERGENCY") ? "bg-red-100 border-red-200 text-red-800" : "bg-slate-50 border-slate-100"}`}>
                      {member.status || "No status yet"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}