import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import EmptyState from "../components/EmptyState";
import AlertMessage from "../components/AlertMessage";


export default function Chat() {

    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastMessages, setLastMessages] = useState<any>({});
    const { user } = useAuth();

    useEffect(() => {
        async function fetchConversations() {
            const { data, error } = await supabase
                .from('conversations')
                .select('*, helped:profiles!helped_id(full_name, avatar_url), helper:profiles!helper_id(full_name, avatar_url), job:jobs(title, category)')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching conversations:', error);
                setError('Failed to load conversations');
            } else {
                setConversations(data || []);
                // iau si ultimul mesaj pt fiecare conv
                const msgs: any = {};
                for (const conv of data || []) {
                    const { data: lastMsg } = await supabase
                        .from('messages')
                        .select('body, type, created_at')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                    if (lastMsg) msgs[conv.id] = lastMsg;
                }
                setLastMessages(msgs);
            }
            setLoading(false);
        }

        fetchConversations();
    }, [])

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <main className="pt-12 pb-24 px-6 md:px-12 max-w-screen-2xl mx-auto">
                <header className="mb-12">
                    <SectionHeading title="Your Conversations" subtitle="Messages between you and your service partners." />
                </header>

                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: '#D9CFC7', borderTopColor: '#C9B59C' }} />
                    </div>
                )}

                {error && <div className="mb-6"><AlertMessage type="error" message={error} /></div>}

                {!loading && !error && conversations.length === 0 && (
                    <EmptyState
                        title="No conversations yet"
                        description="Conversations are created when a technician sends an offer on one of your jobs."
                    />
                )}

                {!loading && !error && conversations.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {conversations.map(conv => {
                            // afisez partenerul (celalalt user)
                            const partner = user?.id === conv.helped_id ? conv.helper : conv.helped
                            const lastMsg = lastMessages[conv.id]

                            return (
                                <Link key={conv.id} to={`/chat/${conv.id}`}
                                    className="block rounded-2xl p-6 transition-all duration-200 hover:shadow-lg"
                                    style={{ background: '#FFFFFF', textDecoration: 'none' }}>
                                    <div className="flex items-center gap-4">

                                        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                                            style={{ background: '#EFE9E3', border: '2px solid #D9CFC7' }}>
                                            {partner?.avatar_url ? (
                                                <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-xl" style={{ color: '#6b5e50' }}>person</span>
                                            )}
                                        </div>


                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                                {partner?.full_name ?? 'User'}
                                            </div>
                                            <div className="text-xs truncate" style={{ color: '#6b5e50' }}>
                                                {conv.job?.title ?? 'Job'}
                                            </div>
                                            {lastMsg && (
                                                <p className="text-xs mt-1 truncate" style={{ color: '#A89882' }}>
                                                    {lastMsg.type === 'image' ? '📷 Photo' : lastMsg.type === 'offer' ? '💰 Price Offer' : lastMsg.body}
                                                </p>
                                            )}
                                        </div>


                                        <div className="text-right shrink-0">
                                            <span className="text-[10px] block mb-1" style={{ color: '#A89882' }}>
                                                {new Date(lastMsg?.created_at ?? conv.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <span className="material-symbols-outlined text-lg" style={{ color: '#D9CFC7' }}>chevron_right</span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
