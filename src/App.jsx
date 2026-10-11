import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATFQE9vknKALk6YZbwOBXY435hhuQVuSI",
  authDomain: "whatsapp-clone-a0ae2.firebaseapp.com",
  projectId: "whatsapp-clone-a0ae2",
  storageBucket: "whatsapp-clone-a0ae2.appspot.com",
  messagingSenderId: "682843818360",
  appId: "1:682843818360:web:4f0e3c5ee32ce2e498e08d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OWNER = {
  name: "Elon Musk",
  phone: "+1 (310) 420-5968",
  avatar: "https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_2015.jpg",
};

export default function App() {
  const [contacts, setContacts] = useState([OWNER]);
  const [selected, setSelected] = useState(OWNER);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "contacts"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setContacts([OWNER, ...list]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selected?.phone) return;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", selected.phone),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => d.data()));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    });
    return () => unsub();
  }, [selected]);

  const importRealContacts = async () => {
    try {
      if ("contacts" in navigator && "ContactsManager" in window) {
        const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
        for (let c of picked) {
          if (c.tel?.[0]) {
            await addDoc(collection(db, "contacts"), {
              name: c.name?.[0] || c.tel[0],
              phone: c.tel[0],
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name?.[0] || c.tel[0])}&background=random`,
            });
          }
        }
        alert("Real contacts imported!");
      } else {
        document.getElementById("vcfInput").click();
      }
    } catch {
      document.getElementById("vcfInput").click();
    }
  };

  const handleVcf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n");
    let name = "", phone = "";
    for (let line of lines) {
      if (line.startsWith("FN:")) name = line.replace("FN:", "").trim();
      if (line.startsWith("TEL")) phone = line.split(":").pop().trim();
      if (name && phone) {
        await addDoc(collection(db, "contacts"), {
          name,
          phone,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        });
        name = "";
        phone = "";
      }
    }
    alert("VCF contacts imported!");
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    await addDoc(collection(db, "messages"), {
      chatId: selected.phone,
      text: text.trim(),
      sender: "me",
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  // Open real WhatsApp with this number
  const openRealWhatsApp = (phone) => {
    if (!phone) return;
    // Clean the number (remove spaces, dashes, brackets)
    const clean = phone.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${clean.replace("+", "")}`, "_blank");
  };

  const filtered = contacts.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#111b21",
        color: "white",
        fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ========== SIDEBAR ========== */}
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#111b21",
          borderRight: "1px solid #222d34",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 60,
            background: "#202c33",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={OWNER.avatar}
              alt="Owner"
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: 16 }}>WhatsApp</div>
              <div style={{ fontSize: 12, color: "#00a884" }}>Hybrid Mode</div>
            </div>
          </div>
        </div>

        {/* Search + Import */}
        <div style={{ padding: 10, background: "#111b21" }}>
          <input
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "#202c33",
              color: "white",
              outline: "none",
              fontSize: 15,
              marginBottom: 8,
            }}
          />
          <button
            onClick={importRealContacts}
            style={{
              width: "100%",
              padding: 10,
              background: "#00a884",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            + Import REAL Phone Contacts
          </button>
          <input id="vcfInput" type="file" accept=".vcf" onChange={handleVcf} style={{ display: "none" }} />
        </div>

        {/* Contact List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((c, i) => (
            <div
              key={i}
              onClick={() => setSelected(c)}
              style={{
                padding: "12px 16px",
                display: "flex",
                gap: 14,
                cursor: "pointer",
                background: selected?.phone === c.phone ? "#2a3942" : "transparent",
                borderBottom: "1px solid #222d34",
                alignItems: "center",
              }}
            >
              <img
                src={c.avatar}
                alt={c.name}
                style={{ width: 49, height: 49, borderRadius: "50%", objectFit: "cover" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 16 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "#8696a0" }}>{c.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ========== CHAT AREA ========== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0b141a" }}>
        {/* Chat Header */}
        <div
          style={{
            height: 60,
            background: "#202c33",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid #222d34",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={selected?.avatar}
              alt={selected?.name}
              style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: 16 }}>{selected?.name}</div>
              <div style={{ fontSize: 13, color: "#8696a0" }}>{selected?.phone}</div>
            </div>
          </div>

          {/* REAL WhatsApp Button */}
          <button
            onClick={() => openRealWhatsApp(selected?.phone)}
            style={{
              background: "#25D366",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Open in Real WhatsApp
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 60px",
            backgroundColor: "#0b141a",
            backgroundImage:
              "url('https://user-images.githubusercontent.com/15075759/28754030-2d4710f2-7505-11e7-9114-6d70ea64e242.png')",
            backgroundSize: "400px",
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.sender === "me" ? "flex-end" : "flex-start",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  background: m.sender === "me" ? "#005c4b" : "#202c33",
                  padding: "8px 12px",
                  borderRadius: 8,
                  maxWidth: "65%",
                  fontSize: 14.5,
                  lineHeight: 1.4,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            height: 62,
            background: "#202c33",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message"
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "none",
              background: "#2a3942",
              color: "white",
              outline: "none",
              fontSize: 15,
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              background: "#00a884",
              border: "none",
              borderRadius: 8,
              color: "white",
              padding: "10px 22px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
