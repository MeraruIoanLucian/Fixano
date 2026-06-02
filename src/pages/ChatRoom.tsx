import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"
import GradientButton from "../components/GradientButton"
import ChatOfferBubble from "../components/ChatOfferBubble"

export default function ChatRoom() {
    const [messages, setMessages] = useState<any[]>([])
    const [conversation, setConversation] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    // state pt oferte in chat (negociere)
    const [showOfferForm, setShowOfferForm] = useState(false)
    const [offerAmount, setOfferAmount] = useState('')
    const [chatOffers, setChatOffers] = useState<any>({})
    const [offerLoading, setOfferLoading] = useState(false)
    const [jobStatus, setJobStatus] = useState<string | null>(null)
    const { user } = useAuth()
    const { conversationId } = useParams() as { conversationId: string }
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const intervalRef = useRef<number | null>(null)

    // la mount iau conversatia si mesajele
    useEffect(() => {
        async function fetchData() {
            const { data: conversation } = await supabase
                .from('conversations')
                .select(`
        *, 
        helped:profiles!helped_id(id, full_name, avatar_url), 
        helper:profiles!helper_id(id, full_name, avatar_url)
    `)
                .eq('id', conversationId)
                .single();
            setConversation(conversation);

            const { data: messages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });
            setMessages(messages ?? []);

            // fetch ofertele din chat pt a afisa bubble-urile corect
            const { data: offers } = await supabase
                .from('chat_offers')
                .select('*')
                .eq('conversation_id', conversationId);
            if (offers) {
                const map: any = {}
                for (const o of offers) map[o.id] = o
                setChatOffers(map)
            }

            // iau statusul jobului ca sa stiu daca pot trimite oferte
            if (conversation?.job_id) {
                const { data: job } = await supabase.from('jobs').select('status').eq('id', conversation.job_id).single()
                if (job) setJobStatus(job.status)
            }

            setLoading(false)
        }
        fetchData()
    }, [conversationId])

    // polling pt mesaje noi la 4 secunde
    useEffect(() => {
        if (loading) return

        intervalRef.current = window.setInterval(async () => {
            const lastTimestamp = messages.length > 0 ? messages[messages.length - 1].created_at : undefined;
            const query = supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (lastTimestamp) {
                query.gt('created_at', lastTimestamp);
            }

            const { data: newMessages } = await query;
            if (newMessages && newMessages.length > 0) {
                setMessages(prev => [...prev, ...newMessages]);
                // daca sunt mesaje noi de tip offer, fetch ofertele aferente
                const offerMsgs = newMessages.filter((m: any) => m.type === 'offer')
                if (offerMsgs.length > 0) {
                    const { data: freshOffers } = await supabase
                        .from('chat_offers')
                        .select('*')
                        .eq('conversation_id', conversationId);
                    if (freshOffers) {
                        const map: any = {}
                        for (const o of freshOffers) map[o.id] = o
                        setChatOffers(map)
                    }
                }
            }
        }, 4000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [loading, messages.length])

    // scroll automat cand vine mesaj nou
    useEffect(() => {
        const container = messagesContainerRef.current
        if (container) {
            container.scrollTop = container.scrollHeight
        }
    }, [messages])

    async function handleSend(e: React.FormEvent) {
        e.preventDefault()
        if (!newMessage.trim() || sending) return
        setSending(true);
        const { data: sentMessage } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user?.id,
                body: newMessage.trim(),
                type: 'text'
            })
            .select('*')
            .single();
        if (sentMessage) {
            setMessages(prev => [
                ...prev,
                {
                    id: sentMessage.id,
                    sender_id: user?.id,
                    body: newMessage.trim(),
                    type: 'text',
                    created_at: sentMessage.created_at
                }
            ]);
        }
        setNewMessage('');
        setSending(false);
    }

    // upload imagine in chat
    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            alert('Imaginea e prea mare. Max 5MB.')
            return
        }
        setSending(true);
        // upload in storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('chat-images')
            .upload(fileName, file);
        if (uploadError) {
            console.error('Error uploading file:', uploadError);
            setSending(false);
            return;
        }
        // get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('chat-images')
            .getPublicUrl(fileName);
        // insert message cu type: 'image'
        const { data: sentMessage } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user?.id,
                body: publicUrl,
                type: 'image'
            })
            .select('*')
            .single();
        if (sentMessage) {
            setMessages(prev => [
                ...prev,
                {
                    id: sentMessage.id,
                    sender_id: user?.id,
                    body: publicUrl,
                    type: 'image',
                    created_at: sentMessage.created_at
                }
            ]);
        }
        setSending(false);
    }

    // trimite oferta de pret in chat
    async function handleSendChatOffer(e: React.FormEvent) {
        e.preventDefault()
        if (!offerAmount.trim() || offerLoading) return
        setOfferLoading(true)
        // 1. insert in chat_offers
        const { data: offer } = await supabase
            .from('chat_offers')
            .insert({
                conversation_id: conversationId,
                sender_id: user?.id,
                amount: parseFloat(offerAmount),
            })
            .select('*')
            .single()
        if (offer) {
            // 2. insert mesaj cu type: 'offer' si body: offer.id
            const { data: sentMessage } = await supabase
                .from('messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user?.id,
                    body: offer.id,
                    type: 'offer'
                })
                .select('*')
                .single()
            if (sentMessage) {
                setMessages(prev => [...prev, sentMessage])
            }
            // adaug oferta in map-ul local
            setChatOffers((prev: any) => {
                // invalidez ofertele vechi pending (trigger-ul face asta in DB, dar si local)
                const updated: any = {}
                for (const key of Object.keys(prev)) {
                    if (prev[key].status === 'pending' && prev[key].id !== offer.id) {
                        updated[key] = { ...prev[key], status: 'declined' }
                    } else {
                        updated[key] = prev[key]
                    }
                }
                updated[offer.id] = offer
                return updated
            })
        }
        setOfferAmount('')
        setShowOfferForm(false)
        setOfferLoading(false)
    }

    // accept oferta din chat
    async function handleAcceptOffer(offerId: string) {
        setOfferLoading(true)
        await supabase.from('chat_offers').update({ status: 'accepted' }).eq('id', offerId)
        // update local
        setChatOffers((prev: any) => ({ ...prev, [offerId]: { ...prev[offerId], status: 'accepted' } }))
        // jobul devine assigned (trigger-ul face asta in DB)
        setJobStatus('assigned')
        setOfferLoading(false)
    }

    // decline oferta din chat
    async function handleDeclineOffer(offerId: string) {
        setOfferLoading(true)
        await supabase.from('chat_offers').update({ status: 'declined' }).eq('id', offerId)
        setChatOffers((prev: any) => ({ ...prev, [offerId]: { ...prev[offerId], status: 'declined' } }))
        setOfferLoading(false)
    }

    // celalalt user din conversatie
    const partner = conversation
        ? (user?.id === conversation.helped_id ? conversation.helper : conversation.helped)
        : null

    if (loading) {
        return (
            <div className="flex justify-center py-32">
                <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#D9CFC7', borderTopColor: '#C9B59C' }} />
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

                {/* header cu back + avatar partener */}
                <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid #EFE9E3' }}>
                    <GradientButton to="/chat" variant="outline" icon="arrow_back" size="sm">Back</GradientButton>
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                        style={{ background: '#EFE9E3', border: '2px solid #D9CFC7' }}>
                        {partner?.avatar_url ? (
                            <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-lg" style={{ color: '#6b5e50' }}>person</span>
                        )}
                    </div>
                    <div>
                        <Link to={`/profile/${partner?.id}`} className="font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                            {partner?.full_name ?? 'User'}
                        </Link>
                    </div>
                </div>


                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ background: '#F9F8F6' }}>
                    {messages.map(msg => {
                        const isMine = msg.sender_id === user?.id

                        // daca e mesaj de tip offer, afisez bubble-ul special
                        if (msg.type === 'offer') {
                            const offer = chatOffers[msg.body]
                            if (!offer) return null
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div>
                                        <ChatOfferBubble
                                            offer={offer}
                                            isMine={isMine}
                                            onAccept={handleAcceptOffer}
                                            onDecline={handleDeclineOffer}
                                            loading={offerLoading}
                                        />
                                        <span className={`text-[10px] mt-1 block ${isMine ? 'text-right' : 'text-left'}`} style={{ color: '#A89882' }}>
                                            {(() => {
                                                const d = new Date(msg.created_at)
                                                const today = new Date()
                                                const isToday = d.toDateString() === today.toDateString()
                                                return isToday
                                                    ? d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                                                    : d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[70%]">

                                    <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                                        style={{
                                            background: isMine ? '#2c2419' : '#FFFFFF',
                                            color: isMine ? '#F9F8F6' : '#2c2419',
                                            borderBottomRightRadius: isMine ? '4px' : '16px',
                                            borderBottomLeftRadius: isMine ? '16px' : '4px',
                                        }}>
                                        {msg.type === 'image' ? (
                                            <img src={msg.body} alt="Shared" className="rounded-xl max-w-full cursor-pointer" onClick={() => setPreviewImage(msg.body)} />
                                        ) : (
                                            msg.body
                                        )}
                                    </div>
                                    <span className={`text-[10px] mt-1 block ${isMine ? 'text-right' : 'text-left'}`} style={{ color: '#A89882' }}>
                                        {(() => {
                                            const d = new Date(msg.created_at)
                                            const today = new Date()
                                            const isToday = d.toDateString() === today.toDateString()
                                            return isToday
                                                ? d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                                                : d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                                        })()}
                                    </span>
                                </div>
                            </div>
                        )
                    })}

                    <div ref={messagesEndRef} />
                </div>


                <div className="px-6 py-4" style={{ borderTop: '1px solid #EFE9E3', background: '#FFFFFF' }}>

                    {/* buton Send Offer — doar daca jobul e open */}
                    {jobStatus === 'open' && !showOfferForm && (
                        <button onClick={() => setShowOfferForm(true)}
                            className="w-full mb-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                            style={{ background: '#C9B59C20', color: '#2c2419', border: '1px dashed #C9B59C' }}>
                            <span className="material-symbols-outlined text-sm" style={{ color: '#C9B59C', fontVariationSettings: "'FILL' 1" }}>payments</span>
                            Send Offer
                        </button>
                    )}

                    {/* mini form pt oferta — apare la click pe Send Offer */}
                    {showOfferForm && (
                        <form onSubmit={handleSendChatOffer} className="flex items-center gap-2 mb-3">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F9F8F6', border: '1px solid #C9B59C' }}>
                                <span className="material-symbols-outlined text-sm" style={{ color: '#C9B59C', fontVariationSettings: "'FILL' 1" }}>payments</span>
                                <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                                    placeholder="Price (RON)" required min="1" autoFocus
                                    className="flex-1 outline-none text-sm bg-transparent"
                                    style={{ border: 'none', color: '#2c2419' }} />
                            </div>
                            <button type="submit" disabled={!offerAmount.trim() || offerLoading}
                                className="px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                                style={{ background: '#2c2419', color: '#F9F8F6' }}>
                                {offerLoading ? 'Sending...' : 'Send'}
                            </button>
                            <button type="button" onClick={() => { setShowOfferForm(false); setOfferAmount('') }}
                                className="p-2 rounded-xl transition-all cursor-pointer" style={{ color: '#6b5e50' }}>
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </form>
                    )}

                    <form onSubmit={handleSend} className="flex items-center gap-3">

                        <button type="button" onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-xl transition-all" style={{ color: '#6b5e50' }}>
                            <span className="material-symbols-outlined">attach_file</span>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />


                        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-3 rounded-xl outline-none text-sm"
                            style={{ background: '#F9F8F6', border: 'none', color: '#2c2419' }} />


                        <button type="submit" disabled={!newMessage.trim() || sending}
                            className="p-3 rounded-xl transition-all disabled:opacity-30"
                            style={{ background: '#2c2419', color: '#F9F8F6' }}>
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        </button>
                    </form>
                </div>
            </div>

            {previewImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.85)' }}
                    onClick={() => setPreviewImage(null)}>
                    <button className="absolute top-6 right-6 p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
                        onClick={() => setPreviewImage(null)}>
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                    <img src={previewImage} alt="Preview" className="max-w-full max-h-full rounded-2xl object-contain" />
                </div>
            )}
        </>
    );
}
