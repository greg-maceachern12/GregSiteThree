import type { Card } from './moments'

export type Stone = Card

/** Legacy projects from gregmac.ca, marked in the graveyard. */
export const stones: Stone[] = [
  {
    id: 'ghola',
    name: 'Ghola AI',
    detail: 'Visualization of characters from books & stories.',
    category: 'Archive · GenAI',
    summary:
      'Extracted character descriptions from novels and stories to generate consistent visual portraits as readers progressed through a book.',
    highlights: ['Character Extraction', 'Generative Portraits', 'Literary Companion'],
    href: 'https://ghola.co',
    icon: '/projects/ghola.png',
    place: 'stone',
    position: [1.55, -17.6],
  },
  {
    id: 'moolah',
    name: 'Moolah AI',
    detail: 'On device analysis and insights of personal spending',
    category: 'Archive · Fintech',
    summary:
      'Privacy-first personal finance tool running local analysis on statement exports to surface recurring spend, anomalies, and cash-flow trends.',
    highlights: ['Local-First Processing', 'Spend Categorization', 'Personal Finance'],
    href: 'https://moolah-app.netlify.app/',
    icon: '/projects/moolah.png',
    place: 'stone',
    position: [3.45, -18.25],
  },
  {
    id: 'resuto',
    name: 'Resuto',
    detail: 'Helping restaurants grow and operate their business with AI',
    category: 'Archive · Vertical AI',
    summary:
      'Operations and marketing copilot built for independent restaurants—streamlining menu updates, guest responses, and local growth.',
    highlights: ['Restaurant Operations', 'Automated Guest Replies', 'Local Growth Tools'],
    href: 'https://resutolanding.netlify.app/',
    icon: '/projects/resuto.png',
    place: 'stone',
    position: [5.35, -17.6],
  },
  {
    id: 'pace',
    name: 'Pace Calculator',
    detail: 'Simple tool to convert min/KM to min/Mile',
    category: 'Archive · Utility',
    summary:
      'Fast, zero-friction running utility for converting training paces and race splits between metric and imperial distances.',
    highlights: ['Instant Split Conversion', 'Race Pace Tables', 'Runner Utility'],
    href: 'https://convertpace.netlify.app/',
    icon: '/projects/pace.png',
    place: 'stone',
    position: [2.45, -15.95],
  },
  {
    id: 'github',
    name: 'Github',
    detail: 'I create new repos all the time with pitches and thoughts in the README.',
    category: 'Open Source & Experiments',
    summary:
      'Public lab of prototypes, product pitches, weekend hacks, and architectural notes explored through working code.',
    highlights: ['Product Prototypes', 'README Pitches', 'Open Source'],
    href: 'https://github.com/greg-maceachern12?tab=repositories',
    icon: '/projects/github.png',
    place: 'stone',
    position: [5.75, -15.95],
  },
]
