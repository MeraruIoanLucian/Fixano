import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthLayout from '../components/AuthLayout'
import AlertMessage from '../components/AlertMessage'
import GradientButton from '../components/GradientButton'

// pagina pe care ajunge userul din linkul de reset din email
export default function ResetPassword() {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // supabase seteaza sesiunea automat din URL hash cand userul vine din email
    useEffect(() => {
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                // sesiunea e setata, userul poate schimba parola
            }
        })
    }, [])

    async function handleSubmit() {
        setError('')
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)
        if (error) setError(error.message)
        else setSuccess(true)
    }

    if (success) {
        return (
            <AuthLayout title="Password updated">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#D1FAE5' }}>
                        <span className="material-symbols-outlined text-3xl" style={{ color: '#065F46' }}>check_circle</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: '#6b5e50' }}>
                        Your password has been updated successfully. You can now sign in with your new password.
                    </p>
                    <GradientButton onClick={() => navigate('/dashboard')} size="sm" fullWidth>
                        Go to Dashboard
                    </GradientButton>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout title="Set new password">
            {error && <AlertMessage type="error" message={error} />}

            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#6b5e50' }}>New password</label>
                <input
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }}
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#6b5e50' }}>Confirm password</label>
                <input
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }}
                />
            </div>

            <GradientButton onClick={handleSubmit} loading={loading} disabled={loading} fullWidth size="sm">
                Update Password
            </GradientButton>
        </AuthLayout>
    )
}
