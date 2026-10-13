/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Colours come from the CSS channels in brand-tokens.css so the theme can flip
      // at runtime. The `<alpha-value>` form is MANDATORY: a plain var() would break
      // every opacity modifier in the app (bg-gold/20, border-white/10, …).
      // `white` and `black` are deliberately remapped to the foreground/background
      // channels — the app is written dark-first and those ~490 utilities all mean
      // "foreground tint on the app surface", so they follow the theme too.
      colors: {
        gold: 'rgb(var(--gold-rgb) / <alpha-value>)',
        'gold-pale': 'rgb(var(--gold-pale-rgb) / <alpha-value>)',
        'gold-deep': 'rgb(var(--gold-deep-rgb) / <alpha-value>)',
        'gold-ink': 'rgb(var(--gold-ink-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',   // text ON gold: dark in both themes
        cream: 'rgb(var(--cream-rgb) / <alpha-value>)',
        white: 'rgb(var(--fg-rgb) / <alpha-value>)',
        black: 'rgb(var(--bg-rgb) / <alpha-value>)',
        // surface ladder for cards (dark: near-black up; light: paper up)
        surface: {
          1: 'rgb(var(--surface-1-rgb) / <alpha-value>)',
          2: 'rgb(var(--surface-2-rgb) / <alpha-value>)',
          3: 'rgb(var(--surface-3-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
        alt: ['Archivo', 'Montserrat', 'sans-serif'],
      },
      // Tailwind 3 ships opacity in steps of 5 only: `bg-white/8`, `border-white/12`
      // & co. (≈45 uses) compiled to NOTHING — invisible stepper discs, sheet close
      // buttons, ring tracks. These are the off-grid steps the app actually uses.
      opacity: {
        6: '0.06',
        8: '0.08',
        12: '0.12',
        14: '0.14',
        22: '0.22',
        32: '0.32',
        92: '0.92',
      },
      borderRadius: {
        card: '16px',
        photo: '22px',
        icon: '18px',
        chip: '5px',
        bar: '9px', // the Panel/medal progress bars used `rounded-bar` with no such key
      },
      letterSpacing: {
        kicker: '0.30em',
        eyebrow: '0.22em',
        micro: '0.16em',
      },
      backgroundImage: {
        'dark-stage': 'var(--grad-dark-stage)',
        'gold-rule': 'var(--grad-gold-rule)',
        'gold-fill': 'var(--grad-gold-fill)',
      },
    },
  },
  plugins: [],
}
