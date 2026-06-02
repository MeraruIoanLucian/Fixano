import { useParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { getOrCreateConversation } from "../lib/getSauCreateConversation"
import { supabase } from "../lib/supabase"
import { StatusBadge, UrgencyBadge } from "../components/StatusBadge"
import GradientButton from "../components/GradientButton"
import AlertMessage from "../components/AlertMessage"

export default function JobDetails() {
    const [job, setJob] = useState<any>(null)
    const [offers, setOffers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [price, setPrice] = useState('')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [hasApplied, setHasApplied] = useState(false)

    // review states
    const [reviewRating, setReviewRating] = useState(0)
    const [reviewHover, setReviewHover] = useState(0)
    const [reviewComment, setReviewComment] = useState('')
    const [reviewSubmitting, setReviewSubmitting] = useState(false)
    const [existingReview, setExistingReview] = useState<any>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const { user } = useAuth()
    const { id } = useParams()
    const navigate = useNavigate()

    const isOwner = user?.id === job?.owner_id

    useEffect(() => {
        async function fetchJob() {
            const { data: job } = await supabase.from('jobs').select('*').eq('id', id).single()
            setJob(job)
            if (user?.id === job?.owner_id) {
                const { data: offersData } = await supabase.from('offers').select('*, helper:profiles!helper_id(full_name, avatar_url, rating_avg)').eq('job_id', id)
                setOffers(offersData ?? [])
            }
            // daca helper a mai dat oferta nu mai poate sa dea alta aici ci doar in chat o editare 
            else if (user) {
                const { data: myOffer } = await supabase.from('offers').select('*').eq('job_id', id).eq('helper_id', user.id).maybeSingle()
                if (myOffer) setHasApplied(true)
            }

            // verificam daca exista deja un review pt acest job
            if (user) {
                const { data: review } = await supabase.from('reviews').select('*').eq('job_id', id).eq('reviewer_id', user.id).maybeSingle()
                if (review) setExistingReview(review)
            }

            setLoading(false)
        }
        fetchJob()
    }, [])

    async function handleSendOffer(e: React.FormEvent) {
        e.preventDefault()
        setSubmitError(null)
        setSubmitting(true)
        try {
            const { error } = await supabase.from('offers').insert({
                job_id: id,
                helper_id: user?.id,
                price: parseFloat(price),
                message,
            })
            if (error) throw error
            const conversation = await getOrCreateConversation(id!, job.owner_id, user?.id!)

            // creez si un chat_offer + mesaj ca oferta sa apara in chat
            const { data: chatOffer } = await supabase.from('chat_offers').insert({
                conversation_id: conversation.id,
                sender_id: user?.id,
                amount: parseFloat(price),
            }).select('*').single()
            if (chatOffer) {
                await supabase.from('messages').insert({
                    conversation_id: conversation.id,
                    sender_id: user?.id,
                    body: chatOffer.id,
                    type: 'offer'
                })
            }

            navigate('/chat/' + conversation.id)
        } catch (error: any) {
            setSubmitError(error.message)
        } finally {
            setSubmitting(false)
        }
    }


    async function handleSubmitReview() {
        if (!user || !job || reviewRating === 0) return
        setReviewSubmitting(true)
        // owner lasa review la helper, helper lasa review la owner
        const reviewedId = isOwner ? job.helper_id : job.owner_id
        const { data, error } = await supabase.from('reviews').insert({
            job_id: job.id,
            reviewer_id: user.id,
            reviewed_id: reviewedId,
            rating: reviewRating,
            comment: reviewComment.trim() || null,
        }).select().single()
        if (!error && data) {
            setExistingReview(data)
        }
        setReviewSubmitting(false)
    }

    // Loading
    if (loading) {
        return (
            <div className="flex justify-center py-32">
                <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#D9CFC7', borderTopColor: '#C9B59C' }} />
            </div>
        )
    }

    if (!job) {
        return (
            <div className="pt-12 pb-24 px-6 md:px-12 max-w-4xl mx-auto text-center">
                <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: '#C9B59C' }}>search_off</span>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Job not found</h2>
                <p className="mb-6" style={{ color: '#6b5e50' }}>This job may have been removed or doesn't exist.</p>
                <GradientButton to="/dashboard" icon="arrow_back">Back to Dashboard</GradientButton>
            </div>
        )
    }

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;
        await supabase
            .from('jobs')
            .delete()
            .eq('id', job.id);
        navigate('/helped-jobs');
    }

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <main className="pt-12 pb-24 px-6 md:px-12 max-w-screen-2xl mx-auto">

                {/* Header cu detalii job */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* Stanga: detalii job */}
                    <div className="lg:col-span-7">
                        <div className="mb-6">
                            <GradientButton to="/helped-jobs" variant="outline" icon="arrow_back" size="sm">Back to Jobs</GradientButton>
                        </div>

                        <div className="rounded-[2rem] p-8 md:p-12 relative" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.04)' }}>
                            {job.owner_id === user?.id && job.status === 'open' && (
                                <button className='px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer absolute' style={{ backgroundColor: '#FEE2E2', color: '#991B1B', top: '2rem', right: '2rem' }} onClick={handleDelete}>Delete job</button>
                            )}
                            {job.owner_id === user?.id && job.status === 'pending_completion' && (
                                <button className='px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer absolute' style={{ backgroundColor: '#FEE2E2', color: '#991B1B', top: '2rem', right: '2rem' }} onClick={handleDelete}>Delete job</button>
                                //TODO: sa fac sa trebuiasca report
                            )}

                            {/* Status + Urgency */}
                            <div className="flex items-center gap-3 mb-6 flex-wrap">
                                <StatusBadge status={job.status} />
                                <UrgencyBadge urgency={job.urgency} />
                            </div>
                            {/* Categorie + Titlu */}
                            <div className="flex items-start gap-5 mb-8">

                                <div>
                                    <span className="text-[10px] font-bold tracking-widest uppercase block mb-1" style={{ color: '#6b5e50' }}>{job.category}</span>
                                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                        {job.title}
                                    </h1>
                                </div>
                            </div>

                            {/* Descriere */}
                            <div className="mb-8">
                                <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#6b5e50' }}>Description</h3>
                                <p className="leading-relaxed" style={{ color: '#2c2419' }}>{job.description}</p>
                            </div>

                            {/* Galerie imagini daca exista */}
                            {job.image_urls && job.image_urls.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#6b5e50' }}>Photos</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {job.image_urls.map((url: string, i: number) => (
                                            <div key={i}
                                                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setPreviewImage(url)}>
                                                <img src={url} alt={`Job photo ${i + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Info grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6" style={{ borderTop: '1px solid #EFE9E3' }}>
                                {job.budget && (
                                    <div className="p-4 rounded-xl" style={{ background: '#F9F8F6' }}>
                                        <span className="text-[10px] font-bold tracking-widest uppercase block mb-1" style={{ color: '#6b5e50' }}>Budget</span>
                                        <span className="text-lg font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>{job.budget}</span>
                                    </div>
                                )}
                                <div className="p-4 rounded-xl" style={{ background: '#F9F8F6' }}>
                                    <span className="text-[10px] font-bold tracking-widest uppercase block mb-1" style={{ color: '#6b5e50' }}>Posted</span>
                                    <span className="text-sm font-medium" style={{ color: '#2c2419' }}>
                                        {new Date(job.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="p-4 rounded-xl" style={{ background: '#F9F8F6' }}>
                                    <span className="text-[10px] font-bold tracking-widest uppercase block mb-1" style={{ color: '#6b5e50' }}>Offers</span>
                                    <span className="text-lg font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>{offers.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dreapta: formular oferta SAU lista oferte */}
                    <aside className="lg:col-span-5 lg:sticky lg:top-32">

                        {/* Formular oferta doar pt helperi pe joburi open */}
                        {!isOwner && job.status === 'open' && !hasApplied && (
                            <div className="rounded-[2rem] p-8 relative overflow-hidden" style={{ background: '#4a3f35' }}>
                                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(200, 180, 155, 0.15)' }} />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-lg" style={{ background: 'rgba(201, 181, 156, 0.15)' }}>
                                            <span className="material-symbols-outlined" style={{ color: '#C9B59C', fontVariationSettings: "'FILL' 1" }}>local_offer</span>
                                        </div>
                                        <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF' }}>
                                            Send an Offer
                                        </h2>
                                    </div>

                                    <form onSubmit={handleSendOffer} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: '#D9CFC7' }}>Your Price (RON)</label>
                                            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                                                placeholder="e.g. 250" required min="1"
                                                className="w-full rounded-xl p-4 text-base outline-none"
                                                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFFFFF' }} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{ color: '#D9CFC7' }}>Message</label>
                                            <textarea value={message} onChange={e => setMessage(e.target.value)}
                                                placeholder="Describe your approach, availability, experience..."
                                                rows={4} required
                                                className="w-full rounded-xl p-4 text-base leading-relaxed resize-none outline-none"
                                                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#FFFFFF' }} />
                                        </div>

                                        {submitError && <AlertMessage type="error" message={submitError} />}

                                        <button type="submit" disabled={submitting}
                                            className="w-full py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: '#C9B59C', color: '#2c2419' }}>
                                            {submitting ? (
                                                <><span className="material-symbols-outlined animate-spin text-base">progress_activity</span>Sending...</>
                                            ) : (
                                                <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>Send Offer</>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {!isOwner && job.status === 'open' && hasApplied && (
                            <div className="rounded-[2rem] p-8 relative overflow-hidden" style={{ background: '#4a3f35' }}>
                                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(200, 180, 155, 0.15)' }} />
                                <div className="relative z-10">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#C9B59C' }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C9B59C' }}>Offer Already Sent</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF' }}>Waiting for approval</h3>
                                    <p className="leading-relaxed mb-8" style={{ color: '#D9CFC7' }}>You've already submitted your offer. The homeowner will review it and contact you if they want to proceed.</p>
                                </div>
                            </div>
                        )}

                        {!isOwner && job.status === 'assigned' && (
                            <div className="rounded-[2rem] p-8 relative overflow-hidden" style={{ background: '#4a3f35' }}>
                                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(200, 180, 155, 0.15)' }} />
                                <div className="relative z-10">

                                    <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF' }}>Everything alright?</h3>
                                    <p className="leading-relaxed mb-8" style={{ color: '#D9CFC7' }}>Mark the job as done or tell us if you have any issues</p>
                                    <div className='flex gap-4'>
                                        <GradientButton onClick={async () => {
                                            await supabase.from('jobs').update({ status: 'pending_completion' }).eq('id', job.id)
                                            setJob({ ...job, status: 'pending_completion' })
                                        }} variant="secondary" icon="check_circle" size="sm">Mark as Done</GradientButton>
                                        <GradientButton variant="outline" icon="flag" size="sm">Report Issue</GradientButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isOwner && job.status === 'pending_completion' && (
                            <div className="rounded-[2rem] p-8 relative overflow-hidden" style={{ background: '#1E40AF' }}>
                                <div className="relative z-10">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#93C5FD' }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#93C5FD' }}>Pending</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF' }}>Waiting for approval</h3>
                                    <p className="leading-relaxed" style={{ color: '#BFDBFE' }}>You marked this job as done. The homeowner has 2 days to confirm or it will be automatically approved.</p>
                                </div>
                            </div>
                        )}

                        {isOwner && job.status === 'pending_completion' && (
                            <div className="rounded-[2rem] p-8 relative overflow-hidden" style={{ background: '#065F46' }}>
                                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(209, 250, 229, 0.15)' }} />
                                <div className="relative z-10">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#6EE7B7' }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6EE7B7' }}>Action Required</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF' }}>Job marked as done</h3>
                                    <p className="leading-relaxed mb-8" style={{ color: '#A7F3D0' }}>The technician finished the work. Please confirm or report any issues.</p>
                                    <div className='flex gap-4'>
                                        <GradientButton onClick={async () => {
                                            await supabase.from('jobs').update({ status: 'completed' }).eq('id', job.id)
                                            setJob({ ...job, status: 'completed' })
                                        }} variant="secondary" icon="verified" size="sm">Confirm Completion</GradientButton>
                                        <GradientButton variant="outline" icon="flag" size="sm">Report Issue</GradientButton>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Review section — apare dupa ce jobul e completed */}
                        {job.status === 'completed' && (
                            <div className="rounded-[2rem] p-8 relative overflow-hidden" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.04)' }}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-xl" style={{ background: '#FEF3C7' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#F59E0B', fontVariationSettings: "'FILL' 1" }}>star</span>
                                    </div>
                                    <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                        {existingReview ? 'Your Review' : 'Leave a Review'}
                                    </h2>
                                </div>

                                {existingReview ? (
                                    // review-ul exista deja — afisam read-only
                                    <div>
                                        <div className="flex items-center gap-1 mb-3">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <span key={star} className="material-symbols-outlined text-2xl"
                                                    style={{ color: star <= existingReview.rating ? '#F59E0B' : '#D9CFC7', fontVariationSettings: "'FILL' 1" }}>star</span>
                                            ))}
                                            <span className="text-sm font-bold ml-2" style={{ color: '#2c2419' }}>{existingReview.rating}/5</span>
                                        </div>
                                        {existingReview.comment && (
                                            <p className="text-sm leading-relaxed" style={{ color: '#6b5e50' }}>{existingReview.comment}</p>
                                        )}
                                        <p className="text-xs mt-3" style={{ color: '#A89882' }}>Submitted {new Date(existingReview.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                ) : (
                                    // formular review
                                    <div className="space-y-4">
                                        <p className="text-sm" style={{ color: '#6b5e50' }}>How was your experience with the technician?</p>

                                        {/* Stele clickabile */}
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button key={star} type="button"
                                                    className="cursor-pointer transition-transform hover:scale-110"
                                                    onMouseEnter={() => setReviewHover(star)}
                                                    onMouseLeave={() => setReviewHover(0)}
                                                    onClick={() => setReviewRating(star)}>
                                                    <span className="material-symbols-outlined text-3xl"
                                                        style={{ color: star <= (reviewHover || reviewRating) ? '#F59E0B' : '#D9CFC7', fontVariationSettings: "'FILL' 1" }}>star</span>
                                                </button>
                                            ))}
                                            {reviewRating > 0 && (
                                                <span className="text-sm font-bold ml-2" style={{ color: '#2c2419' }}>{reviewRating}/5</span>
                                            )}
                                        </div>

                                        <textarea
                                            value={reviewComment}
                                            onChange={e => setReviewComment(e.target.value)}
                                            placeholder="Tell us about your experience (optional)..."
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
                                            style={{ background: '#F9F8F6', border: '1px solid #D9CFC7', color: '#2c2419' }}
                                        />

                                        <GradientButton onClick={handleSubmitReview}
                                            loading={reviewSubmitting}
                                            disabled={reviewSubmitting || reviewRating === 0}
                                            icon="send" size="sm">
                                            Submit Review
                                        </GradientButton>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Lista oferte doar pt owner */}
                        {isOwner && job.status !== 'completed' && job.status !== 'cancelled' && (
                            <div className="rounded-[2rem] p-8" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.04)' }}>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="p-2 rounded-xl" style={{ background: '#C9B59C20' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#C9B59C' }}>list_alt</span>
                                    </div>
                                    <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                        Offers Received ({offers.length})
                                    </h2>
                                </div>

                                {offers.length === 0 ? (
                                    <div className="text-center py-8">
                                        <span className="material-symbols-outlined text-4xl mb-3 block" style={{ color: '#D9CFC7' }}>hourglass_empty</span>
                                        <p className="text-sm" style={{ color: '#6b5e50' }}>No offers yet. Technicians will see your job and send proposals.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {offers.map((offer) => (
                                            <div key={offer.id} className="rounded-2xl p-6" style={{ background: '#F9F8F6' }}>
                                                {/* Helper info */}
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
                                                        style={{ background: '#EFE9E3', border: '2px solid #D9CFC7' }}>
                                                        {offer.helper?.avatar_url ? (
                                                            <img src={offer.helper.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-lg" style={{ color: '#6b5e50' }}>person</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                                            {offer.helper?.full_name ?? 'Technician'}
                                                        </div>
                                                        {offer.helper?.rating_avg > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-xs" style={{ color: '#F59E0B', fontVariationSettings: "'FILL' 1" }}>star</span>
                                                                <span className="text-xs" style={{ color: '#6b5e50' }}>{offer.helper.rating_avg.toFixed(1)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: '#6b5e50' }}>Price</span>
                                                        <span className="text-xl font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                                            {offer.price} RON
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Mesaj oferta */}
                                                <p className="text-sm leading-relaxed mb-4" style={{ color: '#6b5e50' }}>{offer.message}</p>

                                                {/* Actiuni */}
                                                {offer.status === 'pending' && job.status === 'open' && (
                                                    <button onClick={async () => {
                                                        // du ownerul in chat ca sa negocieze acolo
                                                        const conv = await getOrCreateConversation(job.id, job.owner_id, offer.helper_id)
                                                        navigate('/chat/' + conv.id)
                                                    }}
                                                        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                                                        style={{ background: '#2c2419', color: '#F9F8F6' }}>
                                                        <span className="material-symbols-outlined text-sm">chat</span>Go to Chat
                                                    </button>
                                                )}
                                                {offer.status === 'accepted' && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                                                            style={{ background: '#D1FAE5', color: '#065F46' }}>Accepted</span>
                                                        <button onClick={async () => {
                                                            const conv = await getOrCreateConversation(job.id, job.owner_id, offer.helper_id)
                                                            navigate('/chat/' + conv.id)
                                                        }}
                                                            className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.97]"
                                                            style={{ background: '#2c2419', color: '#F9F8F6' }}>
                                                            <span className="material-symbols-outlined text-xs">chat</span>Go to Chat
                                                        </button>
                                                    </div>
                                                )}
                                                {offer.status === 'rejected' && (
                                                    <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                                                        style={{ background: '#F3F4F6', color: '#6B7280' }}>Declined</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            {/* Fullscreen image preview */}
            {previewImage && (
                <div className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}>
                    <button className="absolute top-6 right-6 text-white cursor-pointer"
                        onClick={() => setPreviewImage(null)}>
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                    <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-2xl object-contain"
                        onClick={e => e.stopPropagation()} />
                </div>
            )}
        </div>
    )
}