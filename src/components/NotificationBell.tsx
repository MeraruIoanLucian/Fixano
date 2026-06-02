import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'

// componenta pt clopotelul de notificari din navbar
// o pun in DashboardLayout si AppLayout ca sa nu duplic codul
export default function NotificationBell() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()
    const dropdownRef = useRef<HTMLDivElement>(null)

    // icon + culoare pt fiecare tip de notificare
    function getIcon(type: string) {
        switch (type) {
            case 'review_received': return 'star'
            case 'offer_received': return 'local_offer'
            case 'offer_accepted': return 'check_circle'
            case 'offer_rejected': return 'cancel'
            case 'message': return 'chat'
            case 'job_completed': return 'task_alt'
            case 'chat_offer': return 'payments'
            default: return 'notifications'
        }
    }

    function getIconColor(type: string) {
        if (type === 'review_received') return '#F59E0B'
        if (type === 'offer_received' || type === 'offer_accepted') return '#065F46'
        if (type === 'message') return '#3B82F6'
        if (type === 'job_completed') return '#10B981'
        if (type === 'chat_offer') return '#F59E0B'
        return '#C9B59C'
    }

    // inchide dropdown-ul daca se da click in afara
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open])

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setOpen(!open)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                style={{ background: open ? '#EFE9E3' : 'transparent' }}>
                <span className="material-symbols-outlined" style={{ color: '#6b5e50', fontVariationSettings: unreadCount > 0 ? "'FILL' 1" : "'FILL' 0" }}>notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                        style={{ background: '#991B1B', color: '#FFF' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* dropdown cu lista de notificari */}
            {open && (
                <div className="absolute right-0 top-14 w-80 max-h-96 overflow-y-auto rounded-2xl p-2 z-50"
                    style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.12)', border: '1px solid #EFE9E3' }}>

                    <div className="flex items-center justify-between px-3 py-2 mb-1">
                        <span className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Notifications</span>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-[10px] font-bold uppercase cursor-pointer" style={{ color: '#C9B59C' }}>Mark all read</button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className="py-8 text-center">
                            <span className="material-symbols-outlined text-3xl mb-2 block" style={{ color: '#D9CFC7' }}>notifications_off</span>
                            <p className="text-xs" style={{ color: '#6b5e50' }}>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <button key={n.id}
                                onClick={() => { markAsRead(n.id); setOpen(false); if (n.link) navigate(n.link) }}
                                className="w-full text-left px-3 py-3 rounded-xl transition-colors cursor-pointer flex items-start gap-3"
                                style={{ background: n.is_read ? 'transparent' : '#F9F8F640' }}>
                                <span className="material-symbols-outlined text-sm mt-0.5"
                                    style={{ color: getIconColor(n.type), fontVariationSettings: "'FILL' 1" }}>
                                    {getIcon(n.type)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate" style={{ color: n.is_read ? '#6b5e50' : '#2c2419' }}>{n.title}</p>
                                    <p className="text-[11px] truncate" style={{ color: '#A89882' }}>{n.body}</p>
                                    <span className="text-[10px]" style={{ color: '#D9CFC7' }}>
                                        {new Date(n.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {!n.is_read && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#C9B59C' }} />}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
