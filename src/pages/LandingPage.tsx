import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import heroImg from '../assets/hero_technician.png'
import technicianImg from '../assets/Tehnician.png'
import wipImg from '../assets/WorkInProgress.png'
import Logo from '../components/Logo'
import GradientButton from '../components/GradientButton'
import SectionHeading from '../components/SectionHeading'

// Hook pt fade-in la scroll
function useFadeIn() {
    const ref = useRef<HTMLDivElement>(null) // referinta la div-ul pe care il observ
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const node = ref.current //nodul pe care il urmaresc
        if (!node) return
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true) },
            { threshold: 0.15 }
        )
        obs.observe(node)
        return () => obs.disconnect()
    }, [])

    return { ref, visible }
}

function FadeSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const { ref, visible } = useFadeIn() //aici iau ref si visible din hook
    return (
        <div
            ref={ref} //aici leg ref de div
            className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} // animatie CSS
        >
            {children}
        </div>
    )
}

// date pt sectiunea "Why Us"
const pillars = [
    { icon: 'verified_user', title: 'Verified Excellence', description: 'Every technician is background-checked and vetted. We maintain the highest standards of professional trust.' },
    { icon: 'payments', title: 'Transparent Pricing', description: 'No hidden fees or surprise charges. See upfront estimates and pay securely through the platform.' },
    { icon: 'auto_awesome', title: 'AI-Powered Matching', description: 'Describe your problem in plain language. Our AI analyzes it to find the right category, urgency, and expert.' },
]

const CATEGORIES = [
    { value: 'Instalații Apă', icon: 'plumbing', label: 'Plumbing', sub: 'Systems & Fixtures' },
    { value: 'Electrice', icon: 'bolt', label: 'Electrical', sub: 'Power & Safety' },
    { value: 'Gaze', icon: 'gas_meter', label: 'Gas', sub: 'Installation & Repair' },
    { value: 'Centrale Termice', icon: 'device_thermostat', label: 'Heating', sub: 'Climate Control' },
    { value: 'Climatizare', icon: 'ac_unit', label: 'HVAC', sub: 'Air Conditioning' },
    { value: 'Altele', icon: 'handyman', label: 'Other', sub: 'General Repairs' },
] as const

export default function LandingPage() {
    return (
        <div className="antialiased" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: '#2c2419' }}>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 transition-all duration-300"
                style={{ background: 'rgba(249, 248, 246, 0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.04)' }}>
                <div className="flex justify-between items-center h-20 px-6 md:px-12 max-w-7xl mx-auto">
                    <Logo to="/" />

                    <div className="hidden md:flex items-center gap-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <a href="#services" className="font-bold tracking-tight transition-colors duration-200" style={{ color: '#6b5e50' }}
                            onMouseEnter={e => (e.target as HTMLElement).style.color = '#2c2419'}
                            onMouseLeave={e => (e.target as HTMLElement).style.color = '#6b5e50'}>Services</a>
                        <a href="#how-it-works" className="font-bold tracking-tight transition-colors duration-200" style={{ color: '#6b5e50' }}
                            onMouseEnter={e => (e.target as HTMLElement).style.color = '#2c2419'}
                            onMouseLeave={e => (e.target as HTMLElement).style.color = '#6b5e50'}>How It Works</a>
                        <a href="#why-us" className="font-bold tracking-tight transition-colors duration-200" style={{ color: '#6b5e50' }}
                            onMouseEnter={e => (e.target as HTMLElement).style.color = '#2c2419'}
                            onMouseLeave={e => (e.target as HTMLElement).style.color = '#6b5e50'}>Why Us</a>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link to="/login" className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 hidden sm:inline-flex" style={{ color: '#6b5e50' }}>
                            Log In
                        </Link>
                        <GradientButton to="/register" size="sm">Get Started</GradientButton>
                    </div>
                </div>
            </nav>

            {/* Hero section */}
            <section className="relative pt-32 pb-20 overflow-hidden" style={{ background: '#F9F8F6' }}>
                <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-16">
                    <div className="w-full md:w-1/2 z-10">
                        <FadeSection>
                            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
                                style={{ background: '#C9B59C20', color: '#C9B59C', border: '1px solid #C9B59C40' }}>
                                Your Home, Our Priority
                            </span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight mb-8"
                                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                                Home repairs, <br />handled with{' '}
                                <span style={{ color: '#C9B59C' }}>precision.</span>
                            </h1>
                            <p className="text-lg max-w-lg mb-10 leading-relaxed" style={{ color: '#6b5e50' }}>
                                Connect with trusted local technicians for all your home repair needs. Fast, reliable, and hassle-free — powered by smart AI matching.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <GradientButton to="/register?role=helped" icon="arrow_forward" size="lg">
                                    I Need a Pro
                                </GradientButton>
                                <GradientButton to="/register?role=helper" variant="secondary" size="lg">
                                    Join as Technician
                                </GradientButton>
                            </div>
                        </FadeSection>
                    </div>

                    <div className="w-full md:w-1/2 relative">
                        <FadeSection>
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ aspectRatio: '4/5' }}>
                                <img src={heroImg} alt="Professional technician installing smart home device" className="w-full h-full object-cover" />
                            </div>
                            {/* The box in the corner */}
                            <div className="absolute -bottom-8 -left-8 p-6 rounded-2xl max-w-xs hidden lg:block"
                                style={{ background: 'rgba(249, 248, 246, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.12)', border: '1px solid rgba(217, 207, 199, 0.3)' }}>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#C9B59C30' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#C9B59C', fontVariationSettings: "'FILL' 1" }}>verified</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Certified Artisans</p>
                                        <p className="text-xs" style={{ color: '#6b5e50' }}>Background-checked & vetted</p>
                                    </div>
                                </div>
                                <p className="text-sm italic leading-relaxed" style={{ color: '#6b5e50' }}>
                                    "Every detail matters in your home. Our network respects the craftsmanship of your space."
                                </p>
                            </div>
                        </FadeSection>
                    </div>
                </div>

                <div className="flex justify-center mt-16 animate-bounce" style={{ color: '#C9B59C' }}>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] tracking-widest uppercase font-semibold">Explore</span>
                        <span className="material-symbols-outlined text-xl">expand_more</span>
                    </div>
                </div>
            </section>

            {/* Categorii de servicii */}
            <section id="services" className="py-24" style={{ background: '#EFE9E3' }}>
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <FadeSection>
                        <div className="mb-16">
                            <SectionHeading title="Curation of Expertise" size="sm" />
                            <div className="w-20 h-1 rounded-full mt-4" style={{ background: '#C9B59C' }} />
                        </div>
                    </FadeSection>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                        {CATEGORIES.map((cat, i) => (
                            <FadeSection key={i}>
                                <div className="p-8 rounded-2xl text-center flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group cursor-default"
                                    style={{ background: '#F9F8F6', border: '1px solid #D9CFC720' }}>
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-300 group-hover:bg-[#C9B59C30]" style={{ background: '#EFE9E3' }}>
                                        <span className="material-symbols-outlined text-3xl" style={{ color: '#2c2419' }}>{cat.icon}</span>
                                    </div>
                                    <h3 className="text-sm font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>{cat.label}</h3>
                                    <p className="text-xs mt-1" style={{ color: '#6b5e50' }}>{cat.sub}</p>
                                </div>
                            </FadeSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* Cum functioneaza */}
            <section id="how-it-works" className="py-32" style={{ background: '#F9F8F6' }}>
                <div className="max-w-5xl mx-auto px-6 md:px-12">
                    <FadeSection>
                        <div className="text-center mb-20">
                            <SectionHeading title="Seamless Service" subtitle="Three simple steps to a repaired, happy home." centered />
                        </div>
                    </FadeSection>

                    <div className="relative">
                        <div className="absolute top-8 left-0 w-full h-px hidden md:block" style={{ background: '#D9CFC7' }} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                            {[
                                { num: '1', title: 'Post', desc: 'Describe your home repair need. Our AI can auto-fill category, urgency and title for you.' },
                                { num: '2', title: 'Match', desc: 'Get paired with local artisans whose expertise aligns perfectly with your project.' },
                                { num: '3', title: 'Done', desc: 'Job completed to high standards. Rate your technician and build trust in the community.' },
                            ].map((step, i) => (
                                <FadeSection key={i}>
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-8"
                                            style={{ background: '#F9F8F6', border: '4px solid #C9B59C', color: '#C9B59C', boxShadow: '0 8px 24px rgba(201, 181, 156, 0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {step.num}
                                        </div>
                                        <h3 className="text-xl font-extrabold mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>{step.title}</h3>
                                        <p className="text-sm leading-relaxed px-4" style={{ color: '#6b5e50' }}>{step.desc}</p>
                                    </div>
                                </FadeSection>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Carduri homeowner / technician */}
            <section className="py-24" style={{ background: '#EFE9E3' }}>
                <div className="max-w-6xl mx-auto px-6 md:px-12">
                    <FadeSection>
                        <div className="text-center mb-16">
                            <SectionHeading title="Two Sides, One Platform" subtitle="Whether you need help or you provide it — Fixano brings everyone together." centered size="sm" />
                        </div>
                    </FadeSection>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        <FadeSection>
                            <div className="group relative rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-2" style={{ background: '#F9F8F6', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.06)' }}>
                                <div className="h-56 relative overflow-hidden">
                                    <img src={wipImg} alt="Home repairs" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(44,36,25,0.5), transparent)' }} />
                                    <div className="absolute bottom-5 left-7">
                                        <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: '#C9B59C', color: '#2c2419' }}>Homeowner</span>
                                    </div>
                                </div>
                                <div className="p-8 pt-6">
                                    <div className="w-12 h-1 rounded-full mb-6" style={{ background: '#C9B59C' }} />
                                    <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Need Help at Home?</h3>
                                    <p className="leading-relaxed mb-8" style={{ color: '#6b5e50' }}>
                                        Post your job in seconds and get matched with skilled local technicians who are ready to help. Track everything from one dashboard.
                                    </p>
                                    <GradientButton to="/register?role=helped" icon="arrow_forward">Get Started</GradientButton>
                                </div>
                            </div>
                        </FadeSection>

                        <FadeSection>
                            <div className="group relative rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-2" style={{ background: '#F9F8F6', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.06)' }}>
                                <div className="h-56 relative overflow-hidden">
                                    <img src={technicianImg} alt="Technician at work" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(44,36,25,0.5), transparent)' }} />
                                    <div className="absolute bottom-5 left-7">
                                        <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: '#EFE9E3', color: '#2c2419' }}>Technician</span>
                                    </div>
                                </div>
                                <div className="p-8 pt-6">
                                    <div className="w-12 h-1 rounded-full mb-6" style={{ background: '#2c2419', opacity: 0.2 }} />
                                    <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>Are You a Technician?</h3>
                                    <p className="leading-relaxed mb-8" style={{ color: '#6b5e50' }}>
                                        Join our network of trusted professionals. Browse available jobs nearby, set your own schedule, and grow your client base.
                                    </p>
                                    <GradientButton to="/register?role=helper" variant="outline" icon="visibility">Join Now</GradientButton>
                                </div>
                            </div>
                        </FadeSection>
                    </div>
                </div>
            </section>

            {/* Why Fixano - sectiune dark */}
            <section id="why-us" className="py-24 mx-4 md:mx-8 rounded-[3rem] my-24" style={{ background: 'linear-gradient(135deg, #2c2419 0%, #4a3f35 100%)' }}>
                <div className="max-w-7xl mx-auto px-8 md:px-12">
                    <FadeSection>
                        <div className="text-center mb-16">
                            <SectionHeading title="Why Fixano?" subtitle="Built for trust, speed, and craftsmanship." light centered />
                        </div>
                    </FadeSection>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                        {pillars.map((p, i) => (
                            <FadeSection key={i}>
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201, 181, 156, 0.15)' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#C9B59C' }}>{p.icon}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#F9F8F6' }}>{p.title}</h3>
                                    <p className="leading-relaxed" style={{ color: '#D9CFC7' }}>{p.description}</p>
                                </div>
                            </FadeSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA final */}
            <section className="py-32 px-6 md:px-12 text-center" style={{ background: '#F9F8F6' }}>
                <FadeSection>
                    <div className="max-w-3xl mx-auto">
                        <SectionHeading
                            title="Ready to redefine your home care experience?"
                            subtitle="Whether you're seeking expert service or looking to showcase your professional skills, the journey begins here."
                            centered
                            size="lg"
                        />
                        <div className="flex flex-col sm:flex-row justify-center gap-6 mt-12">
                            <GradientButton to="/register?role=helped" size="lg">
                                I Need a Professional
                            </GradientButton>
                            <GradientButton to="/register?role=helper" variant="secondary" size="lg">
                                I Am a Technician
                            </GradientButton>
                        </div>
                    </div>
                </FadeSection>
            </section>

            {/* Footer */}
            <footer style={{ background: '#2c2419' }} className="pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-2 md:col-span-1">
                            <div className="mb-4">
                                <Logo light size="sm" to="/" />
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs mb-6" style={{ color: '#D9CFC7' }}>
                                Connecting homeowners with artisanal excellence. Professional, verified, and trusted home services.
                            </p>
                            <p className="text-xs italic" style={{ color: '#C9B59C80' }}>© 2026 Fixano. All rights reserved.</p>
                        </div>
                        {[
                            { title: 'Platform', links: [
                                { label: 'Find Pros', to: '/register?role=helped' },
                                { label: 'Technician Portal', to: '/register?role=helper' },
                                { label: 'How It Works', to: '/' },
                            ]},
                            { title: 'Legal', links: [
                                { label: 'Terms of Service', to: '/page/terms' },
                                { label: 'Privacy Policy', to: '/page/privacy' },
                                { label: 'Cookie Policy', to: '/page/cookies' },
                            ]},
                            { title: 'Support', links: [
                                { label: 'Help Center', to: '/page/help' },
                                { label: 'Contact Support', to: '/page/contact' },
                                { label: 'About Us', to: '/page/about' },
                            ]},
                        ].map((col, i) => (
                            <div key={i}>
                                <h4 className="font-bold mb-6 text-xs uppercase tracking-widest" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#C9B59C' }}>{col.title}</h4>
                                <ul className="space-y-3 text-sm">
                                    {col.links.map((link) => (
                                        <li key={link.label}>
                                            <Link to={link.to} className="transition-colors duration-200" style={{ color: '#D9CFC7' }}
                                                onMouseEnter={e => (e.target as HTMLElement).style.color = '#F9F8F6'}
                                                onMouseLeave={e => (e.target as HTMLElement).style.color = '#D9CFC7'}>
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    )
}
