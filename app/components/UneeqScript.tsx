'use client';

import { useUneeq } from '@/hooks/useUneeq';

export default function UneeqScript() {
  // Initialize the Uneeq hook.
  // The hook manages script loading, instance creation, and event listeners.
  // We can pass configuration overrides here if needed.
  useUneeq();

  // This component doesn't render anything itself, as the Uneeq SDK
  // likely handles its own UI rendering based on its configuration.
  return null;
} 