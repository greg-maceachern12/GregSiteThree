export type Card = {
  id: string
  name: string
  role?: string
  detail?: string
  href?: string
  icon?: string
  place?: 'stone' | 'cottage'
  position: [number, number]
}

export type Moment = Card

export const moments: Moment[] = [
  {
    id: 'queens',
    name: "Queen's University",
    role: 'Student',
    detail: 'Computer Engineering',
    position: [-12.6, -13.4],
  },
  {
    id: 'seattle',
    name: 'Seattle',
    position: [1.5, -10.3],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    role: 'Product Manager',
    detail: 'OneNote on Apple, then Copilot in OneNote',
    position: [11.2, -15.4],
  },
  {
    id: 'newyork',
    name: 'New York',
    detail: 'Home',
    position: [-2.4, 13.2],
  },
  {
    id: 'music',
    name: 'Music management',
    role: 'Websites for artists and labels',
    detail: 'greg.so',
    href: 'https://greg.so',
    position: [4.8, 14.6],
  },
  {
    id: 'range',
    name: 'Range',
    role: 'Product Manager',
    detail: 'AI wealth management',
    position: [14.4, 9.1],
  },
]
