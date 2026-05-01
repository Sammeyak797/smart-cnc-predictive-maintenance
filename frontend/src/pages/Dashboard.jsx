import TrendChart from "../components/TrendChart";
import Header from "../components/Header";
import SummaryCards from "../components/SummaryCards";
import AlertPanel from "../components/AlertPanel";
import WorkOrderTable from "../components/WorkOrderTable";
import MachineControl from "../components/MachineControl";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import { useAppContext } from "../context/AppContext";

const SIMULATION_INTERVAL_MS = 3000;

const SENSOR_LABELS = {
    type: { label: "Machine Type", unit: "" },
    air_temp: { label: "Air Temperature", unit: "K" },
    process_temp: { label: "Process Temperature", unit: "K" },
    rpm: { label: "Spindle Speed", unit: "RPM" },
    torque: { label: "Torque", unit: "Nm" },
    tool_wear: { label: "Tool Wear", unit: "min" },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconActivity = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>);
const IconCpu = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>);
const IconShield = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
const IconTool = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>);
const IconWifi = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" strokeWidth={3} strokeLinecap="round" /></svg>);
const IconZap = () => (<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>);

const PRIORITY_CONFIG = {
    URGENT: { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800", pulse: true, label: "Urgent" },
    SCHEDULE_SOON: { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800", pulse: false, label: "Schedule Soon" },
    OK: { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800", pulse: false, label: "Healthy" },
};
const getPriorityConfig = (p) => PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG.OK;
const RUL_BAR = { red: "bg-red-500", amber: "bg-amber-400", green: "bg-emerald-500" };
const RUL_TEXT = { red: "text-red-600 dark:text-red-400", amber: "text-amber-600 dark:text-amber-400", green: "text-emerald-600 dark:text-emerald-400" };

// ─── Sub-components (unchanged) ───────────────────────────────────────────────
function RulCard({ rul, rulStatus }) {
    const color = rulStatus?.color ?? "green";
    const label = rulStatus?.label ?? "Healthy";
    const pct = Math.max(0, Math.min(100, rul ?? 0));
    return (
        <div className="group relative overflow-hidden bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 sm:p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10 group-hover:opacity-20 transition-opacity" />
            <div className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 mb-2 sm:mb-3"><IconCpu /></div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">RUL (0–100)</p>
            <p className={`text-xl sm:text-2xl font-black leading-none mb-2 ${RUL_TEXT[color]}`}>
                {pct}<span className="text-xs sm:text-sm font-semibold ml-0.5 opacity-50">/ 100</span>
            </p>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full transition-all duration-700 ease-out ${RUL_BAR[color]}`} style={{ width: `${pct}%` }} />
            </div>
            <p className={`text-[10px] sm:text-[11px] font-bold ${RUL_TEXT[color]}`}>{label}</p>
        </div>
    );
}

function KpiCard({ icon, label, value, accent = "blue" }) {
    const g = {
        blue: { grad: "from-blue-500 to-indigo-600", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" },
        green: { grad: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400" },
        amber: { grad: "from-amber-400 to-orange-500", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600 dark:text-amber-400" },
        slate: { grad: "from-slate-500 to-slate-700", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
    }[accent] ?? { grad: "from-blue-500 to-indigo-600", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400" };
    return (
        <div className="group relative overflow-hidden bg-white dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 sm:p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${g.grad} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className={`inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${g.bg} ${g.text} mb-2 sm:mb-3`}>{icon}</div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white truncate leading-none">{value}</p>
        </div>
    );
}

function MachineCard({ machine, isSelected, status, onClick }) {
    const sc = {
        Running: { dot: "bg-emerald-500", label: "text-emerald-600 dark:text-emerald-400", pulse: true },
        Failure: { dot: "bg-red-500", label: "text-red-600 dark:text-red-400", pulse: true },
        Idle: { dot: "bg-amber-400", label: "text-amber-600 dark:text-amber-400", pulse: false },
    }[status.text] ?? { dot: "bg-amber-400", label: "text-amber-600 dark:text-amber-400", pulse: false };
    return (
        <div onClick={onClick}
            className={`relative cursor-pointer rounded-2xl p-3 sm:p-4 border transition-all duration-200 select-none active:scale-[0.97]
                ${isSelected
                    ? "bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 border-transparent shadow-xl shadow-blue-500/25"
                    : "bg-white dark:bg-gray-800/80 border-gray-100 dark:border-gray-700/50 shadow-sm"
                }`}>
            {isSelected && (
                <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
            )}
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest mb-2 ${isSelected ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}>
                <IconWifi /> CNC
            </div>
            <p className={`font-black text-base leading-none mb-1 ${isSelected ? "text-white" : "text-gray-900 dark:text-white"}`}>{machine.machine_id}</p>
            <p className={`text-[10px] mb-2 ${isSelected ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}>Duty: {machine.duty_type ?? "—"}</p>
            <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot} ${sc.pulse ? "animate-pulse" : ""}`} />
                <span className={`text-[11px] font-semibold ${isSelected ? "text-blue-100" : sc.label}`}>{status.text}</span>
            </div>
        </div>
    );
}

function SectionHeader({ title, subtitle, action }) {
    return (
        <div className="flex items-start justify-between mb-4 sm:mb-5">
            <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

function SensorRow({ sensorKey, value }) {
    const meta = SENSOR_LABELS[sensorKey];
    const label = meta?.label ?? sensorKey.replace(/_/g, " ");
    const unit = meta?.unit ?? "";
    const isCritical = sensorKey === "tool_wear" && typeof value === "number" && value >= 230;
    return (
        <div className="flex items-center justify-between py-2 sm:py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
            <span className={`text-xs font-bold tabular-nums font-mono px-2 py-0.5 rounded-md ${isCritical ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200"}`}>
                {typeof value === "number" ? value.toFixed(1) : value}
                {unit && <span className="ml-0.5 opacity-50 font-normal">{unit}</span>}
            </span>
        </div>
    );
}

function EmptyState({ icon, message }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-gray-300 dark:text-gray-600 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">{icon}</div>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 text-center px-4">{message}</p>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard({ darkMode, setDarkMode }) {
    const navigate = useNavigate();
    const {
        selectedMachine, setSelectedMachine,
        isRunning, setIsRunning,
        simulationData, setSimulationData,
    } = useAppContext();

    const [rpmHistory, setRpmHistory] = useState([]);
    const [wearHistory, setWearHistory] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [engineerInputs, setEngineerInputs] = useState({});
    const [machines, setMachines] = useState([]);
    const [shownAlerts, setShownAlerts] = useState(new Set());
    const [activeTab, setActiveTab] = useState("insights");

    // Interval handle — lives in Dashboard, not in context or child components
    const intervalRef = useRef(null);

    // ── Core simulation tick ──────────────────────────────────────────────
    // selectedMachine and setSimulationData are in deps so the callback is
    // always fresh. The interval reads it via a ref (below) to avoid the
    // stale-closure problem that caused the navigation bug.
    const runSimulationTick = useCallback(async () => {
        if (!selectedMachine) return;
        try {
            const res = await API.post("/simulate/", { machine_id: selectedMachine });
            setSimulationData(res.data);
            setRpmHistory((p) => [...p, res.data.sensor_data.rpm].slice(-20));
            setWearHistory((p) => [...p, res.data.sensor_data.tool_wear].slice(-20));
        } catch {
            toast.error("Simulation failed");
        }
    }, [selectedMachine, setSimulationData]);

    // ── BUG FIX (ROOT CAUSE): assign ref synchronously, not in an effect ──
    //
    // WHAT WAS BROKEN:
    //   The old code used useEffect(() => { simulationTickRef.current = fn }, [fn])
    //   to keep the ref in sync. On remount after navigation:
    //     1. Mount-restart effect fires → simulationTickRef.current is still NULL
    //     2. Ref-sync effect fires later → ref is populated, but too late
    //   The interval started with a null ref, so every setInterval callback
    //   called null?.() — a no-op — and the simulation never resumed.
    //
    // THE FIX:
    //   Assign the ref directly in the render body (not in an effect).
    //   This guarantees the ref is populated before any effect runs,
    //   so the restart effect always finds a valid function in the ref.
    const simulationTickRef = useRef(runSimulationTick);
    simulationTickRef.current = runSimulationTick;  // ← always current, always synchronous

    // ── Interval helpers ──────────────────────────────────────────────────
    const startInterval = useCallback(() => {
        if (intervalRef.current) return; // guard against double-start
        intervalRef.current = setInterval(() => {
            simulationTickRef.current?.();
        }, SIMULATION_INTERVAL_MS);
    }, []); // no deps — reads via ref

    const stopInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // ── Single effect that manages the interval lifecycle ─────────────────
    //
    // BUG FIX (SECONDARY): The old code had THREE separate effects for the
    // interval: a mount-restart effect, a ref-sync effect, and a machine-
    // change cleanup effect. They conflicted with each other on remount.
    //
    // Now there is ONE effect keyed on [isRunning, selectedMachine]:
    //   - isRunning=true  → start the interval (or restart after navigation)
    //   - isRunning=false → stop it
    //   - selectedMachine changes → effect re-runs, stopInterval fires first
    //     via cleanup, then starts fresh for the new machine
    //   - unmount (navigation away) → cleanup runs stopInterval,
    //     isRunning stays true in context so we can restart on remount
    useEffect(() => {
        if (isRunning && selectedMachine) {
            // Run one tick immediately so UI shows fresh data right away
            // (covers both first start AND return-from-navigation)
            simulationTickRef.current?.();
            startInterval();
        } else {
            stopInterval();
        }

        return () => {
            // On unmount (navigation away) or dep change: always stop the
            // interval. isRunning is NOT reset here — context preserves it
            // so we can resume when the user comes back.
            stopInterval();
        };
    }, [isRunning, selectedMachine]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Public handlers passed to MachineControl ──────────────────────────
    const handleStart = useCallback(async () => {
        if (!selectedMachine || isRunning) return;
        setIsRunning(true); // effect above will start the interval
    }, [selectedMachine, isRunning, setIsRunning]);

    const handleStop = useCallback(() => {
        setIsRunning(false); // effect above will stop the interval
    }, [setIsRunning]);

    // ── Seed trend history when machine is selected ───────────────────────
    // BUG FIX: old code reset rpmHistory to [] THEN fetched from DB,
    // causing a visible empty-state flash on every navigation back to Dashboard.
    // Fix: fetch first, set state only when data arrives — no flash.
    useEffect(() => {
        if (!selectedMachine) return;
        setShownAlerts(new Set());
        API.get(`/analytics/trends?machine_id=${selectedMachine}&limit=15`)
            .then((res) => {
                setRpmHistory(res.data.rpm ?? []);
                setWearHistory(res.data.tool_wear ?? []);
            })
            .catch(() => { /* non-fatal */ });
        // Note: we do NOT reset rpmHistory/wearHistory to [] here.
        // They keep showing the previous machine's data until the fetch
        // completes — much better than a flash of empty charts.
    }, [selectedMachine]);

    // ── Toast on failure detection ────────────────────────────────────────
    useEffect(() => {
        if (!simulationData) return;
        const failure = simulationData?.prediction?.failure_type;
        const key = `${selectedMachine}-${failure}`;
        if (failure && failure !== "No Failure" && !shownAlerts.has(key)) {
            toast.error(`⚠️ ${selectedMachine}: ${failure} detected`, { duration: 4000 });
            setShownAlerts((p) => new Set(p).add(key));
        }
    }, [simulationData]);

    // ── Polling: alerts + work orders ─────────────────────────────────────
    useEffect(() => { const id = setInterval(fetchAlerts, 3000); return () => clearInterval(id); }, []);
    useEffect(() => { const id = setInterval(fetchWorkOrders, 5000); return () => clearInterval(id); }, []);

    // ── API helpers ───────────────────────────────────────────────────────
    const fetchMachines = async () => { try { const r = await API.get("/machines/"); setMachines(r.data); } catch { toast.error("Failed to load machines"); } };
    const fetchAlerts = async () => { try { const r = await API.get("/alerts/"); setAlerts(r.data); } catch { /* silent */ } };
    const fetchWorkOrders = async () => { try { const r = await API.get("/workorders/"); setWorkOrders(r.data.slice(0, 10)); } catch { /* silent */ } };
    const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };
    const acknowledgeAlert = async (id) => { try { await API.post("/alerts/acknowledge", { machine_id: id }); fetchAlerts(); } catch { toast.error("Acknowledge failed"); } };
    const assignEngineer = async (id) => { const n = engineerInputs[id]; if (!n) return; try { await API.post("/workorders/assign", { work_order_id: id, engineer: n }); fetchWorkOrders(); } catch { toast.error("Assign failed"); } };
    const completeWorkOrder = async (id) => { try { await API.post("/workorders/complete", { work_order_id: id }); fetchWorkOrders(); } catch { toast.error("Complete failed"); } };

    useEffect(() => { fetchMachines(); fetchAlerts(); fetchWorkOrders(); }, []);

    // ── Derived ───────────────────────────────────────────────────────────
    const getMachineStatus = (machineId) => {
        if (!simulationData || selectedMachine !== machineId) return { text: "Idle" };
        if (simulationData?.prediction?.failure_type !== "No Failure") return { text: "Failure" };
        if (isRunning) return { text: "Running" };
        return { text: "Idle" };
    };

    const priorityCfg = getPriorityConfig(simulationData?.maintenance?.priority ?? "OK");
    const rul = simulationData?.rul ?? null;
    const rulStatus = simulationData?.rul_status ?? null;

    const tabs = [
        { key: "insights", label: "Insights" },
        { key: "workorders", label: "Orders", count: workOrders.length },
        { key: "alerts", label: "Alerts", count: alerts.length },
    ];

    const machineControlProps = { selectedMachine, isRunning, onStart: handleStart, onStop: handleStop };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans transition-colors duration-300">
            <Header onLogout={handleLogout} alerts={alerts} onAcknowledge={acknowledgeAlert} darkMode={darkMode} setDarkMode={setDarkMode} />

            <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                <SummaryCards selectedMachine={selectedMachine} alerts={alerts} />

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 sm:gap-6 items-start">

                    {/* LEFT */}
                    <div className="space-y-4 sm:space-y-5 min-w-0">

                        {/* Machine Fleet */}
                        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                            <SectionHeader
                                title="Machine Fleet"
                                subtitle="Tap a card to select a machine"
                                action={
                                    <span className="flex items-center gap-1 text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full whitespace-nowrap">
                                        <IconZap /> {machines.length} Online
                                    </span>
                                }
                            />
                            {machines.length === 0 ? (
                                <EmptyState icon={<IconCpu />} message="No machines found — check your database" />
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
                                    {machines.map((m) => (
                                        <MachineCard key={m.machine_id} machine={m} isSelected={selectedMachine === m.machine_id} status={getMachineStatus(m.machine_id)} onClick={() => setSelectedMachine(m.machine_id)} />
                                    ))}
                                </div>
                            )}
                            {selectedMachine && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-50 dark:border-gray-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                    <span><span className="font-semibold text-blue-600 dark:text-blue-400">{selectedMachine}</span> selected</span>
                                </div>
                            )}
                        </section>

                        {/* Mobile: Machine Control */}
                        <div className="xl:hidden">
                            <MachineControl {...machineControlProps} />
                        </div>

                        {/* Live KPIs */}
                        {simulationData && (
                            <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4 sm:mb-5">
                                    <div>
                                        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Live Sensor Data</h2>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Monitoring {selectedMachine}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full ${priorityCfg.badge}`}>
                                        <span className={`w-2 h-2 rounded-full ${priorityCfg.dot} ${priorityCfg.pulse ? "animate-pulse" : ""}`} />
                                        <span className="hidden sm:inline">{priorityCfg.label}</span>
                                        <span className="sm:hidden">{priorityCfg.label.split(" ")[0]}</span>
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                    <KpiCard icon={<IconShield />} label="Failure" value={simulationData.prediction.failure_type} accent="blue" />
                                    <KpiCard icon={<IconActivity />} label="Confidence" value={`${simulationData.prediction.confidence}%`} accent="slate" />
                                    <RulCard rul={rul} rulStatus={rulStatus} />
                                    <KpiCard icon={<IconTool />} label="Priority" value={priorityCfg.label} accent="amber" />
                                </div>
                            </section>
                        )}

                        {/* Tabs */}
                        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="flex border-b border-gray-100 dark:border-gray-800 px-2 sm:px-4 pt-1 overflow-x-auto scrollbar-none">
                                {tabs.map((tab) => (
                                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                        className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold transition-colors
                                            ${activeTab === tab.key ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${activeTab === tab.key ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                                                {tab.count}
                                            </span>
                                        )}
                                        {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
                                    </button>
                                ))}
                            </div>
                            <div className="p-4 sm:p-6">
                                {activeTab === "insights" && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                Trends for <span className="font-semibold text-gray-600 dark:text-gray-300">{selectedMachine || "—"}</span>
                                            </p>
                                            {rpmHistory.length > 0 && (
                                                <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    {rpmHistory.length} pts · saved
                                                </span>
                                            )}
                                        </div>
                                        {rpmHistory.length > 0 || wearHistory.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                                                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">RPM Trend</p>
                                                    <TrendChart label="RPM" dataPoints={rpmHistory} />
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">Tool Wear</p>
                                                    <TrendChart label="Tool Wear" dataPoints={wearHistory} />
                                                </div>
                                            </div>
                                        ) : (
                                            <EmptyState icon={<IconActivity />} message="Start the simulation to see live trends" />
                                        )}
                                    </div>
                                )}
                                {activeTab === "workorders" && <WorkOrderTable workOrders={workOrders} engineerInputs={engineerInputs} setEngineerInputs={setEngineerInputs} onAssign={assignEngineer} onComplete={completeWorkOrder} />}
                                {activeTab === "alerts" && <AlertPanel alerts={alerts} onAcknowledge={acknowledgeAlert} />}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT — desktop sticky sidebar */}
                    <div className="hidden xl:flex flex-col space-y-5 sticky top-[85px]">
                        <MachineControl {...machineControlProps} />

                        {simulationData && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400"><IconTool /></div>
                                    <div>
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Failure Analysis</h3>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">AI-generated diagnosis</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Possible Cause</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{simulationData.analysis?.possible_cause ?? "—"}</p>
                                    </div>
                                    <div className="bg-blue-50/70 dark:bg-blue-900/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-800/30">
                                        <p className="text-[10px] font-bold text-blue-400 dark:text-blue-500 uppercase tracking-widest mb-1.5">Recommendation</p>
                                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{simulationData.analysis?.recommendation ?? "—"}</p>
                                    </div>
                                    {simulationData.analysis?.severity_note && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Severity:</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${simulationData.analysis.severity_note === "Critical" ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : simulationData.analysis.severity_note === "High" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                                {simulationData.analysis.severity_note}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {simulationData && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Sensor Snapshot</h3>
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                    </span>
                                </div>
                                {Object.entries(simulationData.sensor_data ?? {}).map(([k, v]) => <SensorRow key={k} sensorKey={k} value={v} />)}
                            </div>
                        )}

                        {!simulationData && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8">
                                <EmptyState icon={<IconCpu />} message="Select a machine and press Start" />
                            </div>
                        )}
                    </div>

                    {/* Mobile: Failure Analysis + Sensor below tabs */}
                    {simulationData && (
                        <div className="xl:hidden space-y-4">
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400"><IconTool /></div>
                                    <div>
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">Failure Analysis</h3>
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">AI-generated diagnosis</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
                                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Possible Cause</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{simulationData.analysis?.possible_cause ?? "—"}</p>
                                    </div>
                                    <div className="bg-blue-50/70 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-100 dark:border-blue-800/30">
                                        <p className="text-[10px] font-bold text-blue-400 dark:text-blue-500 uppercase tracking-widest mb-1">Recommendation</p>
                                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">{simulationData.analysis?.recommendation ?? "—"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Sensor Snapshot</h3>
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                    </span>
                                </div>
                                {Object.entries(simulationData.sensor_data ?? {}).map(([k, v]) => <SensorRow key={k} sensorKey={k} value={v} />)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;