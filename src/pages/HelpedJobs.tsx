import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
//import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import { StatusBadge, UrgencyBadge, type JobStatus } from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import AlertMessage from '../components/AlertMessage'

interface Job {
    id: string
    title: string
    description: string
    category: string
    urgency: 'low' | 'medium' | 'urgent'
    budget: string | null
    status: JobStatus
    created_at: string
}

const TABS: { label: string; value: JobStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'assigned' },
    { label: 'Awaiting Approval', value: 'pending_completion' },
    { label: 'Completed', value: 'completed' },
    { label: 'Disputed', value: 'disputed' },
    { label: 'Escalated', value: 'escalated' },
    { label: 'Cancelled', value: 'cancelled' },
]

export default function HelpedJobs() {
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<JobStatus | 'all'>('all')
    useEffect(() => { if (profile?.role === 'helper') navigate('/marketplace') }, [profile])

    useEffect(() => {
        async function fetchJobs() {
            if (!user) return
            setLoading(true); setError(null)
            const { data, error: fetchError } = await supabase
                .from('jobs').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
            if (fetchError) setError(fetchError.message)
            else setJobs(data ?? [])
            setLoading(false)
        }
        fetchJobs()
    }, [user])

    const filteredJobs = activeTab === 'all' ? jobs : jobs.filter((j) => j.status === activeTab)
    const counts: Record<string, number> = { all: jobs.length }
    for (const j of jobs) counts[j.status] = (counts[j.status] ?? 0) + 1

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <main className="pt-12 pb-24 min-h-screen px-6 md:px-12 max-w-screen-2xl mx-auto">
                <header className="mb-12">
                    <SectionHeading title="Your Jobs" subtitle="Manage your active service requests and track your ongoing home improvements." />
                </header>

                {/* Tab Filter Bar */}
                <section className="mb-12 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex items-center gap-3 min-w-max pb-4">
                        {TABS.map((tab) => {
                            const isActive = activeTab === tab.value
                            const count = counts[tab.value] ?? 0
                            return (
                                <button key={tab.value} onClick={() => setActiveTab(tab.value)}
                                    className="flex items-center px-6 py-3 rounded-full font-bold transition-all duration-200 cursor-pointer"
                                    style={{
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        background: isActive ? '#2c2419' : '#FFFFFF',
                                        color: isActive ? '#F9F8F6' : '#6b5e50',
                                        boxShadow: isActive ? '0 8px 24px rgba(44,36,25,0.15)' : 'none',
                                    }}>
                                    <span>{tab.label}</span>
                                    {count > 0 && (
                                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full font-bold"
                                            style={{ background: isActive ? '#C9B59C' : '#EFE9E3', color: '#2c2419' }}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#D9CFC7', borderTopColor: '#C9B59C' }} />
                    </div>
                )}

                {/* Error */}
                {error && <div className="mb-6"><AlertMessage type="error" message={error} /></div>}

                {/* Empty State */}
                {!loading && !error && filteredJobs.length === 0 && (
                    <EmptyState
                        title={activeTab === 'all' ? 'No jobs yet' : `No ${TABS.find(t => t.value === activeTab)?.label.toLowerCase()} jobs`}
                        description={activeTab === 'all' ? "You haven't posted any jobs. Create one to get started!" : 'Try selecting a different tab.'}
                        actionLabel={activeTab === 'all' ? 'Create a Job' : undefined}
                        actionTo={activeTab === 'all' ? '/create-job' : undefined}
                    />
                )}

                {/* Jobs Grid */}
                {!loading && !error && filteredJobs.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {filteredJobs.map((job) => {
                            const isCompleted = job.status === 'completed' || job.status === 'cancelled'
                            return (
                                <div key={job.id}
                                    className={`group relative rounded-[2rem] p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-lg ${isCompleted ? 'opacity-70 hover:opacity-100' : ''}`}
                                    style={{ background: '#FFFFFF', border: '1px solid transparent' }}>
                                    {/* Status & Urgency */}
                                    <div className="flex items-center justify-between w-full mb-6">
                                        <StatusBadge status={job.status} />
                                        <UrgencyBadge urgency={job.urgency} />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-2xl md:text-3xl font-extrabold leading-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                        {job.title}
                                    </h3>
                                    <p className="leading-relaxed mb-6 max-w-md line-clamp-2" style={{ color: '#6b5e50' }}>{job.description}</p>

                                    {/* Footer */}
                                    <div className="mt-auto w-full pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid #EFE9E3' }}>
                                        <div className="flex flex-col items-center md:items-start">
                                            {job.budget && (
                                                <>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6b5e50' }}>Budget</span>
                                                    <span className="text-2xl font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>{job.budget}</span>
                                                </>
                                            )}
                                            <span className="text-xs mt-1" style={{ color: '#A89882' }}>
                                                {new Date(job.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button
                                                onClick={async () => {
                                                    const { data: conv } = await supabase.from('conversations').select('id').eq('job_id', job.id).limit(1).maybeSingle()
                                                    if (conv) navigate(`/chat/${conv.id}`)
                                                }}
                                                className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
                                                style={{ background: '#EFE9E3', color: '#2c2419' }}>
                                                <span className="material-symbols-outlined text-sm">chat</span>Chat
                                            </button>
                                            <button
                                                onClick={() => navigate(`/jobs/${job.id}`)}
                                                className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold transition-all duration-200"
                                                style={{ background: '#2c2419', color: '#F9F8F6' }}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

        </div>
    )
}
