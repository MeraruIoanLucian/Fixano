import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
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
    { label: 'Assigned', value: 'assigned' },
    { label: 'Awaiting Approval', value: 'pending_completion' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
]

const CATEGORIES = [
    { value: 'Instalații Apă', icon: 'plumbing', label: 'Plumbing' },
    { value: 'Electrice', icon: 'bolt', label: 'Electrical' },
    { value: 'Gaze', icon: 'gas_meter', label: 'Gas' },
    { value: 'Centrale Termice', icon: 'device_thermostat', label: 'Heating' },
    { value: 'Climatizare', icon: 'ac_unit', label: 'HVAC' },
    { value: 'Altele', icon: 'handyman', label: 'Other' },
]

const URGENCIES = [
    { value: 'low', label: 'Low', color: '#065F46', bg: '#D1FAE5' },
    { value: 'medium', label: 'Medium', color: '#92400E', bg: '#FEF3C7' },
    { value: 'urgent', label: 'Urgent', color: '#991B1B', bg: '#FEE2E2' },
]

export default function Marketplace() {
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<JobStatus | 'all'>('all')

    // filtre noi
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => { if (profile?.role === 'helped') navigate('/dashboard') }, [profile])

    useEffect(() => {
        async function fetchJobs() {
            if (!user) return
            setLoading(true); setError(null)
            const { data, error: fetchError } = await supabase
                .from('jobs').select('*')
                .or(`status.eq.open,helper_id.eq.${user.id}`)
                .order('created_at', { ascending: false })
            if (fetchError) setError(fetchError.message)
            else setJobs(data ?? [])
            setLoading(false)
        }
        fetchJobs()
    }, [user])

    // filtram client-side — status tab + search + categorie + urgenta
    const filteredJobs = jobs.filter((job) => {
        // tab filter
        if (activeTab !== 'all' && job.status !== activeTab) return false
        // search by title
        if (searchQuery.trim() && !job.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
        // category filter
        if (selectedCategory && job.category !== selectedCategory) return false
        // urgency filter
        if (selectedUrgency && job.urgency !== selectedUrgency) return false
        return true
    })

    const counts: Record<string, number> = { all: jobs.length }
    for (const j of jobs) counts[j.status] = (counts[j.status] ?? 0) + 1

    const hasActiveFilters = searchQuery.trim() || selectedCategory || selectedUrgency

    function clearFilters() {
        setSearchQuery('')
        setSelectedCategory(null)
        setSelectedUrgency(null)
    }

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <main className="pt-12 pb-24 min-h-screen px-6 md:px-12 max-w-screen-2xl mx-auto">
                <header className="mb-12">
                    <SectionHeading title="Marketplace" subtitle="Browse available jobs and manage your active projects." />
                </header>

                {/* Search Bar */}
                <section className="mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: '#A89882' }}>search</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search jobs by title..."
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl outline-none transition-all text-sm"
                                style={{ background: '#FFFFFF', border: '1px solid #D9CFC7', color: '#2c2419' }}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer">
                                    <span className="material-symbols-outlined text-sm" style={{ color: '#A89882' }}>close</span>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer"
                            style={{
                                background: showFilters || hasActiveFilters ? '#2c2419' : '#FFFFFF',
                                color: showFilters || hasActiveFilters ? '#F9F8F6' : '#6b5e50',
                                border: '1px solid #D9CFC7',
                            }}>
                            <span className="material-symbols-outlined text-sm">tune</span>
                            Filters
                            {hasActiveFilters && (
                                <span className="w-2 h-2 rounded-full" style={{ background: '#C9B59C' }} />
                            )}
                        </button>
                    </div>
                </section>

                {/* Filter Panel */}
                {showFilters && (
                    <section className="mb-8 rounded-2xl p-6 space-y-5" style={{ background: '#FFFFFF', border: '1px solid #EFE9E3' }}>
                        {/* Categorii */}
                        <div>
                            <label className="text-[10px] font-bold tracking-widest uppercase block mb-3" style={{ color: '#6b5e50' }}>Category</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button key={cat.value}
                                        onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
                                        style={{
                                            background: selectedCategory === cat.value ? '#2c2419' : '#F9F8F6',
                                            color: selectedCategory === cat.value ? '#F9F8F6' : '#6b5e50',
                                            border: `1px solid ${selectedCategory === cat.value ? '#2c2419' : 'transparent'}`,
                                        }}>
                                        <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Urgenta */}
                        <div>
                            <label className="text-[10px] font-bold tracking-widest uppercase block mb-3" style={{ color: '#6b5e50' }}>Urgency</label>
                            <div className="flex flex-wrap gap-2">
                                {URGENCIES.map(u => (
                                    <button key={u.value}
                                        onClick={() => setSelectedUrgency(selectedUrgency === u.value ? null : u.value)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                                        style={{
                                            background: selectedUrgency === u.value ? u.bg : '#F9F8F6',
                                            color: selectedUrgency === u.value ? u.color : '#6b5e50',
                                            border: `1px solid ${selectedUrgency === u.value ? u.color + '30' : 'transparent'}`,
                                        }}>
                                        {u.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear filters */}
                        {hasActiveFilters && (
                            <button onClick={clearFilters}
                                className="flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors"
                                style={{ color: '#6b5e50' }}>
                                <span className="material-symbols-outlined text-xs">close</span>
                                Clear all filters
                            </button>
                        )}
                    </section>
                )}

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

                {/* Active filters summary */}
                {hasActiveFilters && !loading && (
                    <div className="mb-6 flex items-center gap-2 text-sm" style={{ color: '#6b5e50' }}>
                        <span className="material-symbols-outlined text-sm">filter_list</span>
                        <span>Showing <strong style={{ color: '#2c2419' }}>{filteredJobs.length}</strong> of {jobs.length} jobs</span>
                        {selectedCategory && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#EFE9E3', color: '#2c2419' }}>
                                {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                                <button onClick={() => setSelectedCategory(null)} className="ml-1.5 cursor-pointer">×</button>
                            </span>
                        )}
                        {selectedUrgency && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold"
                                style={{ background: URGENCIES.find(u => u.value === selectedUrgency)?.bg, color: URGENCIES.find(u => u.value === selectedUrgency)?.color }}>
                                {URGENCIES.find(u => u.value === selectedUrgency)?.label}
                                <button onClick={() => setSelectedUrgency(null)} className="ml-1.5 cursor-pointer">×</button>
                            </span>
                        )}
                    </div>
                )}

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
                        title={hasActiveFilters ? 'No matching jobs' : (activeTab === 'all' ? 'No jobs available yet' : `No ${TABS.find(t => t.value === activeTab)?.label.toLowerCase()} jobs`)}
                        description={hasActiveFilters ? 'Try adjusting your filters or search query.' : (activeTab === 'all' ? "Couldn't find any job posts matching your criteria." : 'Try selecting a different tab.')}
                    />
                )}

                {/* Jobs Grid */}
                {!loading && !error && filteredJobs.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {filteredJobs.map((job) => {
                            const isCompleted = job.status === 'completed' || job.status === 'cancelled'
                            return (
                                <div key={job.id}
                                    className={`group relative rounded-[2rem] p-8 flex flex-col items-center text-center transition-all  ${isCompleted ? 'opacity-70' : ''}`}
                                    style={{ background: '#FFFFFF', border: '1px solid transparent' }}>
                                    {/* Status & Urgency */}
                                    <div className="flex items-center justify-between w-full mb-6">
                                        <StatusBadge status={job.status} />
                                        <UrgencyBadge urgency={job.urgency} />
                                    </div>

                                    {/* Category chip */}
                                    <span className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#A89882' }}>
                                        {CATEGORIES.find(c => c.value === job.category)?.label ?? job.category}
                                    </span>

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
