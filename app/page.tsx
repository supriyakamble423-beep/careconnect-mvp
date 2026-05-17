"use client";
// This is a forced save test

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
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Dynamic Content Area */}
      <main className="flex-1 px-5 max-w-2xl mx-auto pt-6 space-y-8 w-full">

        {/* --- 1. HOME TAB --- */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-fade-in">
             <section>
              <div className="bg-[#cde5ff]/20 p-5 rounded-2xl border border-[#cde5ff]/40 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[#326085]">auto_awesome</span>
                  <h2 className="text-[14px] font-bold text-[#326085] uppercase tracking-wider">Daily Summary</h2>
                </div>
                <p className="text-[16px] text-[#191c1d] font-medium leading-relaxed">
                  Everyone is home safe. Papa's medicine was taken at 8 PM.
                </p>
              </div>
            </section>

            <section className="bg-white p-5 rounded-2xl shadow-sm border border-[#e1e3e4]">
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

            <section>
              <div className="flex justify-between items-end mb-4 px-1">
                <h2 className="text-[22px] font-extrabold text-[#191c1d]">Family Members</h2>
                <span className="text-[#326085] font-bold text-sm bg-[#cde5ff] px-3 py-1 rounded-full">{familyMembers.length} Active</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center text-center space-y-3 active:scale-95 transition-transform border border-[#e1e3e4]">
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
             <section className="space-y-2">
                <h2 className="text-[28px] font-extrabold text-[#191c1d]">Rules & Reminders</h2>
                <p className="text-[#42474e] mt-xs">Keep your family's routine supportive and reliable.</p>
            </section>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button className="bg-[#4c799f] text-white px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap shadow-sm">All Rules</button>
                <button className="bg-[#e7e8e9] text-[#42474e] px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap">Medicine</button>
                <button className="bg-[#e7e8e9] text-[#42474e] px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap">Prayer</button>
                <button className="bg-[#e7e8e9] text-[#42474e] px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap">Activity</button>
            </div>

            <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm flex items-center border-l-4 border-[#326085]">
                    <div className="flex-shrink-0 bg-[#cde5ff] w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                        <span className="material-symbols-outlined text-[#184a6e]">medication</span>
                    </div>
                    <div className="flex-grow">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#326085] uppercase tracking-wider">Medicine</span>
                            <span className="text-xs text-[#42474e]">Daily</span>
                        </div>
                        <h3 className="font-bold text-[#191c1d] mt-1">Medicine - 8:00 PM</h3>
                        <div className="flex items-center gap-1 mt-1 text-[#42474e]">
                            <span className="material-symbols-outlined text-[16px]">person</span>
                            <span className="text-sm">Papa</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm flex items-center border-l-4 border-[#7f5221]">
                    <div className="flex-shrink-0 bg-[#ffdcbe] w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                        <span className="material-symbols-outlined text-[#663d0e]">auto_awesome</span>
                    </div>
                    <div className="flex-grow">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-[#7f5221] uppercase tracking-wider">Prayer</span>
                            <span className="text-xs text-[#42474e]">Daily</span>
                        </div>
                        <h3 className="font-bold text-[#191c1d] mt-1">Prayer - 7:00 AM</h3>
                        <div className="flex items-center gap-1 mt-1 text-[#42474e]">
                            <span className="material-symbols-outlined text-[16px]">groups</span>
                            <span className="text-sm">Family</span>
                        </div>
                    </div>
                </div>
            </div>

             <div className="mt-8 p-6 rounded-2xl bg-[#ccebc7] text-[#506b4f] flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-4xl mb-2">tips_and_updates</span>
                <p className="text-lg font-bold">Smart Suggestion</p>
                <p className="text-sm mt-2">You usually record Grandpa's vitals on Tuesday mornings. Would you like to add a recurring rule?</p>
                <button className="mt-4 bg-[#4a6549] text-white px-6 py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-all">Set Vital Reminder</button>
            </div>
          </div>
        )}

        {/* --- 3. SETUP TAB --- */}
        {activeTab === "setup" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
                <h1 className="text-[28px] font-extrabold text-[#326085]">Family Setup</h1>
                <p className="text-[#42474e]">Manage your circle and ensure everyone is safely connected through their primary devices.</p>
            </section>

            <section className="bg-[#f3f4f5] p-6 rounded-3xl space-y-4 border border-[#c2c7cf]/50">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#326085] rounded-full flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">person_add</span>
                    </div>
                    <div>
                        <h2 className="text-[20px] font-bold text-[#326085]">Add New Member</h2>
                        <p className="text-sm text-[#42474e]">Expand your care circle</p>
                    </div>
                </div>
                <form className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#326085] ml-2">Member Name</label>
                        <input className="w-full h-[52px] bg-white border border-[#c2c7cf] rounded-xl px-4 focus:border-[#326085] outline-none" placeholder="e.g., Sarah" type="text"/>
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#326085] ml-2">Device Name</label>
                        <input className="w-full h-[52px] bg-white border border-[#c2c7cf] rounded-xl px-4 focus:border-[#326085] outline-none" placeholder="e.g., Samsung Galaxy S23" type="text"/>
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between items-center ml-2">
                            <label className="text-xs font-bold text-[#326085]">MAC Address</label>
                        </div>
                        <input className="w-full h-[52px] bg-white border border-[#c2c7cf] rounded-xl px-4 focus:border-[#326085] outline-none font-mono" placeholder="00:00:00:00:00:00" type="text"/>
                    </div>
                    <div className="p-3 bg-[#ccebc7]/50 rounded-xl flex gap-2 items-start mt-2 border border-[#ccebc7]">
                        <span className="material-symbols-outlined text-[#4a6549] text-[20px]">info</span>
                        <p className="text-xs text-[#506b4f]">CareConnect uses your home Wi-Fi network to recognize when devices arrive or leave. No GPS tracking required inside the house.</p>
                    </div>
                    <button className="w-full h-[56px] bg-[#326085] text-white text-lg font-bold rounded-full shadow-md active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">done_all</span> Register Family Member
                    </button>
                </form>
            </section>

            <section className="bg-[#ffdcbe] p-6 rounded-3xl flex gap-4 items-center">
                <div className="flex-1 space-y-2">
                    <h3 className="text-[20px] font-bold text-[#2d1600]">Setup Support</h3>
                    <p className="text-sm text-[#663d0e]">Need help finding your device info? Our automated scanner can detect devices currently on your Wi-Fi.</p>
                    <button className="text-[16px] font-bold text-[#7f5221] underline underline-offset-4 mt-2">Run Network Scan</button>
                </div>
                <div className="w-20 h-20 bg-white/50 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-[40px] text-[#7f5221]">wifi_find</span>
                </div>
            </section>
          </div>
        )}

        {/* --- 4. LOGS TAB --- */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
                <h2 className="text-[28px] font-extrabold text-[#191c1d]">Activity Logs</h2>
                <p className="text-[#42474e]">Stay updated with your family's recent events and alerts.</p>
            </section>

            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#326085] bg-[#cde5ff] px-3 py-1 rounded-full">Today</span>
                    <div className="h-px flex-1 bg-[#c2c7cf]"></div>
                </div>
                
                <div className="space-y-3">
                    <div className="bg-white rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden active:scale-[0.98] transition-transform">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ba1a1a]"></div>
                        <div className="w-12 h-12 rounded-full bg-[#ffdad6] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#93000a]">warning</span>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-[#191c1d]">Unusual activity detected</h3>
                                <span className="text-xs text-[#42474e]">11:00 PM</span>
                            </div>
                            <p className="text-sm text-[#42474e]">Papa left home at <span className="font-bold text-[#191c1d]">11:00 PM</span>. This is outside his usual routine.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden active:scale-[0.98] transition-transform">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#4a6549]"></div>
                        <div className="w-12 h-12 rounded-full bg-[#ccebc7] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#506b4f]">home</span>
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-[#191c1d]">Arrival Alert</h3>
                                <span className="text-xs text-[#42474e]">3:45 PM</span>
                            </div>
                            <p className="text-sm text-[#42474e]">Ma safely arrived at <span className="font-bold text-[#191c1d]">Home</span> from Grocery Store.</p>
                        </div>
                    </div>
                </div>
            </section>
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