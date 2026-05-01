// frontend/src/__tests__/components/SummaryCards.test.jsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import SummaryCards from "../../components/SummaryCards"

// Mock the AppContext so the test doesn't need a real provider
vi.mock("../../context/AppContext", () => ({
    useAppContext: () => ({
        isRunning: false,
        simulationData: null,
    }),
}))

describe("SummaryCards", () => {
    it("renders the selected machine name", () => {
        render(<SummaryCards selectedMachine="CNC-01" alerts={[]} />)
        expect(screen.getByText("CNC-01")).toBeInTheDocument()
    })

    it("shows zero alerts when alerts array is empty", () => {
        render(<SummaryCards selectedMachine="CNC-01" alerts={[]} />)
        // The active alerts count should be 0
        expect(screen.getByText("0")).toBeInTheDocument()
    })

    it("shows correct alert count", () => {
        const fakeAlerts = [
            { machine_id: "CNC-01", failure: "Tool Wear Failure" },
            { machine_id: "CNC-02", failure: "Power Failure" },
        ]
        render(<SummaryCards selectedMachine="CNC-01" alerts={fakeAlerts} />)
        expect(screen.getByText("2")).toBeInTheDocument()
    })

    it("shows idle status when simulation is not running", () => {
        render(<SummaryCards selectedMachine="CNC-01" alerts={[]} />)
        expect(screen.getByText("Idle")).toBeInTheDocument()
    })

    it("does not crash when no machine is selected", () => {
        render(<SummaryCards selectedMachine="" alerts={[]} />)
        // Should render without throwing
        expect(screen.getByText("Active Alerts")).toBeInTheDocument()
    })
})