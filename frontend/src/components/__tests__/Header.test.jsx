import { render, screen } from "@testing-library/react"
import Header from "../Header"

describe("Header Component", () => {
    test("renders dashboard title", () => {
        render(<Header alerts={[]} onLogout={() => { }} />)

        const title = screen.getByText(/CNC Fleet Dashboard/i)
        expect(title).toBeInTheDocument()
    })

    test("renders logout button", () => {
        render(<Header alerts={[]} onLogout={() => { }} />)

        const logoutBtn = screen.getByText(/Logout/i)
        expect(logoutBtn).toBeInTheDocument()
    })
})