# GigStream Frontend

Next.js 15 application for GigStream - a blockchain-powered instant payment platform for gig workers.

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Notifications:** Sonner

## 📁 Project Structure

```
frontend/
├── app/
│   ├── (worker)/        # Worker dashboard routes
│   ├── (platform)/      # Platform admin routes
│   ├── (demo)/          # Demo simulator routes
│   ├── (auth)/          # Authentication routes
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── ui/              # Reusable UI components
│   └── shared/          # Shared components
├── stores/              # Zustand stores
├── lib/                 # Utility functions
└── public/              # Static assets
```

## 🛠️ Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.local` and update values if needed:
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   NEXT_PUBLIC_ARC_EXPLORER_URL=https://explorer.circle.com/arc-testnet
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Installed Dependencies

- `zustand` - State management
- `react-hook-form` - Form handling
- `zod` - Schema validation
- `recharts` - Data visualization
- `sonner` - Toast notifications

**Note:** Circle SDK is NOT included in frontend as wallet management is handled server-side only.

## 🎯 Key Features

- **Worker Dashboard:** Balance tracking, task management, earnings history
- **Platform Admin:** Analytics, worker management, payment monitoring
- **Demo Simulator:** Interactive demo of payment flows
- **Authentication:** Secure login/registration system

## 🔧 Development

- Build for production: `npm run build`
- Start production server: `npm start`
- Lint code: `npm run lint`

## 📝 Status

✅ **Task 6.1 Completed** - Next.js Project Initialization
- Next.js 15 app created with TypeScript
- Tailwind CSS 4 configured
- App Router structure set up
- Required dependencies installed
- Environment variables configured

## 🚧 Next Steps

- Task 6.2: UI Component Library Setup
- Task 6.3: Authentication Pages
- Task 6.4: Auth Store & Middleware
- Task 6.5: Layout Components

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
