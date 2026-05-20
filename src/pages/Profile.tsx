import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SectionHeading from '../components/SectionHeading'
import GradientButton from '../components/GradientButton'
import AlertMessage from '../components/AlertMessage'

export default function ProfilePage() {
    const { profile, user, signOut, refreshProfile } = useAuth()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    // state-uri pt editare profil
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(profile?.full_name ?? '')
    const [editPhone, setEditPhone] = useState(profile?.phone ?? '')
    const [editCity, setEditCity] = useState(profile?.city ?? '')
    const [editBio, setEditBio] = useState(profile?.bio ?? '')
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    function startEditing() {
        // resetam la valorile curente din profil
        setEditName(profile?.full_name ?? '')
        setEditPhone(profile?.phone ?? '')
        setEditCity(profile?.city ?? '')
        setEditBio(profile?.bio ?? '')
        setIsEditing(true)
        setSaveMsg(null)
    }

    async function handleDeleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This action is irreversible.')) return

        const { error } = await supabase.rpc('delete_own_account')
        if (error) {
            alert('Error deleting account: ' + error.message)
            return
        }
        await signOut()
    }


    async function handleSave() {
        if (!user) return
        setSaving(true)
        setSaveMsg(null)
        const { error } = await supabase.from('profiles').update({
            full_name: editName.trim(),
            phone: editPhone.trim(),
            city: editCity.trim(),
            bio: editBio.trim() || null,
        }).eq('id', user.id)

        if (error) {
            setSaveMsg({ type: 'error', text: error.message })
        } else {
            await refreshProfile()
            setIsEditing(false)
            setSaveMsg({ type: 'success', text: 'Profile updated successfully!' })
        }
        setSaving(false)
    }

    async function handleSignOut() {
        await signOut()
        navigate('/')
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !user) return
        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const filePath = `${user.id}/avatar.${fileExt}`
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)
            if (updateError) throw updateError
            await refreshProfile()
        } catch (err) {
            console.error('Avatar upload failed:', err)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const initials = profile?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    // style comun pt input-urile de editare
    const inputStyle = {
        background: '#F9F8F6',
        border: '1px solid #D9CFC7',
        color: '#2c2419',
    }

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <main className="pt-12 pb-24 px-6 md:px-12 max-w-4xl mx-auto">
                {/* Profile Header Card */}
                <div
                    className="rounded-[2rem] p-8 md:p-12 mb-8 relative overflow-hidden"
                    style={{ background: '#4a3f35' }}
                >
                    <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(200, 180, 155, 0.15)' }} />

                    <div className="relative z-10 flex flex-col items-center text-center">
                        {/* Avatar */}
                        <div
                            className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl overflow-hidden cursor-pointer group mb-6"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ border: '4px solid rgba(201, 181, 156, 0.3)' }}
                        >
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ background: '#C9B59C30' }}>
                                    <span className="text-4xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#C9B59C' }}>
                                        {initials || '?'}
                                    </span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {uploading ? (
                                    <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-white">photo_camera</span>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                        </div>

                        <SectionHeading
                            title={profile?.full_name ?? 'User'}
                            light
                            centered
                            size="sm"
                        />
                        <div className="flex items-center gap-2 mt-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: '#C9B59C', fontVariationSettings: "'FILL' 1" }}>
                                {profile?.role === 'helper' ? 'engineering' : 'home'}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: '#C9B59C' }}>
                                {profile?.role === 'helper' ? 'Technician' : 'Homeowner'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Mesaj de save */}
                {saveMsg && (
                    <div className="mb-6">
                        <AlertMessage type={saveMsg.type} message={saveMsg.text} />
                    </div>
                )}

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="rounded-[2rem] p-8" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44,36,25,0.04)' }}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl" style={{ background: '#C9B59C20' }}>
                                    <span className="material-symbols-outlined" style={{ color: '#C9B59C' }}>badge</span>
                                </div>
                                <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Personal Info</h2>
                            </div>
                            {!isEditing && (
                                <button onClick={startEditing}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    style={{ background: '#EFE9E3', color: '#2c2419' }}>
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                    Edit
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            // mod editare — input-uri
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: '#6b5e50' }}>Full Name</label>
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl outline-none text-sm" style={inputStyle} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: '#6b5e50' }}>Email</label>
                                    <input type="email" value={user?.email ?? ''} disabled
                                        className="w-full px-4 py-2.5 rounded-xl outline-none text-sm opacity-50 cursor-not-allowed" style={inputStyle} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: '#6b5e50' }}>Phone</label>
                                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                                        placeholder="e.g. 0740 123 456"
                                        className="w-full px-4 py-2.5 rounded-xl outline-none text-sm" style={inputStyle} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold tracking-widest uppercase mb-1 block" style={{ color: '#6b5e50' }}>City</label>
                                    <input type="text" value={editCity} onChange={e => setEditCity(e.target.value)}
                                        placeholder="e.g. București"
                                        className="w-full px-4 py-2.5 rounded-xl outline-none text-sm" style={inputStyle} />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <GradientButton onClick={handleSave} loading={saving} disabled={saving} size="sm" icon="save">
                                        Save
                                    </GradientButton>
                                    <button onClick={() => { setIsEditing(false); setSaveMsg(null) }}
                                        className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer"
                                        style={{ border: '1px solid #D9CFC7', color: '#6b5e50' }}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // mod vizualizare — read only
                            <div className="space-y-5">
                                {[
                                    { label: 'Full Name', value: profile?.full_name, icon: 'person' },
                                    { label: 'Email', value: user?.email, icon: 'mail' },
                                    { label: 'Phone', value: profile?.phone || 'Not set', icon: 'phone' },
                                    { label: 'City', value: profile?.city || 'Not set', icon: 'location_on' },
                                ].map((field, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <span className="material-symbols-outlined text-lg" style={{ color: '#D9CFC7' }}>{field.icon}</span>
                                        <div>
                                            <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#6b5e50' }}>{field.label}</div>
                                            <div className="text-sm font-medium" style={{ color: '#2c2419' }}>{field.value ?? '—'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stats Card */}
                    <div className="rounded-[2rem] p-8" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44,36,25,0.04)' }}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 rounded-xl" style={{ background: '#C9B59C20' }}>
                                <span className="material-symbols-outlined" style={{ color: '#C9B59C' }}>insights</span>
                            </div>
                            <h2 className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Stats & Reputation</h2>
                        </div>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                                    <span className="material-symbols-outlined text-2xl" style={{ color: '#F59E0B', fontVariationSettings: "'FILL' 1" }}>star</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                        {profile?.rating_avg?.toFixed(1) ?? '0.0'}
                                    </div>
                                    <div className="text-xs" style={{ color: '#6b5e50' }}>{profile?.rating_count ?? 0} reviews</div>
                                </div>
                            </div>

                            {/* Bio — editabil */}
                            <div>
                                <div className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#6b5e50' }}>Bio</div>
                                {isEditing ? (
                                    <textarea
                                        value={editBio}
                                        onChange={e => setEditBio(e.target.value)}
                                        placeholder="Tell others about yourself..."
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-xl outline-none text-sm resize-none"
                                        style={inputStyle}
                                    />
                                ) : (
                                    <p className="text-sm leading-relaxed" style={{ color: profile?.bio ? '#2c2419' : '#A89882' }}>
                                        {profile?.bio ?? 'No bio added yet.'}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#F9F8F6' }}>
                                <span className="material-symbols-outlined text-sm" style={{ color: '#C9B59C' }}>calendar_today</span>
                                <span className="text-sm" style={{ color: '#6b5e50' }}>
                                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-[2rem] p-8 mt-6 flex flex-col sm:flex-row justify-between items-center gap-6" style={{ background: '#EFE9E3' }}>
                    <div>
                        <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Quick Actions</h3>
                        <p className="text-sm" style={{ color: '#6b5e50' }}>Jump to your most-used features.</p>
                    </div>
                    <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                        <GradientButton to="/dashboard" variant="outline" icon="dashboard" size="sm">Dashboard</GradientButton>
                        <GradientButton to="/helped-jobs" icon="pending_actions" size="sm">My Jobs</GradientButton>
                        <button onClick={handleSignOut}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer"
                            style={{ border: '1px solid #D9CFC7', color: '#6b5e50' }}>
                            <span className="material-symbols-outlined text-sm">logout</span>
                            Sign Out
                        </button>
                        <button onClick={handleDeleteAccount}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer"
                            style={{ border: '1px solid #D9CFC7', color: '#6b5e50' }}>
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Delete account
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}
