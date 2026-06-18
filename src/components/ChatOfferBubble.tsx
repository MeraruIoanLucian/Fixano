// componenta pt bubble-ul de oferta in chat (negociere stil Vinted)
// se afiseaza in loc de text bubble cand msg.type === 'offer'

type ChatOffer = {
    id: string
    sender_id: string
    amount: number
    status: string
    created_at: string
}

type Props = {
    offer: ChatOffer
    isMine: boolean
    isHomeowner?: boolean
    isHelper?: boolean
    acceptedByHelper?: boolean
    onAccept: (offerId: string) => void
    onDecline: (offerId: string) => void
    onPay?: (offerId: string) => void
    loading: boolean
}

export default function ChatOfferBubble({ offer, isMine, isHomeowner, isHelper, acceptedByHelper, onAccept, onDecline, onPay, loading }: Props) {

    // culori diferite in functie de status
    let cardBg = '#FFFFFF'
    let borderColor = '#C9B59C'
    let statusColor = '#C9B59C'
    let statusText = 'Pending'
    let statusIcon = 'schedule'

    if (offer.status === 'accepted') {
        cardBg = '#F0FDF4'
        borderColor = '#86EFAC'
        statusColor = '#065F46'
        statusText = 'Accepted & Paid'
        statusIcon = 'check_circle'
    } else if (offer.status === 'declined') {
        cardBg = '#F9FAFB'
        borderColor = '#E5E7EB'
        statusColor = '#9CA3AF'
        statusText = 'Declined'
        statusIcon = 'cancel'
    }

    const isPending = offer.status === 'pending'

    return (
        <div style={{
            background: cardBg,
            border: `2px solid ${borderColor}`,
            borderRadius: 16,
            padding: 20,
            maxWidth: 280,
            minWidth: 200,
        }}>
            {/* header */}
            <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-base"
                    style={{ color: '#C9B59C', fontVariationSettings: "'FILL' 1" }}>payments</span>
                <span className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: '#6b5e50' }}>Price Offer</span>
            </div>

            {/* pretul */}
            <div className="text-center py-3">
                <span className="text-2xl font-black"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                    {offer.amount} RON
                </span>
            </div>

            {/* If helper, they see Accept/Decline for Homeowner's offer */}
            {!isMine && isHelper && isPending && !acceptedByHelper && (
                <div className="flex gap-2 mt-3">
                    <button onClick={() => onAccept(offer.id)}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                        style={{ background: '#2c2419', color: '#F9F8F6' }}>
                        <span className="material-symbols-outlined text-sm">check</span>
                        Accept
                    </button>
                    <button onClick={() => onDecline(offer.id)}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                        style={{ background: 'transparent', border: '1px solid #D9CFC7', color: '#6b5e50' }}>
                        <span className="material-symbols-outlined text-sm">close</span>
                        Decline
                    </button>
                </div>
            )}

            {/* If helper and they already accepted it */}
            {isHelper && isPending && acceptedByHelper && (
                <div className="mt-3 text-center text-xs font-bold" style={{ color: '#C9B59C' }}>
                    Waiting for homeowner to pay...
                </div>
            )}

            {/* If homeowner, and they received an offer from Helper */}
            {!isMine && isHomeowner && isPending && (
                <div className="flex gap-2 mt-3">
                    <button onClick={() => onPay && onPay(offer.id)}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                        style={{ background: '#065F46', color: '#F0FDF4' }}>
                        <span className="material-symbols-outlined text-sm">payments</span>
                        Pay Now
                    </button>
                    <button onClick={() => onDecline(offer.id)}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                        style={{ background: 'transparent', border: '1px solid #D9CFC7', color: '#6b5e50' }}>
                        <span className="material-symbols-outlined text-sm">close</span>
                        Decline
                    </button>
                </div>
            )}

            {/* If homeowner, and it's their own offer, and Helper accepted it */}
            {isMine && isHomeowner && isPending && acceptedByHelper && (
                <div className="mt-3 flex flex-col gap-2">
                    <div className="text-center text-xs font-bold" style={{ color: '#065F46' }}>
                        The technician accepted your price!
                    </div>
                    <button onClick={() => onPay && onPay(offer.id)}
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
                        style={{ background: '#065F46', color: '#F0FDF4' }}>
                        <span className="material-symbols-outlined text-sm">payments</span>
                        Pay Now
                    </button>
                </div>
            )}

            {/* If homeowner, and it's their OWN offer, and Helper has not responded */}
            {isMine && isHomeowner && isPending && !acceptedByHelper && (
                <div className="mt-3 text-center text-xs font-bold" style={{ color: '#C9B59C' }}>
                    Waiting for technician to respond...
                </div>
            )}

            {/* If helper, and it's their OWN offer, and it's pending */}
            {isMine && isHelper && isPending && !acceptedByHelper && (
                <div className="mt-3 text-center text-xs font-bold" style={{ color: '#C9B59C' }}>
                    Waiting for homeowner to respond...
                </div>
            )}

            {/* status badge */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
                <span className="material-symbols-outlined text-xs"
                    style={{ color: statusColor, fontVariationSettings: "'FILL' 1" }}>{statusIcon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: statusColor }}>{statusText}</span>
            </div>
        </div>
    )
}

