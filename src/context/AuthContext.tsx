import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'helped' | 'helper'

export interface Profile {
    id: string
    role: UserRole
    full_name: string
    phone: string
    city: string
    avatar_url: string | null
    bio: string | null
    rating_avg: number
    rating_count: number
    stripe_account_id: string | null
}

interface AuthState {
    user: User | null
    session: Session | null
    profile: Profile | null
    loading: boolean
    signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error: string | null; needsConfirmation?: boolean }>
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    async function fetchProfile(userId: string) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        setProfile(data)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) fetchProfile(session.user.id)
            else setProfile(null)
        })

        return () => subscription.unsubscribe()
    }, [])

    async function signUp(email: string, password: string, fullName: string, role: UserRole) {
        // trimitem role si full_name ca metadata — trigger-ul din DB creaza profilul automat
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, role }
            }
        })
        if (error) return { error: error.message }

        // daca nu avem sesiune inseamna ca trebuie confirmat emailul
        if (data.user && !data.session) {
            return { error: null, needsConfirmation: true }
        }

        // daca avem sesiune (autoconfirm on) → fetch profile
        if (data.user) await fetchProfile(data.user.id)
        return { error: null }
    }

    async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: error.message }
        return { error: null }
    }

    async function signOut() {
        await supabase.auth.signOut()
        setProfile(null)
    }

    async function refreshProfile() {
        if (user) await fetchProfile(user.id)
    }

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
