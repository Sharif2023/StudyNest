import React, { useEffect, useState } from "react";
import Header from "../Components/Header";
import LeftNav from "../Components/LeftNav";
import Footer from "../Components/Footer";

const API = "http://localhost/StudyNest/study-nest/src/api/group_api.php";

function getAuthUser() {
    try {
        const raw = localStorage.getItem("studynest.auth");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function Groups() {
    const [groups, setGroups] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [search, setSearch] = useState("");
    const [joinModal, setJoinModal] = useState({ open: false, groupId: null });
    const [proofFile, setProofFile] = useState(null);

    const me = getAuthUser();

    useEffect(() => {
        fetch(`${API}?action=my_groups`, { credentials: "include" })
            .then((r) => r.json())
            .then((j) => j.ok && setMyGroups(j.groups));

        fetch(
            "http://localhost/StudyNest/study-nest/src/api/admin_api.php?action=list_groups&k=MYKEY123"
        )
            .then((r) => r.json())
            .then((j) => j.ok && setGroups(j.groups));
    }, []);

    const joinGroup = async (id) => {
        if (!me) {
            alert("You must be logged in to join groups.");
            return;
        }
        const proof = await new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.png,.jpg,.jpeg,.csv"; // allowed routine formats
            input.onchange = () => resolve(input.files[0]);
            input.click();
        });

        if (!proof) return; // user canceled

        const fd = new FormData();
        fd.append("group_id", id);
        fd.append("proof", proof);

        const r = await fetch(`${API}?action=join_group`, {
            method: "POST",
            body: fd,
            credentials: "include",
        });
        const j = await r.json();
        if (j.ok) {
            alert("Join request sent with routine proof!");
            fetch(`${API}?action=my_groups`, { credentials: "include" })
                .then((r) => r.json())
                .then((j) => j.ok && setMyGroups(j.groups));
        } else {
            alert("Failed: " + j.error);
        }
    };

    const leaveGroup = (id) => {
        if (!me) return alert("You must be logged in.");
        fetch(`${API}?action=leave_group`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ group_id: id }),
        })
            .then((r) => r.json())
            .then((j) => {
                if (j.ok) {
                    alert("You left the group!");
                    // refresh groups
                    fetch(`${API}?action=my_groups`, { credentials: "include" })
                        .then((r) => r.json())
                        .then((j) => j.ok && setMyGroups(j.groups));
                } else {
                    alert("Failed: " + j.error);
                }
            });
    };

    const cancelRequest = async (id) => {
        if (!me) return alert("You must be logged in.");
        const r = await fetch(`${API}?action=cancel_request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ group_id: id }),
        });
        const j = await r.json();
        if (j.ok) {
            alert("Join request cancelled!");
            fetch(`${API}?action=my_groups`, { credentials: "include" })
                .then((r) => r.json())
                .then((j) => j.ok && setMyGroups(j.groups));
        } else {
            alert("Failed: " + j.error);
        }
    };

    const myStatus = (id) => myGroups.find((g) => g.id === id)?.status || null;

    const getCourseCode = (sectionName) => {
        const parts = sectionName.split(" / ");
        return parts[1] || null; // e.g. "CSE 1101"
    };

    const joinedCourses = new Set(
        myGroups
            .filter((g) => g.status === "accepted" || g.status === "pending")
            .map((g) => getCourseCode(g.section_name))
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <LeftNav />
            <Header />
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-2xl font-bold mb-4">Join a Group</h1>

                {/* Search bar */}
                <div className="relative mb-6">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        🔍
                    </span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search groups…"
                        className="w-full rounded-lg border border-slate-600 bg-slate-800/80 
               pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 
               focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    />
                </div>

                {/* Groups list */}
                <ul className="space-y-3">
                    {groups
                        .filter((g) =>
                            g.section_name.toLowerCase().includes(search.toLowerCase())
                        )
                        .map((g) => {
                            const status = myStatus(g.id);
                            const courseCode = getCourseCode(g.section_name);
                            const alreadyInCourse = joinedCourses.has(courseCode);

                            return (
                                <li key={g.id} className="p-4 bg-slate-800/80 border border-slate-700 
                           rounded-xl flex justify-between items-center">
                                    <span>{g.section_name}</span>

                                    {status === "accepted" ? (
                                        <a
                                            href={`/group/${g.id}`}
                                            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition"
                                        >
                                            Enter Chat
                                        </a>
                                    ) : status === "pending" ? (
                                        <div className="flex gap-2 items-center">
                                            <span className="text-yellow-400 text-sm">Pending</span>
                                            <button
                                                onClick={() => cancelRequest(g.id)}
                                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : status === "rejected" ? (
                                        <div className="flex gap-2 items-center">
                                            <span className="text-red-400 text-sm">Rejected</span>
                                            <button
                                                onClick={() => setJoinModal({ open: true, groupId: g.id })}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition"
                                            >
                                                Re-Join
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() =>
                                                !alreadyInCourse && setJoinModal({ open: true, groupId: g.id })
                                            }
                                            disabled={alreadyInCourse}
                                            className={`px-3 py-1.5 rounded-lg transition ${alreadyInCourse
                                                ? "bg-gray-600 cursor-not-allowed"
                                                : "bg-emerald-600 hover:bg-emerald-500"
                                                }`}
                                        >
                                            {alreadyInCourse ? "Locked" : "Join"}
                                        </button>
                                    )}
                                </li>
                            );

                        })}
                    {groups.length === 0 && (
                        <li className="text-slate-400">No groups found.</li>
                    )}
                </ul>
            </div>
            {/* Join Modal */}
            {joinModal.open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">
                            Upload Your Routine
                        </h2>

                        {/* File Upload */}
                        <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.csv"
                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-600
                         file:mr-3 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-semibold
                         file:bg-emerald-50 file:text-emerald-700
                         hover:file:bg-emerald-100"
                        />

                        {/* Preview */}
                        {proofFile && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-600 mb-2">
                                    Preview of: <b>{proofFile.name}</b>
                                </p>

                                {/\.(jpg|jpeg|png|gif|webp)$/i.test(proofFile.name) ? (
                                    <img
                                        src={URL.createObjectURL(proofFile)}
                                        alt="Routine Preview"
                                        className="max-h-60 w-full object-contain rounded-lg border"
                                    />
                                ) : /\.pdf$/i.test(proofFile.name) ? (
                                    <iframe
                                        src={URL.createObjectURL(proofFile)}
                                        title="PDF Preview"
                                        className="w-full h-60 border rounded-lg"
                                    />
                                ) : /\.csv$/i.test(proofFile.name) ? (
                                    <div className="bg-gray-100 text-gray-700 text-xs p-2 rounded-lg max-h-40 overflow-auto">
                                        <pre>{/* CSV text preview handled separately */}</pre>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">
                                        Preview not available
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => {
                                    setProofFile(null);
                                    setJoinModal({ open: false, groupId: null });
                                }}
                                className="px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!proofFile) {
                                        alert("Please select a file first!");
                                        return;
                                    }
                                    const fd = new FormData();
                                    fd.append("group_id", joinModal.groupId);
                                    fd.append("proof", proofFile);

                                    const r = await fetch(`${API}?action=join_group`, {
                                        method: "POST",
                                        body: fd,
                                        credentials: "include",
                                    });
                                    const j = await r.json();
                                    if (j.ok) {
                                        alert("Join request sent with routine!");
                                        setProofFile(null);
                                        setJoinModal({ open: false, groupId: null });

                                        setMyGroups(prev => [...prev, { id: joinModal.groupId, status: "pending", section_name: "" }]);
                                        // refresh groups
                                        fetch(`${API}?action=my_groups`, { credentials: "include" })
                                            .then((r) => r.json())
                                            .then((j) => j.ok && setMyGroups(j.groups));
                                    } else {
                                        alert("Failed: " + j.error);
                                    }
                                }}
                                className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}
