import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import GradientButton from '../components/GradientButton'
import NotificationBell from '../components/NotificationBell'


// Layout pt paginile autentificate fara sidebar (create job, my jobs, profile)
export default function AppLayout() {
    const { profile } = useAuth()
    const location = useLocation()
    const isHelper = profile?.role === 'helper'


    // linkuri navbar - mai simplu decat dashboard
    const navLinks = [
        ...(isHelper
            ? [{ to: '/marketplace', label: 'Browse Jobs' }]
            : [{ to: '/helped-jobs', label: 'My Jobs' }]
        ),
        { to: '/chat', label: 'Chats' },
    ]

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--brand-bg)', fontFamily: 'var(--font-body)' }}>

            {/* Navbar */}
            <header className="fixed top-0 w-full z-50 glass-bg">
                <div className="flex justify-between items-center h-20 px-6 md:px-12 max-w-screen-2xl mx-auto">
                    <Logo to="/dashboard" />

                    {/* Linkuri navbar */}
                    <nav className="hidden md:flex items-center gap-8" style={{ fontFamily: 'var(--font-heading)' }}>
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="font-bold tracking-tight transition-colors duration-200"
                                style={{
                                    color: location.pathname === link.to ? 'var(--brand-dark)' : 'var(--brand-muted)',
                                    borderBottom: location.pathname === link.to ? '2px solid var(--brand-dark)' : 'none',
                                    paddingBottom: location.pathname === link.to ? '2px' : '0',
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Actiuni dreapta */}
                    <div className="flex items-center gap-3">
                        {!isHelper && (
                            <GradientButton to="/create-job" size="sm" className="hidden md:flex">
                                Create Job
                            </GradientButton>
                        )}

                        {/* Notification bell */}
                        <NotificationBell />

                        <Link
                            to="/profile"
                            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
                            style={{ background: profile?.avatar_url ? 'transparent' : 'var(--brand-light)', border: '2px solid var(--brand-border)' }}
                        >
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-lg" style={{ color: 'var(--brand-muted)' }}>person</span>
                            )}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Continut pagina */}
            <main className="flex-1 pt-20">
                <Outlet />
            </main>

            {/* Footer simplu */}
            <footer className="pt-16 pb-8 px-6 md:px-12" style={{ background: 'var(--brand-dark)' }}>
                <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Logo light size="sm" to="/" />
                    <p className="text-xs" style={{ color: '#C9B59C80' }}>© 2026 Fixano. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
