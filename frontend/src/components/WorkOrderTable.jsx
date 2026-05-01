import { useState } from "react"

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconFilter = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
)

const IconUser = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
)

const IconCheck = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const IconClock = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
)

const IconClipboard = () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
)

// ─── Config ───────────────────────────────────────────────────────────────────
const FILTERS = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"]

const TABLE_HEADERS = ["ID", "Machine", "Priority", "Type", "Scheduled", "Engineer", "Status", "Action"]

const STATUS_CONFIG = {
    PENDING: {
        label: "Pending",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    },
    IN_PROGRESS: {
        label: "In Progress",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    },
    COMPLETED: {
        label: "Completed",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    },
}

const PRIORITY_CONFIG = {
    URGENT: "text-red-600 dark:text-red-400 font-bold",
    SCHEDULE_SOON: "text-amber-600 dark:text-amber-400 font-semibold",
    OK: "text-emerald-600 dark:text-emerald-400",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// FIX #3: Properly null-guard scheduled_date — new Date(null) = epoch (Jan 1 1970),
// which would cause every null-date work order to appear falsely overdue
const isOverdue = (wo) => {
    if (!wo.scheduled_date || wo.status === "COMPLETED") return false
    const scheduled = new Date(wo.scheduled_date)
    return !isNaN(scheduled.getTime()) && scheduled < new Date()
}

const formatDate = (dateStr) => {
    if (!dateStr) return "—"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "Invalid date"
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

// ─── Empty state ──────────────────────────────────────────────────────────────
// FIX #6: colSpan matches actual TABLE_HEADERS length (8, not 7)
function EmptyState({ filter }) {
    return (
        <tr>
            <td colSpan={TABLE_HEADERS.length}>
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <IconClipboard />
                    <p className="text-sm font-medium mt-3">No work orders</p>
                    <p className="text-xs mt-0.5 text-gray-300">
                        {filter !== "ALL" ? `None with status "${filter}"` : "Nothing to show yet"}
                    </p>
                </div>
            </td>
        </tr>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
// FIX #2: Accept only one canonical set of prop names (onAssign / onComplete).
// Update the parent (WorkOrders.jsx) to pass these names instead.
function WorkOrderTable({
    workOrders = [],
    engineerInputs = {},
    setEngineerInputs = () => { },
    onAssign = () => { },
    onComplete = () => { },
}) {
    const [filter, setFilter] = useState("ALL")

    const filtered = workOrders.filter(
        (wo) => filter === "ALL" || wo.status === filter
    )

    const counts = workOrders.reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] ?? 0) + 1
        return acc
    }, {})

    return (
        <div className="text-gray-800 dark:text-white">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Work Orders</h2>
                    <p className="text-[10px] text-gray-400">{workOrders.length} total</p>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1">
                    <IconFilter />
                    <div className="flex gap-1 ml-1 flex-wrap">
                        {FILTERS.map((f) => {
                            const count = f === "ALL" ? workOrders.length : (counts[f] ?? 0)
                            const isActive = filter === f
                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`
                                        text-[10px] font-semibold px-2 py-1 rounded-lg transition-all
                                        ${isActive
                                            ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        }
                                    `}
                                >
                                    {f === "ALL" ? "All" : STATUS_CONFIG[f]?.label ?? f}
                                    {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-xs text-gray-800 dark:text-gray-200">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                            {/* FIX #5: key on each <th> to silence React warnings */}
                            {TABLE_HEADERS.map((h) => (
                                <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filtered.length === 0 ? (
                            <EmptyState filter={filter} />
                        ) : (
                            filtered.map((wo) => {
                                const overdue = isOverdue(wo)
                                const statusCfg = STATUS_CONFIG[wo.status] ?? STATUS_CONFIG.PENDING

                                return (
                                    // FIX #1: stable key on <tr>
                                    <tr
                                        key={wo.work_order_id}
                                        className={`
                                            transition-colors
                                            ${overdue
                                                ? "bg-red-50 dark:bg-red-900/20"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                            }
                                        `}
                                    >
                                        {/* ID */}
                                        <td className="px-3 py-2.5">
                                            <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                                                #{wo.work_order_id}
                                            </span>
                                        </td>

                                        {/* Machine */}
                                        <td className="px-3 py-2.5">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {wo.machine_id}
                                            </span>
                                        </td>

                                        {/* Priority */}
                                        <td className="px-3 py-2.5">
                                            <span className={`text-xs ${PRIORITY_CONFIG[wo.priority] ?? "text-gray-600"}`}>
                                                {wo.priority}
                                            </span>
                                        </td>

                                        {/* Type */}
                                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {wo.maintenance_type ?? "—"}
                                        </td>

                                        {/* Scheduled date */}
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                {overdue && (
                                                    <span className="text-red-500"><IconClock /></span>
                                                )}
                                                <span className={`text-[10px] ${overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-400"}`}>
                                                    {formatDate(wo.scheduled_date)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Engineer */}
                                        <td className="px-3 py-2.5">
                                            {wo.assigned_engineer ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                                                        <IconUser />
                                                    </div>
                                                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[80px]">
                                                        {wo.assigned_engineer}
                                                    </span>
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Name…"
                                                    value={engineerInputs[wo.work_order_id] ?? ""}
                                                    className="
                                                        w-24 text-xs px-2 py-1 rounded-lg
                                                        bg-gray-100 dark:bg-gray-700
                                                        border border-gray-200 dark:border-gray-600
                                                        text-gray-800 dark:text-white
                                                        placeholder-gray-400
                                                        focus:outline-none focus:ring-2 focus:ring-blue-500
                                                    "
                                                    onChange={(e) =>
                                                        // FIX #4: functional updater avoids stale closure
                                                        setEngineerInputs((prev) => ({
                                                            ...prev,
                                                            [wo.work_order_id]: e.target.value,
                                                        }))
                                                    }
                                                />
                                            )}
                                        </td>

                                        {/* Status badge */}
                                        <td className="px-3 py-2.5">
                                            <span className={`
                                                inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap
                                                ${statusCfg.badge}
                                            `}>
                                                {statusCfg.label}
                                            </span>
                                        </td>

                                        {/* Action buttons */}
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                {wo.status === "PENDING" && (
                                                    <button
                                                        onClick={() => onAssign(wo.work_order_id)}
                                                        disabled={!engineerInputs[wo.work_order_id]?.trim()}
                                                        className="
                                                            flex items-center gap-1
                                                            text-[10px] font-semibold
                                                            bg-blue-500 hover:bg-blue-600
                                                            disabled:opacity-40 disabled:cursor-not-allowed
                                                            text-white px-2 py-1 rounded-lg
                                                            transition-colors active:scale-95
                                                        "
                                                    >
                                                        <IconUser /> Assign
                                                    </button>
                                                )}

                                                {wo.status === "IN_PROGRESS" && (
                                                    <button
                                                        onClick={() => onComplete(wo.work_order_id)}
                                                        className="
                                                            flex items-center gap-1
                                                            text-[10px] font-semibold
                                                            bg-emerald-500 hover:bg-emerald-600
                                                            text-white px-2 py-1 rounded-lg
                                                            transition-colors active:scale-95
                                                        "
                                                    >
                                                        <IconCheck /> Complete
                                                    </button>
                                                )}

                                                {wo.status === "COMPLETED" && (
                                                    <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                                                        <IconCheck /> Done
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default WorkOrderTable