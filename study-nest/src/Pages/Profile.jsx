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
  const API_BASE = "http://localhost/StudyNest/study-nest/src/api";
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

  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.profile")) || null; } catch { return null; }
  });
  const displayName = (profile?.name && profile.name.trim())
    || (auth?.name && auth.name.trim())
    || "Student";
  // On mount, refresh profile from backend (session-based)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/profile.php`, { credentials: "include" });
        const j = await r.json();
        const p = j?.ok ? j.profile : j;
        if (p) {
          setProfile(p);
          localStorage.setItem("studynest.profile", JSON.stringify(p));
        }
      } catch { /* non-fatal */ }
    })();
  }, []);

  // Keep your editable local profile (for profile picture/bio/prefs)
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
                <profile_picture url={user.profile_picture_url} name={user.name} size={64} />
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {profile?.name || user.name || "Student"}
                  </h1>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {profile?.email || auth?.email || "—"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    ID: {profile?.student_id || auth?.student_id || auth?.id || "—"}
                  </p>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
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
                  <profile_picture url={user.profile_picture} name={user.name} size={56} />

                  <div className="flex-1 min-w-0">
                    {/* Name row */}
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {profile?.name || user.name}
                      </h2>
                      {user.prefs?.defaultAnonymous && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          Anonymous
                        </span>
                      )}
                    </div>

                    {/* Email */}
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {profile?.email || auth?.email || "—"}
                    </p>

                    {/* ID */}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      ID: {profile?.student_id || auth?.student_id || auth?.id || "—"}
                    </p>

                    {/* Bio (optional) */}
                    {(profile?.bio ?? "").trim() ? (
                      <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{profile.bio}</p>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        Add a short bio to personalize your profile.
                      </p>
                    )}

                    {/* Focus (optional) */}
                    {user.prefs?.courseFocus && (
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Focus: {user.prefs.courseFocus}
                      </p>
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
                  ["edit", "Edit Profile", "Name, email, bio, profile_picture"],
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
                  displayName={displayName}
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
function Overview({ user, displayName, notes, resources, rooms, bookmarks }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <div className="flex items-start gap-4">
          <profile_picture url={user.profile_picture} name={user.name} size={56} />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Welcome back, {displayName} 👋</h3>
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
  const API_BASE = "http://localhost/StudyNest/study-nest/src/api";
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.profile")) || null; } catch { return null; }
  });
  const [auth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.auth")) || null; } catch { return null; }
  });

  const id = profile?.id || auth?.id;
  const student_id = profile?.student_id || auth?.student_id || "—";
  const email = profile?.email || user.email;

  const [name, setName] = useState(profile?.name || user.name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [profile_picture, setprofile_picture] = useState(profile?.profile_picture_url || user.profile_picture || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  async function handleprofile_picture(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    const form = new FormData();
    form.append("file", f);

    try {
      const res = await fetch(`${API_BASE}/upload.php`, {
        method: "POST",
        body: form,
        credentials: "include",
      });

      // only once
      const j = await res.json();

      if (j?.ok && j.url) {
        setprofile_picture(j.url); // ✅ save local /images/... path
      } else {
        alert("Upload failed: " + (j?.error || "unknown error"));
      }
    } catch (err) {
      alert("Upload error: " + err.message);
    }
  }

  async function save() {
    if (!id) return;
    setSaving(true);

    try {
      let finalUrl = profile_picture;

      // If it's a blob, upload first
      if (finalUrl.startsWith("blob:")) {
        const f = fileRef.current?.files?.[0];
        if (f) {
          const formData = new FormData();
          formData.append("file", f);

          const uploadRes = await fetch(`${API_BASE}/upload.php`, {
            method: "POST",
            credentials: "include",
            body: formData,
          });
          const uploadJson = await uploadRes.json();
          if (!uploadJson.ok) throw new Error(uploadJson.error || "Upload failed");
          finalUrl = uploadJson.url;
        }
      }

      // Save profile with correct field name
      const res = await fetch(`${API_BASE}/profile.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id,
          name: name.trim() || "Student",
          profile_picture_url: finalUrl || "",
          bio: bio || "",
        }),
      });

      const j = await res.json();
      console.log("profile.php response:", j);

      if (j?.ok && j.profile) {
        setProfile(j.profile);
        localStorage.setItem("studynest.profile", JSON.stringify(j.profile));
        window.dispatchEvent(new Event("studynest:profile-updated"));

        onChange({
          ...user,
          name: j.profile.name,
          email: j.profile.email,
          bio: j.profile.bio,
          profile_picture_url: finalUrl,
        });
      } else {
        alert(j?.error || "Failed to save profile");
      }
    } catch (e) {
      alert("Upload failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <div className="flex flex-col items-center text-center">
          <profile_picture url={profile_picture} name={name} size={96} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleprofile_picture} />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-3 rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-slate-800"
          >
            Change profile picture
          </button>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            (For production, add an upload API and save a real file path to <code>profile_picture_url</code>.)
          </p>
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

          {/* Email (read-only) */}
          <div>
            <Label>Email</Label>
            <input
              value={email}
              disabled
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm bg-zinc-100 dark:bg-slate-800 dark:border-zinc-700 dark:text-zinc-400 cursor-not-allowed"
            />
          </div>

          {/* Student ID (read-only) */}
          <div>
            <Label>Student ID</Label>
            <input
              value={student_id}
              disabled
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm bg-zinc-100 dark:bg-slate-800 dark:border-zinc-700 dark:text-zinc-400 cursor-not-allowed"
            />
          </div>

          {/* profile picture URL (optional direct link field) */}
          <div>
            <Label>Profile Picture URL (optional)</Label>
            <input
              value={profile_picture}
              onChange={(e) => setprofile_picture(e.target.value)}
              placeholder="https://example.com/me.jpg"
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>

          {/* Bio */}
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
            disabled={saving}
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
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

function MyContent() {
  const API_BASE = "http://localhost/StudyNest/study-nest/src/api";
  const [data, setData] = useState({ notes: [], resources: [], rooms: [], questions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/profile.php?content=1`, {
          credentials: "include", // required for PHP session
        });
        const json = await res.json();
        if (json.ok && json.content) setData(json.content);
        else console.warn("Failed to load content:", json);
      } catch (err) {
        console.error("Error loading content:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 text-center text-sm text-zinc-500 dark:bg-slate-900 dark:ring-white/10">
        Loading your content...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <ListCard title="My Notes" empty="No notes yet" items={data.notes} type="notes" />
      <ListCard title="My Resources" empty="No resources yet" items={data.resources} type="resources" />
      <ListCard title="My Questions" empty="No questions yet" items={data.questions} type="forum" />
      <ListCard title="My Rooms" empty="No rooms yet" items={data.rooms} type="rooms" />
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
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={it.title}>
  {it.title}
</div>
<div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">
  {(it.tags || "—")} • {safeDate(it.created_at || it.updated_at)}
</div>

            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Security({ user, onClear }) {
  const API_BASE = "http://localhost/StudyNest/study-nest/src/api";
  const [oldPwd, setOldPwd] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePwd() {
    setMsg("");
    if (!oldPwd) return setMsg("Enter your current password");
    if (pwd1.length < 6) return setMsg("Password must be at least 6 characters");
    if (pwd1 !== pwd2) return setMsg("Passwords do not match");

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/profile.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          old_password: oldPwd,
          new_password: pwd1,
        }),
      });

      const j = await res.json();
      if (j?.ok) {
        setMsg("✅ " + (j.message || "Password updated successfully"));
        setOldPwd(""); setPwd1(""); setPwd2("");
      } else {
        setMsg("❌ " + (j.error || "Failed to update password"));
      }
    } catch (err) {
      setMsg("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {/* Change password */}
      <div className="rounded-2xl bg-white p-6 shadow ring-1 ring-zinc-200 dark:bg-slate-900 dark:ring-white/10">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Change password</h3>
        <div className="mt-3 space-y-3 text-sm">
          <input
            type="password"
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            placeholder="Current password"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm 
              focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
          />
          <input
            type="password"
            value={pwd1}
            onChange={(e) => setPwd1(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm 
              focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
          />
          <input
            type="password"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm 
              focus:ring-2 focus:ring-cyan-500 dark:bg-slate-900 dark:border-zinc-700 dark:text-zinc-100"
          />
          {msg && <div className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</div>}
          <div className="flex justify-end">
            <button
              onClick={changePwd}
              disabled={saving}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white 
                hover:bg-cyan-700 disabled:opacity-60"
            >
              {saving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone (unchanged) */}
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
function profile_picture({ url, name, size = 40 }) {
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
    name: "Student",
    email: `{profile?.email || auth?.email || "—"}`,
    bio: "Student at StudyNest",
    profile_picture_url: "",
    prefs: { defaultAnonymous: false, darkMode: false, courseFocus: "" },
  };
  try {
    localStorage.setItem("studynest.user", JSON.stringify(seed));
  } catch { }
  return seed;
}
