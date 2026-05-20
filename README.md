# 🔧 Fixano

A marketplace web app connecting **homeowners** with **local technicians** for home repair services (plumbing, heating, electrical, etc.). Built as a bachelor's thesis project.

## Stack

| Tech | Role |
|------|------|
| React + Vite | Frontend |
| TypeScript | Language |
| Tailwind CSS v4 | Styling |
| Supabase | Auth, Database, Storage |
| Vercel | Deployment |

## Getting Started

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Fill in your Supabase credentials (Project URL + Publishable API Key)

# Run dev server
npm run dev
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── context/        # React contexts (Auth)
├── lib/            # Supabase client & utilities
├── pages/          # Route pages
└── index.css       # Tailwind + design tokens
supabase/
└── 001_profiles.sql  # DB migration scripts
```

## Features (MVP)

- [x] Auth (email + password, role selection)
- [x] Job posting (homeowner creates repair request)
- [ ] Job feed (technicians browse & filter)
- [ ] Offer system (price + message)
- [ ] Chat (per-job messaging)
- [ ] Reviews & ratings

## License

This project is part of a university thesis and is not licensed for commercial use.
