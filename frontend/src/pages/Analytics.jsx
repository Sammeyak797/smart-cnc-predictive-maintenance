import { useEffect, useState, useCallback, useRef } from "react"
import { useAppContext } from "../context/AppContext"
import FailureChart from "../components/FailureChart"
import TrendChart from "../components/TrendChart"
import API from "../services/api"
import toast from "react-hot-toast"

const IconDownload = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>)
const IconBarChart = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>)
const IconClipboard = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>)
const IconTrendUp = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>)
const IconCpu = () => (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>)
const IconRefresh = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>)
const IconSpinner = () => (<svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>)

const PRIORITY_CONFIG = {
    URGENT: { badge: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800", dot: "bg-red-500", row: "hover:bg-red-50/40 dark:hover:bg-red-900/10" },
    SCHEDULE_SOON: { badge: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800", dot: "bg-amber-400", row: "hover:bg-amber-50/40 dark:hover:bg-amber-900/10" },
    OK: { badge: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500", row: "hover:bg-gray-50 dark:hover:bg-gray-800/60" },
}
const getPriorityCfg = (p) => PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG.OK

const formatDate = (s) => {
    if (!s) return "—"
    const d = new Date(s)
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function NoMachineState() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
            <div className="text-center space-y-4 max-w-xs">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center mx-auto text-gray-300 dark:text-gray-600"><IconCpu /></div>
                <div>
                    <p className="text-base font-bold text-gray-700 dark:text-gray-200">No machine selected</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Go to the Dashboard and select a machine first</p>
                </div>
            </div>
        </div>
    )
}

function LoadingSkeleton() {
    return (
        <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg" style={{ opacity: 1 - i * 0.15 }} />)}
        </div>
    )
}

function Card({ icon, iconBg, title, subtitle, children, action, noPadding = false }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${iconBg}`}>{icon}</div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-none truncate">{title}</h2>
                        {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">{subtitle}</p>}
                    </div>
                </div>
                {action && <div className="flex-shrink-0 ml-2">{action}</div>}
            </div>
            <div className={noPadding ? "" : "p-4 sm:p-5"}>{children}</div>
        </div>
    )
}

function StatChip({ label, value, color }) {
    const colors = {
        blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800/40",
        red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800/40",
        amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/40",
        emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/40",
    }
    return (
        <div className={`flex flex-col items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border ${colors[color] ?? colors.blue}`}>
            <span className="text-lg sm:text-xl font-black tabular-nums leading-none">{value}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider mt-1 opacity-70 text-center">{label}</span>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Analytics() {
    const [summary, setSummary] = useState([])
    const [maintenanceHistory, setMaintenanceHistory] = useState([])
    const [rpmHistory, setRpmHistory] = useState([])
    const [wearHistory, setWearHistory] = useState([])
    const [trendCount, setTrendCount] = useState(0)
    const [downloading, setDownloading] = useState(false)
    const [loading, setLoading] = useState(false)
    const [trendsLoading, setTrendsLoading] = useState(false)

    const { selectedMachine, simulationData } = useAppContext()

    // ── BUG FIX #1: Use a ref to always hold the latest fetchAnalytics ────
    // The simulationData effect called fetchAnalytics but had eslint-disable
    // to skip adding it to deps. This meant the effect held a STALE closure
    // of fetchAnalytics — one that still had the OLD selectedMachine baked in.
    // When the user switched machines, fetchAnalytics would silently fetch
    // data for the previous machine, not the current one.
    //
    // Fix: store fetchAnalytics in a ref. The ref is always current without
    // needing to be listed as a dependency, breaking the stale closure.
    const fetchAnalyticsRef = useRef(null)

    const fetchAnalytics = useCallback(async () => {
        if (!selectedMachine) return
        setLoading(true)
        try {
            const [summaryRes, maintenanceRes] = await Promise.all([
                API.get(`/analytics/summary?machine_id=${selectedMachine}`),
                API.get(`/analytics/maintenance?machine_id=${selectedMachine}&limit=50`),
            ])
            setSummary(summaryRes.data)
            setMaintenanceHistory(maintenanceRes.data)
        } catch {
            toast.error("Failed to load analytics")
        } finally {
            setLoading(false)
        }
    }, [selectedMachine])

    // Keep ref in sync with the latest fetchAnalytics (updates when selectedMachine changes)
    useEffect(() => {
        fetchAnalyticsRef.current = fetchAnalytics
    }, [fetchAnalytics])

    const fetchTrends = useCallback(async () => {
        if (!selectedMachine) return
        setTrendsLoading(true)
        try {
            const res = await API.get(`/analytics/trends?machine_id=${selectedMachine}&limit=20`)
            setRpmHistory(res.data.rpm ?? [])
            setWearHistory(res.data.tool_wear ?? [])
            // BUG FIX #2: trendCount is owned exclusively by fetchTrends.
            // The simulationData effect below appends to rpmHistory/wearHistory
            // for live chart updates, but does NOT touch trendCount — that
            // caused the displayed count to flicker between the live-incremented
            // value and the real DB value on every tick.
            setTrendCount(res.data.count ?? 0)
        } catch {
            console.error("Failed to load trend history")
        } finally {
            setTrendsLoading(false)
        }
    }, [selectedMachine])

    // Fetch on machine change
    useEffect(() => {
        fetchAnalytics()
        fetchTrends()
    }, [fetchAnalytics, fetchTrends])

    // ── BUG FIX #3: simulationData effect uses ref, not stale closure ─────
    // Previously: called fetchAnalytics() directly with eslint-disable on deps
    //   → stale closure → fetched for wrong machine after switching
    // Now: calls fetchAnalyticsRef.current() which is always the latest version
    //   → always fetches for the currently selected machine
    //   → no eslint-disable needed, no stale closure
    useEffect(() => {
        if (!simulationData) return

        // Append live readings to charts immediately (no round-trip wait)
        const rpm = simulationData.sensor_data?.rpm
        const wear = simulationData.sensor_data?.tool_wear
        if (rpm != null) setRpmHistory((p) => [...p.slice(-19), rpm])
        if (wear != null) setWearHistory((p) => [...p.slice(-19), wear])

        // Fetch latest analytics using the ref — always the current machine
        // Do NOT increment trendCount here — fetchTrends owns it (BUG FIX #2)
        fetchAnalyticsRef.current?.()
    }, [simulationData])  // simulationData is the only real trigger here

    const downloadReport = async () => {
        if (!simulationData) { toast.error("Run a simulation first"); return }
        setDownloading(true)
        try {
            const response = await API.post(
                "/report/",
                { machine_id: selectedMachine, ...simulationData },
                { responseType: "blob" }
            )
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `report_${selectedMachine}_${Date.now()}.pdf`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success("Report downloaded")
        } catch {
            toast.error("Report generation failed")
        } finally {
            setDownloading(false)
        }
    }

    if (!selectedMachine) return <NoMachineState />

    const urgentCount = maintenanceHistory.filter((r) => r.priority === "URGENT").length
    const scheduleSoonCount = maintenanceHistory.filter((r) => r.priority === "SCHEDULE_SOON").length
    const okCount = maintenanceHistory.filter((r) => r.priority === "OK").length

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">Analytics</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Diagnostics for <span className="font-bold text-blue-600 dark:text-blue-400">{selectedMachine}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { fetchAnalytics(); fetchTrends() }}
                            disabled={loading || trendsLoading}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl transition-all hover:shadow-sm disabled:opacity-50"
                        >
                            <span className={(loading || trendsLoading) ? "animate-spin" : ""}><IconRefresh /></span>
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            onClick={downloadReport}
                            disabled={downloading || !simulationData}
                            className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl shadow-sm transition-all"
                        >
                            {downloading ? <IconSpinner /> : <IconDownload />}
                            <span className="hidden sm:inline">{downloading ? "Generating…" : "Download Report"}</span>
                            <span className="sm:hidden">{downloading ? "…" : "Report"}</span>
                        </button>
                    </div>
                </div>

                {/* Stat chips */}
                {maintenanceHistory.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <StatChip label="Total Records" value={maintenanceHistory.length} color="blue" />
                        <StatChip label="Urgent" value={urgentCount} color="red" />
                        <StatChip label="Schedule Soon" value={scheduleSoonCount} color="amber" />
                        <StatChip label="Healthy" value={okCount} color="emerald" />
                    </div>
                )}

                {/* Sensor Trends */}
                <Card
                    icon={<IconTrendUp />}
                    iconBg="bg-gradient-to-br from-emerald-500 to-teal-500"
                    title="Sensor Trends"
                    subtitle="RPM and tool wear — persisted across sessions"
                >
                    {trendsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                            {[0, 1].map(i => <div key={i} className="h-36 sm:h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                        </div>
                    ) : rpmHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 sm:py-14 gap-3 text-gray-400">
                            <IconTrendUp />
                            <p className="text-sm text-center">No data yet — run a simulation first</p>
                        </div>
                    ) : (
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Last <span className="font-bold text-gray-600 dark:text-gray-300">{trendCount}</span> readings
                                </p>
                                <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
                                    Historical
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">RPM Trend</p>
                                    <TrendChart label="RPM" dataPoints={rpmHistory} />
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">Tool Wear Trend</p>
                                    <TrendChart label="Tool Wear" dataPoints={wearHistory} />
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Bottom grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">

                    <Card
                        icon={<IconBarChart />}
                        iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
                        title="Failure Distribution"
                        subtitle="Breakdown by failure category"
                    >
                        {loading
                            ? <div className="flex items-center justify-center h-40 sm:h-48 gap-2 text-gray-400 dark:text-gray-500"><IconSpinner /><span className="text-sm">Loading…</span></div>
                            : <FailureChart summary={summary} />
                        }
                    </Card>

                    <Card
                        icon={<IconClipboard />}
                        iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
                        title="Maintenance History"
                        subtitle="One record per minute — updates in real time"
                        noPadding
                        action={
                            maintenanceHistory.length > 0 && (
                                <span className="text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full">
                                    {maintenanceHistory.length}
                                </span>
                            )
                        }
                    >
                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="p-4 sm:p-5"><LoadingSkeleton /></div>
                            ) : (
                                <table className="w-full text-xs min-w-[360px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-800">
                                            {["Priority", "Failure Type", "Date"].map(h => (
                                                <th key={h} className="text-left px-4 sm:px-5 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {maintenanceHistory.length === 0 ? (
                                            <tr><td colSpan={3}>
                                                <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
                                                    <IconClipboard />
                                                    <p className="text-sm">No records yet — run a simulation first</p>
                                                </div>
                                            </td></tr>
                                        ) : (
                                            maintenanceHistory.map((item, idx) => {
                                                const cfg = getPriorityCfg(item.priority)
                                                return (
                                                    // Use bucket as key — stable unique identity per machine per minute
                                                    <tr
                                                        key={item.bucket ?? `${item.created_at}-${idx}`}
                                                        className={`transition-colors ${cfg.row}`}
                                                    >
                                                        <td className="px-4 sm:px-5 py-2.5 sm:py-3">
                                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 sm:py-1 rounded-full ${cfg.badge} whitespace-nowrap`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                                {item.priority ?? "—"}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 sm:px-5 py-2.5 sm:py-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                            {item.failure_type ?? "—"}
                                                        </td>
                                                        <td className="px-4 sm:px-5 py-2.5 sm:py-3 text-gray-400 dark:text-gray-500 whitespace-nowrap font-mono text-[11px]">
                                                            {formatDate(item.created_at)}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default Analytics