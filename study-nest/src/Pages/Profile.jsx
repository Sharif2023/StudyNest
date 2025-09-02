import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * StudyNest — Enhanced Profile Page
 * ------------------------------------------------------------------
 * Frontend-only profile with:
 * - Overview: avatar, bio, quick stats (Notes/Resources/Rooms/Bookmarks)
 * - Edit Profile: name, email, bio, avatar upload (persist to localStorage)
 * - Preferences: default anonymous mode, dark mode (class toggle), course focus
 * - Bookmarks: manage saved resources (from studynest.resources)
 * - My Content: lists of user's notes/resources/rooms (based on author === user.name)
 * - Security (mock): change password form (client-only demo)
 * - Danger Zone: clear local data for this user (profile + bookmarks)
 *
 * Route: <Route path="/profile" element={<Profile/>} />
 * Storage keys: studynest.user, studynest.resources, studynest.notes, studynest.rooms
 */

export default function Profile() {
  const [tab, setTab] = useState("overview");
  const [user, setUser] = useState(() => loadUser());
  const [dark, setDark] = useState(() => !!user?.prefs?.darkMode);

  // pull content
  const notes = useMemo(() => loadLocal("studynest.notes", []), []);
  const resources = useMemo(() => loadLocal("studynest.resources", []), []);
  const rooms = useMemo(() => loadLocal("studynest.rooms", []), []);
  const bookmarks = useMemo(() => resources.filter((r) => r.bookmarks > 0), [resources]);

  // dark mode toggling
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  const myResources = useMemo(() => resources.filter((r) => r.author === user.name), [resources, user.name]);
  const myNotes = useMemo(() => notes.filter((n) => (n.author || "You") === user.name), [notes, user.name]);
  const myRooms = useMemo(() => rooms.filter((rm) => (rm.host || "You") === user.name), [rooms, user.name]);

  function updateUser(next) {
    setUser(next);
    try { localStorage.setItem("studynest.user", JSON.stringify(next)); } catch {}
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:bg-zinc-900/80 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar url={user.avatar} name={user.name} size={52} />
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{user.name}</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/home" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">Dashboard</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-6 pb-3">
          <nav className="flex flex-wrap gap-2 text-sm">
            {[
              ["overview", "Overview"],
              ["edit", "Edit Profile"],
              ["prefs", "Preferences"],
              ["bookmarks", "Bookmarks"],
              ["content", "My Content"],
              ["security", "Security"],
            ].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTab(val)}
                className={"rounded-xl px-3 py-1.5 font-semibold " + (tab === val ? "bg-zinc-900 text-white dark:bg-zinc-800" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800")}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {tab === "overview" && <Overview user={user} notes={myNotes} resources={myResources} rooms={myRooms} bookmarks={bookmarks} />}
        {tab === "edit" && <EditProfile user={user} onChange={updateUser} />}
        {tab === "prefs" && <Preferences user={user} onChange={(u)=>{updateUser(u); setDark(!!u.prefs?.darkMode);}} />}
        {tab === "bookmarks" && <Bookmarks items={bookmarks} />}
        {tab === "content" && <MyContent notes={myNotes} resources={myResources} rooms={myRooms} />}
        {tab === "security" && <Security user={user} onClear={() => {
          // clear this user's local profile + bookmarks flags
          try {
            localStorage.removeItem("studynest.user");
            const res = loadLocal("studynest.resources", []);
            const reset = res.map(r => ({...r, bookmarks: 0}));
            localStorage.setItem("studynest.resources", JSON.stringify(reset));
          } catch {}
          setUser(loadUser());
          setTab("overview");
        }} />}
      </div>
    </main>
  );
}

/* -------------------- Sections -------------------- */
function Overview({ user, notes, resources, rooms, bookmarks }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex items-start gap-4">
          <Avatar url={user.avatar} name={user.name} size={64} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
            {user.bio && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              {user.prefs?.defaultAnonymous && <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">Anonymous by default</span>}
              {user.prefs?.courseFocus && <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">Focus: {user.prefs.courseFocus}</span>}
            </div>
          </div>
          <Link to="/search" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">Search</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="My Notes" value={notes.length} link="/notes" />
        <Stat label="My Resources" value={resources.length} link="/resources" />
        <Stat label="My Rooms" value={rooms.length} link="/rooms" />
        <Stat label="Bookmarks" value={bookmarks.length} link="/resources" />
      </div>
    </section>
  );
}

function EditProfile({ user, onChange }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const fileRef = useRef(null);

  function handleAvatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setAvatar(url);
  }

  function save() {
    onChange({ ...user, name: name.trim() || user.name, email: email.trim() || user.email, bio: bio.trim(), avatar });
  }

  return (
    <section className="grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="flex flex-col items-center text-center">
          <Avatar url={avatar} name={name} size={88} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          <button onClick={() => fileRef.current?.click()} className="mt-3 rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">Change avatar</button>
        </div>
      </div>

      <div className="md:col-span-2 rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Profile details</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
          </div>
          <div>
            <Label>Email</Label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
          </div>
          <div className="md:col-span-2">
            <Label>Bio</Label>
            <textarea rows={3} value={bio} onChange={(e)=>setBio(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={save} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save changes</button>
        </div>
      </div>
    </section>
  );
}

function Preferences({ user, onChange }) {
  const [defaultAnonymous, setDefaultAnonymous] = useState(!!user.prefs?.defaultAnonymous);
  const [darkMode, setDarkMode] = useState(!!user.prefs?.darkMode);
  const [courseFocus, setCourseFocus] = useState(user.prefs?.courseFocus || "");

  function save() {
    onChange({ ...user, prefs: { defaultAnonymous, darkMode, courseFocus } });
  }

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">General</h3>
        <div className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={defaultAnonymous} onChange={(e)=>setDefaultAnonymous(e.target.checked)} />
            Default to Anonymous mode when posting
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={darkMode} onChange={(e)=>setDarkMode(e.target.checked)} />
            Enable dark mode
          </label>
        </div>
        <div className="mt-4">
          <Label>Course focus</Label>
          <input value={courseFocus} onChange={(e)=>setCourseFocus(e.target.value)} placeholder="e.g., CSE220" className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={save} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save preferences</button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications (demo)</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">This is a frontend stub – wire to your backend later.</p>
        <div className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Email me on new replies</label>
          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Weekly study digest</label>
          <label className="flex items-center gap-2"><input type="checkbox" /> Room reminders 30 mins before</label>
        </div>
      </div>
    </section>
  );
}

function Bookmarks({ items }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Saved resources</h3>
      {items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white/60 px-4 py-8 text-center text-sm text-zinc-600 dark:bg-zinc-900/60 dark:border-zinc-700 dark:text-zinc-400">
          Nothing saved yet. Go to Resources and hit 🔖 Save on items you like.
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:bg-zinc-900 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{it.title}</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{it.course} • {it.kind || it.type || it.semester}</div>
                </div>
                <a href={it.url} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">Open</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MyContent({ notes, resources, rooms }) {
  return (
    <section className="space-y-6">
      <ListCard title="My Notes" empty="No notes yet" items={notes} type="notes" />
      <ListCard title="My Resources" empty="No resources yet" items={resources} type="resources" />
      <ListCard title="My Rooms" empty="No rooms yet" items={rooms} type="rooms" />
    </section>
  );
}

function ListCard({ title, empty, items, type }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <Link to={`/${type}`} className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100">Open {title.toLowerCase()} →</Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60 px-4 py-8 text-center text-sm text-zinc-600 dark:bg-zinc-900/60 dark:border-zinc-700 dark:text-zinc-400">{empty}</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:bg-zinc-900 dark:border-zinc-800">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={it.title || it.name}>{it.title || it.name}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">{it.course || it.topic || "—"} • {new Date(it.updatedAt || it.createdAt).toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Security({ user, onClear }) {
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [msg, setMsg] = useState("");
  function changePwd(){
    if(pwd1.length < 6) return setMsg("Password must be at least 6 characters");
    if(pwd1 !== pwd2) return setMsg("Passwords do not match");
    setMsg("Password updated (demo)");
    setPwd1(""); setPwd2("");
  }
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Change password (demo)</h3>
        <div className="mt-3 space-y-3 text-sm">
          <input type="password" value={pwd1} onChange={(e)=>setPwd1(e.target.value)} placeholder="New password" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
          <input type="password" value={pwd2} onChange={(e)=>setPwd2(e.target.value)} placeholder="Confirm password" className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
          {msg && <div className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</div>}
          <div className="flex justify-end">
            <button onClick={changePwd} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Update</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Danger zone</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Clears your local profile and bookmarks on this device.</p>
        <div className="mt-4 flex justify-end">
          <button onClick={onClear} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Clear local data</button>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Small Components -------------------- */
function Avatar({ url, name, size = 40 }) {
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="grid place-items-center rounded-full bg-emerald-200 text-emerald-800 font-bold" style={{ width: size, height: size }}>
      {String(name || "U").slice(0,1).toUpperCase()}
    </div>
  );
}
function Stat({ label, value, link }) {
  return (
    <Link to={link} className="rounded-2xl bg-white p-6 text-center shadow ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800">
      <div className="text-2xl font-bold text-emerald-600">{value}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</div>
    </Link>
  );
}
function Label({ children }) { return <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{children}</label>; }

/* -------------------- Utils & Seeds -------------------- */
function loadLocal(key, fallback){ try{ const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v)? v : fallback; }catch{ return fallback; } }
function loadUser(){
  try {
    const raw = JSON.parse(localStorage.getItem("studynest.user"));
    if (raw && typeof raw === 'object') return raw;
  } catch {}
  // default user seed
  const seed = { name: "You", email: "you@example.com", bio: "Student at StudyNest", avatar: "", prefs: { defaultAnonymous: false, darkMode: false, courseFocus: "" } };
  try { localStorage.setItem("studynest.user", JSON.stringify(seed)); } catch {}
  return seed;
}
