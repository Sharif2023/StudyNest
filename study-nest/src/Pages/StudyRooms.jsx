import React, { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useWebRTC } from "../realtime/useWebRTC";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "doyi7vchh";
const CLOUDINARY_UPLOAD_PRESET = "studynest_recordings";

const MINIMIZE_KEY = "studynest.minimizeRoom";

/* ====================== Recording Hook ====================== */
/* ====================== Recording Hook ====================== */
function useRecording(roomId, displayName, room, state) {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      // Try to get the local camera stream first
      let videoStream;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1280,
            height: 720,
            frameRate: 30
          },
          audio: false
        });
      } catch (videoError) {
        console.warn("Could not access camera for recording:", videoError);
        // If camera fails, try screen share
        try {
          videoStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          });
        } catch (screenError) {
          console.warn("Could not access screen for recording:", screenError);
          // If both fail, create a blank video stream as fallback
          videoStream = createFallbackVideoStream(roomId);
        }
      }

      // Get audio from microphone with better error handling
      let audioStream;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          }
        });
      } catch (audioError) {
        console.warn("Could not access microphone:", audioError);
        // Create silent audio track as fallback
        audioStream = await createFallbackAudioStream();
      }

      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      streamRef.current = combinedStream;
      recordedChunksRef.current = [];

      // Try different mime types for compatibility
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      };

      // Fallback mime types
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = '';
      }

      mediaRecorderRef.current = new MediaRecorder(combinedStream, options);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: mediaRecorderRef.current.mimeType || 'video/webm'
        });
        setRecordedBlob(blob);
        setShowSaveOptions(true);

        // Clean up streams
        videoStream.getTracks().forEach(track => track.stop());
        audioStream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setRecording(true);
      return true;
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Recording failed: " + error.message);
      return false;
    }
  };

  // Add helper functions for fallback streams
  const createFallbackVideoStream = (roomId) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');

    const drawFrame = () => {
      context.fillStyle = '#1f2937';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.font = '48px Arial';
      context.textAlign = 'center';
      context.fillText('Recording Session', canvas.width / 2, canvas.height / 2);
      context.fillText(roomId, canvas.width / 2, canvas.height / 2 + 60);
      context.fillText(new Date().toLocaleTimeString(), canvas.width / 2, canvas.height / 2 + 120);
    };

    drawFrame();
    const stream = canvas.captureStream(30);

    // Redraw every second to update time
    setInterval(drawFrame, 1000);

    return stream;
  };

  const createFallbackAudioStream = async () => {
    // Create a silent audio track
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const destination = audioContext.createMediaStreamDestination();

    oscillator.frequency.value = 0; // Silent
    oscillator.connect(destination);
    oscillator.start();

    return destination.stream;
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const saveToDevice = () => {
    if (recordedBlob) {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `studynest-${roomId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      resetRecording();
    }
  };

  const uploadToCloudinary = async () => {
    if (!recordedBlob) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', recordedBlob);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
      formData.append('folder', 'studynest-recordings');
      formData.append('context', `room=${roomId}|user=${displayName}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        // Save recording info to your backend
        await saveRecordingMetadata(data.secure_url, roomId, displayName);
        alert('Recording saved to StudyNest Cloud successfully!');
        window.dispatchEvent(new CustomEvent('studynest:recording-added'));
      } else {
        throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      alert('Failed to upload recording. Please try again.');
    } finally {
      setUploading(false);
      resetRecording();
    }
  };

  const saveRecordingMetadata = async (videoUrl, roomId, userName) => {
    try {
      // Get room title from available sources - now room and state are available
      const roomTitle = room?.title || state?.title || `Room ${roomId}`;

      const response = await fetch('http://localhost/StudyNest/study-nest/src/api/recordings.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          room_id: roomId,
          video_url: videoUrl,
          user_name: userName,
          duration: Math.floor(recordedChunksRef.current.length),
          recorded_at: new Date().toISOString(),
          title: `Recording of ${roomTitle}`,
          description: `Study session recording from room: ${roomTitle}`,
          course: room?.course || "General",
          semester: "Current",
          kind: "recording",
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save recording metadata');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving recording metadata:', error);
      throw error;
    }
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setShowSaveOptions(false);
    recordedChunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const cancelSave = () => {
    resetRecording();
  };

  return {
    recording,
    recordedBlob,
    showSaveOptions,
    uploading,
    startRecording,
    stopRecording,
    saveToDevice,
    uploadToCloudinary,
    cancelSave,
  };
}

/* ====================== Save Recording Modal ====================== */
function SaveRecordingModal({
  isOpen,
  onSaveToDevice,
  onSaveToCloud,
  onCancel,
  uploading
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-auto border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-2">
          Save Recording
        </h3>
        <p className="text-zinc-400 text-sm mb-6">
          Choose where to save your recording
        </p>

        <div className="space-y-3">
          <button
            onClick={onSaveToDevice}
            disabled={uploading}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors text-white disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold">Save to Device</div>
                <div className="text-xs text-zinc-400">Download the video file</div>
              </div>
            </div>
          </button>

          <button
            onClick={onSaveToCloud}
            disabled={uploading}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-700 bg-emerald-900/20 hover:bg-emerald-900/40 transition-colors text-white disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold">Save to StudyNest Cloud</div>
                <div className="text-xs text-emerald-300">Upload to your resources</div>
              </div>
            </div>
            {uploading && (
              <div className="w-5 h-5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="flex-1 py-2 px-4 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== Lobby ====================== */
export function RoomsLobby() {
  const [rooms, setRooms] = useState([]);
  const [title, setTitle] = useState("");

  const [navOpen, setNavOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const COLLAPSED_W = 72;
  const EXPANDED_W = 248;
  const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
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

  async function create() {
    const finalTitle = title.trim() || "Quick Study Room";
    try {
      const res = await fetch("http://localhost/StudyNest/study-nest/src/api/meetings.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: finalTitle, course: "CSE220" }),
      });
      const j = await res.json();
      if (j.ok && j.id) {
        setTitle("");
        navigate(`/rooms/${j.id}`, { state: { title: finalTitle } });
      }
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-cyan-100 to-slate-100 transition-all duration-300 ease-in-out shadow-lg rounded-xl"
      style={{ paddingLeft: sidebarWidth, transition: "padding-left 300ms ease" }}
    >
      <LeftNav
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        anonymous={anonymous}
        setAnonymous={setAnonymous}
        sidebarWidth={sidebarWidth}
      />

      {/* Header */}
      <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

      {/* Create */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Create a room: e.g., CSE220 Quiz Review"
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => navigate("/rooms/newform")}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Start room
          </button>
        </div>
      </section>

      {/* List */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {rooms.length === 0 ? (
          <EmptyRooms />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <li key={r.id}>
                <RoomCard room={r} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Footer />
    </main>
  );
}

function RoomCard({ room }) {
  const title = room.course_title || room.title;
  return (
    <article className="flex flex-col h-full rounded-2xl bg-white shadow-md ring-1 ring-zinc-200/50 p-4">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-100 grid place-items-center">
        {room.course_thumbnail ? (
          <img src={room.course_thumbnail} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
            <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.94-.94 2.56-.27 2.56 1.06v11.38c0 1.33-1.62 2-2.56 1.06z" />
          </svg>
        )}
      </div>

      <h3 className="mt-3 truncate text-lg font-semibold text-zinc-900" title={title}>
        {title}
      </h3>
      <p className="mt-1 text-sm text-zinc-500">
        Topic will be discussed: <span className="font-medium text-zinc-700">{room.title}</span>
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {room.course || "—"} • {timeAgo(room.created_at)}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
        <span className="rounded-full bg-zinc-100/70 px-2 py-0.5 text-zinc-500 font-medium">{room.participants} online</span>
        <Link to={`/rooms/${room.id}`} className="rounded-xl border border-zinc-200 px-3 py-1 font-semibold text-zinc-600 hover:bg-zinc-50">
          Join
        </Link>
      </div>
    </article>
  );
}

function EmptyRooms() {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white/60 py-16">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CamIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No active rooms</h3>
        <p className="mt-1 text-sm text-zinc-600">Create one above to start studying together.</p>
      </div>
    </div>
  );
}

function RoomVideoWall({ streams, participants, mic, toggleFullTile }) {
  // Separate screens & cams; create placeholders for those with no video
  const { screens, cams, placeholders } = useMemo(() => {
    const s = [];
    const c = [];
    const withVideo = new Set();

    for (const item of streams) {
      if (item.type === "screen") {
        s.push(item);
        withVideo.add(item.id.split("::")[0]);
      } else if (item.type === "cam") {
        c.push(item);
        withVideo.add(item.id.split("::")[0]);
      }
    }

    // participant cards for those connected but not sending any video
    const ph = participants
      .filter(p => !withVideo.has(p.id))
      .map(p => ({
        id: p.id + "::placeholder",
        name: p.self ? "You" : (p.name || "Student"),
        self: !!p.self,
        state: p.state,
        hand: !!p.hand,
        type: "placeholder",
      }));

    // Stable order (self first for screens, then by name)
    s.sort((a, b) => (a.self === b.self ? (a.name || "").localeCompare(b.name || "") : a.self ? -1 : 1));
    c.sort((a, b) => (a.self === b.self ? (a.name || "").localeCompare(b.name || "") : a.self ? -1 : 1));

    return { screens: s, cams: c, placeholders: ph };
  }, [streams, participants]);

  const hasScreens = screens.length > 0;

  return (
    <div className="space-y-6">
      {hasScreens && (
        <ScreenWall screens={screens} toggleFullTile={toggleFullTile} />
      )}

      <PeopleWall
        cams={cams}
        placeholders={placeholders}
        mic={mic}
        toggleFullTile={toggleFullTile}
      />

      {!hasScreens && cams.length === 0 && placeholders.length === 0 && (
        <div className="aspect-video rounded-2xl bg-zinc-900/80 grid place-items-center text-zinc-500">
          Waiting for participants…
        </div>
      )}
    </div>
  );
}

function ScreenWall({ screens, toggleFullTile }) {
  // Responsive columns: 1 → 2 → 3 screens
  const colClass =
    screens.length === 1 ? "grid-cols-1" :
      screens.length === 2 ? "grid-cols-1 md:grid-cols-2" :
        "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={`grid ${colClass} gap-4 sm:gap-6`}>
      {screens.map((s) => (
        <div
          key={s.id}
          id={`tile-${s.id}`}
          className="relative overflow-hidden rounded-2xl bg-black ring-1 ring-zinc-700 shadow-lg aspect-video"
        >
          {s.stream ? (
            <video
              id={`video-${s.id}`}
              autoPlay
              playsInline
              muted={s.self}
              className="h-full w-full object-contain bg-black"
              ref={(el) => {
                if (el && el.srcObject !== s.stream) {
                  el.srcObject = s.stream;
                  const p = el.play(); if (p?.catch) p.catch(() => { });
                }
              }}
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-zinc-400 bg-zinc-900/60">Connecting…</div>
          )}

          <TileFooter
            title={s.self ? "You (screen)" : (s.name || "Student")}
            onFullscreen={() => toggleFullTile(`tile-${s.id}`)}
          />
        </div>
      ))}
    </div>
  );
}

function PeopleWall({ cams, placeholders, mic, toggleFullTile }) {
  const tiles = [...cams, ...placeholders];

  if (tiles.length === 0) return null;

  return (
    <div
      className="grid gap-4 sm:gap-6"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))` }}
    >
      {tiles.map((t) => {
        const isPlaceholder = t.type === "placeholder";
        return (
          <div
            key={t.id}
            id={`tile-${t.id}`}
            className="relative overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-700 shadow-lg aspect-video"
          >
            {isPlaceholder ? (
              <div className="h-full w-full grid place-items-center text-zinc-300 bg-zinc-800/60">
                <div className="text-center">
                  <UserIcon className="h-12 w-12 mx-auto" />
                  <div className="mt-2 text-xs font-medium text-zinc-300">
                    {t.name} {t.state !== 'connected' && <span className="text-amber-400">(joining…)</span>}
                  </div>
                </div>
              </div>
            ) : (
              <video
                id={`video-${t.id}`}
                autoPlay
                playsInline
                muted={t.self}
                className="h-full w-full object-cover"
                ref={(el) => {
                  if (el && el.srcObject !== t.stream) {
                    el.srcObject = t.stream;
                    const p = el.play(); if (p?.catch) p.catch(() => { });
                  }
                }}
              />
            )}

            <TileFooter
              title={
                t.self ? (t.type === "screen" ? "You (screen)" : "You")
                  : (t.name || "Student")
              }
              mutedBadge={t.self && t.type !== "screen" ? !mic : false}
              handUp={t.hand}
              onFullscreen={() => toggleFullTile(`tile-${t.id}`)}
            />
          </div>
        );
      })}
    </div>
  );
}

function TileFooter({ title, mutedBadge = false, handUp = false, onFullscreen }) {
  return (
    <div className="absolute left-2 bottom-2 flex items-center gap-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
      <span className="font-semibold">{title}</span>
      {mutedBadge && <span className="rounded bg-white/20 px-1">muted</span>}
      {handUp && <span className="rounded bg-amber-400 text-black px-1">✋</span>}
      <button
        className="ml-1 text-white hover:bg-white/20 rounded p-1 transition-colors"
        onClick={onFullscreen}
        title="Toggle fullscreen"
      >
        <svg className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
}

/* ====================== Study Room ====================== */
export function StudyRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { state, search } = useLocation();
  const params = new URLSearchParams(search);
  const isEmbed = params.get("embed") === "1";

  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [hand, setHand] = useState(false);
  const [anon, setAnon] = useState(false);
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);
  const [streams, setStreams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [room, setRoom] = useState(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`http://localhost/StudyNest/study-nest/src/api/meetings.php?id=${roomId}`, { credentials: "include" });
        const j = await r.json();
        if (j.ok) setRoom(j.room);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [roomId]);

  useEffect(() => {
    if (room && room.status === "live") {
      // Save to localStorage so homepage can detect it
      localStorage.setItem("activeRoom", JSON.stringify(room));
    }

    // Optional cleanup
    return () => {
      const endedRoom = localStorage.getItem("endedRoom");
      if (!endedRoom && room && room.status === "live") {
        // If the user just navigated away (not ended)
        localStorage.setItem("activeRoom", JSON.stringify(room));
      }
    };
  }, [room]);

  const currentUser =
    JSON.parse(localStorage.getItem("studynest.auth") || "null")?.id ||
    JSON.parse(localStorage.getItem("studynest.profile") || "null")?.id;

  const isCreator = room?.created_by === currentUser;

  const roomTitle = state?.title || room?.title || `Room • ${roomId}`;

  const displayName =
    JSON.parse(localStorage.getItem("studynest.profile") || "null")?.name ||
    JSON.parse(localStorage.getItem("studynest.auth") || "null")?.name ||
    "Student";

  // Recording functionality - pass room and state as parameters
  const {
    recording,
    showSaveOptions,
    uploading,
    startRecording,
    stopRecording,
    saveToDevice,
    uploadToCloudinary,
    cancelSave,
  } = useRecording(roomId, displayName, room, state);

  const rtc = useMemo(() => useWebRTC(roomId, displayName), [roomId, displayName]);
  useEffect(() => { rtc.setMic?.(mic); }, [mic, rtc]);
  useEffect(() => { rtc.setCam?.(cam); }, [cam, rtc]);

  useEffect(() => {
    (async () => {
      try {
        await rtc.getLocalStream();
      } catch (e) {
        console.warn("getUserMedia failed", e);
        setCam(false);
      }
    })();
    return () => {/* rtc.disconnect handles stopping tracks */ }
  }, [rtc]);

  useEffect(() => {
    rtc.subscribeStreams(setStreams);
    rtc.subscribeParticipants(setParticipants);
    rtc.onChat((m) => {
      setChat((prev) => [...prev, { id: uid(), author: m.author, text: m.text, ts: m.ts, self: !!m.self }]);
    });
    (async () => {
      const stream = await rtc.getLocalStream();
      rtc.connect();
    })();
    return () => {
      const minId = localStorage.getItem(MINIMIZE_KEY);
      if (minId === roomId) {
        // we're minimizing: keep the meeting alive for the Home mini TV
        localStorage.removeItem(MINIMIZE_KEY);
        try { rtc.setMic?.(false); } catch { }
        // do NOT call rtc.disconnect() here
        return;
      }
      rtc.disconnect();
    };
  }, [rtc]);

  useEffect(() => {
    localStorage.removeItem("endedRoom");
  }, []);


  async function endMeeting() {
    try {
      setEnding(true);
      const res = await fetch(`http://localhost/StudyNest/study-nest/src/api/meetings.php/end`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roomId }),
      });

      const j = await res.json();
      if (j.ok) {
        localStorage.setItem("endedRoom", "true");
        localStorage.removeItem("activeRoom");
        alert("Meeting ended successfully");
        navigate("/home", { replace: true });
      } else {
        console.warn("Failed to end meeting:", j);
        alert("Could not end the meeting. Try again.");
      }
    } catch (err) {
      console.error("End meeting failed", err);
    } finally {
      setEnding(false);
    }
  }

  function send() {
    if (!msg.trim()) return;
    const payload = { type: "chat", text: msg.trim(), author: anon ? "Anonymous" : displayName, ts: new Date().toISOString(), self: true };
    rtc.sendChat(payload);
    setMsg("");
  }

  async function copyInvite() {
    const url = `${window.location.origin}/rooms/${roomId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Invite link copied");
    } catch {
      console.log(url);
    }
  }

  async function toggleShare() {
    try {
      if (!sharing) {
        await rtc.startShare();
        rtc.onShareEnded?.(() => setSharing(false));
        setSharing(true);
      } else {
        await rtc.stopShare();
        setSharing(false);
      }
    } catch (e) {
      if (String(e?.message || "").includes("share-cancelled")) return;
      console.warn("share toggle failed", e);
    }
  }

  async function toggleRecord() {
    if (recording) {
      stopRecording();
    } else {
      const success = await startRecording();
      if (!success) {
        alert("Could not start recording. Make sure there are active video streams.");
      }
    }
  }

  function toggleFullTile(tileId) {
    const el = document.getElementById(tileId);
    if (!el) return;
    const d = document;

    const enter = () =>
    (el.requestFullscreen?.() ||
      el.webkitRequestFullscreen?.() ||
      el.mozRequestFullScreen?.() ||
      el.msRequestFullscreen?.());

    const exit = () =>
    (d.exitFullscreen?.() ||
      d.webkitExitFullscreen?.() ||
      d.mozCancelFullScreen?.() ||
      d.msExitFullscreen?.());

    if (d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement) {
      exit();
    } else {
      enter();
    }
  }

  useEffect(() => {
    rtc.onShareEnded?.(() => setSharing(false));
  }, [rtc]);

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-zinc-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (room && room.status === "live") {
                  // ensure Home has what it needs
                  const active = { ...(room || {}), id: roomId, status: "live" };
                  localStorage.setItem("activeRoom", JSON.stringify(active));
                }
                // mark this navigation as a minimize so cleanup won't call disconnect()
                localStorage.setItem(MINIMIZE_KEY, roomId);

                // Go home and tell it which room to embed
                navigate(`/home?room=${roomId}`);
              }}
              className="rounded-md p-2 hover:bg-zinc-800"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold truncate max-w-[60vw]">{roomTitle}</h1>
            {recording && (
              <div className="flex items-center gap-2 bg-rose-600 px-3 py-1 rounded-full">
                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-semibold">REC</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEmbed && (
              <>
                <button onClick={copyInvite} className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800">
                  Copy invite
                </button>
                {isCreator && (
                  <button
                    onClick={endMeeting}
                    disabled={ending}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {ending ? "Ending…" : "End meeting"}
                  </button>
                )}
              </>
            )}

            {/* Leave behaves differently in embed */}
            <button
              onClick={async () => {
                try {
                  await fetch(`http://localhost/StudyNest/study-nest/src/api/meetings.php/leave`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ id: roomId }),
                  });
                } catch (err) {
                  console.error("Leave failed", err);
                } finally {
                  localStorage.removeItem("activeRoom");
                  if (isEmbed) {
                    // tell Home to blank the mini player
                    window.parent?.postMessage({ type: "studynest:mini-leave" }, "*");
                    // stop any media in this iframe
                    try { rtc?.disconnect?.(); } catch { }
                  } else {
                    navigate("/home", { replace: true });
                  }
                }
              }}
              className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800"
            >
              Leave
            </button>

          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {/* Layout: video grid + sidebar */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 grid gap-4 lg:grid-cols-3">
          {/* Video grid */}
          {/* Video area (Screens on top, People below) */}
          <section className="lg:col-span-2">
            <RoomVideoWall
              streams={streams}
              participants={participants}
              mic={mic}
              toggleFullTile={toggleFullTile}
            />
          </section>

          {/* Sidebar: chat & participants */}
          <aside className="space-y-4">
            <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-100">Chat</h3>
                <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={(e) => setAnon(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 text-emerald-500 bg-zinc-900"
                  />
                  Anonymous
                </label>
              </div>
              <ul className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
                {chat.map((m) => (
                  <li
                    key={m.id}
                    className={
                      "rounded-xl px-3 py-2 text-sm " +
                      (m.self ? "bg-emerald-600 text-white ml-8" : "bg-zinc-800 text-zinc-200 mr-8")
                    }
                  >
                    <div className="text-[10px] opacity-70">
                      {m.author} • {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="break-words">{m.text}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Type a message"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button onClick={send} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Send
                </button>
              </div>
            </div>

            {/* Participants List */}
            <div className="rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-100">Participants ({participants.length})</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${p.state === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                    {p.self ? "You" : p.name || "Student"}
                    {p.state === 'joining' && !p.self && (
                      <span className="text-xs text-amber-400">(joining...)</span>
                    )}
                    {p.self && hand && <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">✋</span>}
                    {!p.self && p.hand && <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-black">✋</span>}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky Controls at Bottom */}
      <div className="sticky bottom-0 z-10 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-4">
            <ToggleButton on={mic} onClick={() => setMic((s) => !s)} label={mic ? "Mute" : "Unmute"}>
              {mic ? <MicIcon /> : <MicOffIcon />}
            </ToggleButton>
            <ToggleButton on={cam} onClick={() => setCam((s) => !s)} label={cam ? "Camera off" : "Camera on"}>
              {cam ? <CamIcon /> : <CamOffIcon />}
            </ToggleButton>
            <ToggleButton on={sharing} onClick={toggleShare} label={sharing ? "Stop sharing" : "Share screen"}>
              <ScreenIcon />
            </ToggleButton>

            {/* Record Button in the Middle */}
            <button
              onClick={toggleRecord}
              className={
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors " +
                (recording
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700")
              }
            >
              <div className="flex items-center gap-2">
                {recording ? (
                  <>
                    <div className="h-3 w-3 rounded-sm bg-white"></div>
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 rounded-full bg-rose-500"></div>
                    <span>Record</span>
                  </>
                )}
              </div>
            </button>

            <button
              onClick={() => {
                setHand((s) => {
                  rtc.toggleHand(!s);
                  return !s;
                });
              }}
              className={
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors " +
                (hand
                  ? "bg-amber-500 text-black hover:bg-amber-600"
                  : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800")
              }
            >
              ✋ {hand ? "Lower hand" : "Raise hand"}
            </button>
          </div>
        </div>
      </div>
      {/* Save Recording Modal */}
      <SaveRecordingModal
        isOpen={showSaveOptions}
        onSaveToDevice={saveToDevice}
        onSaveToCloud={uploadToCloudinary}
        onCancel={cancelSave}
        uploading={uploading}
      />
    </main>
  );
}

/* ============ Optional: /rooms/new auto-redirect ============ */
export function NewRoomRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const id = uid();
    navigate(`/rooms/${id}`, { replace: true, state: { title: "Quick Study Room" } });
  }, [navigate]);
  return null;
}

/* ====================== UI Components ====================== */
function ToggleButton({ on, onClick, children, label }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
        (on ? "bg-zinc-800 text-zinc-100" : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800")
      }
      aria-label={label}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Dot() {
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />;
}

/* ====================== Icons ====================== */
function ArrowLeft(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M12 4 10.59 5.41 16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>;
}
function CamIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H3A2 2 0 0 0 1 7v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5l4 4v-9l-4 4z" /></svg>;
}
function CamOffIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-8 w-8" {...props}><path fill="currentColor" d="m2.1 3.5 18.4 18.4-1.4 1.4-3.44-3.44A2 2 0 0 1 15 21H3a2 2 0 0 1-2-2V7c0-.35.06-.68.17-1L.7 3.5 2.1 2.1l1.9 1.9H15a2 2 0 0 1 2 2v6.17l2-2V7l4 4v2l-3.17-3.17L2.1 3.5z" /></svg>;
}
function MicIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM11 19h2v3h-2z" /></svg>;
}
function MicOffIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="m2.1 3.5 18.4 18.4-1.4 1.4-4.02-4.02A7 7 0 0 1 5 11h2a5 5 0 0 0 6.94 4.57L12 13.63V5a3 3 0 0 1 5.8-1.2l1.6 1.6-1.4 1.4L16.8 5.2A1 1 0 0 0 15 6v5.63l-2-2V5a1 1 0 0 0-2 0v6.63l-7.5-7.5zM11 19h2v3h-2z" /></svg>;
}
function ScreenIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...props}><path fill="currentColor" d="M3 4h18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7v2h3v2H7v-2h3v-2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>;
}
function UserIcon(props) {
  return <svg viewBox="0 0 24 24" className="h-12 w-12" {...props}><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" /></svg>;
}

/* ====================== Utils ====================== */
function uid() { return Math.random().toString(36).slice(2, 9); }
function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  const u = [[60, "s"], [60, "m"], [24, "h"], [7, "d"]];
  let n = d, l = "s";
  for (const [k, t] of u) { if (n < k) { l = t; break; } n = Math.floor(n / k); l = t; }
  return `${Math.max(1, Math.floor(n))}${l} ago`;
}