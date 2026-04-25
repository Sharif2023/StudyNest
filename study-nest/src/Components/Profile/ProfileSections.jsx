import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Database, BookOpen, Video, Play, FileText, 
  MessageSquare, Bookmark, ChevronRight, User, 
  Mail, Target, Edit3, Settings, ShieldCheck, 
  LogOut, ExternalLink
} from "lucide-react";
import apiClient from "../../apiConfig";
import { ProfilePicture, InputGroup, StatCard, OptionToggle } from "./ProfileComponents";
import { safeDate } from "./ProfileUtils";

/* -------------------- Sections -------------------- */
export function Overview({ user, displayName }) {
  const [data, setData] = useState({ notes: [], resources: [], rooms: [], questions: [], recordings: [] });
  const [counts, setCounts] = useState({ notes: 0, resources: 0, rooms: 0, questions: 0, recordings: 0, bookmarks: 0 });
  const [loading, setLoading] = useState(true);

  const [auth] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studynest.auth")) || null; } catch { return null; }
  });
  const isAdmin = auth?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      setLoading(false);
      return;
    }
    async function fetchOverview() {
      setLoading(true);
      try {
        const response = await apiClient.get("profile.php", { params: { content: 1 } });
        const json = response.data;
        if (json.ok && json.content) {
          setData(json.content);
          setCounts({
            notes: json.content.notes?.length || 0,
            resources: json.content.resources?.length || 0,
            recordings: json.content.recordings?.length || 0,
            rooms: json.content.rooms?.length || 0,
            questions: json.content.questions?.length || 0,
            bookmarks: json.content.bookmarks?.length || 0,
          });
        }
      } catch (err) {
        console.error("Error loading overview:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-[2rem] bg-[rgba(255,255,255,0.05)] border border-white/10 flex items-center justify-center mb-6 relative shadow-xl">
          <div className="absolute inset-0 border-2 border-white/20 border-t-transparent rounded-full animate-spin p-2" />
          <Database className="w-6 h-6 text-white animate-pulse" />
        </div>
        <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[9px] animate-pulse">Loading Overview...</p>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-10">
        <div className="rounded-[2.5rem] border border-white/5 bg-[rgba(10,11,18,0.4)] backdrop-blur-2xl p-10 lg:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
            <ShieldCheck size={240} className="text-white" />
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black text-white tracking-tight mb-4 text-gradient-brand">Admin Privileges Active</h3>
            <p className="text-lg text-slate-300 font-medium max-w-2xl leading-relaxed mb-10">
              You are currently logged in with full system administrative access. You can manage users, monitor platform health, and control global settings via the Admin Command Center.
            </p>
            <Link to="/admin" className="inline-flex items-center gap-4 px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-200 transition-all shadow-xl shadow-white/5 hover:scale-[1.02] active:scale-95">
              Enter Admin Panel <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <StatCard label="Resources" value={counts.resources} icon={<BookOpen className="w-5 h-5" />} trend="+12.5%" />
        <StatCard label="Recordings" value={counts.recordings} icon={<Video className="w-5 h-5" />} trend="+4.2%" />
        <StatCard label="Study Rooms" value={counts.rooms} icon={<Play className="w-5 h-5" />} trend="+3" />
        <StatCard label="My Notes" value={counts.notes} icon={<FileText className="w-5 h-5" />} />
        <StatCard label="Questions" value={counts.questions} icon={<MessageSquare className="w-5 h-5" />} />
        <StatCard label="Bookmarks" value={counts.bookmarks} icon={<Bookmark className="w-5 h-5" />} />
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 blur-2xl opacity-50 transition-opacity duration-1000 group-hover:opacity-100" />
        <div className="relative rounded-[2.5rem] border border-white/5 bg-[rgba(10,11,18,0.6)] backdrop-blur-3xl p-10 lg:p-14 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <Target size={300} className="text-indigo-500" />
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 relative z-10 gap-6">
            <div className="flex-1">
              <h3 className="text-3xl font-black text-white tracking-tight mb-3">Academic Roadmap</h3>
              <p className="text-xs font-medium text-slate-400 max-w-lg leading-relaxed">
                Centralized intelligence from your recent scholarly activities across the StudyNest ecosystem. 
                Resume your journey exactly where you left off.
              </p>
            </div>
            <Link to="/home" className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all group/btn shadow-xl shadow-white/5 active:scale-95 flex-shrink-0">
              Live Feed <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
            <PreviewList title="Library" items={data.resources || []} icon={<Database className="w-4 h-4" />} to="/resources" accent="cyan" />
            <PreviewList title="Recordings" items={data.recordings || []} icon={<Video className="w-4 h-4" />} to="/resources" accent="violet" />
            <PreviewList title="Studios" items={data.rooms || []} icon={<Play className="w-4 h-4" />} to="/rooms" accent="emerald" />
            <PreviewList title="Artifacts" items={data.notes || []} icon={<FileText className="w-4 h-4" />} to="/notes" accent="amber" />
            <div className="lg:col-span-2">
              <PreviewList title="Inquiries" items={data.questions || []} icon={<MessageSquare className="w-4 h-4" />} to="/forum" accent="rose" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewList({ title, items, icon, to, accent = "indigo" }) {
  const accents = {
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
  };

  return (
    <div className="flex flex-col h-full group/list rounded-3xl border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-all duration-500">
      <div className="flex items-center gap-5 mb-10">
        <div className={`w-14 h-14 rounded-2xl border transition-all duration-500 ${accents[accent]} group-hover/list:scale-110 group-hover/list:shadow-[0_0_20px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] leading-tight mb-1">{title}</h4>
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Recent Activity</p>
        </div>
      </div>
      
      <div className="flex-1 space-y-4 min-h-[140px]">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Station Empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 4).map((it, i) => (
              <Link key={it.id || i} to={to} className="block group/item">
                <motion.div 
                  whileHover={{ x: 8 }}
                  className="flex items-center justify-between gap-6 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5 transition-all text-sm text-slate-400 font-medium group-hover/item:text-white"
                >
                  <p className="truncate flex-1 py-1">
                    {it.title || it.name || "(Untitled Node)"}
                  </p>
                  <ChevronRight className="w-4 h-4 text-slate-700 group-hover/item:text-white transition-all opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0" />
                </motion.div>
              </Link>
            ))}
            {items.length > 4 && (
              <Link to={to} className="block mt-4 px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-indigo-400 transition-colors">
                View All {title} Archive →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EditProfile({ user, onChange }) {
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
  const [profile_picture_url, setProfilePictureUrl] = useState(profile?.profile_picture_url || user.profile_picture_url || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  async function handleProfilePicture(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type?.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    try {
      const signatureRes = await apiClient.post("cloudinary_signature.php", {
        resource_type: "image",
        folder: "studynest_profiles",
        context: `user=${id || "profile"}`
      });
      const signature = signatureRes.data;
      if (!signature?.ok) throw new Error(signature?.error || "Cloud upload is not configured.");

      const form = new FormData();
      form.append("file", f, f.name);
      form.append("api_key", signature.api_key);
      form.append("signature", signature.signature);
      Object.entries(signature.params || {}).forEach(([key, value]) => {
        form.append(key, value);
      });

      const uploadRes = await fetch(signature.upload_url, {
        method: "POST",
        body: form,
      });
      const upload = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !upload.secure_url) {
        throw new Error(upload?.error?.message || "Upload failed");
      }
      setProfilePictureUrl(upload.secure_url);
    } catch (err) {
      alert("Upload error: " + (err.message || "unknown error"));
    }
  }

  async function save() {
    if (!id) return alert("No user ID found. Please log in again.");
    setSaving(true);
    try {
      const response = await apiClient.put("profile.php", { 
        id, 
        name: name.trim() || "Student", 
        profile_picture_url: profile_picture_url || "", 
        bio: bio || "" 
      });
      const j = response.data;
      if (j?.ok && j.profile) {
        setProfile(j.profile);
        localStorage.setItem("studynest.profile", JSON.stringify(j.profile));
        const updatedUser = { ...user, name: j.profile.name, email: j.profile.email, bio: j.profile.bio, profile_picture_url: j.profile.profile_picture_url };
        onChange(updatedUser);
        localStorage.setItem("studynest.user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("studynest:profile-updated"));
      }
    } catch (e) {
      console.error("Update failed:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-4 rounded-3xl border border-white/5 bg-white/[0.03] p-10 flex flex-col items-center text-center shadow-2xl">
        <div className="relative group mb-10">
          <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="relative">
            <ProfilePicture url={profile_picture_url} name={name} size={180} className="rounded-full ring-8 ring-[#08090e] shadow-2xl" />
            <button 
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-2 right-2 p-4 rounded-2xl bg-white text-black shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 border-4 border-[#08090e]"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicture} />
        <div className="space-y-2 mb-8">
          <h4 className="text-2xl font-black text-white tracking-tight">{name}</h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scholar Account</p>
        </div>
        <div className="w-full h-px bg-white/5 mb-8" />
        <p className="text-sm text-slate-400 leading-relaxed px-4">
          Maintain your academic presence by keeping your biographical information up to date.
        </p>
      </div>

      <div className="lg:col-span-8 rounded-3xl border border-white/5 bg-white/[0.03] p-12 shadow-2xl">
        <div className="flex items-center gap-4 mb-12">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Personal Details</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <InputGroup label="Display Name" value={name} onChange={setName} icon={<User className="w-4 h-4"/>} placeholder="Enter your full name" />
          <InputGroup label="Academic Email" value={email} disabled icon={<Mail className="w-4 h-4"/>} />
          <InputGroup label="Student ID" value={student_id} disabled icon={<Target className="w-4 h-4"/>} />
          <InputGroup label="Avatar Source" value={profile_picture_url} onChange={setProfilePictureUrl} icon={<Bookmark className="w-4 h-4"/>} placeholder="Paste image URL or upload" />
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Academic Biography</label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 text-white px-6 py-5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner"
              placeholder="Share your academic mission and research interests..."
            />
          </div>
        </div>
        <div className="flex justify-end pt-6 border-t border-white/5">
          <button
            onClick={save}
            disabled={saving}
            className="px-12 py-5 bg-white text-black font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Updating..." : "Persist Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Preferences({ user, onChange }) {
  const [defaultAnonymous, setDefaultAnonymous] = useState(!!user.prefs?.defaultAnonymous);
  const [darkMode, setDarkMode] = useState(!!user.prefs?.darkMode);
  const [courseFocus, setCourseFocus] = useState(user.prefs?.courseFocus || "");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 shadow-2xl">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">System</h3>
        </div>
        <div className="space-y-4 mb-10">
          <OptionToggle 
            label="Default Anonymous" 
            desc="Hide identity in forum interactions" 
            checked={defaultAnonymous} 
            onChange={(v) => { setDefaultAnonymous(v); onChange({ ...user, prefs: { ...user.prefs, defaultAnonymous: v } }); }} 
          />
          <OptionToggle 
            label="Dark Appearance" 
            desc="Sleek interface for focused study" 
            checked={darkMode} 
            onChange={(v) => { setDarkMode(v); onChange({ ...user, prefs: { ...user.prefs, darkMode: v } }); }} 
          />
        </div>
        <InputGroup 
          label="Core Course Focus" 
          value={courseFocus} 
          onChange={(v) => { setCourseFocus(v); onChange({ ...user, prefs: { ...user.prefs, courseFocus: v } }); }} 
          icon={<Settings className="w-4 h-4" />} 
          placeholder="e.g. CSE220"
        />
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
          <ShieldCheck size={180} className="text-white" />
        </div>
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Alerts</h3>
        </div>
        <div className="space-y-4 mb-10">
           <OptionToggle label="Push Notifications" desc="Real-time session updates" checked={true} disabled />
           <OptionToggle label="Email Digest" desc="Weekly academic progress" checked={false} disabled />
        </div>
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest leading-relaxed">
           Notification configuration is globally managed by administrators for this term.
        </div>
      </div>
    </div>
  );
}

export function Bookmarks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookmarks() {
      try {
        const response = await apiClient.get("profile.php?content=1");
        const json = response.data;
        if (json.ok && json.content?.bookmarks) setItems(json.content.bookmarks);
      } catch (err) {
        console.error("Failed to load bookmarks:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBookmarks();
  }, []);

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Bookmarks...</p>
    </div>
  );

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 shadow-2xl">
      <div className="flex items-center justify-between mb-10">
        <h3 className="text-2xl font-black text-white tracking-tight">My Bookmarks</h3>
        <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {items.length} Saved
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <Bookmark className="w-10 h-10 text-slate-700 mb-4" />
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">No Bookmarks Found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it) => (
            <motion.a
              key={it.id}
              href={it.url}
              target="_blank"
              whileHover={{ scale: 1.02 }}
              whileActive={{ scale: 0.98 }}
              className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
            >
              <div>
                <p className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors tracking-tight">{it.title}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{it.course} • {it.kind}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}

export function MyContent() {
  const [data, setData] = useState({ notes: [], resources: [], rooms: [], questions: [], recordings: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("profile.php?content=1");
        const json = response.data;
        if (json.ok && json.content) setData(json.content);
      } catch (err) {
        console.error("Error loading content:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading Your Content...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <ContentSection title="Academic Resources" items={data.resources} icon={<Database className="w-5 h-5" />} />
      <ContentSection title="Session Recordings" items={data.recordings} icon={<Video className="w-5 h-5" />} />
      <ContentSection title="Study Notes" items={data.notes} icon={<FileText className="w-5 h-5" />} />
      <ContentSection title="Forum Questions" items={data.questions} icon={<MessageSquare className="w-5 h-5" />} />
      <ContentSection title="Active Study Rooms" items={data.rooms} icon={<Play className="w-5 h-5" />} />
    </div>
  );
}

function ContentSection({ title, items, icon }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-8 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            {icon}
          </div>
          <h4 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">{title}</h4>
        </div>
        {title === "Academic Resources" && (
          <Link to="/my-resources" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all">
            Manage <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
      
      {(!items || items.length === 0) ? (
        <div className="py-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No Items Published</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.slice(0, 6).map((it, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -4 }}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group shadow-lg"
            >
              <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors truncate mb-3 tracking-tight">
                {it.title || it.name}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {safeDate(it.created_at || it.updated_at)}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-white transition-colors" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Security({ user, onClear }) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await apiClient.post("logout.php");
      localStorage.removeItem("studynest.jwt");
      localStorage.removeItem("studynest.refresh");
      localStorage.removeItem("studynest.auth");
      localStorage.removeItem("studynest.profile");
      localStorage.removeItem("studynest.user");
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout error:", e);
      alert("Logout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 shadow-2xl">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Security</h3>
        </div>
        <div className="space-y-4 mb-10">
          <button className="w-full flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group">
            <div className="text-left">
              <p className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">Change Password</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last updated 3 months ago</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />
          </button>
          <button className="w-full flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group">
            <div className="text-left">
              <p className="text-sm font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">Two-Factor Auth</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enhanced account protection</p>
            </div>
            <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Off</div>
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-10 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
          <LogOut size={180} className="text-white" />
        </div>
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-500">
            <LogOut className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Actions</h3>
        </div>
        <div className="space-y-4">
          <button 
            onClick={handleLogout} 
            disabled={loading}
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all group disabled:opacity-50"
          >
            <div className="text-left">
              <p className="text-sm font-bold text-inherit mb-1">{loading ? 'Processing...' : 'Logout Session'}</p>
              <p className="text-[10px] font-bold text-inherit opacity-60 uppercase tracking-widest">Sign out of StudyNest</p>
            </div>
            <LogOut className="w-5 h-5" />
          </button>
          <button 
            onClick={onClear} 
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
          >
            <div className="text-left">
              <p className="text-sm font-bold text-white mb-1 group-hover:text-slate-200 transition-colors">Clear Local Data</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reset browser preferences</p>
            </div>
            <Database className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
