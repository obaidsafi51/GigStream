# React Hooks

This directory contains custom React hooks used throughout the GigStream application.

## Available Hooks

### `useAuth`
Provides authentication state and methods. See `useAuth.ts` for details.

### `useRealtimeBalance`
Manages real-time balance updates with intelligent polling and error handling.

#### Features
- **Automatic Polling**: Updates balance every 2 seconds
- **Exponential Backoff**: Increases polling interval to max 10s on errors
- **Tab Visibility Detection**: Pauses polling when tab is inactive
- **Smooth Animations**: CountUp animation with custom easing
- **Memory Leak Prevention**: Proper cleanup on unmount
- **Error Handling**: Graceful error handling with retry logic
- **Manual Refetch**: Allows manual balance refresh

#### Usage

```tsx
import { useRealtimeBalance } from '@/hooks';

function BalanceDisplay() {
  const { balance, isLoading, error, refetch } = useRealtimeBalance({
    initialBalance: 100.50,
    enabled: true, // Optional, defaults to true
    onBalanceChange: (newBalance, oldBalance) => {
      console.log(`Balance changed from $${oldBalance} to $${newBalance}`);
    },
    onError: (error) => {
      console.error('Failed to fetch balance:', error);
    },
  });

  return (
    <div>
      <p>Balance: ${balance.toFixed(2)}</p>
      {isLoading && <span>Updating...</span>}
      {error && <span>Error: {error.message}</span>}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

#### API

**Parameters:**
- `initialBalance` (number, required): The initial balance value
- `enabled` (boolean, optional): Enable/disable automatic polling. Default: `true`
- `onBalanceChange` (function, optional): Callback when balance changes
  - Parameters: `(newBalance: number, oldBalance: number) => void`
- `onError` (function, optional): Callback when an error occurs
  - Parameters: `(error: Error) => void`

**Returns:**
- `balance` (number): Current balance
- `isLoading` (boolean): Loading state
- `error` (Error | null): Error object if fetch failed
- `refetch` (function): Manual refetch function

#### Implementation Details

**Polling Strategy:**
- Initial interval: 2 seconds
- Error backoff: Multiplies interval by 1.5 on each error
- Max interval: 10 seconds
- Resets to 2 seconds on successful fetch

**Tab Visibility:**
- Automatically pauses polling when tab is hidden
- Checks visibility every 5 seconds while hidden
- Resumes immediately when tab becomes visible
- Resets interval to 2 seconds on resume

**Memory Safety:**
- Cleans up all timers on unmount
- Cancels pending fetch requests using AbortController
- Removes event listeners properly

**Error Handling:**
- Catches and logs all fetch errors
- Applies exponential backoff on consecutive failures
- Calls `onError` callback if provided
- Doesn't crash on network failures

## Best Practices

1. **Always provide initialBalance**: This ensures the UI has data to display immediately
2. **Use onBalanceChange for side effects**: Log transactions, show notifications, etc.
3. **Handle errors gracefully**: Provide fallback UI when balance updates fail
4. **Disable polling when not needed**: Set `enabled={false}` to save resources
5. **Use refetch sparingly**: The hook already polls automatically

## Testing

Tests are available in `__tests__/hooks/use-realtime-balance.test.ts`.

Run tests with:
```bash
npm test -- use-realtime-balance.test.ts
```

## Performance Considerations

- Polling is lightweight (single API call every 2s)
- Automatic pause on inactive tabs saves bandwidth
- Exponential backoff prevents API hammering during outages
- AbortController prevents memory leaks from pending requests
