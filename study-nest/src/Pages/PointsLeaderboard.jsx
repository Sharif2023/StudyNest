import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../Components/Header';
import LeftNav from '../Components/LeftNav';
import Footer from '../Components/Footer';

const API_BASE = "http://localhost/StudyNest/study-nest/src/api";

export default function PointsLeaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isDemoMode, setIsDemoMode] = useState(false);

    //leftBar
    const [navOpen, setNavOpen] = useState(false);
    const [anonymous, setAnonymous] = useState(false);

    // Match LeftNav’s expected widths
    const COLLAPSED_W = 72;   // px
    const EXPANDED_W = 248;  // px
    const sidebarWidth = navOpen ? EXPANDED_W : COLLAPSED_W;

    useEffect(() => {
        // Get current user from localStorage
        const auth = JSON.parse(localStorage.getItem('studynest.auth') || '{}');
        const profile = JSON.parse(localStorage.getItem('studynest.profile') || '{}');

        const userData = {
            id: auth?.id || profile?.id,
            name: profile?.name || auth?.name || 'Current User',
            student_id: profile?.student_id || auth?.student_id || 'STU001',
            points: auth?.points || 0
        };

        setCurrentUser(userData);
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            setError('');
            setIsDemoMode(false);

            const response = await fetch(`${API_BASE}/getLeaderboard.php`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setLeaderboard(data.leaderboard || []);
                if (data.message && data.message.includes('sample')) {
                    setIsDemoMode(true);
                }
            } else {
                throw new Error(data.message || 'Failed to load leaderboard');
            }

        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            setError('Connected to database but using sample data');
            setIsDemoMode(true);
            // Use fallback data from the PHP response if available, otherwise use local fallback
            if (err.message.includes('sample')) {
                setLeaderboard([
                    { id: 1, name: 'John Doe', student_id: 'STU001', points: 1250, rank: 1 },
                    { id: 2, name: 'Jane Smith', student_id: 'STU002', points: 980, rank: 2 },
                    { id: 3, name: 'Mike Johnson', student_id: 'STU003', points: 875, rank: 3 },
                    { id: 4, name: 'Sarah Wilson', student_id: 'STU004', points: 760, rank: 4 },
                    { id: 5, name: 'Alex Chen', student_id: 'STU005', points: 650, rank: 5 },
                ]);
            }
        } finally {
            setLoading(false);
        }
    };

    const getRankIcon = (rank) => {
        switch (rank) {
            case 1:
                return '🥇';
            case 2:
                return '🥈';
            case 3:
                return '🥉';
            default:
                return `#${rank}`;
        }
    };

    const getRankColor = (rank) => {
        switch (rank) {
            case 1:
                return 'from-amber-500 to-yellow-500 border-amber-400';
            case 2:
                return 'from-gray-400 to-gray-500 border-gray-400';
            case 3:
                return 'from-amber-700 to-amber-800 border-amber-600';
            default:
                return 'from-slate-700 to-slate-800 border-slate-600';
        }
    };

    const getUserRank = () => {
        if (!currentUser) return null;
        const userInLeaderboard = leaderboard.find(user => user.id === currentUser.id);
        if (userInLeaderboard) return userInLeaderboard;

        // If user not in top ranks, show their current data
        return {
            ...currentUser,
            rank: leaderboard.length + 1
        };
    };

    const userRank = getUserRank();

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pt-20">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-slate-700 rounded w-1/3 mb-6"></div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-20 bg-slate-800 rounded-xl mb-3"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-400 to-slate-600 transition-all duration-300 ease-in-out shadow-lg rounded-xl" style={{ paddingLeft: sidebarWidth, transition: "padding-left 300ms ease" }}>
            <LeftNav
                navOpen={navOpen}
                setNavOpen={setNavOpen}
                anonymous={anonymous}
                setAnonymous={setAnonymous}
                sidebarWidth={sidebarWidth}
            />

            {/* Header */}
            <Header navOpen={navOpen} sidebarWidth={sidebarWidth} setNavOpen={setNavOpen} />

            <div className="mx-auto max-w-3x1 px-4 sm:px-6 lg:px-8 pt-6 pb-12">
                {/* Demo Mode Notice */}
                {isDemoMode && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-blue-400 text-sm font-medium">Demo Data Loaded</p>
                                <p className="text-blue-300 text-xs">Showing sample data. Real user data will appear when users are registered.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Current User Stats */}
                {userRank && (
                    <div className="bg-slate-800/20 border border-slate-700 rounded-2xl p-6 mb-8">
                        <h2 className="text-3xl font-semibold text-black mb-4">Your Ranking</h2>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getRankColor(userRank.rank)} border-2 flex items-center justify-center text-black font-bold`}>
                                    {getRankIcon(userRank.rank)}
                                </div>
                                <div>
                                    <h3 className="text-black text-lg font-semibold">{userRank.name}</h3>
                                    <p className="text-slate-100 text-sm">ID: {userRank.student_id}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-amber-400">{userRank.points.toLocaleString()}</div>
                                <div className="text-slate-100 text-sm">points</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && !isDemoMode && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <p className="text-red-400 text-sm font-medium">Connection Issue</p>
                                <p className="text-red-300 text-xs">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leaderboard */}
                <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Top Students</h2>
                            <span className="text-slate-100 text-sm">
                                {leaderboard.length} students
                            </span>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-700">
                        {leaderboard.map((user) => (
                            <div
                                key={user.id}
                                className={`p-4 flex items-center justify-between transition-colors ${user.id === currentUser?.id
                                    ? 'bg-cyan-500/10 border-l-4 border-cyan-400'
                                    : 'hover:bg-slate-700/30'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRankColor(user.rank)} border-2 flex items-center justify-center text-white font-bold text-sm`}>
                                        {getRankIcon(user.rank)}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">
                                            {user.name}
                                            {user.id === currentUser?.id && (
                                                <span className="ml-2 text-cyan-400 text-xs">(You)</span>
                                            )}
                                        </h3>
                                        <p className="text-slate-100 text-sm">ID: {user.student_id}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-semibold text-amber-400">{user.points.toLocaleString()}</div>
                                    <div className="text-slate-100 text-sm">points</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How to Earn Points */}
                <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">How to Earn Points</h3>
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+5</span>
                            </div>
                            <span>Daily login streak</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+8</span>
                            </div>
                            <span>3 day login streak</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+12</span>
                            </div>
                            <span>7 day login streak</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+20</span>
                            </div>
                            <span>20 day login streak</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+30</span>
                            </div>
                            <span>Meeting Creation</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+15</span>
                            </div>
                            <span>Join a Meeting</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+25</span>
                            </div>
                            <span>Sharing resources</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+20</span>
                            </div>
                            <span>Sharing Notes</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+15</span>
                            </div>
                            <span>Asking Questions</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+5</span>
                            </div>
                            <span>Accepted Answers</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-xs">+2</span>
                            </div>
                            <span>Giving Answers</span>
                        </div>
                    </div>
                </div>

                {/* Refresh Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={fetchLeaderboard}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white transition-colors font-medium"
                    >
                        Refresh Leaderboard
                    </button>
                </div>
            </div>
            <Footer />
        </main>
    );
}