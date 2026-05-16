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
  // ✨ The Core Logic: Controlling which screen is shown
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
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-3xl shadow-lg p-8 text-center border-t-4 border-primary">
          <div className="w-20 h-20 bg-primary-fixed rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">home_health</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">SafeCircle MVP</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8 leading-relaxed">Stay connected with your family.<br/>Track routines & safety instantly.</p>
          <button onClick={handleLogin} disabled={isLoggingIn} className="w-full bg-primary text-on-primary font-label-lg text-label-lg py-4 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-3">
            {isLoggingIn ? "Logging in..." : "Continue with Google"}
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APP LAYOUT ---
  return (
    <div className="bg-background text-on-background min-h-screen pb-32 font-body-md">
      {/* Top App Bar */}
      <header className="w-full top-0 sticky z-40 bg-background shadow-sm border-b border-outline-variant/20">
        <div className="flex justify-between items-center px-5 py-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-primary-container" />
            <span className="font-headline-md text-[20px] font-bold text-primary">SafeCircle</span>
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center justify-center rounded-full hover:bg-surface-container-high p-2 text-error">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Dynamic Content Area based on Active Tab */}
      <main className="px-5 max-w-2xl mx-auto py-6 space-y-6">

        {/* ---------------- 1. HOME TAB ---------------- */}
        {activeTab === "home" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
              <h1 className="font-headline-lg text-[28px] text-on-surface font-bold">Welcome Home</h1>
              <p className="text-on-surface-variant">Your family is currently safe and active.</p>
            </section>

            <Link href="/sos">
              <div className="bg-error hover:bg-error/90 text-on-error text-center py-5 rounded-2xl shadow-lg font-bold text-xl cursor-pointer transition-all flex justify-center items-center gap-3">
                <span className="material-symbols-outlined animate-pulse">sos</span> EMERGENCY SOS
              </div>
            </Link>

            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">satellite_alt</span> My Current Status
              </p>
              <p className="text-2xl font-bold text-on-surface mb-5">"{myStatus}"</p>
              <div className="flex gap-2 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/50">
                <input 
                  type="text" 
                  placeholder="Where are you? (e.g. Home)" 
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-2 focus:outline-none font-medium text-on-surface"
                />
                <button onClick={updateStatus} className="bg-primary text-on-primary font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-all shadow-md">Post</button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-headline-md text-[20px] text-on-surface">Family Feed</h2>
                <span className="text-xs font-bold bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">{familyMembers.length} Active</span>
              </div>
              <div className="space-y-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className={`rounded-2xl p-4 flex items-center gap-4 border-l-4 shadow-sm ${member.status?.includes("EMERGENCY") ? "bg-error-container border-error" : "bg-surface-container-lowest border-primary"}`}>
                    <div className="relative shrink-0">
                      <img src={member.photoURL} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface ${member.status?.includes("EMERGENCY") ? "bg-error animate-ping" : "bg-[#4a6549]"}`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-[16px] text-on-surface">{member.name.split(' ')[0]} {member.id === user?.uid && "(You)"}</h3>
                        <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-md">{member.lastUpdated}</span>
                      </div>
                      <p className={`text-sm font-medium ${member.status?.includes("EMERGENCY") ? "text-error" : "text-on-surface-variant"}`}>
                        {member.status || "Unknown Location"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 2. RULES TAB (Stitch Integration) ---------------- */}
        {activeTab === "rules" && (
          <div className="space-y-6 animate-fade-in">
            <section className="space-y-2">
              <h1 className="font-headline-lg text-[28px] text-on-surface font-bold">Rules & Reminders</h1>
              <p className="text-on-surface-variant">Keep your family's routine supportive and reliable.</p>
            </section>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button className="bg-primary-container text-on-primary-container px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap shadow-sm">All Rules</button>
              <button className="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap">Medicine</button>
              <button className="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap">Activity</button>
            </div>

            <div className="space-y-4">
              {/* Rule Card 1 */}
              <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center border-l-4 border-primary">
                <div className="flex-shrink-0 bg-primary-fixed w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <span className="material-symbols-outlined text-primary">medication</span>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-xs font-bold text-primary uppercase">Medicine</span>
                     <span className="text-xs text-on-surface-variant font-medium">Daily</span>
                  </div>
                  <h3 className="font-bold text-[16px] text-on-surface">Evening Medicine - 8:00 PM</h3>
                </div>
              </div>
              
              {/* Rule Card 2 */}
              <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center border-l-4 border-secondary opacity-80">
                <div className="flex-shrink-0 bg-secondary-fixed w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                  <span className="material-symbols-outlined text-secondary">directions_walk</span>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-xs font-bold text-secondary uppercase">Activity</span>
                     <span className="text-xs text-on-surface-variant font-medium">Mon, Wed, Fri</span>
                  </div>
                  <h3 className="font-bold text-[16px] text-on-surface">Evening Walk - 6:00 PM</h3>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 bg-secondary text-on-secondary py-4 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
               <span className="material-symbols-outlined">add</span> Create New Rule
            </button>
          </div>
        )}

        {/* ---------------- 3. SETUP TAB (Stitch Integration) ---------------- */}
        {activeTab === "setup" && (
          <div className="space-y-6 animate-fade-in">
            <section className="space-y-2">
              <h1 className="font-headline-lg text-[28px] text-on-surface font-bold">Family Setup</h1>
              <p className="text-on-surface-variant">Manage your circle's devices and connectivity.</p>
            </section>

            <section className="bg-surface-container-low p-6 rounded-3xl space-y-5 border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-fixed rounded-full flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-primary">Add New Member</h2>
                  <p className="text-sm text-on-surface-variant">Expand your care circle</p>
                </div>
              </div>
              <form className="space-y-4">
                <input className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary font-medium" placeholder="Member Name (e.g. Papa)" type="text"/>
                <input className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-4 py-3 outline-none focus:border-primary font-mono" placeholder="Device MAC Address" type="text"/>
                <button type="button" className="w-full bg-primary text-on-primary font-bold rounded-full py-4 shadow-md active:scale-95 transition-all">
                  Register Member
                </button>
              </form>
            </section>

             <section className="bg-tertiary-fixed p-6 rounded-3xl flex gap-4 items-center">
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-[18px] text-on-tertiary-fixed">Setup Support</h3>
                <p className="text-sm text-[#8c4a00] font-medium">Our automated scanner can detect devices currently on your Wi-Fi.</p>
                <button className="text-sm font-bold text-tertiary underline mt-2">Run Network Scan</button>
              </div>
              <span className="material-symbols-outlined text-[48px] text-tertiary opacity-80">wifi_find</span>
            </section>
          </div>
        )}

        {/* ---------------- 4. LOGS TAB (Stitch Integration) ---------------- */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
            <section className="space-y-2">
              <h1 className="font-headline-lg text-[28px] text-on-surface font-bold">Activity Logs</h1>
              <p className="text-on-surface-variant">Stay updated with your family's recent events.</p>
            </section>

            <div className="space-y-4">
               <div className="flex items-center gap-3 mb-2">
                 <span className="font-bold text-sm text-primary bg-primary-fixed px-3 py-1 rounded-full">Today</span>
                 <div className="h-px flex-1 bg-outline-variant/40"></div>
               </div>

               {/* Log Item Warning */}
               <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden border-l-4 border-error">
                  <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-on-surface">Unusual activity detected</h3>
                      <span className="text-xs text-on-surface-variant font-bold ml-4">11:00 PM</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">Papa left home at <span className="font-bold text-on-surface">11:00 PM</span>. This is outside his usual routine.</p>
                  </div>
               </div>

               {/* Log Item Normal */}
               <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden border-l-4 border-[#4a6549]">
                  <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#4a6549] text-[20px]">home</span>
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-on-surface">Arrival Alert</h3>
                      <span className="text-xs text-on-surface-variant font-bold ml-4">3:45 PM</span>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">Ma safely arrived at <span className="font-bold text-on-surface">Home</span>.</p>
                  </div>
               </div>
            </div>
          </div>
        )}

      </main>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-surface-container-lowest shadow-[0_-4px_12px_0_rgba(0,0,0,0.08)] rounded-t-2xl max-w-2xl mx-auto right-0 border-t border-outline-variant/10">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center justify-center transition-all px-4 py-2 rounded-xl ${activeTab === 'home' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
          <span className="material-symbols-outlined">{activeTab === 'home' ? 'home' : 'home_outline'}</span>
          <span className="text-[11px] font-bold mt-1">Home</span>
        </button>
        
        <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center justify-center transition-all px-4 py-2 rounded-xl ${activeTab === 'rules' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
          <span className="material-symbols-outlined">event_note</span>
          <span className="text-[11px] font-bold mt-1">Rules</span>
        </button>
        
        <button onClick={() => setActiveTab('setup')} className={`flex flex-col items-center justify-center transition-all px-4 py-2 rounded-xl ${activeTab === 'setup' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
          <span className="material-symbols-outlined">group_add</span>
          <span className="text-[11px] font-bold mt-1">Setup</span>
        </button>
        
        <button onClick={() => setActiveTab('logs')} className={`flex flex-col items-center justify-center transition-all px-4 py-2 rounded-xl ${activeTab === 'logs' ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
          <span className="material-symbols-outlined">history</span>
          <span className="text-[11px] font-bold mt-1">Logs</span>
        </button>
      </nav>

    </div>
  );
}