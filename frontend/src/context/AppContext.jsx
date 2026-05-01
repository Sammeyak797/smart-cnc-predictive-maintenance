import { createContext, useContext, useState, useRef } from "react"

const AppContext = createContext()

export function AppProvider({ children }) {
    const [selectedMachine, setSelectedMachineRaw] = useState(() => {
        const fromCompare = sessionStorage.getItem("selectedMachine")
        if (fromCompare) {
            sessionStorage.removeItem("selectedMachine")
            return fromCompare
        }
        return localStorage.getItem("lastMachine") ?? ""
    })

    const [isRunning, setIsRunning] = useState(false)
    const [simulationData, setSimulationData] = useState(null)

    const prevMachineRef = useRef(selectedMachine)

    const setSelectedMachine = (id) => {
        if (id === prevMachineRef.current) return
        prevMachineRef.current = id
        setSelectedMachineRaw(id)
        if (id) localStorage.setItem("lastMachine", id)
        setIsRunning(false)
        setSimulationData(null)
    }

    return (
        <AppContext.Provider value={{
            selectedMachine,
            setSelectedMachine,
            isRunning,
            setIsRunning,
            simulationData,
            setSimulationData,
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useAppContext() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error("useAppContext must be used inside AppProvider")
    return ctx
}