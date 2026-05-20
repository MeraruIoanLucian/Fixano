import { Link } from 'react-router-dom'

type LogoProps = {
    size?: 'sm' | 'md'
    light?: boolean
    to?: string
}

const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
}

export default function Logo({ size = 'md', light = false, to = '/' }: LogoProps) {
    return (
        <Link
            to={to}
            className={`${sizes[size]} font-extrabold tracking-tighter`}
            style={{
                fontFamily: 'var(--font-heading)',
                color: light ? 'var(--brand-bg)' : 'var(--brand-dark)',
            }}
        >
            Fix<span style={{ color: 'var(--brand-accent)' }}>ano</span>
        </Link>
    )
}
