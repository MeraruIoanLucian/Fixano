import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/AuthLayout'
import AlertMessage from '../components/AlertMessage'
import GradientButton from '../components/GradientButton'

// pagina de forgot password - trimite link de reset pe email
export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false) // dupa ce se trimite emailul, aratam mesaj de confirmare

    async function handleSubmit() {
        setError('')
        setLoading(true)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        setLoading(false)
        if (error) setError(error.message)
        else setSent(true)
    }

    // daca s-a trimis emailul, aratam un mesaj
    if (sent) {
        return (
            <AuthLayout title="Email sent">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#D1FAE5' }}>
                        <span className="material-symbols-outlined text-3xl" style={{ color: '#065F46' }}>mail</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#6b5e50' }}>
                        We sent a password reset link to <strong style={{ color: '#2c2419' }}>{email}</strong>. Click the link in the email to set a new password.
                    </p>
                    <GradientButton to="/login" variant="outline" size="sm" fullWidth>
                        Back to Login
                    </GradientButton>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout title="Forgot password?">
            <p className="text-sm text-center mb-2" style={{ color: '#6b5e50' }}>
                Enter your email and we'll send you a link to reset your password.
            </p>

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

            <GradientButton onClick={handleSubmit} loading={loading} disabled={loading || !email.trim()} fullWidth size="sm">
                Send Reset Link
            </GradientButton>

            <p className="text-sm text-center" style={{ color: '#6b5e50' }}>
                Remember your password?{' '}
                <Link to="/login" className="font-semibold transition-colors duration-200" style={{ color: '#2c2419' }}>
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    )
}
