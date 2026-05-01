import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import API from "../services/api"
import toast from "react-hot-toast"

const IconRefresh = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>)
const IconSpinner = () => (<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>)
const IconCpu = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>)
const IconActivity = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>)
const IconThermometer = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>)
const IconTool = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>)
const IconZap = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>)
const IconArrowRight = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>)

const fmt = (v, decimals = 1) => (v != null ? Number(v).toFixed(decimals) : "—")

const formatRelative = (isoStr) => {
    if (!isoStr) return "Never"
    const diff = Date.now() - new Date(isoStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

const getRulColor = (rul) => {
    if (rul == null) return { bar: "bg-gray-200 dark:bg-gray-700", text: "text-gray-400 dark:text-gray-500", label: "No data" }
    if (rul <= 15) return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "Critical" }
    if (rul <= 35) return { bar: "bg-orange-400", text: "text-orange-600 dark:text-orange-400", label: "Low" }
    if (rul <= 60) return { bar: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", label: "Moderate" }
    return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "Healthy" }
}

const getFailureBadge = (ft) => (!ft || ft === "No Failure")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40"
    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40"

const DUTY_BADGE = {
    H: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40",
    M: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
    L: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40",
}
const DUTY_LABEL = { H: "Heavy", M: "Medium", L: "Light" }

function StatRow({ icon, label, value, colorClass = "" }) {
    return (
        <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-50 dark:border-gray-700/40 last:border-0">
            <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                {icon}
                <span className="text-xs font-medium">{label}</span>
            </div>
            <span className={`text-xs font-bold tabular-nums font-mono ${colorClass || "text-gray-800 dark:text-gray-200"}`}>{value}</span>
        </div>
    )
}

function MachineCard({ snapshot, onGoToDashboard }) {
    const rul = snapshot.rul
    const rulCfg = getRulColor(rul)
    const pct = rul != null ? Math.max(0, Math.min(100, rul)) : 0
    const hasData = snapshot.failure_type != null
    const isFailure = hasData && snapshot.failure_type !== "No Failure"

    return (
        <div className={`relative bg-white dark:bg-gray-900 rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col
            ${isFailure ? "border-red-200 dark:border-red-800/50" : "border-gray-100 dark:border-gray-800"}`}>

            {isFailure && <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500 w-full" />}

            {/* Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 pb-3 sm:pb-4">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isFailure ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"}`}>
                        <IconCpu />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-base text-gray-900 dark:text-white leading-none truncate">{snapshot.machine_id}</h3>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Last: {formatRelative(snapshot.last_seen)}</p>
                    </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ml-2 ${DUTY_BADGE[snapshot.duty_type] ?? DUTY_BADGE.M}`}>
                    {DUTY_LABEL[snapshot.duty_type] ?? snapshot.duty_type}
                </span>
            </div>

            {/* RUL bar */}
            <div className="px-4 sm:px-5 pb-3 sm:pb-4">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">RUL</span>
                    <span className={`text-sm font-black tabular-nums ${rulCfg.text}`}>
                        {rul != null ? `${pct} / 100` : "—"}
                        <span className="ml-1 text-[10px] font-bold">{rulCfg.label}</span>
                    </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${rulCfg.bar}`} style={{ width: hasData ? `${pct}%` : "0%" }} />
                </div>
            </div>

            <div className="mx-4 sm:mx-5 border-t border-gray-100 dark:border-gray-800" />

            {/* Stats */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 flex-1">
                {!hasData ? (
                    <div className="flex flex-col items-center justify-center py-5 sm:py-6 text-gray-300 dark:text-gray-600 gap-2">
                        <IconActivity />
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">No simulation data yet</p>
                    </div>
                ) : (
                    <div>
                        <div className="mb-2.5 sm:mb-3">
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${getFailureBadge(snapshot.failure_type)}`}>
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isFailure ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                                <span className="truncate max-w-[120px]">{snapshot.failure_type}</span>
                            </span>
                            {snapshot.confidence != null && (
                                <span className="ml-2 text-[11px] text-gray-400 dark:text-gray-500 font-medium">{fmt(snapshot.confidence, 1)}%</span>
                            )}
                        </div>
                        <StatRow icon={<IconActivity />} label="RPM" value={snapshot.rpm != null ? fmt(snapshot.rpm, 0) : "—"} />
                        <StatRow icon={<IconZap />} label="Torque" value={snapshot.torque != null ? `${fmt(snapshot.torque, 1)} Nm` : "—"} />
                        <StatRow icon={<IconThermometer />} label="Temp" value={snapshot.process_temp != null ? `${fmt(snapshot.process_temp, 1)} K` : "—"} />
                        <StatRow icon={<IconTool />} label="Tool Wear" value={snapshot.tool_wear != null ? `${fmt(snapshot.tool_wear, 0)} min` : "—"}
                            colorClass={snapshot.tool_wear > 200 ? "text-red-600 dark:text-red-400" : snapshot.tool_wear > 150 ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-gray-200"}
                        />
                    </div>
                )}
            </div>

            {/* CTA */}
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2.5 sm:pt-3">
                <button onClick={() => onGoToDashboard(snapshot.machine_id)}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-white bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-600 border border-blue-100 dark:border-blue-800/40 hover:border-blue-600 px-4 py-2.5 rounded-xl transition-all duration-200 active:scale-95">
                    Monitor on Dashboard
                    <IconArrowRight />
                </button>
            </div>
        </div>
    )
}

function FleetSummaryBar({ snapshots }) {
    const total = snapshots.length
    const failures = snapshots.filter((s) => s.failure_type && s.failure_type !== "No Failure").length
    const critical = snapshots.filter((s) => s.rul != null && s.rul <= 15).length
    const healthy = snapshots.filter((s) => s.rul != null && s.rul > 60 && (!s.failure_type || s.failure_type === "No Failure")).length
    const noData = snapshots.filter((s) => s.failure_type == null).length

    const chips = [
        { label: "Total", value: total, color: "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
        { label: "Failures", value: failures, color: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40" },
        { label: "Critical", value: critical, color: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/40" },
        { label: "Healthy", value: healthy, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40" },
        { label: "No Data", value: noData, color: "bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
    ]

    return (
        // 3 cols on mobile (wrap), 5 on sm+
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
            {chips.map((c) => (
                <div key={c.label} className={`flex flex-col items-center px-2 sm:px-4 py-2.5 sm:py-3 rounded-2xl border ${c.color}`}>
                    <span className="text-xl sm:text-2xl font-black tabular-nums leading-none">{c.value}</span>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1 sm:mt-1.5 opacity-70 text-center">{c.label}</span>
                </div>
            ))}
        </div>
    )
}

const SORT_OPTIONS = [
    { value: "risk", label: "Risk" },
    { value: "rul_asc", label: "RUL ↑" },
    { value: "rul_desc", label: "RUL ↓" },
    { value: "name", label: "Name" },
    { value: "last_seen", label: "Recent" },
]

function sortSnapshots(snapshots, sortBy) {
    const copy = [...snapshots]
    switch (sortBy) {
        case "risk": return copy.sort((a, b) => { const af = a.failure_type && a.failure_type !== "No Failure" ? 0 : 1; const bf = b.failure_type && b.failure_type !== "No Failure" ? 0 : 1; return af !== bf ? af - bf : (a.rul ?? 999) - (b.rul ?? 999) })
        case "rul_asc": return copy.sort((a, b) => (a.rul ?? 999) - (b.rul ?? 999))
        case "rul_desc": return copy.sort((a, b) => (b.rul ?? -1) - (a.rul ?? -1))
        case "name": return copy.sort((a, b) => a.machine_id.localeCompare(b.machine_id))
        case "last_seen": return copy.sort((a, b) => new Date(b.last_seen ?? 0) - new Date(a.last_seen ?? 0))
        default: return copy
    }
}

function MachineCompare() {
    const navigate = useNavigate()
    const [snapshots, setSnapshots] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortBy, setSortBy] = useState("risk")
    const [lastRefresh, setLastRefresh] = useState(null)

    const fetchCompare = useCallback(async () => {
        setLoading(true)
        try {
            const res = await API.get("/machines/compare")
            setSnapshots(res.data)
            setLastRefresh(new Date())
        } catch { toast.error("Failed to load machine comparison data") }
        finally { setLoading(false) }
    }, [])

    useEffect(() => {
        fetchCompare()
        const id = setInterval(fetchCompare, 30000)
        return () => clearInterval(id)
    }, [fetchCompare])

    const handleGoToDashboard = (machineId) => {
        sessionStorage.setItem("selectedMachine", machineId)
        navigate("/dashboard")
    }

    const sorted = sortSnapshots(snapshots, sortBy)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="flex items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">Fleet Comparison</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            <span className="hidden sm:inline">Side-by-side health overview · </span>
                            {lastRefresh && <span>Updated {formatRelative(lastRefresh.toISOString())}</span>}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Compact sort on mobile */}
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 sm:px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button onClick={fetchCompare} disabled={loading}
                            className="flex items-center gap-1.5 sm:gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2 rounded-xl transition-all hover:shadow-sm disabled:opacity-50">
                            {loading ? <IconSpinner /> : <IconRefresh />}
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Fleet summary */}
                {!loading && snapshots.length > 0 && <FleetSummaryBar snapshots={snapshots} />}

                {/* Cards — 1 col mobile, 2 col sm, 3 col lg */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 animate-pulse space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
                                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-16" />
                                    </div>
                                </div>
                                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
                                <div className="space-y-2">
                                    {[...Array(4)].map((_, j) => <div key={j} className="h-7 sm:h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" style={{ opacity: 1 - j * 0.2 }} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-4 text-gray-300 dark:text-gray-600">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center"><IconCpu /></div>
                        <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No machines found</p>
                        <p className="text-xs text-gray-300 dark:text-gray-600">Seed the database with machines first</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {sorted.map((snapshot) => (
                            <MachineCard key={snapshot.machine_id} snapshot={snapshot} onGoToDashboard={handleGoToDashboard} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MachineCompare