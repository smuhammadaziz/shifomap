# Clinic Web Dashboard

A modern clinic management dashboard built with Next.js 16, TypeScript, and shadcn/ui.

## Features

- 🔐 Authentication with protected routes
- 📱 Responsive design (mobile-friendly)
- 🎨 Modern UI with shadcn/ui components
- ⚡ Performance optimized with page caching
- 🛡️ Route protection middleware
- 📊 Dashboard with sidebar navigation

## Getting Started

### Installation

1. Install dependencies:
```bash
cd apps/clinic-web
pnpm install
```

2. Run the development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Login Credentials

- **Email**: `admin`
- **Password**: `admin123`

## Project Structure

```
clinic-web/
├── app/
│   ├── auth/
│   │   ├── sign-in/      # Login page
│   │   └── sign-up/       # Sign up page (placeholder)
│   ├── dashboard/         # Protected dashboard routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Root page (redirects to sign-in)
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   └── sidebar.tsx        # Dashboard sidebar
├── lib/
│   └── utils.ts           # Utility functions
├── store/
│   └── auth-store.ts      # Authentication state management
└── middleware.ts          # Route protection middleware
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React

## Available Routes

- `/` - Redirects to `/auth/sign-in`
- `/auth/sign-in` - Login page
- `/auth/sign-up` - Sign up page (placeholder)
- `/dashboard` - Main dashboard (protected)
- `/dashboard/patients` - Patients management (protected)
- `/dashboard/appointments` - Appointments (protected)
- `/dashboard/reports` - Reports (protected)
- `/dashboard/settings` - Settings (protected)

## Performance Optimization

- Pages are cached with `revalidate` for optimal performance
- Static generation where possible
- Optimized bundle size with tree-shaking

## Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

