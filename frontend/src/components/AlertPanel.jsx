import { useState } from "react"

// ─── Icons ──────────────────────────────────────────────────────────────────
const IconAlertTriangle = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)

const IconZap = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
)

const IconInfo = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
)

const IconCheck = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const IconBell = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
)

const IconFilter = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
)

// ─── Config ──────────────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
    CRITICAL: {
        label: "Critical",
        icon: <IconZap />,
        bar: "bg-red-500",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
        border: "border-l-red-500",
        bg: "bg-red-50 dark:bg-red-900/10",
        dot: "bg-red-500",
        pulse: true,
    },
    WARNING: {
        label: "Warning",
        icon: <IconAlertTriangle />,
        bar: "bg-amber-400",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
        border: "border-l-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/10",
        dot: "bg-amber-400",
        pulse: false,
    },
    INFO: {
        label: "Info",
        icon: <IconInfo />,
        bar: "bg-blue-400",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
        border: "border-l-blue-400",
        bg: "bg-blue-50 dark:bg-blue-900/10",
        dot: "bg-blue-400",
        pulse: false,
    },
}

const FILTERS = ["ALL", "CRITICAL", "WARNING", "INFO"]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getSeverity = (alert) => {
    if (alert.failure?.includes("Power")) return "CRITICAL"
    if (alert.failure?.includes("Wear")) return "WARNING"
    return "INFO"
}

// BUG FIX: stable key — prefer alert.id, fall back to machine_id + failure combo
const getAlertKey = (alert) =>
    alert.id ?? `${alert.machine_id}-${alert.failure}-${alert.cause}`

// ─── Alert Row ────────────────────────────────────────────────────────────────
function AlertRow({ alert, onAcknowledge, acknowledging }) {
    const severity = getSeverity(alert)
    const cfg = SEVERITY_CONFIG[severity]

    return (
        <div
            className={`
        relative flex items-start gap-3 p-3.5 rounded-xl
        border-l-4 ${cfg.border} ${cfg.bg}
        border border-gray-100 dark:border-gray-700/50
        transition-all duration-200
        ${acknowledging ? "opacity-50 scale-[0.98]" : ""}
      `}
        >
            {/* Severity icon */}
            <div className={`
        mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
        ${cfg.badge}
      `}>
                {cfg.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {alert.machine_id}
                    </p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                    </span>
                    {cfg.pulse && (
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                    )}
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {alert.failure}
                </p>

                {alert.cause && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                        Cause: {alert.cause}
                    </p>
                )}
            </div>

            {/* BUG FIX: pass alert.id if available so backend can target the specific alert,
          not just machine_id which would acknowledge ALL alerts for that machine */}
            <button
                onClick={() => onAcknowledge(alert.id ?? alert.machine_id)}
                disabled={acknowledging}
                title="Acknowledge"
                className="
          flex-shrink-0 flex items-center gap-1
          text-[10px] font-semibold
          bg-white dark:bg-gray-700
          border border-gray-200 dark:border-gray-600
          text-gray-600 dark:text-gray-300
          px-2 py-1 rounded-lg
          hover:bg-gray-50 dark:hover:bg-gray-600
          hover:text-gray-900 dark:hover:text-white
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors
        "
            >
                <IconCheck />
                Ack
            </button>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function AlertPanel({ alerts = [], onAcknowledge }) {
    const [filter, setFilter] = useState("ALL")
    // Track which alerts are mid-acknowledge for optimistic UI
    const [acknowledging, setAcknowledging] = useState(new Set())

    const handleAcknowledge = async (alertId) => {
        setAcknowledging((prev) => new Set(prev).add(alertId))
        try {
            await onAcknowledge(alertId)
        } finally {
            setAcknowledging((prev) => {
                const next = new Set(prev)
                next.delete(alertId)
                return next
            })
        }
    }

    const filteredAlerts =
        filter === "ALL"
            ? alerts
            : alerts.filter((a) => getSeverity(a) === filter)

    // Counts per severity for filter badges
    const counts = alerts.reduce((acc, a) => {
        const s = getSeverity(a)
        acc[s] = (acc[s] ?? 0) + 1
        return acc
    }, {})

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400">
                        <IconBell />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Alerts</h2>
                        <p className="text-[10px] text-gray-400">{alerts.length} total</p>
                    </div>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1">
                    <IconFilter />
                    <div className="flex gap-1 ml-1">
                        {FILTERS.map((f) => {
                            const cfg = f !== "ALL" ? SEVERITY_CONFIG[f] : null
                            const count = f === "ALL" ? alerts.length : (counts[f] ?? 0)
                            const isActive = filter === f

                            return (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`
                    text-[10px] font-semibold px-2 py-1 rounded-lg transition-all
                    ${isActive
                                            ? f === "ALL"
                                                ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                                                : cfg.badge
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        }
                  `}
                                >
                                    {f === "ALL" ? "All" : cfg.label}
                                    {count > 0 && (
                                        <span className="ml-1 opacity-70">{count}</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── Alert List ── */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                {filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <IconBell />
                        </div>
                        <p className="text-sm font-medium">No {filter !== "ALL" ? filter.toLowerCase() : ""} alerts</p>
                        <p className="text-xs mt-0.5 text-gray-300">All clear for now</p>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => {
                        // BUG FIX: stable key instead of array index
                        const key = getAlertKey(alert)
                        return (
                            <AlertRow
                                key={key}
                                alert={alert}
                                onAcknowledge={handleAcknowledge}
                                acknowledging={acknowledging.has(alert.id ?? alert.machine_id)}
                            />
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default AlertPanel