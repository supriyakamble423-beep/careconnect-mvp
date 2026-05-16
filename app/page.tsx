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
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if(result && result.user) setUser(result.user);
    }).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await setDoc(doc(db, "users", currentUser.uid), {
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

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error: any) { 
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try { await signInWithRedirect(auth, googleProvider); } 
        catch (err) { setIsLoggingIn(false); }
      } else { setIsLoggingIn(false); }
    }
  };

  const updateStatus = async () => {
    if (!statusInput.trim() || !user) return;
    const userRef = doc(db, "users", user.uid);
    const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    await setDoc(userRef, { status: statusInput, lastUpdated: timeNow }, { merge: true });
    setStatusInput(""); 
  };

  // --- LOGIN SCREEN (Stitch Design) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-10 font-[Atkinson Hyperlegible Next]">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
           <img src="/design.png" alt="SafeCircle Logo" className="w-40 h-auto drop-shadow-xl animate-pulse" />
           <div className="space-y-2">
             <h1 className="text-4xl font-extrabold text-[#326085] tracking-tight">SafeCircle</h1>
             <p className="text-[#42474e] text-lg font-medium">Your Family Routine Guardian.</p>
           </div>
           
           <div className="w-full pt-8">
             <button 
               onClick={handleLogin} 
               disabled={isLoggingIn}
               className="w-full h-[56px] flex items-center justify-center gap-3 bg-[#326085] text-white rounded-2xl shadow-[0_8px_16px_rgba(50,96,133,0.3)] active:scale-95 transition-all text-[18px] font-bold"
             >
               <span className="material-symbols-outlined">login</span>
               {isLoggingIn ? "Connecting..." : "Continue with Google"}
             </button>
             <p className="text-[#72787f] text-xs mt-6 uppercase tracking-widest font-bold">Secure Family Network</p>
           </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP LAYOUT (Stitch Design) ---
  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen flex flex-col font-[Atkinson Hyperlegible Next] pb-32">
      
      {/* Top App Bar */}
      <header className="w-full top-0 sticky z-40 bg-[#f8f9fa] shadow-sm border-b border-[#e1e3e4]">
        <div className="flex justify-between items-center px-5 py-3 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-[#cde5ff]" />
            <h1 className="text-[22px] font-extrabold text-[#326085]">SafeCircle</h1>
          </div>
          <button onClick={() => signOut(auth)} className="active:scale-95 hover:bg-[#e7e8e9] rounded-full p-2 transition-all flex items-center justify-center text-[#ba1a1a]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>logout</span>
          </button>
        </div>
      </header>

      {/* Dynamic Content Area */}
      <main className="flex-1 px-5 max-w-2xl mx-auto pt-6 space-y-8 w-full">

        {/* --- 1. HOME TAB --- */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-fade-in">
             
             {/* AI Summary */}
             <section>
              <div className="bg-[#4c799f]/10 p-5 rounded-2xl border border-[#4c799f]/20 shadow-[0_4px_12px_rgba(90,134,173,0.08)]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#326085]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <h2 className="text-[14px] font-bold text-[#326085] uppercase tracking-wider">Daily Summary</h2>
                </div>
                <p className="text-[16px] text-[#191c1d] font-medium leading-relaxed">
                  Everything looks normal today. Papa is home and your current status is "{myStatus}".
                </p>
              </div>
            </section>

            {/* Post Status */}
            <section className="bg-white p-5 rounded-2xl shadow-[0_4px_12px_rgba(90,134,173,0.08)]">
               <h2 className="text-[18px] font-bold text-[#191c1d] mb-4 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#4a6549]">near_me</span> Update Location
               </h2>
               <div className="flex gap-3">
                 <input 
                    type="text" 
                    placeholder="E.g. At the office" 
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="flex-1 bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-3 outline-none focus:border-[#326085] font-medium"
                  />
                  <button onClick={updateStatus} className="bg-[#326085] text-white px-5 rounded-xl font-bold active:scale-95 shadow-md">Post</button>
               </div>
            </section>

            {/* Family Members Grid */}
            <section>
              <div className="flex justify-between items-end mb-4 px-1">
                <h2 className="text-[22px] font-extrabold text-[#191c1d]">Family Members</h2>
                <span className="text-[#326085] font-bold text-sm bg-[#cde5ff] px-3 py-1 rounded-full">{familyMembers.length} Active</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="bg-white p-4 rounded-2xl shadow-[0_4px_12px_rgba(90,134,173,0.08)] flex flex-col items-center text-center space-y-3 active:scale-95 transition-transform border border-transparent hover:border-[#cde5ff]">
                    <div className="relative">
                      <img src={member.photoURL} alt={member.name} className="w-16 h-16 rounded-full object-cover shadow-sm" />
                      <div className={`absolute bottom-0 right-0 w-5 h-5 border-4 border-white rounded-full ${member.status?.includes("EMERGENCY") ? "bg-[#ba1a1a] animate-pulse" : "bg-[#4a6549]"}`}></div>
                    </div>
                    <div className="w-full">
                      <h3 className="font-bold text-[16px] text-[#191c1d] truncate">{member.name.split(' ')[0]}</h3>
                      <div className={`inline-flex items-center px-2 py-1 rounded-md mt-1 w-full justify-center ${member.status?.includes("EMERGENCY") ? "bg-[#ffdad6] text-[#93000a]" : "bg-[#ccebc7] text-[#506b4f]"}`}>
                        <span className="text-[11px] font-bold truncate max-w-[100px]">{member.status || "Home"}</span>
                      </div>
                      <p className="text-[10px] font-medium text-[#72787f] mt-1">{member.lastUpdated}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}

        {/* --- 2. RULES TAB --- */}
        {activeTab === "rules" && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(90,134,173,0.08)] text-center border-t-4 border-[#326085]">
                <span className="material-symbols-outlined text-[60px] text-[#4c799f] mb-4">construction</span>
                <h2 className="text-[22px] font-extrabold text-[#191c1d]">Rules Coming Soon</h2>
                <p className="text-[#42474e] mt-2">Hum family rules ka feature build kar rahe hain. Jaldi hi yahan aayega!</p>
             </div>
          </div>
        )}

        {/* --- 3. SETUP TAB --- */}
        {activeTab === "setup" && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-[#ffdcbe]/30 rounded-2xl p-6 shadow-sm border border-[#ffdcbe] flex gap-4 items-center">
                <div className="flex-1 space-y-2">
                  <h3 className="font-bold text-[18px] text-[#2d1600]">Setup Support</h3>
                  <p className="text-sm text-[#7f5221] font-medium">Add members and configure Wi-Fi scanning here.</p>
                  <button className="text-sm font-bold text-[#326085] mt-2 bg-[#cde5ff] px-4 py-2 rounded-full">Run Scan</button>
                </div>
                <span className="material-symbols-outlined text-[48px] text-[#7f5221] opacity-80">wifi_find</span>
             </div>
          </div>
        )}

        {/* --- 4. LOGS TAB --- */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
             <div className="bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(90,134,173,0.08)]">
                <h2 className="text-[20px] font-extrabold text-[#191c1d] mb-4">Activity Logs</h2>
                <div className="border-l-4 border-[#4a6549] pl-4 py-2">
                   <p className="text-[14px] font-bold text-[#191c1d]">System Online</p>
                   <p className="text-[#72787f] text-sm mt-1">Firebase database connected successfully.</p>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* --- BOTTOM NAVIGATION BAR (Stitch Design) --- */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-3xl max-w-2xl mx-auto right-0 border-t border-[#e1e3e4]/50">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center transition-all px-5 py-2 rounded-2xl ${activeTab === 'home' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e] hover:bg-[#f3f4f5]'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="text-[12px] font-bold mt-1">Home</span>
        </button>
        
        <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center justify-center transition-all px-5 py-2 rounded-2xl ${activeTab === 'rules' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e] hover:bg-[#f3f4f5]'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'rules' ? "'FILL' 1" : "'FILL' 0" }}>event_note</span>
          <span className="text-[12px] font-bold mt-1">Rules</span>
        </button>
        
        <button onClick={() => setActiveTab('setup')} className={`flex flex-col items-center justify-center transition-all px-5 py-2 rounded-2xl ${activeTab === 'setup' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e] hover:bg-[#f3f4f5]'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'setup' ? "'FILL' 1" : "'FILL' 0" }}>group_add</span>
          <span className="text-[12px] font-bold mt-1">Setup</span>
        </button>
        
        <button onClick={() => setActiveTab('logs')} className={`flex flex-col items-center justify-center transition-all px-5 py-2 rounded-2xl ${activeTab === 'logs' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e] hover:bg-[#f3f4f5]'}`}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'logs' ? "'FILL' 1" : "'FILL' 0" }}>history</span>
          <span className="text-[12px] font-bold mt-1">Logs</span>
        </button>
      </nav>

    </div>
  );
}