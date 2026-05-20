import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth, type UserRole } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import AlertMessage from '../components/AlertMessage'
import GradientButton from '../components/GradientButton'

export default function RegisterPage() {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const roleFromUrl = searchParams.get('role') as UserRole | null
    const preselected = roleFromUrl === 'helped' || roleFromUrl === 'helper'

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<UserRole>(preselected ? roleFromUrl : 'helped')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [emailSent, setEmailSent] = useState(false)

    async function handleSubmit() {
        setError('')
        setLoading(true)
        const { error, needsConfirmation } = await signUp(email, password, fullName, role)
        setLoading(false)
        if (error) setError(error)
        else if (needsConfirmation) setEmailSent(true)
        else navigate('/dashboard')
    }

    // dupa signup cu email confirmation — afisam mesajul
    if (emailSent) {
        return (
            <AuthLayout title="Check your email">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#D1FAE5' }}>
                        <span className="material-symbols-outlined text-3xl" style={{ color: '#065F46' }}>mark_email_read</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#6b5e50' }}>
                        We sent a confirmation link to <strong style={{ color: '#2c2419' }}>{email}</strong>. Please check your inbox and click the link to activate your account.
                    </p>
                    <p className="text-xs" style={{ color: '#A89882' }}>
                        Didn't receive it? Check your spam folder or try again.
                    </p>
                    <GradientButton to="/login" variant="outline" size="sm" fullWidth>
                        Go to Login
                    </GradientButton>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout title="Create your account">
            {error && <AlertMessage type="error" message={error} />}

            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#6b5e50' }}>Full name</label>
                <input type="text" placeholder="John Doe" value={fullName}
                    onChange={e => setFullName(e.target.value)} required
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }} />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#6b5e50' }}>Email</label>
                <input type="email" placeholder="name@example.com" value={email}
                    onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }} />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#6b5e50' }}>Password</label>
                <input type="password" placeholder="Min 6 characters" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={6}
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }} />
            </div>

            {/* Role Selector */}
            {!preselected && (
                <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#6b5e50' }}>I am a…</label>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { value: 'helped' as UserRole, icon: 'home', label: 'Homeowner' },
                            { value: 'helper' as UserRole, icon: 'engineering', label: 'Technician' },
                        ]).map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setRole(opt.value)}
                                className="flex flex-col items-center p-4 rounded-2xl transition-all duration-200 cursor-pointer"
                                style={{
                                    background: role === opt.value ? '#FFFFFF' : '#F9F8F6',
                                    border: `2px solid ${role === opt.value ? '#2c2419' : '#D9CFC7'}`,
                                }}
                            >
                                <span className="material-symbols-outlined mb-2 text-2xl" style={{
                                    color: role === opt.value ? '#2c2419' : '#6b5e50',
                                    fontVariationSettings: role === opt.value ? "'FILL' 1" : "'FILL' 0",
                                }}>{opt.icon}</span>
                                <span className="text-sm font-semibold" style={{ color: role === opt.value ? '#2c2419' : '#6b5e50' }}>
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <GradientButton onClick={handleSubmit} loading={loading} disabled={loading} fullWidth size="sm">
                Sign Up
            </GradientButton>

            <p className="text-sm text-center" style={{ color: '#6b5e50' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold transition-colors duration-200" style={{ color: '#2c2419' }}>Sign in</Link>
            </p>
        </AuthLayout>
    )
}

