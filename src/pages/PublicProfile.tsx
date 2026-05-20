import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionHeading from '../components/SectionHeading'
import GradientButton from '../components/GradientButton'

// tipurile pt datele profilului public si review-uri
interface PublicProfile {
    id: string
    full_name: string
    avatar_url: string | null
    bio: string | null
    city: string
    role: string
    rating_avg: number
    rating_count: number
    created_at: string
}

interface Review {
    id: string
    rating: number
    comment: string | null
    created_at: string
    reviewer: { full_name: string; avatar_url: string | null }
    job: { title: string }
}

export default function PublicProfile() {
    const { id } = useParams()
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)

    // iau profilul si reviewurile la mount
    useEffect(() => {
        async function fetchData() {
            // profil
            const { data: profileData } = await supabase
                .from('profiles').select('*').eq('id', id).single()
            setProfile(profileData)

            // reviewuri primite
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url), job:jobs(title)')
                .eq('reviewed_id', id)
                .order('created_at', { ascending: false })
                .limit(10)
            setReviews(reviewsData ?? [])

            setLoading(false)
        }
        fetchData()
    }, [id])

    if (loading) {
        return (
            <div className="flex justify-center py-32">
                <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#D9CFC7', borderTopColor: '#C9B59C' }} />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="pt-12 pb-24 px-6 md:px-12 max-w-4xl mx-auto text-center">
                <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: '#C9B59C' }}>person_off</span>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Profile not found</h2>
                <p className="mb-6" style={{ color: '#6b5e50' }}>This user doesn't exist or their profile was removed.</p>
                <GradientButton to="/dashboard" icon="arrow_back">Back to Dashboard</GradientButton>
            </div>
        )
    }

    const initials = profile.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
    const memberSince = new Date(profile.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <main className="pt-12 pb-24 px-6 md:px-12 max-w-screen-2xl mx-auto">
                <div className="mb-12">
                    <SectionHeading title={`${profile.full_name}'s Profile`} subtitle="" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Stanga: info profil */}
                    <div className="lg:col-span-4">
                        <div className="rounded-[2rem] p-8 text-center" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.04)' }}>
                            {/* Avatar */}
                            <div className="w-28 h-28 rounded-full mx-auto mb-6 overflow-hidden"
                                style={{ background: profile.avatar_url ? 'transparent' : '#EFE9E3', border: '3px solid #D9CFC7' }}>
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-3xl font-bold" style={{ color: '#6b5e50' }}>{initials}</span>
                                    </div>
                                )}
                            </div>

                            <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                {profile.full_name}
                            </h2>
                            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9B59C' }}>
                                {profile.role === 'helper' ? 'Technician' : 'Homeowner'}
                            </span>

                            {/* Rating */}
                            {profile.rating_count > 0 && (
                                <div className="flex items-center justify-center gap-1 mt-4">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <span key={s} className="material-symbols-outlined text-lg"
                                            style={{ color: s <= Math.round(profile.rating_avg) ? '#F59E0B' : '#D9CFC7', fontVariationSettings: "'FILL' 1" }}>star</span>
                                    ))}
                                    <span className="text-sm font-bold ml-1" style={{ color: '#2c2419' }}>
                                        {Number(profile.rating_avg).toFixed(1)}
                                    </span>
                                    <span className="text-xs" style={{ color: '#6b5e50' }}>({profile.rating_count})</span>
                                </div>
                            )}

                            {/* Info cards */}
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                {profile.city && (
                                    <div className="p-3 rounded-xl" style={{ background: '#F9F8F6' }}>
                                        <span className="material-symbols-outlined text-sm block mb-1" style={{ color: '#C9B59C' }}>location_on</span>
                                        <span className="text-xs font-medium" style={{ color: '#2c2419' }}>{profile.city}</span>
                                    </div>
                                )}
                                <div className="p-3 rounded-xl" style={{ background: '#F9F8F6' }}>
                                    <span className="material-symbols-outlined text-sm block mb-1" style={{ color: '#C9B59C' }}>calendar_month</span>
                                    <span className="text-xs font-medium" style={{ color: '#2c2419' }}>Since {memberSince}</span>
                                </div>
                            </div>

                            {/* Bio */}
                            {profile.bio && (
                                <div className="mt-6 pt-6" style={{ borderTop: '1px solid #EFE9E3' }}>
                                    <p className="text-sm leading-relaxed text-left" style={{ color: '#6b5e50' }}>{profile.bio}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Dreapta: reviews + completed jobs */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Reviews */}
                        <div className="rounded-[2rem] p-8" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.04)' }}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl" style={{ background: '#FEF3C7' }}>
                                    <span className="material-symbols-outlined" style={{ color: '#F59E0B', fontVariationSettings: "'FILL' 1" }}>star</span>
                                </div>
                                <h3 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                    Reviews ({reviews.length})
                                </h3>
                            </div>

                            {reviews.length === 0 ? (
                                <p className="text-sm py-4" style={{ color: '#6b5e50' }}>No reviews yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <div key={review.id} className="p-5 rounded-xl" style={{ background: '#F9F8F6' }}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center"
                                                        style={{ background: review.reviewer.avatar_url ? 'transparent' : '#EFE9E3' }}>
                                                        {review.reviewer.avatar_url ? (
                                                            <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-sm" style={{ color: '#6b5e50' }}>person</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold" style={{ color: '#2c2419' }}>{review.reviewer.full_name}</span>
                                                        <span className="text-xs block" style={{ color: '#A89882' }}>
                                                            {new Date(review.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <span key={s} className="material-symbols-outlined text-sm"
                                                            style={{ color: s <= review.rating ? '#F59E0B' : '#D9CFC7', fontVariationSettings: "'FILL' 1" }}>star</span>
                                                    ))}
                                                </div>
                                            </div>
                                            {review.job && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#A89882' }}>
                                                    Job: {review.job.title}
                                                </span>
                                            )}
                                            {review.comment && (
                                                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#6b5e50' }}>{review.comment}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>


                    </div>
                </div>
            </main>
        </div>
    )
}
