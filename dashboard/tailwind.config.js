/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
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
