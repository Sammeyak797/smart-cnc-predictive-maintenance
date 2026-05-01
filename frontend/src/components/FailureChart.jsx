import { Pie } from "react-chartjs-2"
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js"

ChartJS.register(ArcElement, Tooltip, Legend)

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
    { bg: "#3b82f6", hover: "#2563eb" }, // blue
    { bg: "#ef4444", hover: "#dc2626" }, // red
    { bg: "#f59e0b", hover: "#d97706" }, // amber
    { bg: "#10b981", hover: "#059669" }, // emerald
    { bg: "#8b5cf6", hover: "#7c3aed" }, // violet
    { bg: "#06b6d4", hover: "#0891b2" }, // cyan
    { bg: "#f97316", hover: "#ea580c" }, // orange
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

// BUG FIX #2: guard against null/undefined _id from unclassified DB entries
const formatLabel = (id) => {
    if (!id || id === "null" || id === "undefined") return "Unclassified"
    // Convert snake_case / ALL_CAPS to Title Case for readability
    return id
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
}

const total = (counts) => counts.reduce((a, b) => a + b, 0)

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4m0 4h.01" />
            </svg>
            <p className="text-sm font-medium">No failure data</p>
            <p className="text-xs mt-0.5 text-gray-300">Run a simulation to populate this chart</p>
        </div>
    )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function CustomLegend({ labels, counts, colors }) {
    const sum = total(counts)
    return (
        <div className="space-y-2 mt-4">
            {labels.map((label, i) => {
                const pct = sum > 0 ? ((counts[i] / sum) * 100).toFixed(1) : "0.0"
                const color = colors[i % colors.length]
                return (
                    <div key={label} className="flex items-center gap-2.5">
                        <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color.bg }}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">
                            {label}
                        </span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                            {counts[i]}
                        </span>
                        <span className="text-[10px] text-gray-400 tabular-nums w-10 text-right">
                            {pct}%
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function FailureChart({ summary }) {
    if (!summary || summary.length === 0) return <EmptyState />

    // BUG FIX #2: sanitize labels before they reach Chart.js
    const labels = summary.map((item) => formatLabel(item._id))
    const counts = summary.map((item) => item.count ?? 0)

    const data = {
        labels,
        datasets: [
            {
                data: counts,
                backgroundColor: COLORS.map((c) => c.bg),
                hoverBackgroundColor: COLORS.map((c) => c.hover),
                // BUG FIX #1: set border to transparent so dark mode doesn't show
                // the hardcoded white slice borders Chart.js applies by default
                borderColor: "transparent",
                borderWidth: 0,
                hoverOffset: 6,
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "60%", // donut style — more readable than full pie for small slices
        plugins: {
            // Disable built-in legend — we render our own CustomLegend below
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const sum = total(counts)
                        const pct = sum > 0 ? ((ctx.parsed / sum) * 100).toFixed(1) : "0.0"
                        return `  ${ctx.label}: ${ctx.parsed} (${pct}%)`
                    },
                },
                backgroundColor: "rgba(15,23,42,0.85)",
                titleColor: "#f1f5f9",
                bodyColor: "#cbd5e1",
                borderColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
            },
        },
    }

    const sum = total(counts)
    const dominantIdx = counts.indexOf(Math.max(...counts))

    return (
        <div>
            {/* Donut + center label */}
            <div className="relative flex items-center justify-center">
                <Pie data={data} options={options} />

                {/* Center annotation — shows dominant failure type */}
                <div className="absolute flex flex-col items-center pointer-events-none select-none">
                    <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                        {sum}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight text-center max-w-[60px] truncate">
                        {labels[dominantIdx] ?? "Events"}
                    </p>
                </div>
            </div>

            {/* Custom legend with counts + percentages */}
            <CustomLegend labels={labels} counts={counts} colors={COLORS} />
        </div>
    )
}

export default FailureChart