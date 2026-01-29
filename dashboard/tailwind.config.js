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
                    '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.8)' },
                    '15%': { transform: 'scale(1.08)', boxShadow: '0 0 28px 10px rgba(16, 185, 129, 0.7)' },
                    '30%': { transform: 'scale(1.05)', boxShadow: '0 0 36px 14px rgba(16, 185, 129, 0.6)' },
                    '50%': { transform: 'scale(1.06)', boxShadow: '0 0 32px 12px rgba(16, 185, 129, 0.6)' },
                    '70%': { transform: 'scale(1.04)', boxShadow: '0 0 20px 8px rgba(16, 185, 129, 0.5)' },
                    '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
                },
                'quartil-desceu': {
                    '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.8)' },
                    '15%': { transform: 'scale(1.08)', boxShadow: '0 0 28px 10px rgba(239, 68, 68, 0.7)' },
                    '30%': { transform: 'scale(1.05)', boxShadow: '0 0 36px 14px rgba(239, 68, 68, 0.6)' },
                    '50%': { transform: 'scale(1.06)', boxShadow: '0 0 32px 12px rgba(239, 68, 68, 0.6)' },
                    '70%': { transform: 'scale(1.04)', boxShadow: '0 0 20px 8px rgba(239, 68, 68, 0.5)' },
                    '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
                },
                'quartil-acordos': {
                    '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.8)' },
                    '15%': { transform: 'scale(1.06)', boxShadow: '0 0 24px 8px rgba(59, 130, 246, 0.7)' },
                    '50%': { transform: 'scale(1.04)', boxShadow: '0 0 28px 10px rgba(59, 130, 246, 0.6)' },
                    '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
                },
                'bar-grow': {
                    '0%': { transform: 'scaleX(0)' },
                    '100%': { transform: 'scaleX(1)' },
                },
                'text-pop': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '25%': { transform: 'scale(1.15)' },
                    '50%': { transform: 'scale(1.08)' },
                    '75%': { transform: 'scale(1.12)' },
                },
            },
            animation: {
                'quartil-subiu': 'quartil-subiu 2.5s ease-out',
                'quartil-desceu': 'quartil-desceu 2.5s ease-out',
                'quartil-acordos': 'quartil-acordos 2s ease-out',
                'bar-grow': 'bar-grow 0.9s ease-out forwards',
                'text-pop': 'text-pop 0.8s ease-out',
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
