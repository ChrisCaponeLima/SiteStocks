// tailwind.config.js - V1.0 - Adição das cores customizadas do projeto
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#0A2E59', // Azul Marinho
        'secondary': '#FFD700', // Dourado
        'accent': '#3498db', // Azul Vívido (para cards de destaque, etc.)
        'bg-dark': '#1C2833', // Fundo escuro do Footer
      },
      borderRadius: {
        'card': '12px', // Borda arredondada para cards
      }
    },
    // Adiciona a fonte Poppins como padrão (se desejar)
    fontFamily: {
        sans: ['Poppins', 'sans-serif'],
    },
  },
  plugins: [],
}