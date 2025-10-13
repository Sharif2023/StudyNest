import React, { useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

/** ---------- THEME HELPERS ---------- */
const Badge = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "bg-slate-800/60 border border-slate-700 text-slate-200",
    accent: "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300",
    success: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300",
    warn: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${tones[tone]}`}>{children}</span>;
};

const Card = ({ className = "", children }) => (
  <div
    className={`bg-slate-950/60 backdrop-blur rounded-2xl border border-slate-800 shadow-[0_1px_0_0_rgba(255,255,255,0.04),0_10px_20px_-10px_rgba(0,0,0,0.6)] ${className}`}
  >
    {children}
  </div>
);

const Button = ({ variant = "primary", size = "sm", className = "", ...props }) => {
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" };
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
    soft:
      "bg-slate-900/70 border border-slate-700 hover:bg-slate-900 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
    ghost:
      "bg-transparent hover:bg-slate-800/40 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/40",
  };
  return (
    <button className={`${sizes[size]} rounded-lg ${variants[variant]} ${className}`} {...props} />
  );
};

const ProgressBar = ({ value = 0 }) => (
  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
      style={{ width: `${value}%` }}
    />
  </div>
);

// Add this function to calculate streak and points
const calculateStreakAndPoints = () => {
  const STREAK_DATA_KEY = 'studynest_streak_data';
  const today = new Date().toDateString();

  // Get or initialize streak data from localStorage
  const storedData = localStorage.getItem(STREAK_DATA_KEY);
  let streakData = storedData ? JSON.parse(storedData) : {
    lastLogin: null,
    currentStreak: 0,
    totalPoints: 0
  };

  const lastLogin = streakData.lastLogin ? new Date(streakData.lastLogin).toDateString() : null;

  // Check if user already logged in today
  if (lastLogin === today) {
    return streakData; // Return current data without updating
  }

  // Calculate days since last login
  let daysSinceLastLogin = 0;
  if (lastLogin) {
    const lastLoginDate = new Date(lastLogin);
    const todayDate = new Date(today);
    const timeDiff = todayDate.getTime() - lastLoginDate.getTime();
    daysSinceLastLogin = Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  let pointsEarned = 5; // Base points
  let newStreak = 1; // Default to 1 if no previous login

  if (lastLogin) {
    if (daysSinceLastLogin === 1) {
      // Consecutive login - continue streak
      newStreak = streakData.currentStreak + 1;

      // Calculate points based on streak length
      if (newStreak >= 20) {
        pointsEarned = 20;
      } else if (newStreak >= 7) {
        pointsEarned = 12;
      } else if (newStreak >= 3) {
        pointsEarned = 8;
      }
    } else if (daysSinceLastLogin > 1) {
      // Streak broken - reset to base points
      newStreak = 1;
      pointsEarned = 5; // Base points for broken streak
    }
  }

  // Update streak data
  const updatedData = {
    lastLogin: new Date().toISOString(),
    currentStreak: newStreak,
    totalPoints: streakData.totalPoints + pointsEarned,
    pointsEarnedToday: pointsEarned
  };

  // Save to localStorage
  localStorage.setItem(STREAK_DATA_KEY, JSON.stringify(updatedData));

  return updatedData;
};

const StudyStreakCard = () => {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    totalPoints: 0,
    pointsEarnedToday: 0
  });

  useEffect(() => {
    // Calculate streak and points on component mount
    const data = calculateStreakAndPoints();
    setStreakData(data);
  }, []);

  const getStreakMessage = () => {
    const { currentStreak, pointsEarnedToday } = streakData;

    if (currentStreak === 0) return "Start your streak!";
    if (currentStreak === 1) return "First day! Keep going!";
    if (currentStreak === 2) return "One more day for bonus!";
    if (currentStreak >= 3 && currentStreak < 7) return "3-day streak! +8 pts";
    if (currentStreak >= 7 && currentStreak < 20) return "7-day streak! +12 pts";
    if (currentStreak >= 20) return "20-day streak! +20 pts";
    return "Keep it going!";
  };

  const calculateProgress = () => {
    const { currentStreak } = streakData;

    // Progress towards next milestone
    if (currentStreak < 3) return (currentStreak / 3) * 100;
    if (currentStreak < 7) return ((currentStreak - 2) / 5) * 100; // 3 to 7 days
    if (currentStreak < 20) return ((currentStreak - 6) / 13) * 100; // 7 to 20 days
    return 100; // Max milestone reached
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">
        Study Streak
      </h3>
      <div className="flex items-center gap-3">
        <div className="text-3xl">🔥</div>
        <div>
          <div className="text-2xl font-semibold">{streakData.currentStreak} days</div>
          <div className="text-xs text-slate-400">
            {getStreakMessage()} • +{streakData.pointsEarnedToday} pts today
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar value={calculateProgress()} />
      </div>
      <div className="mt-2 text-xs text-slate-400">
        Total Points: {streakData.totalPoints}
      </div>

      {/* Milestone indicators */}
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span className={streakData.currentStreak >= 3 ? "text-amber-300" : ""}>3d</span>
        <span className={streakData.currentStreak >= 7 ? "text-amber-300" : ""}>7d</span>
        <span className={streakData.currentStreak >= 20 ? "text-amber-300" : ""}>20d</span>
      </div>
    </Card>
  );
};

const formatTime = (t) =>
  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const getDayAndDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if it's today
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  // Check if it's tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  // Check if it's within the next 6 days
  const diffTime = date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays >= 2 && diffDays <= 6) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // For dates further in the future, show the date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function CourseCard({ c, joinTo }) {
  const isLive = c.status === "live";
  const progress = isLive
    ? Math.min(100, Math.floor(((Date.now() - (c.startedAt || Date.now())) / (60 * 60 * 1000)) * 100))
    : 0;
  const timeLeftMs = c.startAt ? Math.max(0, c.startAt - Date.now()) : 0;
  const minutesLeft = Math.ceil(timeLeftMs / 60000);

  // normalize expected fields
  const title = c.title;
  const code = c.code;
  const instructor = c.instructor; // mock items have this; API meetings won’t
  const thumb = c.thumbnail || null;

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {thumb ? (
          <img src={thumb} alt="" className="h-24 w-32 object-cover" />
        ) : (
          <div className="h-24 w-32 grid place-items-center bg-slate-900 text-slate-500">
            No image
          </div>
        )}
        <div className="p-3 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold leading-tight text-slate-100">{title}</div>
              <div className="text-xs text-slate-400">
                {code}
                {instructor ? <> • {instructor}</> : null}
              </div>
            </div>
            <div>
              {isLive ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-300 text-xs inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> LIVE
                </span>
              ) : c.startAt ? (
                <Badge tone="warn">Starts {formatTime(c.startAt)}</Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {(c.tags || []).slice(0, 3).map((t) => (
              <Badge key={t} tone="accent">{t}</Badge>
            ))}
            {isLive && typeof c.viewers === "number" && (
              <span className="text-xs text-slate-400">👀 {c.viewers} watching</span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            {isLive ? (
              <ProgressBar value={progress} />
            ) : (
              c.startAt && <div className="text-xs text-slate-400">~{minutesLeft} min</div>
            )}
            {joinTo ? (
              <Link to={joinTo} className="ml-3">
                <Button size="md">{isLive ? "Join" : "Remind me"}</Button>
              </Link>
            ) : (
              <Button className="ml-3" size="md">
                {isLive ? "Join" : "Remind me"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Pomodoro() {
  const [sec, setSec] = useState(25 * 60);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [run]);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-300 uppercase">Pomodoro Timer</h3>
        <div className="text-xs text-slate-400">Focus • Short • Long</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full grid place-content-center border-4 border-white/10 shadow-inner">
          <div className="text-xl font-mono text-slate-100">
            {mm}:{ss}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button onClick={() => setRun((r) => !r)} size="md">
              {run ? "Pause" : "Start"}
            </Button>
            <Button
              onClick={() => {
                setRun(false);
                setSec(25 * 60);
              }}
              variant="soft"
              size="md"
            >
              Reset
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setSec(25 * 60)} variant="ghost">
              Focus 25
            </Button>
            <Button onClick={() => setSec(5 * 60)} variant="ghost">
              Short 5
            </Button>
            <Button onClick={() => setSec(15 * 60)} variant="ghost">
              Long 15
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function mapMeetingToCard(m) {
  return {
    id: m.id,
    // prefer course_title (from courses table) → fallback to meeting title
    title: m.course_title || m.title,
    // show course code on the subtitle row
    code: m.course || "—",
    // image on the left (if your API returns this key)
    thumbnail: m.course_thumbnail || m.thumbnail || null,
    // "live" | "scheduled"
    status: m.status,
    // number on the right line ("👀 X watching")
    viewers: typeof m.participants === "number" ? m.participants : 0,
    // for the progress bar when live
    startedAt: m.status === "live"
      ? Date.parse(m.starts_at || m.created_at || Date.now())
      : undefined,
    startAt: m.status === "scheduled" && m.starts_at
      ? Date.parse(m.starts_at)
      : undefined,
  };
}
function StudyRoom({ anonymous, activeRoom }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const [liveRooms, setLiveRooms] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("activeRoom");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.status === "live") {
          setLiveRooms([parsed]);
          return;
        }
      } catch { }
    }

    // fallback to API fetch if no active room found
    (async () => {
      try {
        const r = await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php", { credentials: "include" });
        const j = await r.json();
        if (j.ok) setLiveRooms((j.rooms || []).filter(r => r.status === "live"));
      } catch (e) { }
    })();
  }, []);
  useEffect(() => {
    function handleClear() {
      setActiveRoom(null);
    }
    window.addEventListener("activeRoomCleared", handleClear);
    return () => window.removeEventListener("activeRoomCleared", handleClear);
  }, []);


  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          loop
          autoPlay
          playsInline
          muted
        >
          <source
            src={activeRoom?.stream_url || "https://cdn.coverr.co/videos/coverr-students-studying-1782/1080p.mp4"}
            type="video/mp4"
          />
        </video>
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-rose-600/15 border border-rose-600/40 text-rose-300 text-xs inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> LIVE ROOM
          </span>
          <Badge tone="neutral">{anonymous ? "Anonymous" : "You"}</Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="soft" size="md" onClick={() => setMuted(m => !m)}>
              {muted ? "🔇" : "🔊"}
            </Button>
            <Button variant="soft" size="md">🎥</Button>
            <Button variant="soft" size="md">🖥️</Button>
            <Button variant="soft" size="md">✋</Button>
          </div>

          <div className="flex items-center gap-2">
            {activeRoom ? (
              <>
                <Link to={`/rooms/${activeRoom.id}`}>
                  <Button size="md">Expand</Button>
                </Link>
                <Button
                  variant="soft"
                  size="md"
                  onClick={async () => {
                    try {
                      if (activeRoom?.id) {
                        await fetch(
                          "http://localhost/StudyNest/study-nest/src/api/meetings.php/leave",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ id: activeRoom.id }),
                          }
                        );
                      }
                    } catch (e) {
                      console.warn("Mini TV leave failed", e);
                    } finally {
                      localStorage.removeItem("activeRoom");
                      // Signal Home() to clear immediately
                      window.dispatchEvent(new Event("activeRoomCleared"));
                    }
                  }}
                >
                  Leave
                </Button>
              </>
            ) : liveRooms[0] ? (
              <Link to={`/rooms/${liveRooms[0].id}`}>
                <Button size="md">Join</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border-t border-slate-800 bg-slate-950/50">
        <input
          className="md:col-span-2 bg-slate-900/70 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          placeholder="Chat (press Enter to send) — be respectful"
        />
        <div className="flex items-center gap-2">
          <Button className="flex-1" size="md">
            Share Resource
          </Button>
          <Button variant="soft" aria-label="Lock room">
            🔒
          </Button>
        </div>
      </div>
    </Card>
  );
}

// global, lightweight, transparent scrollbar styles for the sidebar
const ScrollStyles = () => (
  <style>{`
    .custom-scroll { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.25) transparent; }
    .custom-scroll::-webkit-scrollbar { width: 8px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,.25); border-radius: 8px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  `}</style>
);

export default function Home() {
  const [anonymous, setAnonymous] = useState(false);
  const [navOpen, setNavOpen] = useState(false); // collapsed by default
  const SIDEBAR_W = navOpen ? 240 : 72;
  const [isChatbotOpen, setIsChatbotOpen] = useState(false); // Track if chatbot is open
  const [messages, setMessages] = useState([]); // Store chat messages
  const [inputMessage, setInputMessage] = useState(''); // Store input message
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("activeRoom")) || null;
    } catch {
      return null;
    }
  });

  // Add these state variables
  const [qaList, setQaList] = useState([]);
  const [resourceCategories, setResourceCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [todoItems, setTodoItems] = useState([]);

  // Fetch Todo data (use the correct API URL for fetching real todo data)
  // Fetch Todo data
  useEffect(() => {
    const fetchTodoData = async () => {
      try {
        // Get user profile to get user_id
        const profileStr = localStorage.getItem("studynest.profile");
        const profile = profileStr ? JSON.parse(profileStr) : {};
        const userId = profile?.id;

        if (!userId) {
          console.log("No user ID found, skipping todo fetch");
          return;
        }

        const response = await fetch(`http://localhost/StudyNest/study-nest/src/api/todo.php?user_id=${userId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.todos) {
            // Filter to only show pending tasks in the home preview
            const pendingTodos = data.todos
              .filter(todo => todo.status === 'pending')
              .sort((a, b) => new Date(a.due_date || '9999-12-31') - new Date(b.due_date || '9999-12-31'));

            setTodoItems(pendingTodos);
          } else {
            console.error('Error in todo response:', data.error);
          }
        } else {
          console.error('Error fetching todo data:', response.status);
        }
      } catch (error) {
        console.error('Error fetching todo data:', error);
      }
    };

    fetchTodoData();
  }, []);

  // Add these useEffect hooks for data fetching
  useEffect(() => {
    fetchQAData();
    fetchResourceData();
  }, []);

  const fetchQAData = async () => {
    try {
      const response = await fetch('http://localhost/StudyNest/study-nest/src/api/QnAForum.php', {
        credentials: 'include'
      });

      if (response.ok) {
        const questions = await response.json();
        // Transform the data to match your existing format
        const formattedQuestions = questions.slice(0, 3).map(q => ({
          id: q.id,
          question: q.title,
          course: q.tags?.[0] || 'General',
          votes: q.votes,
          answers: q.answers?.length || 0,
          tag: q.tags?.[0] || 'General'
        }));
        setQaList(formattedQuestions);
      } else {
        // Fallback to mock data if API fails
        setQaList([
          {
            id: 11,
            course: "CSE 220",
            question: "Proof that activity selection is greedy-optimal?",
            votes: 12,
            answers: 3,
            tag: "Greedy",
          },
          {
            id: 12,
            course: "EEE 205",
            question: "Why does convolution flip one signal?",
            votes: 9,
            answers: 2,
            tag: "Signals",
          },
          {
            id: 13,
            course: "CSE 310",
            question: "Clustered vs Non-clustered index trade-offs",
            votes: 15,
            answers: 6,
            tag: "DBMS",
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching Q&A data:', error);
      // Fallback to mock data
      setQaList([
        {
          id: 11,
          course: "CSE 220",
          question: "Proof that activity selection is greedy-optimal?",
          votes: 12,
          answers: 3,
          tag: "Greedy",
        },
        {
          id: 12,
          course: "EEE 205",
          question: "Why does convolution flip one signal?",
          votes: 9,
          answers: 2,
          tag: "Signals",
        },
        {
          id: 13,
          course: "CSE 310",
          question: "Clustered vs Non-clustered index trade-offs",
          votes: 15,
          answers: 6,
          tag: "DBMS",
        },
      ]);
    }
  };

  const fetchResourceData = async () => {
    try {
      const response = await fetch('http://localhost/StudyNest/study-nest/src/api/ResourceLibrary.php', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // Group resources by course and count files/notes
          const categories = {};

          data.resources.forEach(resource => {
            const course = resource.course || 'Other';
            if (!categories[course]) {
              categories[course] = {
                name: course,
                fileCount: 0,
                noteCount: 0,
              };
            }

            if (resource.kind === 'note' || resource.src_type === 'file') {
              categories[course].noteCount++;
            } else {
              categories[course].fileCount++;
            }
          });

          // Convert to array and take first 4
          const categoryArray = Object.values(categories).slice(0, 4);
          setResourceCategories(categoryArray);
        } else {
          setFallbackResourceData();
        }
      } else {
        setFallbackResourceData();
      }
    } catch (error) {
      console.error('Error fetching resource data:', error);
      setFallbackResourceData();
    }
  };

  const setFallbackResourceData = () => {
    // Fallback to demo data
    setResourceCategories([
      { name: "Algebra", fileCount: 8, noteCount: 4, progress: 65 },
      { name: "Calculus", fileCount: 12, noteCount: 6, progress: 80 },
      { name: "DBMS", fileCount: 15, noteCount: 8, progress: 45 },
      { name: "AI", fileCount: 10, noteCount: 5, progress: 30 },
    ]);
  };

  useEffect(() => {
    const stored = localStorage.getItem("activeRoom");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.status === "live") {
          setActiveRoom(parsed);
        }
      } catch (err) {
        console.warn("Invalid activeRoom in localStorage", err);
      }
    }
  }, []);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomParam = params.get("room");

    if (roomParam) {
      // fetch details or use localStorage to fill in active room info
      const stored = localStorage.getItem("activeRoom");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.id === roomParam) setActiveRoom(parsed);
        } catch { }
      } else {
        // fallback: fetch from API if needed
        fetch(`http://localhost/StudyNest/study-nest/src/api/meetings.php?id=${roomParam}`)
          .then(r => r.json())
          .then(j => j.ok && setActiveRoom(j.room));
      }
    }
  }, [location.search]);

  // Toggle chatbot visibility
  const toggleChatbot = () => {
    setIsChatbotOpen((prev) => !prev);
  };

  const sendMessage = async () => {
    if (inputMessage.trim()) {
      // Add user message to chat history
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'user', message: inputMessage },
      ]);

      // Send message to the backend (chatbot.php)
      try {
        const response = await fetch('http://localhost/StudyNest/study-nest/src/api/chatbot.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputMessage }),
        });

        const data = await response.json();

        if (data.response) {
          // Add bot response to chat history
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: 'bot', message: data.response },
          ]);
        } else {
          console.error("No response from the bot:", data);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }

      // Clear the input field
      setInputMessage('');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // use the same absolute URL you use elsewhere in the app
        const r = await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php", {
          credentials: "include",
        });
        const j = await r.json();
        if (j.ok) setRooms(j.rooms || []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("activeRoom");
    if (stored) {
      try {
        setActiveRoom(JSON.parse(stored));
      } catch { }
    }
  }, []);
  useEffect(() => {
    function handleRoomCleared() {
      setActiveRoom(null); // Reset active room state
    }
    window.addEventListener("activeRoomCleared", handleRoomCleared);
    return () => window.removeEventListener("activeRoomCleared", handleRoomCleared);
  }, []);


  useEffect(() => {
    const t = setInterval(() => {
      if (activeRoom?.id) {
        fetch(`http://localhost/StudyNest/study-nest/src/api/meetings.php?id=${activeRoom.id}`)
          .then(r => r.json())
          .then(j => {
            if (!j.ok || j.room.status !== "live") {
              localStorage.removeItem("activeRoom");
              setActiveRoom(null);
            }
          });
      }
    }, 10000);
    return () => clearInterval(t);
  }, [activeRoom]);

  const featured = useMemo(() => {
    return (rooms || [])
      .filter(r => r.status === "live")
      .map(mapMeetingToCard)
      .slice(0, 2);
  }, [rooms]);


  const upcoming = useMemo(() => {
    return (rooms || [])
      .filter(r => r.status === "scheduled")
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .map(mapMeetingToCard);
  }, [rooms]);

  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch('http://localhost/StudyNest/study-nest/src/api/getLeaderboard.php', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.leaderboard) {
            setLeaderboard(data.leaderboard); // Assuming the API returns a list of leaderboard users
          }
        } else {
          console.error('Error fetching leaderboard data');
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };

    fetchLeaderboard();
  }, []);

  useEffect(() => {
    function onEmbedMessage(e) {
      if (!e?.data) return;
      if (e.data.type === "studynest:mini-leave") {
        localStorage.removeItem("activeRoom");
        setActiveRoom(null);
      }
    }
    window.addEventListener("message", onEmbedMessage);
    return () => window.removeEventListener("message", onEmbedMessage);
  }, []);

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(14,165,233,0.14),transparent),radial-gradient(800px_400px_at_80%_-20%,rgba(59,130,246,0.12),transparent)]">
      <ScrollStyles />

      {/* Left Sidebar */}
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={SIDEBAR_W}
      />

      {/* Header */}
      <Header sidebarWidth={SIDEBAR_W} />

      {/* Main */}
      <main style={{ paddingLeft: SIDEBAR_W }} className="transition-[padding] duration-300">
        <div className="mx-auto max-w-[1600px] p-4 lg:p-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left column */}
            <div className="order-2 xl:order-1 xl:col-span-5 space-y-6">
              <Card className="p-3 border-cyan-500/20">
                <div className="text-cyan-300 text-sm font-medium">💡 Daily Tip</div>
                <p className="text-sm mt-1 text-slate-300">
                  After live sessions, add a 10-minute recall quiz and schedule a 2-day review.
                </p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">Live Now</h3>
                  <Link to="/rooms">
                    <Button variant="soft" size="sm">
                      See all
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {featured.map((m) => {
                    const cardData = mapMeetingToCard(m);
                    return <CourseCard key={m.id} c={cardData} joinTo={`/rooms/${m.id}`} />;
                  })}
                  {featured.length === 0 && (
                    <div className="text-sm text-slate-400">No sessions yet.</div>
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">
                  Upcoming Sessions
                </h3>
                <div className="space-y-3">
                  {upcoming.map((c) => (
                    <CourseCard key={c.id} c={c} joinTo={`/rooms/${c.id}`} />
                  ))}
                  {upcoming.length === 0 && (
                    <div className="text-sm text-slate-400">No upcoming sessions.</div>
                  )}
                </div>
              </Card>

              {/* Questions and forum part */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">Q&A Forum</h3>
                  <Link to="/forum">
                    <Button variant="soft" size="sm">
                      Ask here
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {qaList.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/forum`}
                    >
                      <div className="text-sm font-medium text-slate-100">{q.question}</div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                        <Badge tone="neutral">{q.course}</Badge>
                        <span>👍 {q.votes}</span>
                        <span>{q.answers} answers</span>
                        <Badge tone="accent">{q.tag}</Badge>
                      </div>
                    </div>
                  ))}
                  {qaList.length === 0 && (
                    <div className="text-sm text-slate-400 text-center py-4">
                      No questions yet. Be the first to ask!
                    </div>
                  )}
                </div>
              </Card>

              {/* Resource part */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">
                    Resource Library
                  </h3>
                  <Link to="/resources/upload">
                    <Button variant="soft" size="sm">
                      Upload your Resources
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {resourceCategories.map((category) => (
                    <div
                      key={category.name}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/resources?category=${category.name}`}
                    >
                      <div className="text-sm font-medium text-slate-100">{category.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {category.fileCount} files • {category.noteCount} notes
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Adjusted grid container for shortcuts */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase">Shortcuts</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  <Link to="/forum" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Ask a question
                  </Link>
                  <Link to="/rooms" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Join room
                  </Link>
                  <Link to="/notes" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Add notes
                  </Link>
                  <Link to="/resources" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Resources
                  </Link>
                  <Link to="/calendar" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Calendar
                  </Link>
                  <Link to="/profile" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Profile
                  </Link>
                  <Link to="/ai-check" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    AI File Check
                  </Link>
                  <Link to="/ai-usage" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    AI Usage Checker
                  </Link>
                  <Link to="/humanize" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Humanize Writing
                  </Link>
                  <Link to="/search" className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-100 text-sm text-center font-medium hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                    Search
                  </Link>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase mb-3">
                  Smart Recommendations
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between text-sm">
                    <div>Revise DP fundamentals</div> <Badge tone="success">Weak Area</Badge>
                  </li>
                  <li className="flex items-center justify-between text-sm">
                    <div>Practice convolution problems</div> <Badge tone="accent">Quiz</Badge>
                  </li>
                  <li className="flex items-center justify-between text-sm">
                    <div>Flashcards: B+ Trees</div> <Badge tone="warn">Upcoming</Badge>
                  </li>
                </ul>
              </Card>
            </div>

            {/* Right column */}
            <div className="order-1 xl:order-2 xl:col-span-7 space-y-6">
              <div>
                {activeRoom ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                    <iframe
                      src={`/rooms/${activeRoom.id}?embed=1`}
                      title="Live Study Room (Mini)"
                      className="absolute inset-0 w-full h-full rounded-2xl"
                      allow="camera; microphone; display-capture"
                    />

                    {/* Overlay controls */}
                    <div className="absolute top-3 right-3 z-10 pointer-events-none">
                      <div className="flex gap-2 pointer-events-auto">
                        <Link to={`/rooms/${activeRoom.id}`}>
                          <Button size="sm" className="!px-3 !py-1.5">Expand</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="soft"
                          className="!px-3 !py-1.5"
                          onClick={async () => {
                            try {
                              await fetch(
                                "http://localhost/StudyNest/study-nest/src/api/meetings.php/leave",
                                {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  credentials: "include",
                                  body: JSON.stringify({ id: activeRoom.id }),
                                }
                              );
                            } catch (e) {
                              console.warn("Mini leave failed", e);
                            } finally {
                              localStorage.removeItem("activeRoom");
                              setActiveRoom(null);
                              // also tell the iframe (if it’s still alive)
                              window.postMessage({ type: "studynest:mini-leave" }, "*");
                            }
                          }}
                        >
                          Leave
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <StudyRoom anonymous={anonymous} activeRoom={null} />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Pomodoro />

                <StudyStreakCard />

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase">To-Do List</h3>
                    <Link to="/to-do-list">
                      <Button variant="soft" size="sm">Open</Button>
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {todoItems.slice(0, 3).map((item) => (
                      <li key={item.id} className="flex items-center justify-between text-sm">
                        <div className={`truncate max-w-[60%] ${item.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          {item.title}
                        </div>
                        <span className="text-xs text-slate-400">
                          {item.due_date ? getDayAndDate(item.due_date) : 'No date'}
                        </span>
                      </li>
                    ))}
                    {todoItems.length === 0 && (
                      <div className="text-sm text-slate-400 text-center py-4">
                        No upcoming tasks.
                      </div>
                    )}
                    {todoItems.length > 3 && (
                      <div className="text-xs text-slate-400 text-center pt-2">
                        +{todoItems.length - 3} more tasks
                      </div>
                    )}
                  </ul>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase">Leaderboard</h3>
                    <Link to="/leaderboard" className="text-xs text-slate-300 hover:text-white">
                      View all
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.map((u, i) => (
                      <div key={u.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-800 grid place-content-center text-xs">
                            {i + 1}
                          </div>
                          <div className="text-sm">{u.name}</div>
                        </div>
                        <div className="text-xs text-slate-400">
                          {u.points} pts • 🔥{u.streak}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Chatbot Floating Button */}
      <div
        onClick={toggleChatbot}
        role="button"
        aria-label="Open chatbot"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          zIndex: 9999,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          overflow: 'hidden',           // ensures the GIF is clipped to a circle
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          backgroundColor: '#ffffff',   // white bezel so the GIF pops
          border: '2px solid #007bff',  // subtle brand ring
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/cb/WhatsApp-BOT-Image-2_2.gif"
          alt="Chatbot"
          loading="lazy"
          style={{
            width: '185%',
            height: '185%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {/* Chatbot Modal */}
      {isChatbotOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            zIndex: 9999,
            width: '350px',
            maxWidth: '90%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#333' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/cb/WhatsApp-BOT-Image-2_2.gif"
                alt="Bot"
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#007bff' }}>Ask me Buddy!</span>
            </div>
            <button
              onClick={toggleChatbot}
              aria-label="Close chatbot"
              style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer', transition: 'color .2s' }}
              onMouseEnter={(e) => (e.target.style.color = '#ff6347')}
              onMouseLeave={(e) => (e.target.style.color = '#888')}
            >
              &times;
            </button>
          </div>

          <div
            style={{
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: '16px',
              paddingRight: '8px',
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  textAlign: msg.sender === 'user' ? 'right' : 'left',
                  padding: '10px 14px',
                  marginBottom: '10px',
                  backgroundColor: msg.sender === 'user' ? '#007bff' : '#f1f1f1',
                  color: msg.sender === 'user' ? '#ffffff' : '#333',
                  borderRadius: '18px',
                  maxWidth: '70%',
                  marginLeft: msg.sender === 'user' ? 'auto' : '0',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  fontSize: '16px',
                }}
              >
                {msg.message}
              </div>
            ))}
          </div>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #ddd',
              fontSize: '16px',
              color: '#333',
              transition: 'border 0.3s ease, box-shadow 0.3s ease',
            }}
            onFocus={(e) => (e.target.style.boxShadow = '0 0 8px rgba(0, 123, 255, 0.6)')}
            onBlur={(e) => (e.target.style.boxShadow = 'none')}
          />
        </div>
      )}

      {/* Add CSS Animations */}
      <style>
        {`
    @keyframes fadeIn {
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `}
      </style>

      {/* Footer */}
      <Footer sidebarWidth={SIDEBAR_W} />
    </div>
  );
}
