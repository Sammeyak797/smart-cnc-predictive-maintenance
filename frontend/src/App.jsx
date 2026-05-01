import { Routes, Route, useLocation } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import WorkOrders from "./pages/WorkOrders"
import Analytics from "./pages/Analytics"
import MachineCompare from "./pages/MachineCompare"
import Sidebar from "./components/Sidebar"
import { useState, useEffect } from "react"
import Login from "./pages/Login"
import { Navigate } from "react-router-dom"

function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true")
  const isAuthenticated = !!localStorage.getItem("token")
  const location = useLocation()
  const hideSidebar = location.pathname === "/login"

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    localStorage.setItem("darkMode", darkMode)
  }, [darkMode])

  return (
    // On mobile: full width (sidebar is a drawer overlay).
    // On lg+: sidebar (w-60) + content side-by-side.
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {!hideSidebar && isAuthenticated && <Sidebar />}

      {/* Content area — on mobile takes full width since sidebar is a drawer */}
      <div className="flex-1 min-w-0 overflow-x-hidden">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard"
            element={isAuthenticated ? <Dashboard darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />}
          />
          <Route path="/analytics"
            element={isAuthenticated ? <Analytics /> : <Navigate to="/login" />}
          />
          <Route path="/workorders"
            element={isAuthenticated ? <WorkOrders /> : <Navigate to="/login" />}
          />
          <Route path="/compare"
            element={isAuthenticated ? <MachineCompare /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </div>
  )
}

export default App