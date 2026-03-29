'use client';

import toast from 'react-hot-toast';

export { toast };

export function successToast(message: string) {
  toast.success(message, {
    style: {
      background: '#0f1117',
      color: '#e4e0d8',
      border: '1px solid rgba(62,207,142,0.3)',
      borderRadius: '2px',
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
    },
    iconTheme: { primary: '#3ecf8e', secondary: '#0f1117' },
  });
}

export function errorToast(message: string) {
  toast.error(message, {
    style: {
      background: '#0f1117',
      color: '#e4e0d8',
      border: '1px solid rgba(247,107,107,0.3)',
      borderRadius: '2px',
      fontFamily: 'var(--font-sans)',
      fontSize: '14px',
    },
    iconTheme: { primary: '#f76b6b', secondary: '#0f1117' },
  });
}
