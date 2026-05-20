import { useParams } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import GradientButton from '../components/GradientButton'

// paginile statice din footer (terms, privacy, etc)
// TODO: adauga continut real pt fiecare pagina
export default function StaticPage() {
    const { slug } = useParams()

    // titlu pe baza slug-ului din URL
    let title = 'Page'
    if (slug === 'terms') title = 'Terms of Service'
    else if (slug === 'privacy') title = 'Privacy Policy'
    else if (slug === 'cookies') title = 'Cookie Policy'
    else if (slug === 'help') title = 'Help Center'
    else if (slug === 'about') title = 'About Us'
    else if (slug === 'contact') title = 'Contact Support'

    return (
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <main className="pt-12 pb-24 px-6 md:px-12 max-w-screen-2xl mx-auto">
                <div className="mb-12">
                    <SectionHeading title={title} subtitle="" />
                </div>

                <div className="rounded-[2rem] p-12 text-center" style={{ background: '#FFFFFF', boxShadow: '0 24px 48px rgba(44, 36, 25, 0.04)' }}>
                    <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: '#C9B59C' }}>construction</span>
                    <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#2c2419' }}>
                        Va fi aici: {title}
                    </h2>
                    <p className="text-sm mb-8" style={{ color: '#6b5e50' }}>
                        Această pagină este în curs de dezvoltare.
                    </p>
                    <GradientButton to="/dashboard" icon="arrow_back" variant="secondary">
                        Back to Dashboard
                    </GradientButton>
                </div>
            </main>
        </div>
    )
}
