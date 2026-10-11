import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";

const ME = {
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
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const ref = useRef(null);
  const typingTimeout = useRef(null);

  // LIVE contacts
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
        setStatus("Check Firebase rules");
      }
    );
    return () => unsub();
  }, []);

  // LIVE messages
  useEffect(() => {
    if (!sel) return;

    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = all.filter(
        (m) =>
          (m.from_id === ME.id && m.to_id === sel.id) ||
          (m.from_id === sel.id && m.to_id === ME.id)
      );
      setMsgs(filtered);

      // Mark as read
      filtered.forEach(async (m) => {
        if (m.from_id === sel.id && !m.read) {
          try {
            await updateDoc(doc(db, "messages", m.id), { read: true });
          } catch (e) {}
        }
      });
    });
    return () => unsub();
  }, [sel]);

  useEffect(() => {
    ref.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [msgs, typing]);

  const send = async () => {
    if (!text.trim() || !sel) return;
    const msgText = text.trim();
    setText("");
    setTyping(false);

    await addDoc(collection(db, "messages"), {
      from_id: ME.id,
      to_id: sel.id,
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: serverTimestamp(),
      read: false,
    });
  };

  const handleTyping = (e) => {
    setText(e.target.value);
    setTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(false), 1500);
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
          lastSeen: "online",
        });
      }
      alert(`${picked.length} REAL contacts saved`);
    } catch {
      document.getElementById("vcf").click();
    }
  };

  const onVcf = async (e) => {
    const file = e.target.files?.[0];
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
        lastSeen: "online",
      });
    }
    alert(`${names.length} REAL contacts imported`);
  };

  const filtered = contacts.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getLastMessage = (contactId) => {
    // This is a simple version - in real app we would store last message on contact
    return "";
  };

  return (
    <div className="flex h-screen bg-[#0b141a] text-white overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-full md:w-[420px] flex flex-col border-r border-[#222d34] bg-[#111b21]">
        {/* Header */}
        <div className="h-[60px] bg-[#202c33] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <img src={ME.avatar} className="w-10 h-10 rounded-full object-cover" alt="me" />
            <div>
              <div className="font-medium text-[15px]">{ME.name}</div>
              <div className="text-[11px] text-[#00a884]">{status}</div>
            </div>
          </div>
          <div className="flex gap-4 text-[#aebac1] text-xl">
            <span className="cursor-pointer hover:text-white">✦</span>
            <span className="cursor-pointer hover:text-white">⋮</span>
          </div>
        </div>

        {/* Search + Import */}
        <div className="p-3 bg-[#111b21] space-y-2">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full bg-[#202c33] rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none placeholder:text-[#8696a0]"
            />
            <span className="absolute left-3.5 top-2.5 text-[#8696a0]">🔍</span>
          </div>

          <button
            onClick={importReal}
            className="w-full bg-[#00a884] hover:bg-[#008f72] py-2.5 rounded-lg text-sm font-semibold transition"
          >
            + Import Real Phone Contacts
          </button>
          <input id="vcf" type="file" hidden accept=".vcf" onChange={onVcf} />
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-[#8696a0] text-sm leading-relaxed">
              No contacts yet.<br /><br />
              Click the green button above to import<br />your real phone contacts.
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSel(c)}
                className={`flex gap-3 px-3 py-3 cursor-pointer transition ${
                  sel?.id === c.id ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                }`}
              >
                <img
                  src={c.avatar}
                  className="w-[49px] h-[49px] rounded-full object-cover shrink-0"
                  alt={c.name}
                />
                <div className="flex-1 min-w-0 border-b border-[#222d34] pb-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-[16px] truncate">{c.name}</span>
                    <span className="text-[11px] text-[#00a884] shrink-0">online</span>
                  </div>
                  <div className="text-[13px] text-[#8696a0] truncate mt-0.5">
                    {c.phone || "Tap to chat"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      <div className="flex-1 hidden md:flex flex-col bg-[#0b141a]">
        {sel ? (
          <>
            {/* Chat header */}
            <div className="h-[60px] bg-[#202c33] flex items-center gap-3 px-4 shrink-0">
              <img
                src={sel.avatar}
                className="w-10 h-10 rounded-full object-cover"
                alt={sel.name}
              />
              <div className="flex-1">
                <div className="font-medium text-[16px]">{sel.name}</div>
                <div className="text-[12px] text-[#8696a0]">
                  {typing ? (
                    <span className="text-[#00a884]">typing...</span>
                  ) : (
                    "online"
                  )}
                </div>
              </div>
              <div className="flex gap-5 text-[#aebac1] text-lg">
                <span>🔍</span>
                <span>⋮</span>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={ref}
              className="flex-1 overflow-y-auto px-10 py-4 space-y-1"
              style={{
                backgroundColor: "#0b141a",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23182126' fill-opacity='0.35'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {msgs.map((m) => {
                const isMe = m.from_id === ME.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[65%] px-3 py-1.5 rounded-lg text-[14.5px] leading-relaxed shadow-sm ${
                        isMe
                          ? "bg-[#005c4b] rounded-tr-none"
                          : "bg-[#202c33] rounded-tl-none"
                      }`}
                    >
                      {m.text}
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] text-white/60">{m.time}</span>
                        {isMe && (
                          <span className="text-[11px]">
                            {m.read ? (
                              <span className="text-[#53bdeb]">✓✓</span>
                            ) : (
                              <span className="text-white/40">✓✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="flex justify-start">
                  <div className="bg-[#202c33] px-4 py-2 rounded-lg rounded-tl-none text-sm text-[#8696a0]">
                    typing...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="h-[62px] bg-[#202c33] flex items-center gap-3 px-4 shrink-0">
              <span className="text-[#8696a0] text-xl cursor-pointer">🙂</span>
              <span className="text-[#8696a0] text-xl cursor-pointer">📎</span>
              <input
                value={text}
                onChange={handleTyping}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message"
                className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2.5 text-[15px] outline-none placeholder:text-[#8696a0]"
              />
              <button
                onClick={send}
                className="bg-[#00a884] hover:bg-[#008f72] w-10 h-10 rounded-full flex items-center justify-center transition"
              >
                <span className="text-white text-lg">➤</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] bg-[#222e35]">
            <div className="text-6xl mb-4 opacity-30">💬</div>
            <div className="text-2xl font-light mb-2">WhatsApp</div>
            <div className="text-sm text-center max-w-xs">
              Import your real contacts to start chatting live on your own Firebase.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
