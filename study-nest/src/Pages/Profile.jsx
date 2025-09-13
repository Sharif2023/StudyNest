// Pages/Profile.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

/**
 * StudyNest — Profile (Pro Layout)
 * - Integrated shell: LeftNav + Header + Footer
 * - 2-pane content: compact profile card + vertical tabs sidebar on the left, content on the right
 * - Same data model & storage keys as before (studynest.*)
 * - Dark mode respected via root .dark toggle from prefs
 */

const SIDEBAR_WIDTH_COLLAPSED = 72;
const SIDEBAR_WIDTH_EXPANDED = 260;

export default function Profile() {
  // ----- Shell state (LeftNav) -----
  const [navOpen, setNavOpen] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const sidebarWidth = navOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  // ----- Profile state -----
  const [tab, setTab] = useState("overview");
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("studynest.auth")) || null;
    } catch {
      return null;
    }
  });

  // Keep your editable local profile (for avatar/bio/prefs)
  const [user, setUser] = useState(() => loadUser());
  const [dark, setDark] = useState(() => !!user?.prefs?.darkMode);

  // ----- Collections -----
  const notes = useMemo(() => loadLocal("studynest.notes", []), []);
  const resources = useMemo(() => loadLocal("studynest.resources", []), []);
  const rooms = useMemo(() => loadLocal("studynest.rooms", []), []);
  const bookmarks = useMemo(() => resources.filter((r) => r.bookmarks > 0), [resources]);

  // ----- Derived -----
  const myResources = useMemo(() => resources.filter((r) => r.author === user.name), [resources, user.name]);
  const myNotes = useMemo(() => notes.filter((n) => (n.author || "You") === user.name), [notes, user.name]);
  const myRooms = useMemo(() => rooms.filter((rm) => (rm.host || "You") === user.name), [rooms, user.name]);

  // ----- Dark mode -----
  useEffect(() => {
    const root = document.documentElement;
    dark ? root.classList.add("dark") : root.classList.remove("dark");
  }, [dark]);

  function updateUser(next) {
    setUser(next);
    try { localStorage.setItem("studynest.user", JSON.stringify(next)); } catch { }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      {/* LeftNav (pinned) */}
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={sidebarWidth}
      />

      {/* Header (sticky, offset by sidebar) */}
      <Header sidebarWidth={sidebarWidth} />

      {/* Page container */}
      <main className="pt-4 pb-10" style={{ paddingLeft: sidebarWidth }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page header / identity bar */}
          <div className="mb-6 rounded-2xl bg-white/90 dark:bg-slate-900/60 ring-1 ring-zinc-200 dark:ring-white/10 backdrop-blur p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Avatar url={user.avatar} name={user.name} size={64} />
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {user.name || "Student"}
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {auth?.email || "—"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    ID: {auth?.student_id || auth?.id || "—"}
                  </p>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                <Link
                  to="/home"
                  className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Dashboard
                </Link>
                <Link
                  to="/search"
                  className="rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                >
                  Quick Search
                </Link>
              </div>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left pane: profile card + vertical tabs */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Profile card */}
              <div className="rounded-2xl bg-white p-5 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
                <div className="flex items-start gap-4">
                  <Avatar url={user.avatar} name={user.name} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</h2>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {auth?.email || "—"} • ID: {auth?.student_id || auth?.id || "—"}
                      </p>
                      {user.prefs?.defaultAnonymous && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Anonymous
                        </span>
                      )}
                    </div>
                    {user.bio ? (
                      <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{user.bio}</p>
                    ) : (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add a short bio to personalize your profile.</p>
                    )}
                    {user.prefs?.courseFocus && (
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Focus: {user.prefs.courseFocus}</p>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <StatMini label="Notes" value={myNotes.length} to="/notes" />
                  <StatMini label="Resources" value={myResources.length} to="/resources" />
                  <StatMini label="Rooms" value={myRooms.length} to="/rooms" />
                  <StatMini label="Saves" value={bookmarks.length} to="/resources" />
                </div>
              </div>

              {/* Vertical tabs */}
              <nav className="rounded-2xl bg-white p-2 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
                {[
                  ["overview", "Overview", "Home profile summary"],
                  ["edit", "Edit Profile", "Name, email, bio, avatar"],
                  ["prefs", "Preferences", "Dark mode, anonymity, focus"],
                  ["bookmarks", "Bookmarks", "Your saved resources"],
                  ["content", "My Content", "Notes, resources, rooms"],
                  ["security", "Security", "Password (demo), danger zone"],
                ].map(([val, label, desc]) => (
                  <button
                    key={val}
                    onClick={() => setTab(val)}
                    className={
                      "w-full text-left rounded-xl px-3 py-2.5 transition " +
                      (tab === val
                        ? "bg-zinc-900 text-white dark:bg-slate-800"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-slate-800/60")
                    }
                  >
                    <div className="text-sm font-semibold">{label}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</div>
                  </button>
                ))}
              </nav>
            </aside>

            {/* Right pane: active tab */}
            <section className="lg:col-span-8 space-y-6">
              {tab === "overview" && (
                <Overview
                  user={user}
                  notes={myNotes}
                  resources={myResources}
                  rooms={myRooms}
                  bookmarks={bookmarks}
                />
              )}
              {tab === "edit" && <EditProfile user={user} onChange={updateUser} />}
              {tab === "prefs" && (
                <Preferences
                  user={user}
                  onChange={(u) => {
                    updateUser(u);
                    setDark(!!u.prefs?.darkMode);
                  }}
                />
              )}
              {tab === "bookmarks" && <Bookmarks items={bookmarks} />}
              {tab === "content" && (
                <MyContent notes={myNotes} resources={myResources} rooms={myRooms} />
              )}
              {tab === "security" && (
                <Security
                  user={user}
                  onClear={() => {
                    try {
                      localStorage.removeItem("studynest.user");
                      const res = loadLocal("studynest.resources", []);
                      const reset = res.map((r) => ({ ...r, bookmarks: 0 }));
                      localStorage.setItem("studynest.resources", JSON.stringify(reset));
                    } catch { }
                    setUser(loadUser());
                    setTab("overview");
                  }}
                />
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Footer (offset by sidebar) */}
      <Footer sidebarWidth={sidebarWidth} />
    </div>
  );
}

/* -------------------- Sections -------------------- */
function Overview({ user, notes, resources, rooms, bookmarks }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <div className="flex items-start gap-4">
          <Avatar url={user.avatar} name={user.name} size={56} />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Welcome back, {user.name} 👋</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Quick snapshot of your activity and collections.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              {user.prefs?.defaultAnonymous && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-slate-800">Anonymous by default</span>
              )}
              {user.prefs?.courseFocus && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-slate-800">
                  Focus: {user.prefs.courseFocus}
                </span>
              )}
            </div>
          </div>
          <Link
            to="/resources"
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-slate-800"
          >
            Explore Resources
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Notes" value={notes.length} link="/notes" />
        <StatCard label="My Resources" value={resources.length} link="/resources" />
        <StatCard label="My Rooms" value={rooms.length} link="/rooms" />
        <StatCard label="Bookmarks" value={bookmarks.length} link="/resources" />
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
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <div className="flex flex-col items-center text-center">
          <Avatar url={avatar} name={name} size={96} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-slate-800"
          >
            Change avatar
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Profile details</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div>
            <Label>Email</Label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Bio</Label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={save}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Save changes
          </button>
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
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">General</h3>
        <div className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={defaultAnonymous} onChange={(e) => setDefaultAnonymous(e.target.checked)} />
            Default to Anonymous mode when posting
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
            Enable dark mode
          </label>
        </div>
        <div className="mt-4">
          <Label>Course focus</Label>
          <input
            value={courseFocus}
            onChange={(e) => setCourseFocus(e.target.value)}
            placeholder="e.g., CSE220"
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={save}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Save preferences
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications (demo)</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Frontend stub – wire to your backend later.</p>
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
    <section className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Saved resources</h3>
      {items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-white/60 px-4 py-8 text-center text-sm text-zinc-600 dark:bg-slate-900/60 dark:border-zinc-700 dark:text-zinc-400">
          Nothing saved yet. Go to Resources and hit 🔖 Save on items you like.
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{it.title}</div>
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">{it.course} • {it.kind || it.type || it.semester}</div>
                </div>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg border border-zinc-300 px-2 py-1 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-slate-800"
                >
                  Open
                </a>
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
    <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <Link to={`/${type}`} className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
          Open {title.toLowerCase()} →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white/60 px-4 py-8 text-center text-sm text-zinc-600 dark:bg-slate-900/60 dark:border-zinc-700 dark:text-zinc-400">
          {empty}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:bg-slate-900 dark:border-slate-800">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={it.title || it.name}>
                {it.title || it.name}
              </div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">
                {it.course || it.topic || "—"} • {safeDate(it.updatedAt || it.createdAt)}
              </div>
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

  function changePwd() {
    if (pwd1.length < 6) return setMsg("Password must be at least 6 characters");
    if (pwd1 !== pwd2) return setMsg("Passwords do not match");
    setMsg("Password updated (demo)");
    setPwd1(""); setPwd2("");
  }

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Change password (demo)</h3>
        <div className="mt-3 space-y-3 text-sm">
          <input
            type="password"
            value={pwd1}
            onChange={(e) => setPwd1(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
          />
          <input
            type="password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
          />
          {msg && <div className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</div>}
          <div className="flex justify-end">
            <button
              onClick={changePwd}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Update
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Danger zone</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Clears your local profile and bookmarks on this device.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClear}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Clear local data
          </button>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Small Components -------------------- */
function Avatar({ url, name, size = 40 }) {
  return url ? (
    <img src={url} alt={name} className="rounded-full object-cover ring-2 ring-cyan-200/50 dark:ring-cyan-400/20" style={{ width: size, height: size }} />
  ) : (
    <div
      className="grid place-items-center rounded-full bg-cyan-200 text-cyan-800 font-bold ring-2 ring-cyan-200/50 dark:ring-cyan-400/20"
      style={{ width: size, height: size }}
    >
      {String(name || "U").slice(0, 1).toUpperCase()}
    </div>
  );
}

function StatCard({ label, value, link }) {
  return (
    <Link
      to={link}
      className="rounded-2xl bg-white p-6 text-center shadow ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-slate-900 dark:ring-white/10 dark:hover:bg-slate-800/60"
    >
      <div className="text-2xl font-bold text-cyan-500">{value}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</div>
    </Link>
  );
}

function StatMini({ label, value, to }) {
  return (
    <Link
      to={to}
      className="rounded-xl bg-zinc-50 px-3 py-2 text-center ring-1 ring-zinc-200 hover:bg-zinc-100 dark:bg-slate-800 dark:ring-white/10 dark:hover:bg-slate-800/80"
    >
      <div className="text-sm font-bold text-cyan-500">{value}</div>
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</div>
    </Link>
  );
}

function Label({ children }) {
  return <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{children}</label>;
}

/* -------------------- Utils -------------------- */
function safeDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "—";
  }
}

function loadLocal(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function loadUser() {
  try {
    const raw = JSON.parse(localStorage.getItem("studynest.user"));
    if (raw && typeof raw === "object") return raw;
  } catch { }
  const seed = {
    name: "You",
    email: "you@example.com",
    bio: "Student at StudyNest",
    avatar: "",
    prefs: { defaultAnonymous: false, darkMode: false, courseFocus: "" },
  };
  try {
    localStorage.setItem("studynest.user", JSON.stringify(seed));
  } catch { }
  return seed;
}
