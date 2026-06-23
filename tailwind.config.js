/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#C6AE78',
        'gold-pale': '#EADEB4',
        'gold-deep': '#8A6A38',
        ink: '#0E0E0F',
        cream: '#F5F4F2',
        // dark surface ladder for cards on near-black
        surface: { 1: '#121211', 2: '#1A1916', 3: '#232118' },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
        alt: ['Archivo', 'Montserrat', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        photo: '22px',
        icon: '18px',
        chip: '5px',
      },
      letterSpacing: {
        kicker: '0.30em',
        eyebrow: '0.22em',
        micro: '0.16em',
      },
      backgroundImage: {
        'dark-stage': 'radial-gradient(125% 90% at 72% 8%, #15140F 0%, #000000 70%)',
        'gold-rule': 'linear-gradient(180deg,#8A6A38,#C6AE78 18%,#C6AE78 82%,#8A6A38)',
        'gold-fill': 'linear-gradient(90deg,#C6AE78,#8A6A38)',
      },
    },
  },
  plugins: [],
}
