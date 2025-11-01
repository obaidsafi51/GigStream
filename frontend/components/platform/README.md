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

### `analytics-cards.tsx` ✨ NEW
Analytics metric cards for the dashboard.

**Features:**
- 4 color-coded metric cards
- Icon backgrounds with matching colors
- Change indicators (period-over-period)
- Hover effects with shadow transitions
- Responsive grid layout

**Metrics:**
- Total Payouts (Green, DollarSign)
- Active Workers (Blue, Users)
- Tasks Completed (Purple, CheckCircle)
- Weekly Revenue (Orange, TrendingUp)

**Usage:**
```tsx
import { AnalyticsCards } from "@/components/platform/analytics-cards";

const data = {
  totalPayouts: "12,345.67",
  totalTasks: 542,
  activeWorkers: 87,
  weeklyRevenue: "1,234.56",
  payoutsChange: "+12.5%",
  tasksChange: "+23",
  workersChange: "+5",
  revenueChange: "+8.3%",
};

<AnalyticsCards data={data} />
```

### `payment-volume-chart.tsx` ✨ NEW
Payment volume trend chart using Recharts.

**Features:**
- Dual Y-axis line chart
- 30-day payment volume trend
- Interactive tooltips
- Custom date formatting
- Responsive container
- Amount (USD) and task count visualization

**Usage:**
```tsx
import { PaymentVolumeChart } from "@/components/platform/payment-volume-chart";

const data = [
  { date: "2025-11-01", amount: 432.50, tasks: 18 },
  { date: "2025-11-02", amount: 389.25, tasks: 15 },
  // ... more data points
];

<PaymentVolumeChart data={data} />
```

### `top-workers-table.tsx` ✨ NEW
Ranked table of top-performing workers.

**Features:**
- Ranked worker list with medals (🥇🥈🥉)
- Reputation score with color-coded badges
- Completion rate progress bars
- Total earnings display
- Truncated wallet addresses
- Hover effects on rows
- Empty state for new platforms

**Usage:**
```tsx
import { TopWorkersTable } from "@/components/platform/top-workers-table";

const workers = [
  {
    id: "worker-1",
    name: "Alice Johnson",
    walletAddress: "0x1234...5678",
    reputation: 900,
    tasksCompleted: 150,
    totalEarned: "5000.00",
    completionRate: 98,
    rank: 1,
  },
  // ... more workers
];

<TopWorkersTable workers={workers} />
```

### `recent-transactions.tsx` ✨ NEW
Recent payment transactions list.

**Features:**
- Transaction type badges (Payout, Advance, Repayment, Stream)
- Status indicators (Completed, Pending, Failed)
- Worker name and task title
- Formatted amounts and relative timestamps
- Blockchain explorer links
- Hover effects with border transitions
- Empty state message

**Usage:**
```tsx
import { RecentTransactions } from "@/components/platform/recent-transactions";

const transactions = [
  {
    id: "tx-1",
    type: "payout",
    workerName: "Alice Johnson",
    amount: "125.50",
    status: "completed",
    txHash: "0x1234...5678",
    createdAt: "2025-11-01T10:30:00Z",
    taskTitle: "Task #123",
  },
  // ... more transactions
];

<RecentTransactions 
  transactions={transactions}
  explorerUrl="https://testnet.arcscan.app"
/>
```## Navigation Structure

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
