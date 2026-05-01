import { useState } from "react";

const IconPlay = () => (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>);
const IconStop = () => (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>);
const IconCpu = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>);

/**
 * MachineControl — pure UI for Start/Stop.
 *
 * All polling logic lives in Dashboard.jsx.
 * onStart()  → called once when user clicks Start  (Dashboard starts the interval)
 * onStop()   → called once when user clicks Stop   (Dashboard clears the interval)
 */
function MachineControl({ selectedMachine, isRunning, onStart, onStop }) {
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        if (!selectedMachine || isRunning || loading) return;
        setLoading(true);
        try {
            await onStart();
        } catch {
            // errors handled by Dashboard via toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <IconCpu />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white">Machine Control</h2>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Start or stop simulation</p>
                </div>
            </div>

            {/* Active machine display */}
            <div className="mb-4 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                    Active Machine
                </p>
                {selectedMachine ? (
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedMachine}</p>
                ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">None selected — click a card above</p>
                )}
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-slate-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                    {isRunning
                        ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Simulation running…</span>
                        : "Simulation stopped"
                    }
                </span>
            </div>

            {/* Start / Stop */}
            <div className="grid grid-cols-2 gap-2.5">
                <button
                    onClick={handleStart}
                    disabled={!selectedMachine || isRunning || loading}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-150"
                >
                    {loading
                        ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        : <IconPlay />
                    }
                    {loading ? "Starting…" : "Start"}
                </button>

                <button
                    onClick={onStop}
                    disabled={!isRunning}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-95 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-150"
                >
                    <IconStop /> Stop
                </button>
            </div>
        </div>
    );
}

export default MachineControl;