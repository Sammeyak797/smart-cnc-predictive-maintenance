// frontend/src/__tests__/components/MachineControl.test.jsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import MachineControl from "../../components/MachineControl"

describe("MachineControl", () => {
    const defaultProps = {
        selectedMachine: "CNC-01",
        isRunning: false,
        onStart: vi.fn(),
        onStop: vi.fn(),
    }

    it("renders the active machine name", () => {
        render(<MachineControl {...defaultProps} />)
        expect(screen.getByText("CNC-01")).toBeInTheDocument()
    })

    it("shows 'None selected' when no machine is selected", () => {
        render(<MachineControl {...defaultProps} selectedMachine="" />)
        expect(screen.getByText(/None selected/i)).toBeInTheDocument()
    })

    it("Start button is disabled when no machine is selected", () => {
        render(<MachineControl {...defaultProps} selectedMachine="" />)
        const startBtn = screen.getByRole("button", { name: /start/i })
        expect(startBtn).toBeDisabled()
    })

    it("Start button is disabled when simulation is already running", () => {
        render(<MachineControl {...defaultProps} isRunning={true} />)
        const startBtn = screen.getByRole("button", { name: /start/i })
        expect(startBtn).toBeDisabled()
    })

    it("Stop button is disabled when simulation is not running", () => {
        render(<MachineControl {...defaultProps} isRunning={false} />)
        const stopBtn = screen.getByRole("button", { name: /stop/i })
        expect(stopBtn).toBeDisabled()
    })

    it("Stop button is enabled when simulation is running", () => {
        render(<MachineControl {...defaultProps} isRunning={true} />)
        const stopBtn = screen.getByRole("button", { name: /stop/i })
        expect(stopBtn).not.toBeDisabled()
    })

    it("calls onStop when Stop is clicked", () => {
        const onStop = vi.fn()
        render(<MachineControl {...defaultProps} isRunning={true} onStop={onStop} />)
        fireEvent.click(screen.getByRole("button", { name: /stop/i }))
        expect(onStop).toHaveBeenCalledTimes(1)
    })

    it("shows running status when isRunning is true", () => {
        render(<MachineControl {...defaultProps} isRunning={true} />)
        expect(screen.getByText(/simulation running/i)).toBeInTheDocument()
    })
})