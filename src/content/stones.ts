import type { Card } from './moments'

export type Stone = Card

// Append a Card to add a marker. The newest stone sits closest to the house path.
export const stones: Stone[] = [
  {
    id: 'audiometa',
    name: 'Audiometa',
    // TODO: role
    // TODO: detail
    href: 'https://audiometa.io',
    position: [-0.6, 16.2],
  },
]
