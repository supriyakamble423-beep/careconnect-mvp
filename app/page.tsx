"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, collection, query } from "firebase/firestore";
import Link from "next/link";
import { auth, db, googleProvider } from "../lib/firebase";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [statusInput, setStatusInput] = useState("");
  const [myStatus, setMyStatus] = useState("Loading...");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Redirect ke baad wapas aane par user pakadne ke liye
    getRedirectResult(auth).then((result) => {
      if(result && result.user) {
         setUser(result.user);
      }
    }).catch((error) => {
      console.error("Redirect Error:", error);
      alert("Redirect Error: " + error.message);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
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

  // DUAL ENGINE LOGIN FIX (Ye sabse fast aur safe tarika hai)
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try { 
      // Pehle Popup try karo
      await signInWithPopup(auth, googleProvider); 
    } 
    catch (error: any) { 
      // Agar mobile ne popup block kar diya, toh seedha Redirect chalao
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError: any) {
          alert("Login Error: " + redirectError.message);
          setIsLoggingIn(false);
        }
      } else {
        alert("Login Failed: " + error.message); 
        setIsLoggingIn(false);
      }
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
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border-t-4 border-blue-500">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏠</span>
          </div>
          {/* BRAND UPDATE: SafeCircle */}
          <h1 className="text-3xl font-extrabold text-slate-800 mb-2">SafeCircle MVP</h1>
          <p className="text-slate-500 mb-8 font-medium leading-relaxed">Stay connected with your family.<br/>Track routines & safety instantly.</p>
          
          <button 
            onClick={handleLogin} 
            disabled={isLoggingIn}
            className={`w-full text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-3 text-lg ${isLoggingIn ? 'bg-slate-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoggingIn ? "Logging in..." : "Continue with Google"}
          </button>
          
          <p className="text-xs text-slate-400 mt-6 uppercase tracking-widest font-bold">Family Routine Guardian</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      <div className="max-w-lg mx-auto bg-white min-h-screen shadow-2xl">
        <div className="bg-blue-600 text-white p-6 flex justify-between items-center shadow-md rounded-b-3xl mb-4">
          <div className="flex items-center gap-4">
            <img src={user.photoURL} alt="Me" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" />
            <div>
              {/* BRAND UPDATE: SafeCircle */}
              <h1 className="text-2xl font-black tracking-tight">SafeCircle</h1>
              <p className="text-blue-200 text-xs font-medium tracking-wide">FAMILY GUARDIAN</p>
            </div>
          </div>
          <button onClick={() => {signOut(auth); setIsLoggingIn(false);}} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-full transition-all backdrop-blur-sm">LOGOUT</button>
        </div>

        <div className="p-5 space-y-6">
          <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl shadow-sm flex items-start gap-3">
             <div className="text-2xl mt-1">✨</div>
             <div>
               <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Today's Summary</p>
               <p className="text-sm text-purple-900 font-medium">"Aaj sab normal lag raha hai. Papa ghar aa gaye hain, aur davai ka time ho gaya hai."</p>
             </div>
          </div>

          <Link href="/sos">
            <div className="bg-red-500 hover:bg-red-600 text-white text-center py-5 rounded-2xl shadow-xl shadow-red-200 font-black text-xl cursor-pointer transition-all flex justify-center items-center gap-3 border-2 border-red-400">
              <span className="animate-pulse">🚨</span> EMERGENCY SOS
            </div>
          </Link>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-2"><span>📡</span> My Current Status</p>
            <p className="text-2xl font-black text-blue-900 mb-5 tracking-tight">"{myStatus}"</p>
            <div className="flex gap-2 bg-white p-2 rounded-2xl border border-blue-100 shadow-sm">
              <input 
                type="text" 
                placeholder="Where are you? (e.g. Home)" 
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                className="flex-1 bg-transparent px-4 py-2 focus:outline-none font-medium text-slate-700"
              />
              <button onClick={updateStatus} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-md">Post</button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-800 mb-4 px-2 flex items-center justify-between">
              <span className="flex items-center gap-2">👨‍👩‍👧‍👦 Family Feed</span>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{familyMembers.length} Active</span>
            </h2>
            <div className="space-y-4">
              {familyMembers.map((member) => (
                <div key={member.id} className={`rounded-3xl p-5 flex items-center gap-5 transition-all ${member.status?.includes("EMERGENCY") ? "bg-red-50 border-2 border-red-200 shadow-md" : "bg-white border border-slate-100 shadow-sm"}`}>
                  <div className="relative">
                    <img src={member.photoURL} alt={member.name} className="w-14 h-14 rounded-full object-cover" />
                    <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${member.status?.includes("EMERGENCY") ? "bg-red-500 animate-ping" : "bg-green-500"}`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-extrabold text-slate-900 text-lg">{member.name.split(' ')[0]} {member.id === user?.uid && "(You)"}</h3>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{member.lastUpdated}</span>
                    </div>
                    <p className={`font-semibold text-sm ${member.status?.includes("EMERGENCY") ? "text-red-700" : "text-slate-600"}`}>
                      {member.status || "Unknown Location"}
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