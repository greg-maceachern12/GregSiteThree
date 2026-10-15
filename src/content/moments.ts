export type Card = {
  id: string
  name: string
  role?: string
  detail?: string
  summary?: string
  category?: string
  location?: string
  highlights?: string[]
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
    category: 'Education',
    location: 'Kingston, ON',
    summary:
      'Studied hardware systems, embedded software, and applied engineering while building early web and product experiments on the side.',
    highlights: ['B.A.Sc. Computer Engineering', 'Systems & Architecture', 'Kingston, Ontario'],
    position: [-12.6, -13.4],
  },
  {
    id: 'seattle',
    name: 'Seattle',
    category: 'Chapter',
    location: 'Puget Sound, WA',
    summary:
      'Moved out west to begin a career in product management—spending weekends on the water around Lake Union and the Puget Sound.',
    highlights: ['Pacific Northwest', 'Early Career Base', 'Lake Union & Sound'],
    position: [1.5, -10.3],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    role: 'Product Manager',
    detail: 'OneNote on Apple, then Copilot in OneNote',
    category: 'Career Milestone',
    location: 'Redmond & New York',
    summary:
      'Led product experiences for OneNote across Mac, iPad, and iPhone before shaping generative AI note-taking workflows with Copilot in OneNote.',
    highlights: ['OneNote for Apple (iOS, iPadOS, macOS)', 'Microsoft 365 Copilot Integration', '0→1 AI Note-Taking Flows'],
    position: [11.2, -15.4],
  },
  {
    id: 'newyork',
    name: 'New York',
    detail: 'Home',
    category: 'Home Base',
    location: 'New York, NY',
    summary:
      'Home base in New York City—working at the intersection of fintech, AI products, and independent creative software.',
    highlights: ['New York City', 'Product & Design', 'Current Home'],
    position: [-2.4, 13.2],
  },
  {
    id: 'music',
    name: 'Music management',
    role: 'Websites for artists and labels',
    detail: 'greg.so',
    category: 'Studio & Management',
    location: 'Independent',
    summary:
      'Designing and launching bespoke digital worlds, interactive campaigns, and tour hubs for recording artists, DJs, and independent labels.',
    highlights: ['Artist & Label Web Experiences', 'Release Campaigns & Funnels', 'Creative Direction'],
    href: 'https://greg.so',
    position: [4.8, 14.6],
  },
  {
    id: 'range',
    name: 'Range',
    role: 'Product Manager',
    detail: 'AI wealth management',
    category: 'Career Milestone',
    location: 'New York, NY',
    summary:
      'Building modern, AI-native wealth management software that gives members clear, proactive guidance across their entire financial life.',
    highlights: ['AI Wealth Platform', 'Financial Planning & Advisory', 'Consumer Fintech'],
    position: [14.4, 9.1],
  },
]
