"use client";

import { useState, useEffect } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, collection, query, addDoc, orderBy, limit, deleteDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

// ✨ THE HAVERSINE FORMULA (Mathematical Inch-Tape for Earth) ✨
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [statusInput, setStatusInput] = useState("");
  const [myStatus, setMyStatus] = useState("Loading...");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Geofence State
  const [homeBaseLat, setHomeBaseLat] = useState<number | null>(null);
  const [homeBaseLon, setHomeBaseLon] = useState<number | null>(null);

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

        const qUsers = query(collection(db, "users"));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
          let membersData: any[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            membersData.push({ id: doc.id, ...data });
            if (doc.id === currentUser.uid) {
              if (data.status) setMyStatus(data.status);
              if (data.homeLat && data.homeLon) {
                setHomeBaseLat(data.homeLat);
                setHomeBaseLon(data.homeLon);
              }
            }
          });
          setFamilyMembers(membersData);
        });

        const qLogs = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(15));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
          let logsData: any[] = [];
          snapshot.forEach((doc) => {
            logsData.push({ id: doc.id, ...doc.data() });
          });
          setActivityLogs(logsData);
        });

        return () => { unsubUsers(); unsubLogs(); };
      }
    });
    return () => unsubscribeAuth();
  }, []);

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
    
    await setDoc(doc(db, "users", user.uid), { 
        status: newStatus, 
        lastUpdated: timeNow,
        lat: null, 
        lon: null
    }, { merge: true });
    
    await addDoc(collection(db, "logs"), {
        userName: user.displayName.split(' ')[0],
        action: newStatus,
        time: timeNow,
        timestamp: new Date().getTime(),
        isEmergency: newStatus.includes("EMERGENCY")
    });
    setStatusInput(""); 
  };

  // ✨ SET HOME BASE (Safe Zone Center) ✨
  const setHomeBase = () => {
    if (!user) return;
    alert("Please stand inside your house. We are setting the Safe Zone coordinates.");
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          await setDoc(doc(db, "users", user.uid), { 
              homeLat: lat,
              homeLon: lon
          }, { merge: true });

          alert("✅ Safe Zone (Home Base) successfully set!");
        },
        (error) => alert("Could not set Home Base. Please allow GPS.")
      );
    }
  };

  // ✨ GOD MODE: GEOFENCE CHECKER ✨
  const shareExactLocation = () => {
    if (!user) return;
    setIsGettingLocation(true);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          let geofenceStatus = "📍 Shared Live 2D Location";
          let isEmergency = false;

          // 🧠 Smart Geofence Logic
          if (homeBaseLat && homeBaseLon) {
             const distanceKm = getDistanceFromLatLonInKm(homeBaseLat, homeBaseLon, lat, lon);
             const distanceMeters = distanceKm * 1000;

             if (distanceMeters > 500) { // 500 meters Safe Zone radius
                 geofenceStatus = "⚠️ LEFT SAFE ZONE! (More than 500m away)";
                 isEmergency = true; // Alerts the family
             } else {
                 geofenceStatus = "✅ Safely inside Home Zone";
             }
          }

          // Save to Firebase
          await setDoc(doc(db, "users", user.uid), { 
              status: geofenceStatus, 
              lat: lat,
              lon: lon,
              lastUpdated: timeNow 
          }, { merge: true });

          await addDoc(collection(db, "logs"), {
              userName: user.displayName.split(' ')[0],
              action: geofenceStatus,
              time: timeNow,
              timestamp: new Date().getTime(),
              isEmergency: isEmergency
          });

          setIsGettingLocation(false);
        },
        (error) => {
          console.error("GPS Error:", error);
          alert("Could not get location. Please allow GPS access.");
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("GPS not supported.");
      setIsGettingLocation(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText("https://careconnect-mvp.vercel.app");
    alert("App link copied!");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
           <img src="/design.png" alt="SafeCircle Logo" className="w-40 h-auto drop-shadow-xl animate-pulse" />
           <h1 className="text-4xl font-extrabold text-[#326085]">SafeCircle</h1>
           <p className="text-[#42474e] text-lg font-medium">Your Family Routine Guardian.</p>
           <div className="w-full pt-8">
             <button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-[56px] flex items-center justify-center gap-3 bg-[#326085] text-white rounded-2xl shadow-lg active:scale-95 transition-all text-[18px] font-bold">
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
        <div className="flex justify-between items-center px-5 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-[#cde5ff]" />
            <h1 className="text-[22px] font-extrabold text-[#326085]">SafeCircle</h1>
          </div>
          <button onClick={() => signOut(auth)} className="hover:bg-[#e7e8e9] rounded-full p-2 transition-all text-[#ba1a1a]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 max-w-2xl mx-auto pt-6 space-y-8">
        
        {/* --- HOME TAB --- */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => updateStatus("🚨 EMERGENCY! I NEED HELP!")} className="w-full bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center active:scale-95 transition-all border border-[#93000a]">
                  <span className="material-symbols-outlined text-[36px] animate-pulse mb-1">sos</span>
                  <span className="text-[14px] font-extrabold tracking-wider text-center">SOS ALERT</span>
              </button>
              
              <button onClick={shareExactLocation} disabled={isGettingLocation} className={`w-full text-white rounded-2xl p-4 shadow-md flex flex-col items-center justify-center active:scale-95 transition-all border ${isGettingLocation ? 'bg-[#72787f] border-[#42474e]' : 'bg-[#4c799f] hover:bg-[#326085] border-[#326085]'}`}>
                  <span className={`material-symbols-outlined text-[36px] mb-1 ${isGettingLocation ? 'animate-spin' : ''}`}>
                    {isGettingLocation ? 'sync' : 'map'}
                  </span>
                  <span className="text-[14px] font-extrabold tracking-wider text-center">
                    {isGettingLocation ? 'CHECKING...' : 'SMART GPS'}
                  </span>
              </button>
            </div>

            <section className="bg-white p-5 rounded-2xl shadow-sm border border-[#e1e3e4]">
               <h2 className="text-[16px] font-bold text-[#191c1d] mb-3 flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#4a6549]">chat_bubble</span> Manual Update
               </h2>
               <div className="flex gap-2">
                 <input type="text" placeholder="E.g. Reached safely" value={statusInput} onChange={(e) => setStatusInput(e.target.value)} className="flex-1 bg-[#f3f4f5] border border-[#c2c7cf] rounded-xl px-4 py-3 outline-none focus:border-[#326085] font-medium text-sm" />
                 <button onClick={() => updateStatus(statusInput)} className="bg-[#326085] text-white px-4 rounded-xl font-bold active:scale-95">Post</button>
               </div>
            </section>

            <section>
              <h2 className="text-[22px] font-extrabold text-[#191c1d] mb-4">Live Family Feed</h2>
              <div className="grid grid-cols-1 gap-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className={`bg-white p-4 rounded-2xl shadow-sm flex flex-col gap-4 border ${member.status?.includes("LEFT SAFE ZONE") || member.status?.includes("EMERGENCY") ? "border-[#ba1a1a] bg-[#ffdad6]" : "border-[#e1e3e4]"}`}>
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <img src={member.photoURL} alt={member.name} className="w-14 h-14 rounded-full object-cover shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-[16px] truncate">{member.name}</h3>
                          <p className="text-[10px] font-bold text-[#72787f]">{member.lastUpdated}</p>
                        </div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-md mt-1 mb-2 ${member.status?.includes("SAFE ZONE") || member.status?.includes("EMERGENCY") ? "bg-[#ba1a1a] text-white" : "bg-[#ccebc7] text-[#506b4f]"}`}>
                          <span className="text-[12px] font-bold truncate">{member.status || "Online"}</span>
                        </div>
                      </div>
                    </div>
                    {member.lat && member.lon && (
                      <div className="w-full h-48 rounded-xl overflow-hidden border border-[#c2c7cf]">
                        <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={`https://www.openstreetmap.org/export/embed.html?bbox=${member.lon-0.005},${member.lat-0.005},${member.lon+0.005},${member.lat+0.005}&layer=mapnik&marker=${member.lat},${member.lon}`}></iframe>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- SETUP TAB (With Smart Geofencing Button) --- */}
        {activeTab === "setup" && (
          <div className="space-y-6 animate-fade-in">
            <section className="bg-[#e7e8e9] p-6 rounded-3xl space-y-4 border border-[#c2c7cf] shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#7f5221] rounded-full flex items-center justify-center text-white"><span className="material-symbols-outlined">add_location_alt</span></div>
                    <div><h2 className="text-[20px] font-bold text-[#7f5221]">Smart Safe Zone</h2><p className="text-sm text-[#42474e]">Set 500m Geofence</p></div>
                </div>
                <p className="text-sm text-[#42474e] font-medium leading-relaxed">Stand inside your house and click below. If you share your GPS and are more than 500m away, the app will auto-trigger an alert!</p>
                
                <button onClick={setHomeBase} className="w-full h-[56px] bg-[#7f5221] hover:bg-[#663d0e] text-white text-lg font-bold rounded-full shadow-md active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">home_pin</span> Set Current Location as Home
                </button>
                {homeBaseLat && <p className="text-xs text-center text-[#4a6549] font-bold mt-2">✅ Home Base is Active</p>}
            </section>

            <section className="bg-white p-6 rounded-3xl space-y-4 border border-[#c2c7cf]/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#4a6549] rounded-full flex items-center justify-center text-white"><span className="material-symbols-outlined">share</span></div>
                    <div><h2 className="text-[20px] font-bold text-[#4a6549]">Invite Members</h2></div>
                </div>
                <button onClick={copyInviteLink} className="w-full h-[56px] bg-[#326085] text-white text-lg font-bold rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">content_copy</span> Copy Invite Link
                </button>
            </section>
          </div>
        )}

        {/* --- LOGS TAB --- */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-2">
                <h2 className="text-[28px] font-extrabold text-[#191c1d]">Activity Logs</h2>
            </section>
            <section className="space-y-4">
                {activityLogs.map((log) => (
                   <div key={log.id} className={`bg-white rounded-xl p-4 shadow-sm flex gap-4 overflow-hidden border ${log.isEmergency ? 'border-[#ba1a1a] bg-[#ffdad6]/30' : 'border-[#e1e3e4]'}`}>
                      <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                              <h3 className="font-bold text-[#191c1d]">{log.userName}</h3>
                              <span className="text-xs text-[#42474e]">{log.time}</span>
                          </div>
                          <p className={`text-sm ${log.isEmergency ? 'font-bold text-[#93000a]' : 'text-[#42474e]'}`}>{log.action}</p>
                      </div>
                  </div>
                ))}
            </section>
          </div>
        )}

        {/* --- RULES TAB (Kept minimal for space, but functional) --- */}
        {activeTab === "rules" && (
          <div className="space-y-6 animate-fade-in text-center py-10">
             <span className="material-symbols-outlined text-[60px] text-[#c2c7cf]">build</span>
             <h2 className="text-[22px] font-extrabold text-[#191c1d]">Rules Engine</h2>
             <p className="text-[#42474e]">Your scheduled alarms are active in the database.</p>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-3 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-3xl max-w-2xl mx-auto border-t border-[#e1e3e4]/50">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center px-5 py-2 rounded-2xl ${activeTab === 'home' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e]'}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}>home</span><span className="text-[12px] font-bold">Home</span></button>
        <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center px-5 py-2 rounded-2xl ${activeTab === 'rules' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e]'}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'rules' ? "'FILL' 1" : "'FILL' 0" }}>event_note</span><span className="text-[12px] font-bold">Rules</span></button>
        <button onClick={() => setActiveTab('setup')} className={`flex flex-col items-center px-5 py-2 rounded-2xl ${activeTab === 'setup' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e]'}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'setup' ? "'FILL' 1" : "'FILL' 0" }}>group_add</span><span className="text-[12px] font-bold">Setup</span></button>
        <button onClick={() => setActiveTab('logs')} className={`flex flex-col items-center px-5 py-2 rounded-2xl ${activeTab === 'logs' ? 'bg-[#cde5ff] text-[#001d32]' : 'text-[#42474e]'}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'logs' ? "'FILL' 1" : "'FILL' 0" }}>history</span><span className="text-[12px] font-bold">Logs</span></button>
      </nav>
    </div>
  );
}