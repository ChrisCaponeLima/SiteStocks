// tailwind.config.js - V1.2 - Adição das cores primárias/secundárias (primary, secondary, bg-dark) para uso no main.css.
// Anteriormente: // tailwind.config.js - V1.1 - Adição de cores dinâmicas para o clima
/** @type {import('tailwindcss').Config} */
module.exports = {
 content: [
  "./components/**/*.{js,vue,ts}",
  "./layouts/**/*.vue",
  "./pages/**/*.vue",
  "./plugins/**/*.{js,ts}",
  "./nuxt.config.{js,ts}",
 ],
 theme: {
  extend: {
   colors: {
        // ⚠️ CORREÇÃO V1.2: Adição das cores primárias/secundárias (Necessárias para classes como text-primary no main.css)
        primary: '#0A2E59',   // Cor primária
        secondary: '#FFD700', // Cor secundária
        'bg-dark': '#1a202c', // Fundo escuro do Footer

    // Cores dos Cards (Existente)
    'card-azul': '#E0F2FE',
    'card-roxo': '#E6E1FF',
    'card-amarelo': '#EDE5D6',
    'card-verde': '#E3F0E4',
    'card-terracota': '#FFF0EB',
    'card-rosa': '#F8EBFD',
    'card-gelo': '#E6E6EE',
    'card-laranja': '#D78159',

    // 🚨 NOVAS CORES DO CLIMA (Fundo)
    'card-weather-sun': '#E6F7FF',    // Sol (Dia - 01d, 02d)
    'card-weather-night': '#1F2937',   // Noite (01n, 02n)
    'card-weather-cloudy': '#F3F4F6',   // Nublado (03x, 04x)
    'card-weather-rain': '#BFDBFE',    // Chuva (09x, 10x)
    'card-weather-thunder': '#4B0082',  // Tempestade (11x)
    'card-weather-snow': '#FFFFFF',    // Neve (13x)
    'card-weather-mist': '#F9FAFB',    // Névoa (50x)
    'card-weather-error': '#FEE2E2',   // Erro/Fallback

    // Cores das Fontes (Existente)
    'font-azul': '#9AB3E5',
    'font-roxo': '#B014EA',
    'font-amarelo': '#F3934F',
    'font-verde': '#1DA01C',
    'font-terracota': '#F2350E',
    'font-rosa': '#D7B4B6',
    'font-gelo': '#5D5D5D',
    'font-laranja': '#ffffff',
    
    // 🚨 NOVAS CORES DO CLIMA (Fonte)
    'font-weather-sun': '#36A2EB',
    'font-weather-night': '#F3F4F6',
    'font-weather-cloudy': '#4B5563',
    'font-weather-rain': '#1D4ED8',
    'font-weather-thunder': '#FFD700',
    'font-weather-snow': '#1E3A8A',
    'font-weather-mist': '#4B5563',
    'font-weather-error': '#EF4444',


    // Cores dos Botões
    'btn-principal': '#E9E9FF',
    'btn-secundario': '#070FFC',
    'btn-desativado': '#C7D1E1',

    // Cores das Fontes dos Botões
    'btn-font-principal': '#4845CF',
    'btn-font-secundario': '#ffffff',
    'btn-font-desativado': '#000000',
   }
  },
 },
 plugins: [],
}