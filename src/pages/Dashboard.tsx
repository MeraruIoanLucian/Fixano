import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
// imagini
import createJobImg from '../assets/dashboard_create.png'
import manageJobsImg from '../assets/dashboard_manage.png'
import technicianImg from '../assets/Tehnician.png'
import { StatusBadge, UrgencyBadge } from '../components/StatusBadge'
// componente
import SectionHeading from '../components/SectionHeading'
import EmptyState from '../components/EmptyState'

// tipuri
type RecentJob = {
    id: string
    title: string
    category: string
    status: string
    urgency: string
    created_at: string
}

export default function Dashboard() {
    const { profile } = useAuth()
    const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
    const [acceptedJobs, setAcceptedJobs] = useState<RecentJob[]>([])
    const [loadingJobs, setLoadingJobs] = useState(true)

    const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
    const isHelper = profile?.role === 'helper'

    useEffect(() => {
        // fetch accepted jobs for helper
        async function fetchAcceptedJobs() {
            setLoadingJobs(true)
            const { data } = await supabase
                .from('jobs')
                .select('id, title, category, status, urgency, created_at')
                .eq('helper_id', profile!.id)
                .order('created_at', { ascending: false })
                .limit(3)
            setAcceptedJobs(data ?? [])
            setLoadingJobs(false)
        }
        if (isHelper) fetchAcceptedJobs()
    }, [profile, isHelper])

    // fetch recent jobs for homeowner
    useEffect(() => {
        if (!profile) return
        async function fetchRecent() {
            setLoadingJobs(true)
            const { data } = await supabase
                .from('jobs')
                .select('id, title, category, status, urgency, created_at')
                .eq('owner_id', profile!.id)
                .order('created_at', { ascending: false })
                .limit(3)
            setRecentJobs(data ?? [])
            setLoadingJobs(false)
        }
        if (!isHelper) fetchRecent()
        else setLoadingJobs(false)
    }, [profile, isHelper])

    // carduri diferite in functie de rol
    const cards = isHelper
        ? [
            { img: technicianImg, badge: 'Marketplace', badgeBg: '#C9B59C', title: 'Explore Available Jobs', desc: 'Find jobs that match your skills and interests from our curated directory of home projects.', link: '/marketplace', primary: true, icon: 'search', cta: 'Browse Jobs' },
            { img: manageJobsImg, badge: 'Active Status', badgeBg: '#EFE9E3', title: 'See Your Jobs', desc: 'Track and manage your assigned jobs. View timelines, documents, and messaging history.', link: '/marketplace', primary: false, icon: 'visibility', cta: 'View Jobs' },
        ]
        : [
            { img: createJobImg, badge: 'New Project', badgeBg: '#C9B59C', title: 'Create a Job', desc: "Describe your problem and we'll match you with the right helper from our curated directory of experts.", link: '/create-job', primary: true, icon: 'arrow_forward', cta: 'Start Now' },
            { img: manageJobsImg, badge: 'Active Status', badgeBg: '#EFE9E3', title: 'See Your Jobs', desc: 'Track and manage your active and past requests. View timelines, documents, and messaging history.', link: '/helped-jobs', primary: false, icon: 'visibility', cta: 'View Jobs' },
        ]

    return (
        <div className="p-6 md:p-12 max-w-6xl mx-auto">

            {/* Header */}
            <header className="mb-16">
                <SectionHeading
                    title={`Welcome back, ${firstName}!`}
                    subtitle={isHelper
                        ? 'Find your next project and grow your client base.'
                        : "Your home projects are on track. What's next on your list today?"
                    }
                />
            </header>

            {/* Carduri cu actiuni */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {cards.map((card, i) => (
                    <Link key={i} to={card.link}
                        className="group relative rounded-[2rem] overflow-hidden block"
                        style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.06)' }}>
                        <div className="h-64 relative overflow-hidden">
                            <img src={card.img} alt={card.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(44,36,25,0.5), transparent)' }} />
                            <div className="absolute bottom-6 left-8">
                                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: card.badgeBg, color: '#2c2419' }}>
                                    {card.badge}
                                </span>
                            </div>
                        </div>
                        <div className="p-8 pt-6">
                            <div className="w-12 h-1 rounded-full mb-6" style={{ background: card.primary ? '#C9B59C' : '#2c2419', opacity: card.primary ? 1 : 0.2 }} />
                            <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>{card.title}</h3>
                            <p className="leading-relaxed mb-8" style={{ color: '#6b5e50' }}>{card.desc}</p>
                            <span className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all duration-200"
                                style={card.primary
                                    ? { background: 'linear-gradient(135deg, #2c2419, #4a3f35)', color: '#F9F8F6' }
                                    : { border: '2px solid rgba(44,36,25,0.1)', color: '#2c2419' }
                                }>
                                {card.cta}
                                <span className="material-symbols-outlined text-sm">{card.icon}</span>
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Ultimele joburi - doar pt homeowner */}
            {!isHelper && (
                <div className="mt-20">
                    <div className="flex items-center justify-between mb-8">
                        <SectionHeading title="Recent Updates" size="sm" />
                        <Link to="/helped-jobs" className="font-bold text-sm transition-colors duration-200" style={{ color: '#2c2419' }}>
                            View All →
                        </Link>
                    </div>

                    {loadingJobs ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#D9CFC7', borderTopColor: '#C9B59C' }} />
                        </div>
                    ) : recentJobs.length === 0 ? (
                        <EmptyState
                            title="No jobs yet"
                            description="Create your first job to get started."
                            actionLabel="Create a Job"
                            actionTo="/create-job"
                        />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Job principal - card mare */}
                            {recentJobs[0] && (
                                <div className="lg:col-span-2 rounded-[2rem] p-8 flex flex-col md:flex-row gap-8 items-center" style={{ background: '#EFE9E3' }}>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                                            <StatusBadge status={recentJobs[0].status} />
                                            <UrgencyBadge urgency={recentJobs[0].urgency} />
                                            <span className="text-xs font-medium" style={{ color: '#6b5e50' }}>
                                                {new Date(recentJobs[0].created_at).toLocaleDateString('ro-RO')}
                                            </span>
                                        </div>
                                        <h4 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                            {recentJobs[0].title}
                                        </h4>
                                        <p className="text-sm" style={{ color: '#6b5e50' }}>{recentJobs[0].category}</p>
                                    </div>
                                    <Link to={`/jobs/${recentJobs[0].id}`} className="p-4 rounded-2xl transition-colors duration-200"
                                        style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(44,36,25,0.06)' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#2c2419' }}>arrow_forward</span>
                                    </Link>
                                </div>
                            )}

                            {/* Card secundar */}
                            <div className="rounded-[2rem] p-8 flex flex-col justify-between" style={{ background: '#C9B59C20' }}>
                                <div>
                                    <h4 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                        {recentJobs.length > 1 ? `${recentJobs.length} Recent Jobs` : 'Quick Actions'}
                                    </h4>
                                    <p className="text-sm" style={{ color: '#6b5e50' }}>
                                        {recentJobs.length > 1
                                            ? 'Check your latest job postings and their current status.'
                                            : 'Create a new job or browse your existing ones.'}
                                    </p>
                                </div>
                                <Link to="/helped-jobs" className="mt-6 font-bold text-sm flex items-center gap-2 transition-colors duration-200" style={{ color: '#2c2419' }}>
                                    View All Jobs
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* TODO: joburile assignate (pt helperi)*/}
            {isHelper && (
                <div className="mt-20">
                    <div className="flex items-center justify-between mb-8">
                        <SectionHeading title="Assigned Jobs" size="sm" />
                        <Link to="/marketplace" className="font-bold text-sm transition-colors duration-200" style={{ color: '#2c2419' }}>
                            View All →
                        </Link>
                    </div>
                    {loadingJobs ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#D9CFC7', borderTopColor: '#C9B59C' }} />
                        </div>
                    ) : acceptedJobs.length === 0 ? (
                        <EmptyState
                            title="No jobs yet"
                            description="You don't have any assigned jobs yet."
                            actionLabel="Browse available jobs"
                            actionTo="/marketplace"
                        />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Job principal - card mare */}
                            {acceptedJobs[0] && (
                                <div className="lg:col-span-2 rounded-[2rem] p-8 flex flex-col md:flex-row gap-8 items-center" style={{ background: '#EFE9E3' }}>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-6 flex-wrap">
                                            <StatusBadge status={acceptedJobs[0].status} />
                                            <UrgencyBadge urgency={acceptedJobs[0].urgency} />
                                            <span className="text-xs font-medium" style={{ color: '#6b5e50' }}>
                                                {new Date(acceptedJobs[0].created_at).toLocaleDateString('ro-RO')}
                                            </span>
                                        </div>
                                        <h4 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                            {acceptedJobs[0].title}
                                        </h4>
                                        <p className="text-sm" style={{ color: '#6b5e50' }}>{acceptedJobs[0].category}</p>
                                    </div>
                                    <Link to={`/jobs/${acceptedJobs[0].id}`} className="p-4 rounded-2xl transition-colors duration-200"
                                        style={{ background: '#FFFFFF', boxShadow: '0 2px 8px rgba(44,36,25,0.06)' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#2c2419' }}>arrow_forward</span>
                                    </Link>
                                </div>
                            )}

                            {/* Card secundar */}
                            <div className="rounded-[2rem] p-8 flex flex-col justify-between" style={{ background: '#C9B59C20' }}>
                                <div>
                                    <h4 className="text-xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                        {acceptedJobs.length > 1 ? `${acceptedJobs.length} Accepted Jobs` : 'Quick Actions'}
                                    </h4>
                                    <p className="text-sm" style={{ color: '#6b5e50' }}>
                                        {acceptedJobs.length > 1
                                            ? 'Check your latest accepted jobs and their current status.'
                                            : 'Accept a new job or browse your existing ones.'}
                                    </p>
                                </div>
                                <Link to="/helped-jobs" className="mt-6 font-bold text-sm flex items-center gap-2 transition-colors duration-200" style={{ color: '#2c2419' }}>
                                    View All Jobs
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
