"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, collection, query } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [statusInput, setStatusInput] = useState("");
  const [myStatus, setMyStatus] = useState("Loading...");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  // 1. FIREBASE MAGIC: Auto-detecting who is logged in
  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if(result && result.user) setUser(result.user);
    }).catch(console.error);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // User jaise hi login karega, uski entry automatic database me ho jayegi!
        await setDoc(doc(db, "users", currentUser.uid), {
          name: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        }, { merge: true });

        // Live List Listener (Sabki live location/status yahan se aati hai)
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

  const updateStatus = async (newStatus: string) => {
    if (!newStatus.trim() || !user) return;
    const userRef = doc(db, "users", user.uid);
    const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    // Firebase me status dalte hi sabke app me alert chala jayega!
    await setDoc(userRef, { status: newStatus, lastUpdated: timeNow }, { merge: true });
    setStatusInput(""); 
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText("https://careconnect-mvp.vercel.app");
    alert("App link copied! Send it to your family on WhatsApp.");
  };

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
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

  // --- MAIN APP LAYOUT ---
  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen pb-32">
      
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

      <main className="flex-1 px-5 max-w-2xl mx-auto pt-6 space-y-8 w-full">

        {/* --- 1. HOME TAB --- */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-fade-in">
            
            {/* EMERGENCY SOS ALERT BUTTON */}
            <button 
                onClick={() => updateStatus("🚨 EMERGENCY! I NEED HELP!")}
                className="w-full bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-2xl p-5 shadow-[0_8px_20px_rgba(186,26,26,0.3)] flex flex-col items-center justify-center active:scale-95 transition-all border border-[#93000a]"
            >
                <span className="material-symbols-outlined text-[48px] animate-pulse mb-1">sos</span>
                <span className="text-[20px] font-extrabold tracking-widest">SEND EMERGENCY ALERT</span>
            </button>

            {/* Post Status */}
            <section className="bg-white p-5 rounded-2xl shadow-[0_4px_12px_rgba(90,134,173,0.08)]">
               <h2 className="text-[18px] font-bold text-[#191c1d] mb-4 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#4a6549]">near_me</span> Post Normal Status
               </h2>
               <div className="flex gap-3">
                 <input 
                    type="text" 
                    placeholder="E.g. Reached office safely" 
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="flex-1 bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-3 outline-none focus:border-[#326085] font-medium"
                  />
                  <button onClick={() => updateStatus(statusInput)} className="bg-[#326085] text-white px-5 rounded-xl font-bold active:scale-95 shadow-md">Update</button>
               </div>
            </section>

            {/* Live Family Feed */}
            <section>
              <div className="flex justify-between items-end mb-4 px-1">
                <h2 className="text-[22px] font-extrabold text-[#191c1d]">Live Family Feed</h2>
                <span className="text-[#326085] font-bold text-sm bg-[#cde5ff] px-3 py-1 rounded-full">{familyMembers.length} Online</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className={`bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center text-center space-y-3 transition-transform border ${member.status?.includes("EMERGENCY") ? "border-[#ba1a1a] bg-[#ffdad6]" : "border-[#e1e3e4]"}`}>
                    <div className="relative">
                      <img src={member.photoURL} alt={member.name} className="w-16 h-16 rounded-full object-cover shadow-sm" />
                      <div className={`absolute bottom-0 right-0 w-5 h-5 border-4 border-white rounded-full ${member.status?.includes("EMERGENCY") ? "bg-[#ba1a1a] animate-ping" : "bg-[#4a6549]"}`}></div>
                    </div>
                    <div className="w-full">
                      <h3 className={`font-bold text-[16px] truncate ${member.status?.includes("EMERGENCY") ? "text-[#93000a]" : "text-[#191c1d]"}`}>
                        {member.name.split(' ')[0]}
                      </h3>
                      <div className={`inline-flex items-center px-2 py-1 rounded-md mt-1 w-full justify-center ${member.status?.includes("EMERGENCY") ? "bg-[#ba1a1a] text-white" : "bg-[#ccebc7] text-[#506b4f]"}`}>
                        <span className="text-[11px] font-bold truncate max-w-[100px]">{member.status || "Online"}</span>
                      </div>
                      <p className="text-[10px] font-medium text-[#72787f] mt-1">{member.lastUpdated}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- 3. SETUP TAB (Auto Add Method) --- */}
        {activeTab === "setup" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
                <h1 className="text-[28px] font-extrabold text-[#326085]">Family Setup</h1>
                <p className="text-[#42474e]">Invite your family members easily. No technical setup required.</p>
            </section>

            {/* Smart Invite Section */}
            <section className="bg-white p-6 rounded-3xl space-y-4 border border-[#c2c7cf]/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#4a6549] rounded-full flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">share</span>
                    </div>
                    <div>
                        <h2 className="text-[20px] font-bold text-[#4a6549]">Invite Members</h2>
                        <p className="text-sm text-[#42474e]">Add people to your Live Feed</p>
                    </div>
                </div>
                
                <div className="p-4 bg-[#f3f4f5] rounded-xl flex gap-3 items-start border border-[#e1e3e4]">
                    <span className="material-symbols-outlined text-[#326085] text-[24px]">magic_button</span>
                    <p className="text-sm text-[#42474e] font-medium leading-relaxed">
                        MAC address dalne ki zaroorat nahi! Bas niche diya gaya link copy karein aur family ko WhatsApp karein. Jaise hi wo login karenge, wo list me automatically aa jayenge.
                    </p>
                </div>

                <button onClick={copyInviteLink} className="w-full h-[56px] bg-[#326085] text-white text-lg font-bold rounded-full shadow-md active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">content_copy</span> Copy Invite Link
                </button>
            </section>

             <section className="bg-[#ffdcbe]/30 p-6 rounded-3xl flex gap-4 items-center border border-[#ffdcbe]">
                <div className="flex-1 space-y-2">
                    <h3 className="text-[18px] font-bold text-[#2d1600]">Total Active Devices</h3>
                    <p className="text-sm text-[#663d0e] font-medium">There are currently <strong className="text-lg">{familyMembers.length}</strong> members registered securely in your database.</p>
                </div>
                <div className="w-16 h-16 bg-white/60 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px] text-[#7f5221]">devices</span>
                </div>
            </section>
          </div>
        )}

        {/* --- 2. RULES & 4. LOGS TAB (Placeholders for now) --- */}
        {(activeTab === "rules" || activeTab === "logs") && (
          <div className="space-y-6 animate-fade-in text-center py-10">
             <span className="material-symbols-outlined text-[60px] text-[#c2c7cf]">build</span>
             <h2 className="text-[22px] font-extrabold text-[#191c1d]">Coming Soon</h2>
             <p className="text-[#42474e]">This feature is under development.</p>
          </div>
        )}

      </main>

      {/* --- BOTTOM NAVIGATION BAR --- */}
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