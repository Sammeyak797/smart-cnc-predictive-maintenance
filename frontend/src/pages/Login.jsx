import { useState } from "react"
import { useNavigate } from "react-router-dom"
import API from "../services/api"

function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const validate = () => {
        if (!email.trim() || !password.trim()) {
            setError("Email and password are required.")
            return false
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError("Please enter a valid email address.")
            return false
        }
        return true
    }

    const handleLogin = async () => {
        setError("")

        if (!validate()) return

        setLoading(true)
        try {
            const res = await API.post("/auth/login", { email, password })

            if (!res.data.token) {
                setError("Login failed: No token received from server.")
                return
            }

            localStorage.setItem("token", res.data.token)
            navigate("/dashboard")

        } catch (err) {
            const message =
                err.response?.data?.message ||
                "Login failed. Please check your credentials and try again."
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter") handleLogin()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    CNC Maintenance Login
                </h2>

                {error && (
                    <p className="text-red-500 mb-4 text-sm">{error}</p>
                )}

                <input
                    type="email"
                    placeholder="Email"
                    className="w-full mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full mb-4 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </div>
        </div>
    )
}

export default Login