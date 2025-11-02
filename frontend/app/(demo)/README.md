# Demo Simulator

This directory contains the GigStream demo simulator - an interactive tool for demonstrating the complete payment flow in under 2 minutes.

## Pages

### `/simulator` - Payment Flow Simulator

**Purpose:** Demonstrate instant payment processing from task completion to blockchain settlement.

**Features:**
- 3 demo workers with different reputation scores
- 4 quick scenario presets (food delivery, data entry, customer support, content moderation)
- Manual configuration for custom demos
- Real-time progress tracking with 4-stage visualization
- Smooth animations and success effects
- Transaction details with Arc Explorer links
- Mobile responsive design
- Dark mode support

**Demo Flow:**
1. Select a worker (or use default)
2. Choose a preset scenario or configure manually
3. Click "Complete Task & Process Payment"
4. Watch the 4-stage process (2.7 seconds total):
   - 🔍 Task Verification
   - ⚙️ Payment Processing
   - ⛓️ Blockchain Submission
   - ✅ Payment Completed
5. View transaction details and Arc Explorer link

**Tech Stack:**
- React 18 Client Component
- Tailwind CSS for styling
- TypeScript for type safety
- No external dependencies

**Usage:**
```bash
# Development
npm run dev
# Navigate to: http://localhost:3000/(demo)/simulator

# Production
npm run build
npm start
```

## Demo Script (2 Minutes)

**For judges/stakeholders:**

1. **Intro (15s):** "GigStream provides instant payments for gig workers"
2. **Select (10s):** Click "Quick Food Delivery" preset
3. **Execute (30s):** Run simulation, explain stages
4. **Results (20s):** Show 2.7s completion, Arc Explorer
5. **Features (30s):** Highlight streaming payments, USDC, blockchain
6. **Q&A (15s):** Reset and try another scenario

## Development

**Add new scenarios:**
```typescript
// Edit DEMO_SCENARIOS in page.tsx
const DEMO_SCENARIOS = [
  {
    id: "your-scenario",
    name: "Your Scenario Name",
    taskType: "fixed", // or "streaming"
    amount: 25.00,
    description: "Your scenario description",
  },
  // ... more scenarios
];
```

**Add new workers:**
```typescript
// Edit DEMO_WORKERS in page.tsx
const DEMO_WORKERS = [
  { id: "worker-id", name: "Worker Name", reputation: 850 },
  // ... more workers
];
```

**Customize simulation timing:**
```typescript
// Edit simulateTaskCompletion() in page.tsx
// Adjust setTimeout durations for each stage
```

## Integration

**Connect to real API:**
```typescript
// Replace mock simulation with API call
const simulateTaskCompletion = async () => {
  const response = await fetch('/api/v1/demo/complete-task', {
    method: 'POST',
    body: JSON.stringify({
      workerId: selectedWorker,
      taskType,
      amount: parseFloat(amount),
    }),
  });
  
  const { txHash, stages } = await response.json();
  // Update UI with real transaction data
};
```

## Files

- `simulator/page.tsx` - Main simulator component (591 lines)
- `README.md` - This file

## Documentation

See `summary/TASK_10.1_COMPLETED.md` for complete implementation details.

---

**Last Updated:** November 2, 2025  
**Status:** ✅ Production Ready
