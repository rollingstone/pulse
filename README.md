# Pulse

A lightweight, reactive state management library for React. It leverages the power of RxJS to provide a simple and efficient way to manage global or local component state, with optional out-of-the-box persistence to browser storage.

## Features

*   **Minimalist API**: Get started quickly with a small and intuitive API surface.
*   **React Hooks**: A set of hooks (`usePulse`, `usePulseValue`, `usePulseSetValue`) for seamless integration with your React components.
*   **Persistent State**: Easily persist state to `LocalStorage` or `SessionStorage` with a simple configuration option.
*   **Reactive Core**: Built on an RxJS `Subject` for efficient and predictable state updates.
*   **Imperative Usage, Update State from anywhere**: Update react component from anyshere, even from outside of the React component.
*   **Async Callback Handling**: The `usePulse` hook can take a callback and provides `isProcessing` and `isFinished` states, perfect for handling side-effects like API calls.
*   **Imperative Usage, Update State from anywhere**: Update react component from anyshere, even from outside of the React component.


## Installation

Install the package using npm:

```bash
npm install @rollingstone/pulse
```


## Usage

### 1. Creating a Pulse (State Atom)

A "pulse" is an individual, observable piece of state. You create one using the `pulse` function, which can be shared across your application.

```typescript
// src/state/pulses.ts
import { pulse, StorageEnum } from '@rollingstone/pulse';

// A simple, non-persistent counter state
export const counterPulse = pulse({ defaultValue: 0 });

// A persistent state for a user's name, stored in LocalStorage
export const userNamePulse = pulse({
  defaultValue: 'Guest',
  key: 'user_name',
  storageType: StorageEnum.LocalStorage,
});
```

### 2. Using a Pulse in a React Component

Use the `usePulse` hook to subscribe a component to a pulse. It returns the current value and a function to update it, automatically re-rendering the component when the value changes.

```tsx
// src/components/Counter.tsx
import React from 'react';
import { usePulse } from '@rollingstone/pulse';
import { counterPulse } from '../state/pulses';

export function Counter() {
  const [count, setCount] = usePulse(counterPulse);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

### 3. Read-only and Write-only Hooks

For components that only need to read the value or only need to update it, you can use `usePulseValue` and `usePulseSetValue` respectively. This is a performance optimization that prevents the component from re-rendering on state changes it doesn't care about.

```tsx
// src/components/DisplayCount.tsx
import React from 'react';
import { usePulseValue } from '@rollingstone/pulse';
import { counterPulse } from '../state/pulses';

export function DisplayCount() {
  const count = usePulseValue(counterPulse);
  return <p>Current count is: {count}</p>;
}

// src/components/ResetButton.tsx
import React from 'react';
import { usePulseSetValue } from '@rollingstone/pulse';
import { counterPulse } from '../state/pulses';

export function ResetButton() {
  const setCount = usePulseSetValue(counterPulse);
  return <button onClick={() => setCount(0)}>Reset Counter</button>;
}
```

### 4. Handling Side-Effects with Callbacks

The `usePulse` hook can accept a callback that triggers whenever the state changes. The hook also provides `isProcessing` and `isFinished` booleans to track the callback's execution, which is especially useful for async operations.

```tsx
// src/components/DataFetcher.tsx
import React from 'react';
import { pulse, usePulse } from '@rollingstone/pulse';

// A pulse to trigger a data fetch
const fetchTriggerPulse = pulse({ defaultValue: 0 });

export function DataFetcher() {
  const [data, setData] = React.useState<any>(null);

  const fetchData = async () => {
    console.log('Fetching data...');
    // Simulate an API call
    const response = await new Promise(resolve => 
      setTimeout(() => resolve({ id: 1, name: 'Fetched Data' }), 1500)
    );
    setData(response);
    console.log('Data fetched!');
  };

  // The usePulse hook returns [value, setValue, isProcessing, isFinished]
  const [, setTrigger, isProcessing] = usePulse(fetchTriggerPulse, fetchData);

  return (
    <div>
      <button onClick={() => setTrigger(c => c + 1)} disabled={isProcessing}>
        {isProcessing ? 'Fetching...' : 'Fetch Data'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

### 5. Imperative Usage (Outside Components)

You can also get and set pulse values from outside React components using the `getPulse` and `setPulse` utility functions.

```typescript
import { getPulse, setPulse } from '@rollingstone/pulse';
import { counterPulse } from './state/pulses';

// Get the current value (from memory or persistent storage)
const currentCount = getPulse(counterPulse);
console.log(currentCount); // e.g., 0

// Set a new value, which will notify all subscribed components
setPulse(counterPulse, 10);
```
