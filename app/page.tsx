"use client";

import { useState, useEffect, useRef } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, collection, query, addDoc, orderBy, limit, deleteDoc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";

// Haversine Formula for Geofencing
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

// WebRTC Public STUN Servers Connection Configurations
const servers = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
  iceCandidatePoolSize: 10,
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [statusInput, setStatusInput] = useState("");
  const [myStatus, setMyStatus] = useState("Loading...");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  // Geofence & Wi-Fi States
  const [homeBaseLat, setHomeBaseLat] = useState<number | null>(null);
  const [homeBaseLon, setHomeBaseLon] = useState<number | null>(null);
  const [homeWiFiIP, setHomeWiFiIP] = useState<string | null>(null);

  // ✨ WEBRTC CCTV SYSTEM STATES
  const [cctvMode, setCctvMode] = useState<"idle" | "camera" | "viewer">("idle");
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

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
              if (data.homeRouterIP) setHomeWiFiIP(data.homeRouterIP);
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
    await setDoc(doc(db, "users", user.uid), { status: newStatus, lastUpdated: timeNow, lat: null, lon: null }, { merge: true });
    await addDoc(collection(db, "logs"), { userName: user.displayName.split(' ')[0], action: newStatus, time: timeNow, timestamp: new Date().getTime(), isEmergency: newStatus.includes("EMERGENCY") });
    setStatusInput(""); 
  };

  const setHomeRouter = async () => {
    if (!user) return;
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      await setDoc(doc(db, "users", user.uid), { homeRouterIP: data.ip }, { merge: true });
      alert(`✅ Home Wi-Fi Registered: ${data.ip}`);
    } catch (error) { alert("Error saving Router info."); }
  };

  const setHomeBase = () => {
    if (!user) return;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        await setDoc(doc(db, "users", user.uid), { homeLat: position.coords.latitude, homeLon: position.coords.longitude }, { merge: true });
        alert("✅ GPS Home Base Zone Active!");
      });
    }
  };

  const checkWiFiAndGPS = async () => {
    if (!user) return;
    setIsGettingLocation(true);
    const timeNow = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      if (homeWiFiIP && data.ip === homeWiFiIP) {
         updateStatus("✅ Securely Connected to Home Wi-Fi");
         setIsGettingLocation(false);
         alert("Connected to Home Wi-Fi! No GPS Needed.");
         return;
      }
    } catch(e) {}

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        let geofenceStatus = "📍 Outside Home Base Zone";
        let isEmergency = false;
        if (homeBaseLat && homeBaseLon) {
           const dist = getDistanceFromLatLonInKm(homeBaseLat, homeBaseLon, position.coords.latitude, position.coords.longitude) * 1000;
           if (dist > 500) { geofenceStatus = "⚠️ LEFT SAFE ZONE!"; isEmergency = true; }
           else { geofenceStatus = "✅ Inside GPS Home Zone"; }
        }
        await setDoc(doc(db, "users", user.uid), { status: geofenceStatus, lat: position.coords.latitude, lon: position.coords.longitude, lastUpdated: timeNow }, { merge: true });
        await addDoc(collection(db, "logs"), { userName: user.displayName.split(' ')[0], action: geofenceStatus, time: timeNow, timestamp: new Date().getTime(), isEmergency: isEmergency });
        setIsGettingLocation(false);
      });
    }
  };

  // ========================================================
  // 🚨 MASTER WEBRTC CCTV SYSTEM ENGINE CODE 🚨
  // ========================================================
  
  // 1. Start Old Phone Streaming Session
  const startCctvCameraMode = async () => {
    setCctvMode("camera");
    pc.current = new RTCPeerConnection(servers);

    // Get camera video stream
    const localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
    
    localStream.getTracks().forEach((track) => pc.current?.addTrack(track, localStream));
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

    const callDoc = doc(db, "cctv", "liveStream");
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    pc.current.onicecandidate = (event) => {
      if (event.candidate) addDoc(offerCandidates, event.candidate.toJSON());
    };

    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    await setDoc(callDoc, { offer: { type: offerDescription.type, sdp: offerDescription.sdp } });

    // Listen for viewer's answer connection token
    onSnapshot(callDoc, async (snapshot) => {
      const data = snapshot.data();
      if (!pc.current?.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        await pc.current.setRemoteDescription(answerDescription);
      }
    });

    onSnapshot(answerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
  };

  // 2. Open Viewer Monitor Session
  const startCctvViewerMode = async () => {
    setCctvMode("viewer");
    pc.current = new RTCPeerConnection(servers);

    const remoteStream = new MediaStream();
    pc.current.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

    const callDoc = doc(db, "cctv", "liveStream");
    const answerCandidates = collection(callDoc, "answerCandidates");
    const offerCandidates = collection(callDoc, "offerCandidates");

    pc.current.onicecandidate = (event) => {
      if (event.candidate) addDoc(answerCandidates, event.candidate.toJSON());
    };

    const callSnapshot = await getDoc(callDoc);
    const callData = callSnapshot.data();

    if (!callData || !callData.offer) {
      alert("CCTV Camera Offline! Pehle purane phone se broadcast chalu karein.");
      setCctvMode("idle");
      return;
    }

    await pc.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    await updateDoc(callDoc, { answer: { type: answerDescription.type, sdp: answerDescription.sdp } });

    onSnapshot(offerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
        }
      });
    });
  };

  const stopCctv = () => {
    pc.current?.close();
    setCctvMode("idle");
    window.location.reload(); // Hard resets state objects cleanly
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
           <img src="/design.png" alt="SafeCircle Logo" className="w-40 h-auto drop-shadow-xl animate-pulse" />
           <h1 className="text-4xl font-extrabold text-[#326085]">SafeCircle</h1>
           <div className="w-full pt-8">
             <button onClick={handleLogin} disabled={isLoggingIn} className="w-full h-[56px] bg-[#326085] text-white rounded-2xl text-[18px] font-bold shadow-lg">
               Continue with Google
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f9fa] text-[#191c1d] min-h-screen pb-32 font-[Atkinson Hyperlegible Next]">
      <header className="w-full top-0 sticky z-40 bg-[#f8f9fa] shadow-sm border-b border-[#e1e3e4]">
        <div className="flex justify-between items-center px-5 py-3 max-w-2xl mx-auto">
          <h1 className="text-[22px] font-extrabold text-[#326085]">SafeCircle CCTV</h1>
          <button onClick={() => signOut(auth)} className="text-[#ba1a1a] font-bold text-sm">Logout</button>
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto pt-6 space-y-8">
        
        {/* ================= HOME TAB ================= */}
        {activeTab === "home" && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => updateStatus("🚨 EMERGENCY! I NEED HELP!")} className="w-full bg-[#ba1a1a] text-white rounded-2xl p-4 font-bold flex flex-col items-center">
                  <span className="material-symbols-outlined text-3xl">sos</span> SOS ALERT
              </button>
              <button onClick={checkWiFiAndGPS} className="w-full bg-[#4c799f] text-white rounded-2xl p-4 font-bold flex flex-col items-center">
                  <span className="material-symbols-outlined text-3xl">sync</span> SMART SCAN
              </button>
            </div>

            <section className="bg-white p-4 rounded-2xl border border-[#e1e3e4]">
               <h2 className="text-sm font-bold text-[#42474e] mb-2">Live Feed Status Map</h2>
               <div className="grid grid-cols-1 gap-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className={`p-4 rounded-2xl border flex flex-col gap-2 ${member.status?.includes("SAFE ZONE") || member.status?.includes("EMERGENCY") ? "border-[#ba1a1a] bg-[#ffdad6]/40" : "border-[#e1e3e4]"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-md">{member.name}</span>
                      <span className="text-xs text-[#72787f]">{member.lastUpdated}</span>
                    </div>
                    <p className="text-sm font-medium text-[#42474e]">{member.status || "Active Online"}</p>
                    {member.lat && member.lon && (
                      <div className="w-full h-40 rounded-xl overflow-hidden border">
                        <iframe width="100%" height="100%" frameBorder="0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${member.lon-0.003},${member.lat-0.003},${member.lon+0.003},${member.lat+0.003}&layer=mapnik&marker=${member.lat},${member.lon}`}></iframe>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ================= ✨ NEW CAMERA TAB (LIVE WebRTC CCTV) ================= */}
        {activeTab === "camera" && (
          <div className="space-y-6 animate-fade-in">
             <section className="space-y-1">
                <h2 className="text-[26px] font-extrabold text-[#326085]">Live CCTV Home Security</h2>
                <p className="text-[#42474e] text-sm">Turn your old phone into a home surveillance system.</p>
             </section>

             {cctvMode === "idle" && (
               <div className="grid grid-cols-1 gap-4">
                  <button onClick={startCctvCameraMode} className="bg-[#4a6549] text-white p-6 rounded-2xl flex flex-col items-center shadow-md active:scale-95 transition-transform">
                     <span className="material-symbols-outlined text-4xl mb-2">videocam</span>
                     <span className="text-lg font-bold">Act as Camera Streamer</span>
                     <span className="text-xs text-green-200 mt-1">(Old phone ko darwaze par lagayein)</span>
                  </button>

                  <button onClick={startCctvViewerMode} className="bg-[#326085] text-white p-6 rounded-2xl flex flex-col items-center shadow-md active:scale-95 transition-transform">
                     <span className="material-symbols-outlined text-4xl mb-2">live_tv</span>
                     <span className="text-lg font-bold">Watch Live Feed Monitoring</span>
                     <span className="text-xs text-blue-100 mt-1">(Apne naye phone se check karein)</span>
                  </button>
               </div>
             )}

             {/* CAMERA BROADCASTER VIEW */}
             {cctvMode === "camera" && (
               <div className="bg-black rounded-3xl overflow-hidden relative shadow-2xl border-4 border-[#4a6549]">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-auto max-h-[400px] object-cover" />
                  <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">🔴 LIVE BROADCASTING</div>
                  <button onClick={stopCctv} className="w-full bg-[#ba1a1a] text-white py-4 font-bold text-center">STOP STREAM</button>
               </div>
             )}

             {/* MONITOR VIEWER VIEW */}
             {cctvMode === "viewer" && (
               <div className="bg-black rounded-3xl overflow-hidden relative shadow-2xl border-4 border-[#326085]">
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-auto max-h-[400px] object-cover" />
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">📡 SECURE WEBRTC FEED</div>
                  <button onClick={stopCctv} className="w-full bg-[#72787f] text-white py-4 font-bold text-center">CLOSE MONITOR</button>
               </div>
             )}
          </div>
        )}

        {/* ================= SETUP TAB ================= */}
        {activeTab === "setup" && (
          <div className="space-y-6 animate-fade-in">
            <section className="bg-white p-5 rounded-3xl border border-[#c2c7cf] space-y-4">
                <button onClick={setHomeRouter} className="w-full h-[52px] bg-[#326085] text-white font-bold rounded-xl">Register Home Wi-Fi Router IP</button>
                <button onClick={setHomeBase} className="w-full h-[52px] bg-[#7f5221] text-white font-bold rounded-xl">Set GPS Home Coordinates</button>
            </section>
          </div>
        )}

        {/* ================= LOGS TAB ================= */}
        {activeTab === "logs" && (
          <div className="space-y-4 animate-fade-in">
             <h2 className="text-xl font-bold">Activity Logs History</h2>
             {activityLogs.map((log) => (
                <div key={log.id} className="bg-white p-4 rounded-xl border text-sm shadow-sm">
                   <div className="flex justify-between font-bold"><span>{log.userName}</span><span>{log.time}</span></div>
                   <p className="text-[#42474e] mt-1">{log.action}</p>
                </div>
             ))}
          </div>
        )}

      </main>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center py-3 bg-white shadow-xl border-t">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center px-4 ${activeTab === 'home' ? 'text-[#326085]' : 'text-[#72787f]'}`}><span className="material-symbols-outlined">home</span><span className="text-[11px] font-bold">Home</span></button>
        <button onClick={() => setActiveTab('camera')} className={`flex flex-col items-center px-4 ${activeTab === 'camera' ? 'text-[#326085]' : 'text-[#72787f]'}`}><span className="material-symbols-outlined">videocam</span><span className="text-[11px] font-bold">CCTV</span></button>
        <button onClick={() => setActiveTab('setup')} className={`flex flex-col items-center px-4 ${activeTab === 'setup' ? 'text-[#326085]' : 'text-[#72787f]'}`}><span className="material-symbols-outlined">settings</span><span className="text-[11px] font-bold">Setup</span></button>
        <button onClick={() => setActiveTab('logs')} className={`flex flex-col items-center px-4 ${activeTab === 'logs' ? 'text-[#326085]' : 'text-[#72787f]'}`}><span className="material-symbols-outlined">history</span><span className="text-[11px] font-bold">Logs</span></button>
      </nav>
    </div>
  );
}