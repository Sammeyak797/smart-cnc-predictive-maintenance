import { NavLink, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconDashboard = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>)
const IconWrench = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>)
const IconBarChart = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>)
const IconCompare = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="3" width="8" height="18" rx="1" /><rect x="14" y="3" width="8" height="18" rx="1" /><line x1="10" y1="8" x2="14" y2="8" /><line x1="10" y1="12" x2="14" y2="12" /><line x1="10" y1="16" x2="14" y2="16" /></svg>)
const IconCog = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></svg>)
const IconMenu = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>)
const IconX = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)

const LogoMark = () => (
    <svg className="w-7 h-7 flex-shrink-0" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="8" className="fill-blue-600" />
        <path d="M7 14a7 7 0 0 1 7-7v3a4 4 0 0 0-4 4H7zm14 0a7 7 0 0 1-7 7v-3a4 4 0 0 0 4-4h3z" className="fill-white" />
        <circle cx="14" cy="14" r="2" className="fill-blue-200" />
    </svg>
)

const MENU = [
    { name: "Dashboard", path: "/dashboard", icon: <IconDashboard /> },
    { name: "Work Orders", path: "/workorders", icon: <IconWrench /> },
    { name: "Analytics", path: "/analytics", icon: <IconBarChart /> },
    { name: "Compare", path: "/compare", icon: <IconCompare />, badge: "Fleet" },
]

function NavItem({ item, onClick }) {
    return (
        <NavLink to={item.path} onClick={onClick}
            className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                }`
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/40 rounded-full -ml-px" />}
                    <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                        ${isActive
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        }`}>
                        {item.icon}
                    </span>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && !isActive && (
                        <span className="text-[9px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full leading-none">
                            {item.badge}
                        </span>
                    )}
                </>
            )}
        </NavLink>
    )
}

function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const location = useLocation()

    // Close mobile menu on route change
    useEffect(() => { setMobileOpen(false) }, [location.pathname])

    // Prevent body scroll when menu is open on mobile
    useEffect(() => {
        if (mobileOpen) document.body.style.overflow = "hidden"
        else document.body.style.overflow = ""
        return () => { document.body.style.overflow = "" }
    }, [mobileOpen])

    const sidebarContent = (
        <>
            {/* Brand */}
            <div className="flex items-center gap-3 px-1 mb-8">
                <LogoMark />
                <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">CNC System</p>
                    <p className="text-[10px] text-gray-400 leading-tight">Fleet Management</p>
                </div>
                {/* Close button — mobile only */}
                <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <IconX />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Navigation</p>
                {MENU.map((item) => (
                    <NavItem key={item.path} item={item} onClick={() => setMobileOpen(false)} />
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
                    <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
                        <IconCog />
                    </span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Settings</span>
                </div>
            </div>
        </>
    )

    return (
        <>
            {/* ── Mobile hamburger button (top-left, visible below lg) ── */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <IconMenu />
            </button>

            {/* ── Mobile overlay backdrop ── */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Mobile drawer (slides in from left) ── */}
            <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-gray-800 px-4 py-5 shadow-xl transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {sidebarContent}
            </div>

            {/* ── Desktop sidebar (always visible on lg+) ── */}
            <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-gray-800 px-4 py-5 flex-shrink-0">
                {sidebarContent}
            </aside>
        </>
    )
}

export default Sidebar