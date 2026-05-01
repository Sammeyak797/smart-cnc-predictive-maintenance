import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js"
import { Line } from "react-chartjs-2"

// Filler must be registered to use backgroundColor area fill
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
)

// ─── Color palette — one per chart instance, keyed by label ──────────────────
const CHART_COLORS = {
    RPM: {
        line: "rgb(59, 130, 246)",        // blue-500
        fill: "rgba(59, 130, 246, 0.08)", // blue translucent
        point: "rgb(37, 99, 235)",         // blue-600
        gridColor: "rgba(59, 130, 246, 0.06)",
    },
    "Tool Wear": {
        line: "rgb(16, 185, 129)",        // emerald-500
        fill: "rgba(16, 185, 129, 0.08)",
        point: "rgb(5, 150, 105)",         // emerald-600
        gridColor: "rgba(16, 185, 129, 0.06)",
    },
    default: {
        line: "rgb(139, 92, 246)",        // violet-500
        fill: "rgba(139, 92, 246, 0.08)",
        point: "rgb(109, 40, 217)",
        gridColor: "rgba(139, 92, 246, 0.06)",
    },
}

const getColors = (label) => CHART_COLORS[label] ?? CHART_COLORS.default

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ label }) {
    return (
        <div className="flex flex-col items-center justify-center h-32 text-gray-300 dark:text-gray-600 select-none">
            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <p className="text-xs">No {label} data yet</p>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
function TrendChart({
    label,
    dataPoints = [],     // BUG FIX #2: default to [] — prevents .map() crash on undefined
    color,               // optional override; falls back to palette below
}) {
    // BUG FIX #2: also guard against empty array — nothing to render
    if (!dataPoints || dataPoints.length === 0) return <EmptyState label={label} />

    const palette = getColors(label)

    // BUG FIX #1: use palette colors when no color prop is passed
    const lineColor = color ?? palette.line

    // BUG FIX #3: backgroundColor must be translucent for area fill,
    // NOT the same opaque value as borderColor
    const fillColor = color
        ? lineColor.replace("rgb(", "rgba(").replace(")", ", 0.08)")
        : palette.fill

    const labels = dataPoints.map((_, i) => i + 1)
    const minVal = Math.min(...dataPoints)
    const maxVal = Math.max(...dataPoints)
    const padding = (maxVal - minVal) * 0.2 || 5 // graceful padding even if flat

    const data = {
        labels,
        datasets: [
            {
                label,
                data: dataPoints,
                borderColor: lineColor,
                backgroundColor: fillColor,  // BUG FIX #3: translucent fill
                pointBackgroundColor: color ?? palette.point,
                pointBorderColor: "transparent",
                pointRadius: 3,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: lineColor,
                tension: 0.4,
                fill: true,       // enable area fill (requires Filler plugin)
                borderWidth: 2,
            },
        ],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
            duration: 400,
            easing: "easeInOutQuart",
        },
        plugins: {
            legend: { display: false }, // label shown in parent card header, not here
            tooltip: {
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                titleColor: "#f1f5f9",
                bodyColor: "#94a3b8",
                borderColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                    title: (items) => `Point ${items[0].label}`,
                    label: (item) => `  ${label}: ${Number(item.raw).toFixed(2)}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    color: "rgba(148,163,184,0.08)",
                    drawBorder: false,
                },
                ticks: {
                    color: "#94a3b8",
                    font: { size: 10 },
                    maxTicksLimit: 8,
                },
            },
            y: {
                min: minVal - padding,
                max: maxVal + padding,
                grid: {
                    color: "rgba(148,163,184,0.08)",
                    drawBorder: false,
                },
                ticks: {
                    color: "#94a3b8",
                    font: { size: 10 },
                    maxTicksLimit: 5,
                    callback: (val) => Number(val).toFixed(0),
                },
            },
        },
    }

    return <Line data={data} options={options} />
}

export default TrendChart