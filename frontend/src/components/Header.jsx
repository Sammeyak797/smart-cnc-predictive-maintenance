import { useState, useRef, useEffect } from "react"

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconSun = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
)

const IconMoon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
)

const IconBell = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
)

const IconLogout = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
)

const IconCheck = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
    </svg>
)

const IconShield = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
)

// ─── Severity helper (mirrors AlertPanel logic) ───────────────────────────────
const getSeverity = (alert) => {
    if (alert.failure?.includes("Power") || alert.failure_type?.includes("Power")) return "CRITICAL"
    if (alert.failure?.includes("Wear") || alert.failure_type?.includes("Wear")) return "WARNING"
    return "INFO"
}

const SEVERITY_STYLES = {
    CRITICAL: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
    WARNING: { dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
    INFO: { dot: "bg-blue-400", text: "text-blue-600 dark:text-blue-400" },
}

// ─── Alert Row (inside dropdown) ──────────────────────────────────────────────
function DropdownAlertRow({ alert, onAcknowledge }) {
    const severity = getSeverity(alert)
    const style = SEVERITY_STYLES[severity]
    // BUG FIX #1: stable key — use alert.id or a composite, NOT array index
    const label = alert.failure ?? alert.failure_type ?? "Unknown failure"

    return (
        <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {alert.machine_id}
                </p>
                <p className={`text-xs truncate ${style.text}`}>{label}</p>
                {alert.cause && (
                    <p className="text-[10px] text-gray-400 truncate">{alert.cause}</p>
                )}
            </div>
            <button
                onClick={() => onAcknowledge(alert.id ?? alert.machine_id)}
                className="
          flex-shrink-0 flex items-center gap-1
          text-[10px] font-semibold
          bg-gray-100 dark:bg-gray-700
          text-gray-600 dark:text-gray-300
          hover:bg-green-100 dark:hover:bg-green-900/40
          hover:text-green-700 dark:hover:text-green-400
          px-2 py-1 rounded-lg transition-colors
        "
            >
                <IconCheck /> Ack
            </button>
        </div>
    )
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({
    onLogout,
    alerts = [],
    onAcknowledge = () => { },
    darkMode = false,
    setDarkMode = () => { },
}) {
    const [showAlerts, setShowAlerts] = useState(false)
    const dropdownRef = useRef(null)

    // BUG FIX #3: close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowAlerts(false)
            }
        }
        if (showAlerts) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [showAlerts])

    const criticalCount = alerts.filter((a) => getSeverity(a) === "CRITICAL").length
    const hasAlerts = alerts.length > 0

    return (
        <header className="
      flex justify-between items-center
      bg-white dark:bg-slate-900
      border-b border-gray-100 dark:border-gray-800
      px-6 py-4
      sticky top-0 z-40
    ">
            {/* ── Left: Brand ── */}
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-200 dark:shadow-blue-900">
                    <IconShield />
                </div>
                <div>
                    <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        CNC Fleet Dashboard
                    </h1>
                    <p className="text-[10px] text-gray-400 leading-tight">
                        Real-time Predictive Maintenance
                    </p>
                </div>
            </div>

            {/* ── Right: Controls ── */}
            <div className="flex items-center gap-2">

                {/* Dark mode toggle */}
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    className="
            w-9 h-9 flex items-center justify-center rounded-xl
            bg-gray-100 dark:bg-slate-800
            text-gray-500 dark:text-gray-400
            hover:bg-gray-200 dark:hover:bg-slate-700
            hover:text-gray-800 dark:hover:text-white
            transition-colors
          "
                >
                    {darkMode ? <IconSun /> : <IconMoon />}
                </button>

                {/* Alert bell */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowAlerts((prev) => !prev)}
                        title="View alerts"
                        className={`
              relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors
              ${showAlerts
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                            }
              ${/* BUG FIX #2: only animate when alerts exist AND dropdown is closed */ ""}
              ${hasAlerts && !showAlerts ? "animate-bounce" : ""}
            `}
                    >
                        <IconBell />
                        {/* Badge */}
                        {hasAlerts && (
                            <span className="
                absolute -top-1 -right-1
                min-w-[18px] h-[18px] px-1
                flex items-center justify-center
                bg-red-500 text-white
                text-[10px] font-bold rounded-full
                shadow-sm
              ">
                                {alerts.length > 99 ? "99+" : alerts.length}
                            </span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {showAlerts && (
                        <div className="
              absolute right-0 mt-2 w-80
              bg-white dark:bg-slate-900
              border border-gray-100 dark:border-gray-800
              rounded-2xl shadow-xl shadow-black/10
              z-50 overflow-hidden
            ">
                            {/* Dropdown header */}
                            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        Active Alerts
                                    </p>
                                    {criticalCount > 0 && (
                                        <p className="text-[10px] text-red-500 font-medium">
                                            {criticalCount} critical
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-gray-400">{alerts.length} total</span>
                            </div>

                            {/* Alert list */}
                            <div className="px-4 max-h-72 overflow-y-auto">
                                {alerts.length === 0 ? (
                                    <div className="py-8 flex flex-col items-center text-gray-400">
                                        <IconBell />
                                        <p className="text-xs mt-2">No active alerts</p>
                                    </div>
                                ) : (
                                    alerts.map((alert) => (
                                        // BUG FIX #1: stable composite key, not array index
                                        <DropdownAlertRow
                                            key={alert.id ?? `${alert.machine_id}-${alert.failure ?? alert.failure_type}`}
                                            alert={alert}
                                            onAcknowledge={(id) => {
                                                onAcknowledge(id)
                                                // Auto-close dropdown if last alert acknowledged
                                                if (alerts.length === 1) setShowAlerts(false)
                                            }}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            {alerts.length > 0 && (
                                <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        onClick={() => {
                                            alerts.forEach((a) => onAcknowledge(a.id ?? a.machine_id))
                                            setShowAlerts(false)
                                        }}
                                        className="
                      w-full text-xs font-semibold text-center
                      text-gray-500 dark:text-gray-400
                      hover:text-red-600 dark:hover:text-red-400
                      transition-colors py-1
                    "
                                    >
                                        Acknowledge all
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Logout */}
                <button
                    onClick={onLogout}
                    className="
            flex items-center gap-2
            bg-red-500 hover:bg-red-600 active:scale-95
            text-white text-sm font-semibold
            px-4 py-2 rounded-xl
            shadow-sm shadow-red-200 dark:shadow-red-900
            transition-all
          "
                >
                    <IconLogout />
                    Logout
                </button>
            </div>
        </header>
    )
}

export default Header