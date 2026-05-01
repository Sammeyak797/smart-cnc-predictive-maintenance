import { useCallback, useEffect, useState } from "react"
import WorkOrderTable from "../components/WorkOrderTable"
import API from "../services/api"

const IconClipboardList = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>)
const IconRefresh = ({ spinning }) => (<svg className={`w-4 h-4 transition-transform ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>)
const IconAlertTriangle = () => (<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth={3} strokeLinecap="round" /></svg>)
const IconX = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)
const IconInbox = () => (<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>)

const normaliseWorkOrders = (orders) =>
    orders.map((wo) => ({ ...wo, status: wo.status?.toUpperCase() ?? "PENDING" }))

function SkeletonRows() {
    return (
        <div className="space-y-3 animate-pulse p-1">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 sm:h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
            ))}
        </div>
    )
}

function StatChip({ label, value, color }) {
    const colors = {
        blue: "bg-blue-50    dark:bg-blue-900/20    text-blue-700    dark:text-blue-300    border-blue-100    dark:border-blue-800/40",
        amber: "bg-amber-50   dark:bg-amber-900/20   text-amber-700   dark:text-amber-300   border-amber-100   dark:border-amber-800/40",
        emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/40",
        slate: "bg-slate-50   dark:bg-slate-800/60   text-slate-600   dark:text-slate-300   border-slate-100   dark:border-slate-700/40",
    }
    return (
        <div className={`flex flex-col items-center px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl border ${colors[color] ?? colors.slate}`}>
            <span className="text-xl sm:text-2xl font-black tabular-nums leading-none">{value}</span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1.5 opacity-70 text-center">{label}</span>
        </div>
    )
}

function ErrorBanner({ message, onDismiss }) {
    if (!message) return null
    return (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
            <IconAlertTriangle />
            <span className="flex-1 font-medium">{message}</span>
            <button onClick={onDismiss} className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors flex-shrink-0"><IconX /></button>
        </div>
    )
}

function WorkOrders() {
    const [workOrders, setWorkOrders] = useState([])
    const [engineerInputs, setEngineerInputs] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [actionError, setActionError] = useState("")

    const fetchWorkOrders = useCallback(async () => {
        setError(""); setLoading(true)
        try {
            const res = await API.get("/workorders/")
            setWorkOrders(normaliseWorkOrders(res.data))
        } catch { setError("Failed to load work orders. Please try again.") }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchWorkOrders() }, [fetchWorkOrders])

    const assignEngineer = async (workOrderId) => {
        const name = engineerInputs[workOrderId]?.trim()
        if (!name) return
        setActionError("")
        try {
            await API.post("/workorders/assign", { work_order_id: workOrderId, engineer: name })
            setEngineerInputs((prev) => ({ ...prev, [workOrderId]: "" }))
            await fetchWorkOrders()
        } catch (err) { setActionError(err.response?.data?.message ?? "Failed to assign engineer.") }
    }

    const completeWorkOrder = async (workOrderId) => {
        setActionError("")
        try {
            await API.post("/workorders/complete", { work_order_id: workOrderId })
            await fetchWorkOrders()
        } catch (err) { setActionError(err.response?.data?.message ?? "Failed to complete work order.") }
    }

    const pending = workOrders.filter((w) => w.status === "PENDING").length
    const inProgress = workOrders.filter((w) => w.status === "IN_PROGRESS").length
    const completed = workOrders.filter((w) => w.status === "COMPLETED").length

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                            <IconClipboardList />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">Work Orders</h1>
                            <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">Manage and track all maintenance tasks</p>
                        </div>
                    </div>
                    <button onClick={fetchWorkOrders} disabled={loading}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2 rounded-xl transition-all hover:shadow-sm disabled:opacity-50 whitespace-nowrap">
                        <IconRefresh spinning={loading} />
                        <span className="hidden sm:inline">{loading ? "Refreshing…" : "Refresh"}</span>
                    </button>
                </div>

                {/* Stat chips — 2 cols on mobile, 4 on sm+ */}
                {!loading && workOrders.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <StatChip label="Total" value={workOrders.length} color="slate" />
                        <StatChip label="Pending" value={pending} color="amber" />
                        <StatChip label="In Progress" value={inProgress} color="blue" />
                        <StatChip label="Completed" value={completed} color="emerald" />
                    </div>
                )}

                <ErrorBanner message={actionError} onDismiss={() => setActionError("")} />

                {/* Table card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Work Orders</h2>
                            {!loading && workOrders.length > 0 && (
                                <span className="text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-full">{workOrders.length}</span>
                            )}
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-xs text-red-500 dark:text-red-400 font-medium">
                                <IconAlertTriangle />
                                <span className="hidden sm:inline">{error}</span>
                                <button onClick={fetchWorkOrders} className="underline underline-offset-2 hover:text-red-700 dark:hover:text-red-300">Retry</button>
                            </div>
                        )}
                    </div>

                    <div className="p-3 sm:p-5">
                        {loading ? (
                            <SkeletonRows />
                        ) : workOrders.length === 0 && !error ? (
                            <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3 text-gray-300 dark:text-gray-600">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><IconInbox /></div>
                                <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No work orders found</p>
                                <p className="text-xs text-gray-300 dark:text-gray-600 text-center px-4">New orders will appear here once created</p>
                            </div>
                        ) : (
                            <WorkOrderTable
                                workOrders={workOrders}
                                engineerInputs={engineerInputs}
                                setEngineerInputs={setEngineerInputs}
                                onAssign={assignEngineer}
                                onComplete={completeWorkOrder}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WorkOrders