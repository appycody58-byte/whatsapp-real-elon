import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  or,
  and,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const ELON = {
  id: "elon-musk",
  name: "Elon Musk",
  phone: "+1 (310) 420-5968",
  avatar: "https://upload.wikimedia.org/wikipedia/commons/3/34/Elon_Musk_2015.jpg",
};

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [sel, setSel] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Connecting to Firebase...");
  const ref = useRef(null);

  // LIVE contacts listener
  useEffect(() => {
    const q = query(collection(db, "contacts"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setContacts(list);
        if (list.length > 0 && !sel) setSel(list[0]);
        setStatus("LIVE · Firebase");
      },
      (err) => {
        console.error(err);
        setStatus("Firebase error – check your config in src/firebase.js");
      }
    );
    return () => unsub();
  }, []);

  // LIVE messages for selected contact
  useEffect(() => {
    if (!sel) return;

    // Simple approach: get all messages and filter client-side for reliability
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(
        (m) =>
          (m.from_id === "elon-musk" && m.to_id === sel.id) ||
          (m.from_id === sel.id && m.to_id === "elon-musk")
      );
      setMsgs(filtered);
    });
    return () => unsub();
  }, [sel]);

  useEffect(() => {
    ref.current?.scrollTo(0, 99999);
  }, [msgs]);

  const send = async () => {
    if (!text.trim() || !sel) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    await addDoc(collection(db, "messages"), {
      from_id: "elon-musk",
      to_id: sel.id,
      text: text.trim(),
      time,
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  const importReal = async () => {
    try {
      if (!navigator.contacts) {
        document.getElementById("vcf").click();
        return;
      }
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      for (let c of picked) {
        await addDoc(collection(db, "contacts"), {
          name: c.name?.[0] || "Unknown",
          phone: c.tel?.[0] || "",
          avatar: `https://i.pravatar.cc/150?u=${c.tel?.[0] || Math.random()}`,
          createdAt: serverTimestamp(),
        });
      }
      alert(picked.length + " REAL contacts saved LIVE to Firebase!");
    } catch (err) {
      console.error(err);
      document.getElementById("vcf").click();
    }
  };

  const onVcf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const txt = await file.text();
    const names = [...txt.matchAll(/FN:(.+)/g)].map((x) => x[1].trim());
    const tels = [...txt.matchAll(/TEL.*:(.+)/g)].map((x) => x[1].trim());
    for (let i = 0; i < names.length; i++) {
      await addDoc(collection(db, "contacts"), {
        name: names[i],
        phone: tels[i] || "+000",
        avatar: `https://i.pravatar.cc/150?u=${tels[i] || names[i]}`,
        createdAt: serverTimestamp(),
      });
    }
    alert(names.length + " REAL contacts imported LIVE to Firebase!");
  };

  const filtered = contacts.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#111b21] text-white">
      {/* Sidebar */}
      <div className="w-full md:w-[400px] flex flex-col border-r border-[#222d34]">
        <div className="h-[59px] bg-[#202c33] flex items-center gap-3 px-4">
          <img src={ELON.avatar} className="w-10 h-10 rounded-full object-cover" alt="Elon" />
          <div>
            <b>{ELON.name} 🇺🇸</b>
            <div className="text-xs text-[#8696a0]">{ELON.phone} · {status}</div>
          </div>
        </div>

        <div className="p-3 space-y-2 bg-[#111b21]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-[#202c33] rounded-lg px-3 py-2 text-sm outline-none placeholder:text-[#8696a0]"
          />
          <button
            onClick={importReal}
            className="w-full bg-[#00a884] hover:bg-[#008f72] py-2 rounded font-bold text-sm transition"
          >
            + Import REAL Phone Contacts
          </button>
          <input id="vcf" type="file" hidden accept=".vcf" onChange={onVcf} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSel(c)}
              className={`flex gap-3 p-3 cursor-pointer hover:bg-[#202c33] ${sel?.id === c.id ? "bg-[#2a3942]" : ""}`}
            >
              <img
                src={c.avatar}
                className="w-12 h-12 rounded-full object-cover"
                alt={c.name}
              />
              <div className="flex-1 border-b border-[#222d34] pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-[#8696a0]">{c.phone}</span>
                </div>
                <div className="text-xs text-[#8696a0]">LIVE Firebase Chat</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-6 text-center text-[#8696a0] text-sm">
              No contacts yet. Import REAL ones above.
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 hidden md:flex flex-col bg-[#0b141a]">
        {sel ? (
          <>
            <div className="h-[59px] bg-[#202c33] flex items-center gap-3 px-4">
              <img src={sel.avatar} className="w-10 h-10 rounded-full object-cover" alt={sel.name} />
              <div>
                <b>{sel.name}</b>
                <div className="text-xs text-[#8696a0]">Online · LIVE Firebase</div>
              </div>
            </div>

            <div
              ref={ref}
              className="flex-1 overflow-y-auto p-4 space-y-2"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182126' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[65%] p-2.5 rounded-lg text-sm ${
                    m.from_id === "elon-musk" ? "bg-[#005c4b] ml-auto" : "bg-[#202c33]"
                  }`}
                >
                  {m.text}
                  <div className="text-[10px] opacity-60 text-right mt-1">{m.time}</div>
                </div>
              ))}
            </div>

            <div className="h-[62px] bg-[#202c33] flex gap-2 p-3 items-center">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message"
                className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2 outline-none placeholder:text-[#8696a0]"
              />
              <button
                onClick={send}
                className="bg-[#00a884] hover:bg-[#008f72] px-6 py-2 rounded-lg font-bold transition"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-[#8696a0]">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              Select a REAL contact to start chatting
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
