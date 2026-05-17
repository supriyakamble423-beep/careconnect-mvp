"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, collection, query, addDoc, orderBy, limit, deleteDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [statusInput, setStatusInput] = useState("");
  const [myStatus, setMyStatus] = useState("Loading...");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  // ✨ RULES TAB STATES (Real-Time Inputs)
  const [rules, setRules] = useState<any[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleTime, setRuleTime] = useState("");
  const [ruleCategory, setRuleCategory] = useState("Medicine");
  const [ruleAssignee, setRuleAssignee] = useState("Papa");

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

        // 1. Live Family Feed Listener
        const qUsers = query(collection(db, "users"));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
          let membersData: any[] = [];
          snapshot.forEach((doc) => {
            membersData.push({ id: doc.id, ...doc.data() });
            if (doc.id === currentUser.uid && doc.data().status) {
              setMyStatus(doc.data().status);
            }
          });
          setFamilyMembers(membersData);
        });

        // 2. Live History Logs Listener
        const qLogs = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(15));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
          let logsData: any[] = [];
          snapshot.forEach((doc) => {
            logsData.push({ id: doc.id, ...doc.data() });
          });
          setActivityLogs(logsData);
        });

        // 3. ✨ NAYA: Live Rules & Reminders Listener
        const qRules = query(collection(db, "rules"), orderBy("timestamp", "asc"));
        const unsubRules = onSnapshot(qRules, (snapshot) => {
          let rulesData: any[] = [];
          snapshot.forEach((doc) => {
            rulesData.push({ id: doc.id, ...doc.data() });
          });
          setRules(rulesData);
        });

        return () => { unsubUsers(); unsubLogs(); unsubRules(); };
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // ✨ Naya Engine: Background Clock Reminder System (App khule hone par check karega)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHoursMinutes = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
      
      rules.forEach((rule) => {
        if (rule.time === currentHoursMinutes && !rule.triggeredToday) {
          alert(`⏰ SafeCircle Reminder: Time for ${rule.assignee} to do [${rule.title}]!`);
          // Note: Real world production me yahan se Push Notification trigger hoti hai.
        }
      });
    }, 60000); // Har 1 minute me clock check hogi

    return () => clearInterval(interval);
  }, [rules]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try { await signInWithPopup(auth, googleProvider); } 
    catch (error: any) { 
      if (error.code === 'auth/popup-blocked') {
        try { await signInWithRedirect(auth, googleProvider); } 
        catch (err) { setIsLoggingIn(false); }
      } else { setIsLoggingIn(false); }
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!newStatus.trim() || !user) return;
    const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    await setDoc(doc(db, "users", user.uid), { status: newStatus, lastUpdated: timeNow }, { merge: true });
    
    await addDoc(collection(db, "logs"), {
        userName: user.displayName.split(' ')[0],
        action: newStatus,
        time: timeNow,
        timestamp: new Date().getTime(),
        isEmergency: newStatus.includes("EMERGENCY")
    });
    setStatusInput(""); 
  };

  // ✨ Naya Function: New Rule Database write
  const createNewRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim() || !ruleTime) return;

    // 24 Hour Format clean setup
    await addDoc(collection(db, "rules"), {
      title: ruleTitle,
      time: ruleTime,
      category: ruleCategory,
      assignee: ruleAssignee,
      timestamp: new Date().getTime()
    });

    // Automatic Log generation
    await addDoc(collection(db, "logs"), {
      userName: user.displayName.split(' ')[0],
      action: `Created a new ${ruleCategory} schedule: "${ruleTitle}" for ${ruleAssignee}`,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      timestamp: new Date().getTime(),
      isEmergency: false
    });

    // Reset Inputs
    setRuleTitle("");
    setRuleTime("");
    setShowRuleForm(false);
  };

  const deleteRule = async (id: string, title: string) => {
    if(confirm(`Delete rule "${title}"?`)) {
      await deleteDoc(doc(db, "rules", id));
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText("https://careconnect-mvp.vercel.app");
    alert("App link copied! Send it to your family on WhatsApp.");
  };

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
             <button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-[56px] flex items-center justify-center gap-3 bg-[#326085] text-white rounded-2xl shadow-[0_8px_16px_rgba(50,96,133,0.3)] active:scale-95 transition-all text-[18px] font-bold">
               <span className="material-symbols-outlined">login</span>
               {isLoggingIn ? "Connecting..." : "Continue with Google"}
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen pb-32">
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

      <main className="flex-1 px-5 max-w-2xl mx-auto pt-6 space-y-8 w-full">
        {/* --- HOME TAB --- */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-fade-in">
            <button onClick={() => updateStatus("🚨 EMERGENCY! I NEED HELP!")} className="w-full bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-2xl p-5 shadow-[0_8px_20px_rgba(186,26,26,0.3)] flex flex-col items-center justify-center active:scale-95 transition-all border border-[#93000a]">
                <span className="material-symbols-outlined text-[48px] animate-pulse mb-1">sos</span>
                <span className="text-[20px] font-extrabold tracking-widest">SEND EMERGENCY ALERT</span>
            </button>
            <section className="bg-white p-5 rounded-2xl shadow-[0_4px_12px_rgba(90,134,173,0.08)]">
               <h2 className="text-[18px] font-bold text-[#191c1d] mb-4 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#4a6549]">near_me</span> Post Normal Status
               </h2>
               <div className="flex gap-3">
                 <input type="text" placeholder="E.g. Reached office safely" value={statusInput} onChange={(e) => setStatusInput(e.target.value)} className="flex-1 bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-3 outline-none focus:border-[#326085] font-medium" />
                 <button onClick={() => updateStatus(statusInput)} className="bg-[#326085] text-white px-5 rounded-xl font-bold active:scale-95 shadow-md">Update</button>
               </div>
            </section>
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
                      <h3 className="font-bold text-[16px] truncate">{member.name.split(' ')[0]}</h3>
                      <div className={`inline-flex items-center px-2 py-1 rounded-md mt-1 w-full justify-center ${member.status?.includes("EMERGENCY") ? "bg-[#ba1a1a] text-white" : "bg-[#ccebc7] text-[#506b4f]"}`}>
                        <span className="text-[11px] font-bold truncate max-w-[100px]">{member.status || "Online"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- 2. ✨ RULES TAB (FULLY OPERATIONAL) --- */}
        {activeTab === "rules" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
                <h2 className="text-[28px] font-extrabold text-[#191c1d]">Rules & Reminders</h2>
                <p className="text-[#42474e]">Keep your family's daily schedules tight and synchronized.</p>
            </section>

            {/* Toggle Build Form Button */}
            {!showRuleForm ? (
              <button onClick={() => setShowRuleForm(true)} className="w-full bg-[#326085] text-white py-4 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">add_circle</span> Create New Alarm Schedule
              </button>
            ) : (
              // Add New Rule Form Object
              <form onSubmit={createNewRule} className="bg-white p-5 rounded-2xl border border-[#c2c7cf] space-y-4 shadow-sm animate-fade-in">
                <h3 className="text-lg font-bold text-[#326085]">Configure Routine Rule</h3>
                
                <input type="text" placeholder="Alarm Title (e.g. Evening Insulin Dose)" value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} className="w-full bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-3 outline-none focus:border-[#326085]" required />
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#72787f] mb-1 ml-1">Select Time</label>
                    <input type="time" value={ruleTime} onChange={(e) => setRuleTime(e.target.value)} className="w-full bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-2 outline-none focus:border-[#326085]" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#72787f] mb-1 ml-1">Category</label>
                    <select value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} className="w-full bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-2 outline-none focus:border-[#326085]">
                      <option value="Medicine">Medicine 💊</option>
                      <option value="Prayer">Prayer 📿</option>
                      <option value="Activity">Activity 🚶‍♂️</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#72787f] mb-1 ml-1">Assign To Family Member</label>
                  <select value={ruleAssignee} onChange={(e) => setRuleAssignee(e.target.value)} className="w-full bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-2 outline-none focus:border-[#326085]">
                    <option value="Papa">Papa</option>
                    <option value="Mama">Mama</option>
                    <option value="Children">Children</option>
                    <option value="Family">Whole Family</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 bg-[#4a6549] text-white py-3 rounded-xl font-bold shadow-md">Save Rule</button>
                  <button type="button" onClick={() => setShowRuleForm(false)} className="bg-[#f3f4f5] text-[#42474e] px-4 rounded-xl font-bold">Cancel</button>
                </div>
              </form>
            )}

            {/* Dynamic Rules Output Renderer */}
            <div className="space-y-4">
              {rules.length === 0 ? (
                <p className="text-center text-[#72787f] py-10">No rules scheduled yet. Click above to add your first alarm!</p>
              ) : (
                rules.map((rule) => {
                  const isMed = rule.category === "Medicine";
                  const isPray = rule.category === "Prayer";
                  return (
                    <div key={rule.id} className={`bg-white rounded-xl p-4 shadow-sm flex items-center border-l-4 ${isMed ? 'border-[#326085]' : isPray ? 'border-[#7f5221]' : 'border-[#4a6549]'}`}>
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${isMed ? 'bg-[#cde5ff] text-[#326085]' : isPray ? 'bg-[#ffdcbe] text-[#7f5221]' : 'bg-[#ccebc7] text-[#4a6549]'}`}>
                        <span className="material-symbols-outlined">
                          {isMed ? 'medication' : isPray ? 'auto_awesome' : 'directions_walk'}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold uppercase ${isMed ? 'text-[#326085]' : isPray ? 'text-[#7f5221]' : 'text-[#4a6549]'}`}>{rule.category}</span>
                          <span className="text-sm font-bold text-[#191c1d] bg-[#f3f4f5] px-2 py-0.5 rounded-md">⏰ {rule.time}</span>
                        </div>
                        <h3 className="font-bold text-[#191c1d] mt-1">{rule.title}</h3>
                        <div className="flex items-center gap-1 mt-1 text-[#72787f] text-xs font-bold">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                          <span>Assigned to: {rule.assignee}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteRule(rule.id, rule.title)} className="ml-4 text-[#ba1a1a] hover:bg-[#ffdad6] p-2 rounded-full transition-all">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- 3. SETUP TAB --- */}
        {activeTab === "setup" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
                <h1 className="text-[28px] font-extrabold text-[#326085]">Family Setup</h1>
                <p className="text-[#42474e]">Invite your family members easily. No technical setup required.</p>
            </section>
            <section className="bg-white p-6 rounded-3xl space-y-4 border border-[#c2c7cf]/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#4a6549] rounded-full flex items-center justify-center text-white"><span className="material-symbols-outlined">share</span></div>
                    <div><h2 className="text-[20px] font-bold text-[#4a6549]">Invite Members</h2><p className="text-sm text-[#42474e]">Add people to your Live Feed</p></div>
                </div>
                <button onClick={copyInviteLink} className="w-full h-[56px] bg-[#326085] text-white text-lg font-bold rounded-full shadow-md active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">content_copy</span> Copy Invite Link
                </button>
            </section>
          </div>
        )}

        {/* --- 4. LOGS TAB --- */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
                <h2 className="text-[28px] font-extrabold text-[#191c1d]">Activity Logs</h2>
                <p className="text-[#42474e]">Real-time history of your family's updates.</p>
            </section>
            <section className="space-y-4">
                {activityLogs.length === 0 ? (
                  <p className="text-center text-[#72787f] mt-10">No recent activity. Update your status to see it here!</p>
                ) : (
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                       <div key={log.id} className={`bg-white rounded-xl p-4 shadow-sm flex gap-4 relative overflow-hidden border ${log.isEmergency ? 'border-[#ba1a1a] bg-[#ffdad6]/30' : 'border-[#e1e3e4]'}`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${log.isEmergency ? 'bg-[#ba1a1a]' : 'bg-[#4a6549]'}`}></div>
                          <div className="flex-1 space-y-1">
                              <div className="flex justify-between items-start">
                                  <h3 className="font-bold text-[#191c1d]">{log.userName}</h3>
                                  <span className="text-xs text-[#42474e]">{log.time}</span>
                              </div>
                              <p className={`text-sm ${log.isEmergency ? 'font-bold text-[#93000a]' : 'text-[#42474e]'}`}>{log.action}</p>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
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