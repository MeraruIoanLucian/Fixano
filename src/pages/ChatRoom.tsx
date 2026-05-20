import { useState, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"
import GradientButton from "../components/GradientButton"

export default function ChatRoom() {
    const [messages, setMessages] = useState<any[]>([])
    const [conversation, setConversation] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
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
