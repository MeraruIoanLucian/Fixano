type JobStatus = 'open' | 'assigned' | 'in_progress' | 'pending_completion' | 'completed' | 'cancelled'
type Urgency = 'low' | 'medium' | 'urgent'

const STATUS_MAP: Record<JobStatus, { bg: string; color: string; label: string }> = {
    open: { bg: '#EFE9E3', color: '#6B5E50', label: 'Open' },
    assigned: { bg: '#E6E9EE', color: '#4B5563', label: 'Assigned' },
    in_progress: { bg: '#FDF3E1', color: '#9A6A24', label: 'In Progress' },
    completed: { bg: '#E8EFE9', color: '#40624A', label: 'Completed' },
    pending_completion: { bg: '#F4EBE6', color: '#8B5A51', label: 'Pending Approval' },
    cancelled: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
}

const URGENCY_MAP: Record<Urgency, { bg: string; color: string; label: string }> = {
    low: { bg: '#E8EFE9', color: '#40624A', label: 'Low Urgency' },
    medium: { bg: '#EFE9E3', color: '#6B5E50', label: 'Medium' },
    urgent: { bg: '#FCEAE8', color: '#9E3535', label: 'Emergency' },
}

export function StatusBadge({ status }: { status: string }) {
    const s = STATUS_MAP[status as JobStatus] ?? STATUS_MAP.open
    return (
        <span
            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ background: s.bg, color: s.color }}
        >
            {s.label}
        </span>
    )
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
    const u = URGENCY_MAP[urgency as Urgency] ?? URGENCY_MAP.medium
    return (
        <span
            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ background: u.bg, color: u.color }}
        >
            {u.label}
        </span>
    )
}

export type { JobStatus }
