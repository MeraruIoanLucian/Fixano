import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import AlertMessage from '../components/AlertMessage'
import GradientButton from '../components/GradientButton'

export default function LoginPage() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit() {
        setError('')
        setLoading(true)
        const { error } = await signIn(email, password)
        setLoading(false)
        if (error) setError(error)
        else navigate('/dashboard')
    }

    return (
        <AuthLayout title="Welcome back">
            {error && <AlertMessage type="error" message={error} />}

            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#6b5e50' }}>Email</label>
                <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#6b5e50' }}>Password</label>
                <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }}
                />
                <div className="text-right mt-1.5">
                    <Link to="/forgot-password" className="text-xs font-medium transition-colors duration-200" style={{ color: '#6b5e50' }}>
                        Forgot password?
                    </Link>
                </div>
            </div>

            <GradientButton
                onClick={handleSubmit}
                loading={loading}
                disabled={loading}
                fullWidth
                size="sm"
            >
                Sign In
            </GradientButton>

            <p className="text-sm text-center" style={{ color: '#6b5e50' }}>
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold transition-colors duration-200" style={{ color: '#2c2419' }}>
                    Sign up
                </Link>
            </p>
        </AuthLayout>
    )
}
