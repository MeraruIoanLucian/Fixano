import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import SectionHeading from '../components/SectionHeading'
import { StatusBadge, UrgencyBadge, type JobStatus } from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import AlertMessage from '../components/AlertMessage'
import { CATEGORIES } from '../lib/constants'

interface Job {
    id: string
    title: string
    description: string
    category: string
    city: string
    urgency: 'low' | 'medium' | 'urgent'
    budget: string | null
    status: JobStatus
    created_at: string
}



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

    // filtre noi
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedUrgency, setSelectedUrgency] = useState<string | null>(null)
    const [cityFilter, setCityFilter] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    const [sortBy, setSortBy] = useState<'latest' | 'urgency'>('latest')
    const [locating, setLocating] = useState(false)

    async function detectLocation() {
        if (!navigator.geolocation) {
            alert('Browser-ul tau nu suporta geolocatia.')
            return
        }
        setLocating(true)
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                // folosim Nominatim API (free, no key required)
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
                const data = await res.json()
                const detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.county
                if (detectedCity) {
                    setCityFilter(detectedCity)
                } else {
                    alert('Nu am putut extrage numele orasului.')
                }
            } catch (err) {
                console.error(err)
                alert('Eroare la detectarea orasului.')
            } finally {
                setLocating(false)
            }
        }, () => {
            alert('Accesul la locatie a fost refuzat sau a aparut o eroare.')
            setLocating(false)
        })
    }

    useEffect(() => { if (profile?.role === 'helped') navigate('/dashboard') }, [profile])

    useEffect(() => {
        async function fetchJobs() {
            if (!user) return
            setLoading(true); setError(null)
            const { data, error: fetchError } = await supabase
                .from('jobs').select('*')
                .eq('status', 'open')
                .order('created_at', { ascending: false })
            if (fetchError) setError(fetchError.message)
            else setJobs(data ?? [])
            setLoading(false)
        }
        fetchJobs()
    }, [user])

    // set default city filter from profile
    useEffect(() => {
        if (profile?.city && !cityFilter) {
            setCityFilter(profile.city)
        }
    }, [profile])

    // utilitar pentru eliminarea diacriticelor, spatiilor si cratimelor
    const normalizeString = (str: string) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // scoate diacritice
            .replace(/[^a-zA-Z0-9]/g, "") // scoate spatii, cratime, virgule etc.
            .toLowerCase()
    }

    // filtram client-side — search + categorie + urgenta + oras
    const filteredJobs = jobs.filter((job) => {
        // search by title
        if (searchQuery.trim() && !normalizeString(job.title).includes(normalizeString(searchQuery))) return false
        // city filter (ignoring diacritics)
        if (cityFilter.trim() && !normalizeString(job.city).includes(normalizeString(cityFilter))) return false
        // category filter
        if (selectedCategory && job.category !== selectedCategory) return false
        // urgency filter
        if (selectedUrgency && job.urgency !== selectedUrgency) return false
        return true
    })

    const sortedJobs = [...filteredJobs].sort((a, b) => {
        if (sortBy === 'latest') {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        } else {
            const urgencyWeight: Record<string, number> = { urgent: 3, medium: 2, low: 1 }
            const wA = urgencyWeight[a.urgency] ?? 0
            const wB = urgencyWeight[b.urgency] ?? 0
            if (wA !== wB) return wB - wA
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
    })

    const hasActiveFilters = searchQuery.trim() || cityFilter.trim() || selectedCategory || selectedUrgency

    function clearFilters() {
        setSearchQuery('')
        setCityFilter('')
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
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSortBy(sortBy === 'latest' ? 'urgency' : 'latest')}
                                className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer"
                                style={{
                                    background: sortBy === 'urgency' ? '#2c2419' : '#FFFFFF',
                                    color: sortBy === 'urgency' ? '#F9F8F6' : '#6b5e50',
                                    border: '1px solid #D9CFC7',
                                }}>
                                <span className="material-symbols-outlined text-sm">sort</span>
                                Sort: {sortBy === 'latest' ? 'Latest' : 'Urgency'}
                            </button>
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
                    </div>
                    {/* Location Filter Row */}
                    <div className="flex items-center gap-3 mt-4">
                        <div className="flex-1 relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg" style={{ color: '#A89882' }}>location_on</span>
                            <input
                                type="text"
                                value={cityFilter}
                                onChange={e => setCityFilter(e.target.value)}
                                placeholder="Filter by city..."
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl outline-none transition-all text-sm"
                                style={{ background: '#FFFFFF', border: '1px solid #D9CFC7', color: '#2c2419' }}
                            />
                            {cityFilter && (
                                <button onClick={() => setCityFilter('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer">
                                    <span className="material-symbols-outlined text-sm" style={{ color: '#A89882' }}>close</span>
                                </button>
                            )}
                        </div>
                        <button
                            onClick={detectLocation}
                            disabled={locating}
                            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: '#EFE9E3', color: '#2c2419', border: '1px solid transparent' }}>
                            <span className="material-symbols-outlined text-sm">{locating ? 'progress_activity' : 'my_location'}</span>
                            {locating ? 'Locating...' : 'See nearby jobs'}
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

                {/* Active filters summary */}
                {hasActiveFilters && !loading && (
                    <div className="mb-6 flex items-center gap-2 text-sm" style={{ color: '#6b5e50' }}>
                        {cityFilter && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1" style={{ background: '#EFE9E3', color: '#2c2419' }}>
                                <span className="material-symbols-outlined text-[12px]">location_on</span>
                                {cityFilter}
                                <button onClick={() => setCityFilter('')} className="ml-1.5 cursor-pointer">×</button>
                            </span>
                        )}
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
                {!loading && !error && sortedJobs.length === 0 && (
                    <EmptyState
                        title={hasActiveFilters ? 'No matching jobs' : 'No jobs available yet'}
                        description={hasActiveFilters ? 'Try adjusting your filters or search query.' : "Couldn't find any open jobs at the moment."}
                    />
                )}

                {/* Jobs Grid */}
                {!loading && !error && sortedJobs.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {sortedJobs.map((job) => {
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

                                    {/* Category and City chip */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#A89882' }}>
                                            {CATEGORIES.find(c => c.value === job.category)?.label ?? job.category}
                                        </span>
                                        {job.city && job.city !== '-' && (
                                            <>
                                                <span style={{ color: '#EFE9E3' }}>•</span>
                                                <span className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1" style={{ color: '#A89882' }}>
                                                    <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                    {job.city}
                                                </span>
                                            </>
                                        )}
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
