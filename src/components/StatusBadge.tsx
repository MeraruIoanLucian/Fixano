type JobStatus = 'open' | 'assigned' | 'in_progress' | 'pending_completion' | 'completed' | 'cancelled'
type Urgency = 'low' | 'medium' | 'urgent'

const STATUS_MAP: Record<JobStatus, { bg: string; color: string; label: string }> = {
    open: { bg: '#C9B59C30', color: 'var(--brand-dark)', label: 'Open' },
    assigned: { bg: '#E0E7FF', color: '#3730A3', label: 'Assigned' },
    in_progress: { bg: '#FEF3C7', color: '#92400E', label: 'In Progress' },
    completed: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
    pending_completion: { bg: '#DBEAFE', color: '#1E40AF', label: 'Pending Approval' },
    cancelled: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
}

const URGENCY_MAP: Record<Urgency, { bg: string; color: string; label: string }> = {
    low: { bg: '#D1FAE5', color: '#065F46', label: 'Low Urgency' },
    medium: { bg: '#FEF3C7', color: '#92400E', label: 'Medium' },
    urgent: { bg: '#FEE2E2', color: '#991B1B', label: 'Emergency' },
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
