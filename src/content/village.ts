import type { Card } from './moments'

/** Active projects from gregmac.ca, gathered as their own hamlet on the west shore. */
export const village: Card[] = [
  {
    id: 'baselift',
    name: 'Baselift',
    detail: 'Custom workout splits using AI',
    category: 'Active Project · Fitness AI',
    summary:
      'Generates personalized strength and hypertrophy programs tailored to available equipment, recovery schedule, and training goals.',
    highlights: ['Adaptive Split Builder', 'Progression Tracking', 'Equipment-Aware'],
    href: 'https://www.baselift.io',
    icon: '/projects/baselift.png',
    place: 'cottage',
    position: [-13.1, 10.3],
  },
  {
    id: 'visuai',
    name: 'Visuai',
    detail: 'Text-to-image GenAI application transforming e-books into vivid picture books.',
    category: 'Active Project · Creative AI',
    summary:
      'Turns EPUB chapters and prose into richly illustrated scenes, maintaining visual style and atmosphere across an entire story.',
    highlights: ['Scene Illustration Engine', 'Consistent Art Direction', 'Interactive Reader'],
    href: 'https://www.visuai.io',
    icon: '/projects/visuai.png',
    place: 'cottage',
    position: [-12.6, 11.9],
  },
  {
    id: 'primer',
    name: 'Primer AI',
    detail:
      'AI Generated Learning Platform generating structured and organized self service learning modules for any topic',
    category: 'Active Project · EdTech',
    summary:
      'Transforms any subject into a structured curriculum with interactive lessons, mental models, and comprehension checkpoints.',
    highlights: ['Dynamic Curriculum Graph', 'Self-Paced Modules', 'Interactive Checkpoints'],
    href: 'https://primerai.io',
    icon: '/projects/primer.png',
    place: 'cottage',
    position: [-11.2, 12.5],
  },
  {
    id: 'musicmilk',
    name: 'Music Milk',
    detail: 'Platform to host mashups and long-form mixtapes',
    category: 'Active Project · Audio',
    summary:
      'Dedicated streaming home for DJs and producers to share uncleared mashups, bootlegs, and continuous long-form sets.',
    highlights: ['Long-Form Mixtape Hosting', 'Tracklist Timestamps', 'Crate & DJ Profiles'],
    href: 'https://musicmilk.co',
    icon: '/projects/musicmilk.png',
    place: 'cottage',
    position: [-9.8, 12.2],
  },
  {
    id: 'consultancy',
    name: 'Digital Music Consultancy',
    detail: 'Custom websites for high-profile music industry clients, increasing funnel by 500%.',
    category: 'Active Project · Agency',
    summary:
      'Bespoke web design and conversion engineering for artists, managers, and labels—driving 5× growth in fan capture and merch/ticket funnels.',
    highlights: ['500% Funnel Conversion Lift', 'Custom Interactive Web', 'Roster & Tour Launches'],
    href: 'https://www.greg.so',
    icon: '/projects/consultancy.png',
    place: 'cottage',
    position: [-9.4, 11.3],
  },
]
