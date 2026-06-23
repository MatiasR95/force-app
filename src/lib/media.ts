import type { MovementPattern } from './types'

// Exercise demo media.
//
// Brand rule §5 bans photos with baked-in text or front-facing faces, so the v1
// demo uses a clean, generated, on-brand visual per movement pattern (a large
// faint equipment icon over the dark stage) instead of stock/Canva photos.
//
// As coaches add curated, text-free exercise gifs/images to the Force library,
// register them per slug below (or fetch a manifest.json from the gym Drive).
// `mediaFor` returns a real asset URL when one exists; otherwise null → the UI
// renders the branded placeholder.

const SLUG_MEDIA: Record<string, string> = {
  // 'press-plano': pressPlanoGif,  // drop curated assets here
}

export function mediaFor(slug: string): string | null {
  return SLUG_MEDIA[slug] ?? null
}

export const PATTERN_LABEL: Record<MovementPattern, string> = {
  squat: 'Sentadilla', hinge: 'Bisagra de cadera', push: 'Empuje',
  pull: 'Tracción', core: 'Core', carry: 'Transporte', other: 'General',
}
