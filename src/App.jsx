import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATFQE9vknKALk6YZbwOBXY435hhuQVuSI",
  authDomain: "whatsapp-clone-a0ae2.firebaseapp.com",
  projectId: "whatsapp-clone-a0ae2",
  storageBucket: "whatsapp-clone-a0ae2.firebasestorage.app",
  messagingSenderId: "682843818360",
  appId: "1:682843818360:web:4f0e3c5ee32ce2e498e08d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ELON = {
  id: "elon",
  name: "Elon Musk",
  phone: "+1 (310) 420-5968",
  avatar: "https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_2015.jpg"
};

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [sel, setSel] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "contacts"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContacts(d);
      if (d.length > 0 && !sel) setSel(d[0]);
    });
  }, []);

  useEffect(() => {
    if (!sel) return;
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => d.data());
      setMsgs(all.filter(m => (m.from === "elon" && m.to === sel.id) || (m.from === sel.id && m.to === "elon")));
    });
  }, [sel]);

  useEffect(() => { listRef.current?.scrollTo(0, 99999); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !sel) return;
    await addDoc(collection(db, "messages"), {
      from: "elon",
      to: sel.id,
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now()
    });
    setText("");
  };

  const importReal = async () => {
    try {
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      for (let c of picked) {
        await addDoc(collection(db, "contacts"), {
          name: c.name[0],
          phone: c.tel[0],
          avatar: `https://i.pravatar.cc/150?u=${c.tel[0]}`,
          createdAt: Date.now()
        });
      }
      alert(picked.length + " REAL contacts saved!");
    } catch {
      document.getElementById("vcf").click();
    }
  };

  const onVcf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const txt = await file.text();
    const names = [...txt.matchAll(/FN:(.+)/g)].map(m => m[1].trim());
    const tels = [...txt.matchAll(/TEL.*:(.+)/g)].map(m => m[1].trim());
    for (let i = 0; i < names.length; i++) {
      await addDoc(collection(db, "contacts"), {
        name: names[i],
        phone: tels[i] || "+234",
        avatar: `https://i.pravatar.cc/150?u=${tels[i]}`,
        createdAt: Date.now()
      });
    }
    alert(names.length + " imported!");
  };

  const filtered = contacts.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111b21", color: "white", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 400, borderRight: "1px solid #222d34", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 59, background: "#202c33", display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
          <img src={ELON.avatar} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} alt="Elon" />
          <div>
            <div style={{ fontWeight: "bold" }}>{ELON.name} 🇺🇸</div>
            <div style={{ fontSize: 11, color: "#8696a0" }}>{ELON.phone}</div>
          </div>
        </div>

        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            style={{ width: "100%", background: "#202c33", padding: 10, borderRadius: 8, border: "none", outline: "none", color: "white" }}
          />
          <button
            onClick={importReal}
            style={{ width: "100%", background: "#00a884", padding: 10, borderRadius: 8, fontWeight: "bold", border: "none", color: "white", cursor: "pointer" }}
          >
            + Import REAL Phone Contacts
          </button>
          <input id="vcf" type="file" hidden accept=".vcf" onChange={onVcf} />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => setSel(c)}
              style={{
                display: "flex",
                gap: 12,
                padding: 12,
                cursor: "pointer",
                background: sel?.id === c.id ? "#2a3942" : "transparent"
              }}
            >
              <img src={c.avatar} style={{ width: 49, height: 49, borderRadius: "50%", objectFit: "cover" }} alt={c.name} />
              <div style={{ flex: 1, borderBottom: "1px solid #222d34" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{c.name}</span>
                  <span style={{ fontSize: 11, color: "#8696a0" }}>{c.phone}</span>
                </div>
                <div style={{ fontSize: 13, color: "#8696a0" }}>REAL chat</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0b141a" }}>
        {sel ? (
          <>
            <div style={{ height: 59, background: "#202c33", padding: "0 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <img src={sel.avatar} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} alt={sel.name} />
              <b>{sel.name}</b>
            </div>

            <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {msgs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.from === "elon" ? "flex-end" : "flex-start",
                    marginBottom: 4
                  }}
                >
                  <div style={{
                    background: m.from === "elon" ? "#005c4b" : "#202c33",
                    padding: "6px 10px",
                    borderRadius: 8,
                    maxWidth: "70%",
                    fontSize: 14
                  }}>
                    {m.text}
                    <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>{m.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: 62, background: "#202c33", display: "flex", gap: 8, padding: 12, alignItems: "center" }}>
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Type a message"
                style={{
                  flex: 1,
                  background: "#2a3942",
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  outline: "none",
                  color: "white"
                }}
              />
              <button
                onClick={send}
                style={{
                  background: "#00a884",
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#8696a0" }}>
            Select a contact
          </div>
        )}
      </div>
    </div>
  );
}
