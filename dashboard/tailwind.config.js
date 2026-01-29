/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            keyframes: {
                'quartil-subiu': {
                    '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
                    '25%': { transform: 'scale(1.03)', boxShadow: '0 0 16px 4px rgba(16, 185, 129, 0.5)' },
                    '50%': { transform: 'scale(1.02)', boxShadow: '0 0 20px 6px rgba(16, 185, 129, 0.4)' },
                    '75%': { transform: 'scale(1.01)', boxShadow: '0 0 12px 2px rgba(16, 185, 129, 0.3)' },
                },
                'quartil-desceu': {
                    '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
                    '25%': { transform: 'scale(1.03)', boxShadow: '0 0 16px 4px rgba(239, 68, 68, 0.5)' },
                    '50%': { transform: 'scale(1.02)', boxShadow: '0 0 20px 6px rgba(239, 68, 68, 0.4)' },
                    '75%': { transform: 'scale(1.01)', boxShadow: '0 0 12px 2px rgba(239, 68, 68, 0.3)' },
                },
            },
            animation: {
                'quartil-subiu': 'quartil-subiu 1.8s ease-out',
                'quartil-desceu': 'quartil-desceu 1.8s ease-out',
            },
            colors: {
                vuon: {
                    primary: '#2563eb', // Example blue
                    secondary: '#1e40af',
                    background: '#f8fafc',
                    card: '#ffffff',
                    text: '#1e293b',
                    muted: '#64748b',
                }
            }
        },
    },
    plugins: [],
}
