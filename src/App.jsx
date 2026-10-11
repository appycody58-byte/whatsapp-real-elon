import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATFQE9vknKALk6YZbwOBXY435hhuQVuSI",
  authDomain: "whatsapp-clone-a0ae2.firebaseapp.com",
  projectId: "whatsapp-clone-a0ae2",
  storageBucket: "whatsapp-clone-a0ae2.appspot.com",
  messagingSenderId: "682843818360",
  appId: "1:682843818360:web:4f0e3c5ee32ce2e498e08d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const OWNER = {
  name: "Elon Musk",
  phone: "+1 (310) 420-5968",
  avatar: "https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_2015.jpg"
};

export default function App() {
  const [contacts, setContacts] = useState([OWNER]);
  const [selected, setSelected] = useState(OWNER);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);

  // Load contacts from Firestore
  useEffect(() => {
    const q = query(collection(db, "contacts"), orderBy("name"));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setContacts([OWNER, ...list]);
    });
    return () => unsub();
  }, []);

  // Load messages for selected contact
  useEffect(() => {
    if (!selected) return;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", selected.phone),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => d.data()));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [selected]);

  const importRealContacts = async () => {
    try {
      if ("contacts" in navigator && "ContactsManager" in window) {
        const props = ["name", "tel"];
        const contacts = await navigator.contacts.select(props, { multiple: true });
        for (let c of contacts) {
          if (c.tel && c.tel[0]) {
            await addDoc(collection(db, "contacts"), {
              name: c.name ? c.name[0] : c.tel[0],
              phone: c.tel[0],
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name ? c.name[0] : c.tel[0])}`
            });
          }
        }
        alert("Real contacts imported!");
      } else {
        document.getElementById("vcfInput").click();
      }
    } catch (e) {
      document.getElementById("vcfInput").click();
    }
  };

  const handleVcf = async (e) => {
    const file = e.target.files[0];
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
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
        });
        name = "";
        phone = "";
      }
    }
    alert("VCF imported!");
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    await addDoc(collection(db, "messages"), {
      chatId: selected.phone,
      text: text,
      sender: "me",
      createdAt: serverTimestamp()
    });
    setText("");
  };

  const filtered = contacts.filter(c =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111b21", color: "white", fontFamily: "Segoe UI, sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: "35%", background: "#111b21", borderRight: "1px solid #222d34", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 12, background: "#202c33", display: "flex", alignItems: "center", gap: 10 }}>
          <img src={OWNER.avatar} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} alt="Owner" />
          <b>WhatsApp</b>
        </div>

        <div style={{ padding: 8, background: "#111b21" }}>
          <input
            placeholder="Search or start new chat"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 8,
              border: "none",
              background: "#202c33",
              color: "white",
              outline: "none"
            }}
          />
          <button
            onClick={importRealContacts}
            style={{
              marginTop: 8,
              width: "100%",
              padding: 8,
              background: "#00a884",
              border: "none",
              borderRadius: 8,
              color: "white",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            + Import REAL Phone Contacts
          </button>
          <input id="vcfInput" type="file" accept=".vcf" onChange={handleVcf} style={{ display: "none" }} />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.map((c, i) => (
            <div
              key={i}
              onClick={() => setSelected(c)}
              style={{
                padding: 12,
                display: "flex",
                gap: 12,
                cursor: "pointer",
                background: selected?.phone === c.phone ? "#2a3942" : "transparent",
                borderBottom: "1px solid #222d34"
              }}
            >
              <img
                src={c.avatar}
                style={{ width: 49, height: 49, borderRadius: "50%", objectFit: "cover" }}
                alt={c.name}
              />
              <div>
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "#8696a0" }}>{c.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0b141a" }}>
        <div style={{ padding: 12, background: "#202c33", display: "flex", gap: 12, alignItems: "center" }}>
          <img
            src={selected?.avatar}
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
            alt={selected?.name}
          />
          <div>
            <b>{selected?.name}</b>
            <div style={{ fontSize: 12, color: "#8696a0" }}>{selected?.phone}</div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28754030-2d4710f2-7505-11e7-9114-6d70ea64e242.png')",
            backgroundColor: "#0b141a",
            backgroundSize: "400px"
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: m.sender === "me" ? "flex-end" : "flex-start",
                marginBottom: 8
              }}
            >
              <div
                style={{
                  background: m.sender === "me" ? "#005c4b" : "#202c33",
                  padding: "8px 12px",
                  borderRadius: 8,
                  maxWidth: "70%"
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: 10, background: "#202c33", display: "flex", gap: 10 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Type a message"
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: "none",
              background: "#2a3942",
              color: "white",
              outline: "none"
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              padding: "0 20px",
              background: "#00a884",
              border: "none",
              borderRadius: 8,
              color: "white",
              cursor: "pointer"
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
