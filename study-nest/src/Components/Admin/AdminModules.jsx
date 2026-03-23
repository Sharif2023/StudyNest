import React from "react";
import { 
  Users, 
  Activity, 
  Cpu, 
  Trash2, 
  UserCheck, 
  Ban, 
  AlertTriangle, 
  HardDrive, 
  MessageSquare, 
  Archive, 
  Clock, 
  CheckCircle2, 
  X, 
  ExternalLink 
} from "lucide-react";
import { StatCard, DataTable, ActionButton, Param } from "./AdminUIComponents";

export function AnalyticsModule({ stats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Users" value={stats?.total_users} sub="Registered students" icon={Users} color="cyan" />
            <StatCard title="New Growth" value={stats?.new_signups_30d} sub="New signups (30d)" icon={Activity} color="purple" />
            <StatCard title="Active Sessions" value={stats?.active_rooms} sub="Live study rooms" icon={Cpu} color="blue" />
        </div>
    );
}

export function UserManagementModule({ users, handleAction }) {
    return (
        <DataTable 
            columns={["User", "Identity", "Access", "Registry", "Actions"]}
            data={users.map(u => ({
                User: <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-cyan-500">{u.username.charAt(0)}</div>
                    <span className="font-bold">{u.username}</span>
                </div>,
                Identity: u.email,
                Access: <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${u.role === 'Admin' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-500/10 text-slate-500'}`}>{u.role}</span>,
                Registry: new Date(u.created_at).toLocaleDateString(),
                Actions: <div className="flex gap-2">
                    <ActionButton icon={u.status === 'Banned' ? UserCheck : Ban} color={u.status === 'Banned' ? "emerald" : "rose"} onClick={() => handleAction("toggle_user_status", { id: u.id })} />
                    <ActionButton icon={Trash2} color="rose" onClick={() => handleAction("delete_user", { id: u.id })} />
                </div>
            }))}
        />
    );
}

export function ContentFeedModule({ content, handleAction }) {
    return (
        <DataTable 
            columns={["Type", "Source", "Origin", "Status", "Actions"]}
            data={content.map(c => ({
                Type: <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.type}</span>,
                Source: <div className="max-w-xs truncate font-bold">{c.title}</div>,
                Origin: c.author,
                Status: <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${c.status === 'Reported' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{c.status}</span>,
                Actions: <div className="flex gap-2">
                    <ActionButton icon={AlertTriangle} color={c.status === 'Reported' ? "rose" : "slate"} onClick={() => handleAction("toggle_content_status", { id: c.id })} />
                    <ActionButton icon={Trash2} color="rose" onClick={() => handleAction("delete_content", { id: c.id, type: c.type })} />
                </div>
            }))}
        />
    );
}

export function AuditLogsModule({ logs }) {
    return (
        <DataTable 
            columns={["Timestamp", "Operator", "Action", "Item", "Details"]}
            data={logs.map(l => ({
                Timestamp: <span className="text-slate-500 font-mono text-[10px]">{new Date(l.created_at).toLocaleString()}</span>,
                Operator: <span className="font-bold text-white">{l.admin_name || "System"}</span>,
                Action: <span className="text-cyan-400 font-semibold text-xs">{l.action}</span>,
                Item: <span className="text-slate-400 text-xs">{l.target_type} {l.target_id ? `#${l.target_id}` : ""}</span>,
                Details: <div className="max-w-xs truncate text-slate-500 text-xs">{l.details || "None"}</div>
            }))}
        />
    );
}

export function SystemHealthModule({ health }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Storage" value={health?.db_size} sub="Database Size" icon={HardDrive} color="cyan" />
            <StatCard title="Communications" value={health?.total_messages} sub="Platform messages" icon={MessageSquare} color="purple" />
            <StatCard title="Assets" value={health?.external_resources} sub="Cloudinary Media" icon={Archive} color="blue" />
            <div className="lg:col-span-3 p-8 rounded-[2.5rem] border border-white/10 bg-white/[0.02] flex flex-col gap-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-3">
                    <Cpu size={18} className="text-cyan-500" />
                    System Parameters
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Param label="Core Version" val={health?.php_version} />
                    <Param label="Engine" val={health?.db_type} />
                    <Param label="Local Time" val={health?.server_time} />
                    <Param label="API State" val="Operational" color="emerald" />
                </div>
            </div>
        </div>
    );
}

export function SettingsModule({ settings, updateSetting }) {
    return (
        <div className="space-y-4 max-w-3xl">
            {settings.map(s => (
                <div key={s.key} className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                    <div>
                        <div className="text-[10px] font-semibold text-cyan-500 mb-1">{s.key.replace(/_/g, " ")}</div>
                        <div className="text-sm font-medium text-slate-400">{s.description}</div>
                    </div>
                    <div className="flex items-center gap-4">
                        {s.type === 'boolean' ? (
                            <button 
                                onClick={() => updateSetting(s.key, s.value === 'true' ? 'false' : 'true')}
                                className={`w-12 h-6 rounded-full relative transition-all ${s.value === 'true' ? 'bg-cyan-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${s.value === 'true' ? 'left-7' : 'left-1'}`} />
                            </button>
                        ) : (
                            <input 
                                type={s.type === 'number' ? 'number' : 'text'}
                                defaultValue={s.value}
                                onBlur={(e) => updateSetting(s.key, e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none w-24 text-center font-bold"
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function GroupsModule({ requests, groups, handleAction, fetchAll, apiClient }) {
    return (
        <div className="space-y-8">
            <div className="flex gap-4">
                <div className="flex-1 p-8 rounded-[2.5rem] border border-white/10 bg-white/[0.02] text-center">
                    <Archive size={40} className="mx-auto mb-4 text-slate-600" />
                    <h3 className="text-white font-bold uppercase mb-4">Import Groups</h3>
                    <input type="file" onChange={(e) => {
                        const fd = new FormData();
                        fd.append("csv", e.target.files[0]);
                        apiClient.post("admin_api.php?action=upload_csv", fd).then(res => {
                            if (res.data.ok) fetchAll();
                        });
                    }} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:uppercase file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20" />
                </div>
                <div className="flex-1 p-8 rounded-[2.5rem] border border-rose-500/10 bg-rose-500/[0.02] text-center flex flex-col justify-center">
                    <AlertTriangle size={30} className="mx-auto mb-4 text-rose-500 opacity-50" />
                    <button 
                        onClick={() => handleAction("delete_all_groups", {})}
                        className="px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-semibold uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all"
                    >
                        Clear All Groups
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-6 flex items-center gap-3">
                        <Clock size={16} className="text-amber-500" />
                        Pending Join Requests
                    </h3>
                    <div className="space-y-4">
                        {requests.map(r => (
                            <div key={r.id} className="p-6 rounded-[2rem] border border-white/10 bg-white/[0.02] flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-white truncate pr-4">{r.section_name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold">{r.username} • {r.student_id}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <ActionButton icon={CheckCircle2} color="emerald" onClick={() => handleAction("approve_member", { id: r.id, status: 'accepted' })} />
                                        <ActionButton icon={X} color="rose" onClick={() => handleAction("approve_member", { id: r.id, status: 'rejected' })} />
                                    </div>
                                </div>
                                {r.proof_url && (
                                    <a href={r.proof_url} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-2 hover:underline">
                                        <ExternalLink size={12} /> View Proof Document
                                    </a>
                                )}
                            </div>
                        ))}
                        {requests.length === 0 && <div className="text-slate-600 italic text-xs p-6 text-center">No pending authorizations...</div>}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-6 flex items-center gap-3">
                        <MessageSquare size={16} className="text-cyan-500" />
                        Active Groups
                    </h3>
                    <div className="max-h-[600px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                        {groups.map(g => (
                            <div key={g.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] flex justify-between items-center group hover:bg-white/[0.03] transition-all">
                                <span className="text-xs font-bold text-slate-300 truncate pr-4">{g.section_name}</span>
                                <button onClick={() => handleAction("delete_group", { id: g.id })} className="opacity-0 group-hover:opacity-100 p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
