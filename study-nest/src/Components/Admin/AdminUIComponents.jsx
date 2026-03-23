import React from "react";

export function StatCard({ title, value, sub, icon: Icon, color }) {
    const colors = {
        cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-cyan-500/10",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-purple-500/10",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10"
    };
    return (
        <div className={`p-8 rounded-[2.5rem] border bg-white/[0.02] shadow-xl transition-all hover:scale-[1.02] flex items-center gap-6 ${colors[color] || colors.cyan}`}>
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${colors[color] || colors.cyan} border shadow-inner`}>
                <Icon size={28} />
            </div>
            <div>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">{title}</div>
                <div className="text-3xl font-bold text-white">{value || 0}</div>
                <div className="text-[10px] font-semibold opacity-40 mt-1 uppercase tracking-wider">{sub}</div>
            </div>
        </div>
    );
}

export function DataTable({ columns, data }) {
    return (
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5">
                            {columns.map(c => (
                                <th key={c} className="px-8 py-6 text-[10px] font-bold uppercase tracking-wider text-slate-600">{c}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-all">
                                {columns.map(c => (
                                    <td key={c} className="px-8 py-6 text-sm text-slate-400">{row[c]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.length === 0 && <div className="p-20 text-center text-slate-600 font-medium italic">No records found.</div>}
        </div>
    );
}

export function ActionButton({ icon: Icon, color, onClick }) {
    const colors = {
        rose: "text-rose-500 hover:bg-rose-500 hover:text-white border-rose-500/20",
        emerald: "text-emerald-500 hover:bg-emerald-500 hover:text-white border-emerald-500/20",
        slate: "text-slate-500 hover:bg-white/10 border-white/10",
        cyan: "text-cyan-500 hover:bg-cyan-500 hover:text-white border-cyan-500/20"
    };
    return (
        <button onClick={onClick} className={`p-2.5 rounded-xl border transition-all ${colors[color]} shadow-lg`}>
            <Icon size={16} />
        </button>
    );
}

export function Param({ label, val, color = "slate" }) {
    return (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="text-[8px] font-bold uppercase tracking-wider text-slate-600 mb-1">{label}</div>
            <div className={`text-xs font-bold ${color === 'emerald' ? 'text-emerald-400' : 'text-white'} truncate`}>{val || "Unknown"}</div>
        </div>
    );
}
