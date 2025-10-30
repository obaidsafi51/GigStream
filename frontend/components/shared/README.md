# Shared Components

This directory contains shared UI components used across the GigStream application.

## Components

### Header (`header.tsx`)

The main navigation header component that adapts based on user role and current route.

**Features:**
- Route-specific navigation items (worker, platform, demo)
- Active route highlighting
- User profile dropdown
- Responsive mobile menu
- Automatic hiding on auth pages (login/register)

**Usage:**
```tsx
import { Header } from "@/components/shared/header";

// Header is included in the root layout and automatically adapts
<Header />
```

**Navigation Items:**

*Worker Navigation:*
- Dashboard (`/dashboard`)
- Tasks (`/tasks`)
- History (`/history`)
- Advance (`/advance`)
- Reputation (`/reputation`)

*Platform Navigation:*
- Dashboard (`/platform/dashboard`)
- Workers (`/platform/workers`)
- Analytics (`/platform/analytics`)

*Demo Navigation:*
- Simulator (`/demo/simulator`)

**Mobile Responsive:**
- Desktop: Horizontal navigation with user menu
- Mobile: Hamburger menu with dropdown navigation

## User Menu

The user menu is integrated into the header and displays:
- User avatar (first letter of name)
- User name and email
- Role badge
- Wallet address (with copy button)
- Logout button

**Features:**
- Dropdown menu with click-outside-to-close
- Wallet address truncation
- Copy to clipboard functionality
- Role-based badge display

## Styling

All components use:
- Tailwind CSS for styling
- Consistent color scheme (blue-600 to purple-600 gradient)
- Responsive design patterns
- Accessibility features (ARIA labels, keyboard navigation)

## Dependencies

- Next.js 15 (App Router, usePathname)
- React hooks (useState, useRef, useEffect)
- Custom hooks (@/hooks/useAuth)
- UI components (@/components/ui)
