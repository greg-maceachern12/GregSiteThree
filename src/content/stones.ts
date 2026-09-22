import type { Card } from './moments'

export type Stone = Card

/** Legacy projects from gregmac.ca, marked in the graveyard. */
export const stones: Stone[] = [
  {
    id: 'ghola',
    name: 'Ghola AI',
    detail: 'Visualization of characters from books & stories.',
    href: 'https://ghola.co',
    icon: '/projects/ghola.png',
    place: 'stone',
    position: [1.55, -17.6],
  },
  {
    id: 'moolah',
    name: 'Moolah AI',
    detail: 'On device analysis and insights of personal spending',
    href: 'https://moolah-app.netlify.app/',
    icon: '/projects/moolah.png',
    place: 'stone',
    position: [3.45, -18.25],
  },
  {
    id: 'resuto',
    name: 'Resuto',
    detail: 'Helping restaurants grow and operate their business with AI',
    href: 'https://resutolanding.netlify.app/',
    icon: '/projects/resuto.png',
    place: 'stone',
    position: [5.35, -17.6],
  },
  {
    id: 'pace',
    name: 'Pace Calculator',
    detail: 'Simple tool to convert min/KM to min/Mile',
    href: 'https://convertpace.netlify.app/',
    icon: '/projects/pace.png',
    place: 'stone',
    position: [2.45, -15.95],
  },
  {
    id: 'github',
    name: 'Github',
    detail: 'I create new repos all the time with pitches and thoughts in the README.',
    href: 'https://github.com/greg-maceachern12?tab=repositories',
    icon: '/projects/github.png',
    place: 'stone',
    position: [5.75, -15.95],
  },
]
