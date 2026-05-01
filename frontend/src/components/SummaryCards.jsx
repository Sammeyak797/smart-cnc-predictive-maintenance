import { useAppContext } from "../context/AppContext"

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconCpu = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="14" x2="23" y2="14" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
)

const IconActivity = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
)

const IconAlertTriangle = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
)

// ─── Status config ────────────────────────────────────────────────────────────
const getSystemStatus = (isRunning, simulationData) => {
    // BUG FIX #1: derive real status from context instead of hardcoding "Running"
    if (!isRunning) {
        return {
            label: "Idle",
            dot: "bg-amber-400",
            pulse: false,
            text: "text-amber-600 dark:text-amber-400",
        }
    }

    const priority = simulationData?.maintenance?.priority

    if (priority === "URGENT") {
        return {
            label: "Critical",
            dot: "bg-red-500",
            pulse: true,
            text: "text-red-600 dark:text-red-400",
        }
    }

    if (priority === "SCHEDULE_SOON") {
        return {
            label: "Warning",
            dot: "bg-amber-400",
            pulse: true,
            text: "text-amber-600 dark:text-amber-400",
        }
    }

    return {
        label: "Running",
        dot: "bg-emerald-500",
        pulse: true,
        text: "text-emerald-600 dark:text-emerald-400",
    }
}

// ─── Single card ──────────────────────────────────────────────────────────────
function Card({ icon, iconBg, label, children }) {
    return (
        <div className="
      relative overflow-hidden
      bg-white dark:bg-gray-900
      border border-gray-100 dark:border-gray-800
      rounded-2xl p-5 shadow-sm
      hover:shadow-md transition-shadow
    ">
            {/* Soft background circle for depth */}
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 ${iconBg}`} />

            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${iconBg} text-white`}>
                {icon}
            </div>

            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {label}
            </p>

            {children}
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
function SummaryCards({
    selectedMachine,
    alerts = [], // BUG FIX #2: default to [] so .length never throws on undefined
}) {
    // BUG FIX #1: read real running state from context
    const { isRunning, simulationData } = useAppContext()
    const status = getSystemStatus(isRunning, simulationData)

    const criticalAlerts = alerts.filter(
        (a) => a.failure?.includes("Power") || a.failure_type?.includes("Power")
    ).length

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Card 1 — Selected Machine */}
            <Card
                icon={<IconCpu />}
                iconBg="bg-blue-500"
                label="Selected Machine"
            >
                {selectedMachine ? (
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {selectedMachine}
                    </p>
                ) : (
                    <p className="text-sm text-gray-400 italic">None selected</p>
                )}
            </Card>

            {/* Card 2 — System Status (BUG FIX #1: no longer hardcoded) */}
            <Card
                icon={<IconActivity />}
                iconBg={
                    status.label === "Running" ? "bg-emerald-500" :
                        status.label === "Critical" ? "bg-red-500" :
                            status.label === "Warning" ? "bg-amber-400" :
                                "bg-slate-400"
                }
                label="System Status"
            >
                <div className="flex items-center gap-2">
                    <span className={`
            w-2.5 h-2.5 rounded-full flex-shrink-0
            ${status.dot}
            ${status.pulse ? "animate-pulse" : ""}
          `} />
                    <span className={`text-lg font-bold ${status.text}`}>
                        {status.label}
                    </span>
                </div>
            </Card>

            {/* Card 3 — Active Alerts */}
            <Card
                icon={<IconAlertTriangle />}
                iconBg={alerts.length > 0 ? "bg-red-500" : "bg-slate-400"}
                label="Active Alerts"
            >
                <div className="flex items-end gap-2">
                    <p className={`text-lg font-bold ${alerts.length === 0
                            ? "text-gray-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                        {alerts.length}
                    </p>

                    {/* Show critical sub-count if any */}
                    {criticalAlerts > 0 && (
                        <p className="text-[11px] text-red-500 font-semibold mb-0.5">
                            {criticalAlerts} critical
                        </p>
                    )}

                    {alerts.length === 0 && (
                        <p className="text-[11px] text-gray-400 mb-0.5">All clear</p>
                    )}
                </div>
            </Card>

        </div>
    )
}

export default SummaryCards