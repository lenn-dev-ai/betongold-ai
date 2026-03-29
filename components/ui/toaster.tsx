'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#0f1117',
          color: '#e4e0d8',
          border: '1px solid #1f2633',
          borderRadius: '2px',
          fontFamily: 'var(--font-sans)',
          fontSize: '14px',
        },
      }}
    />
  );
}
