# Platform Admin Components

This directory contains components specific to the platform admin interface.

## Components

### `sidebar.tsx`
Desktop sidebar navigation for platform administrators.

**Features:**
- Navigation menu with icons
- Active route highlighting
- Quick status card
- Sticky positioning

**Usage:**
```tsx
import { PlatformSidebar } from "@/components/platform/sidebar";

<PlatformSidebar />
```

### `mobile-sidebar.tsx`
Mobile/tablet slide-out navigation menu.

**Features:**
- Slide-in animation
- Backdrop overlay
- Auto-close on navigation
- Prevents body scroll when open

**Usage:**
```tsx
import { PlatformMobileSidebar } from "@/components/platform/mobile-sidebar";

<PlatformMobileSidebar 
  isOpen={mobileMenuOpen} 
  onClose={() => setMobileMenuOpen(false)} 
/>
```

### `stats-header.tsx`
Quick stats overview header for platform admins.

**Features:**
- 4 key metrics display
- Real-time updates
- Responsive grid layout
- Change indicators

**Metrics:**
- Total Payouts
- Active Workers
- Tasks Completed
- Weekly Revenue

**Usage:**
```tsx
import { PlatformStatsHeader } from "@/components/platform/stats-header";

<PlatformStatsHeader />
```

## Navigation Structure

The platform admin interface includes the following menu items:

1. **Dashboard** - `/platform/dashboard` - Overview and analytics
2. **Workers** - `/platform/workers` - Worker management
3. **Analytics** - `/platform/analytics` - Detailed analytics
4. **Transactions** - `/platform/transactions` - Transaction history
5. **Reports** - `/platform/reports` - Reports and exports
6. **Settings** - `/platform/settings` - Platform settings

## Layout

The platform admin layout (`app/(platform)/layout.tsx`) combines these components:

```
┌─────────────────────────────────────┐
│          Header (Global)            │
├─────────────────────────────────────┤
│       Platform Stats Header         │
├──────────┬──────────────────────────┤
│          │                          │
│ Sidebar  │    Main Content Area     │
│ (Desktop)│                          │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

On mobile/tablet:
- Sidebar is hidden
- Menu button appears in header
- Mobile sidebar slides in from left

## Responsive Breakpoints

- **Mobile**: < 1024px (lg breakpoint)
  - Mobile sidebar with overlay
  - 2-column stats grid
  
- **Desktop**: ≥ 1024px
  - Fixed sidebar
  - 4-column stats grid

## Task 9.1 Completion

This directory was created as part of Task 9.1: Platform Admin Layout

**Deliverables Completed:**
- ✅ Created `app/(platform)/layout.tsx`
- ✅ Built admin-specific navigation
- ✅ Added quick stats in header
- ✅ Created sidebar with menu items
- ✅ Made responsive with mobile menu

**Acceptance Criteria Met:**
- ✅ Layout renders correctly
- ✅ Navigation works
- ✅ Responsive design functional

## Next Steps

Task 9.2 will implement the platform dashboard page with:
- Analytics cards
- Payment volume chart
- Top workers table
- Recent transactions
