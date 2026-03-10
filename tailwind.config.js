/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'tarot-bg': '#fdfbf7', // Tom pastel areia/papel antigo
                'tarot-accent': '#d4af37', // Dourado
                'tarot-dark': '#2c3e50', // Azul marinho profundo
                'tarot-muted': '#e8e4db'
            },
            fontFamily: {
                tarot: ['Cinzel', 'serif'], // Fonte com serifas clássica (precisará de import do google)
                body: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
