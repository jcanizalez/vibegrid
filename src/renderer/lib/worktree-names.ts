const ADJECTIVES = [
  'lunar',
  'stellar',
  'cosmic',
  'solar',
  'astral',
  'nebular',
  'orbital',
  'galactic',
  'radiant',
  'celestial',
  'crimson',
  'golden',
  'frozen',
  'blazing',
  'silent',
  'swift',
  'phantom',
  'crystal',
  'ancient',
  'vivid',
  'amber',
  'cobalt',
  'emerald',
  'iron',
  'obsidian',
  'sapphire',
  'silver',
  'violet',
  'arctic',
  'molten'
]

const NOUNS = [
  'moon',
  'sun',
  'nova',
  'comet',
  'pulsar',
  'quasar',
  'nebula',
  'orbit',
  'titan',
  'vega',
  'mars',
  'phoenix',
  'zenith',
  'eclipse',
  'horizon',
  'vertex',
  'prism',
  'flare',
  'drift',
  'spark',
  'aurora',
  'meteor',
  'atlas',
  'helix',
  'ion',
  'nexus',
  'photon',
  'sigma',
  'omega',
  'terra'
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateWorktreeName(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`
}
