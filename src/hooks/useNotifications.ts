import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// tipul pt o notificare din DB
export interface Notification {
    id: string
    type: string
    title: string
    body: string
    link: string | null
    is_read: boolean
    created_at: string
}

// hook pt notificari - il folosesc in ambele layouturi (AppLayout si DashboardLayout)
export function useNotifications() {
    const { profile } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])

    const unreadCount = notifications.filter(n => !n.is_read).length

    // fetch notificari + polling la 30s
    useEffect(() => {
        if (!profile) return

        async function fetchNotifs() {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', profile!.id)
                .order('created_at', { ascending: false })
                .limit(20)
            if (data) setNotifications(data)
        }

        fetchNotifs()
        const interval = setInterval(fetchNotifs, 30000)
        return () => clearInterval(interval)
    }, [profile])

    // marcheaza una ca citita
    async function markAsRead(notifId: string) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notifId)
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
    }

    // marcheaza toate ca citite
    async function markAllAsRead() {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
        if (unreadIds.length === 0) return
        await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    }

    return { notifications, unreadCount, markAsRead, markAllAsRead }
}
