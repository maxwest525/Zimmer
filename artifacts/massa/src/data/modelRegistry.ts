export type ModelCategory = 'thinking' | 'building' | 'interface' | 'automation' | 'research' | 'multimodal'

export interface ModelEntry {
  name: string
  label: string
  category: ModelCategory
  role: string
  color: string
  capabilities: string[]
  reasons: Record<string, string>
  logoNames?: string[]
}

export const MODEL_REGISTRY: ModelEntry[] = [
  {
    name: 'Claude',
    label: 'Think',
    category: 'thinking',
    role: 'Thinking layer',
    color: '#34d399',
    capabilities: ['Intent', 'Refinement', 'Planning', 'Classification'],
    reasons: {
      default: 'Selected for deep reasoning and planning',
      ui: 'Handles intent parsing and component planning',
      backend: 'Plans architecture and validates logic flow',
      automation: 'Reasons about workflow structure and routing',
      research: 'Synthesizes complex findings into actionable plans',
    },
  },
  {
    name: 'Claude Code',
    label: 'Build',
    category: 'building',
    role: 'Build engine',
    color: '#4ade80',
    capabilities: ['Backend', 'APIs', 'Logic', 'Infrastructure'],
    reasons: {
      default: 'Selected for technical depth and code generation',
      ui: 'Builds component logic and state management',
      backend: 'Writes production-grade backend code and APIs',
      automation: 'Implements integration logic and data transforms',
      database: 'Designs schemas and writes migration scripts',
    },
  },
  {
    name: 'GPT-4o',
    label: 'Reason',
    category: 'thinking',
    role: 'Reasoning engine',
    color: '#a78bfa',
    capabilities: ['Analysis', 'Strategy', 'Complex reasoning', 'Math'],
    reasons: {
      default: 'Selected for advanced multi-step reasoning',
      ui: 'Analyzes UX patterns and suggests optimal layouts',
      backend: 'Validates complex business logic and edge cases',
      automation: 'Designs intelligent decision trees and routing',
      database: 'Optimizes query strategies and data modeling',
    },
  },
  {
    name: 'Gemini',
    label: 'Multi',
    category: 'multimodal',
    role: 'Multimodal engine',
    color: '#60a5fa',
    capabilities: ['Vision', 'Multimodal', 'Long context', 'Code review'],
    reasons: {
      default: 'Selected for multimodal understanding and long context',
      ui: 'Processes design mockups and visual references',
      backend: 'Reviews large codebases with full-context analysis',
      research: 'Analyzes documents, images, and mixed media inputs',
    },
  },
  {
    name: 'Lovable',
    label: 'Interface',
    category: 'interface',
    role: 'Interface layer',
    color: '#f472b6',
    capabilities: ['Dashboards', 'Front-end', 'Control panels', 'UI'],
    reasons: {
      default: 'Best for rapid UI prototyping and visual surfaces',
      ui: 'Generates polished React components and layouts',
      backend: 'Builds admin panels and internal tools',
    },
  },
  {
    name: 'Replit',
    label: 'Interface',
    category: 'interface',
    role: 'Interface layer',
    color: '#f97316',
    capabilities: ['Full-stack', 'Prototyping', 'Deployment', 'UI'],
    reasons: {
      default: 'Selected for full-stack prototyping and deployment',
      ui: 'Rapidly scaffolds and deploys interactive apps',
      backend: 'Handles end-to-end build and hosting',
    },
  },
  {
    name: 'Cursor',
    label: 'Code',
    category: 'building',
    role: 'Code assistant',
    color: '#818cf8',
    capabilities: ['Refactoring', 'Debugging', 'Code completion', 'Migration'],
    reasons: {
      default: 'Selected for precise code editing and refactoring',
      ui: 'Refactors component trees and optimizes renders',
      backend: 'Debugs complex logic and performs migrations',
      database: 'Refactors data access layers and ORM code',
    },
  },
  {
    name: 'Bolt',
    label: 'Ship',
    category: 'building',
    role: 'Rapid builder',
    color: '#fbbf24',
    capabilities: ['Scaffolding', 'Boilerplate', 'Quick builds', 'MVPs'],
    reasons: {
      default: 'Selected for rapid scaffolding and MVP builds',
      ui: 'Quickly generates full-page layouts and forms',
      backend: 'Scaffolds APIs and CRUD endpoints fast',
    },
  },
  {
    name: 'Windsurf',
    label: 'Flow',
    category: 'building',
    role: 'Flow builder',
    color: '#22d3ee',
    capabilities: ['Agentic flows', 'Multi-file edits', 'Codebase-aware'],
    reasons: {
      default: 'Selected for large codebase-aware edits',
      backend: 'Handles cross-file refactors and dependency updates',
      ui: 'Coordinates multi-component UI changes',
    },
  },
  {
    name: 'n8n',
    label: 'Automate',
    category: 'automation',
    role: 'Automation layer',
    color: '#a3b535',
    capabilities: ['Routing', 'Triggers', 'Scheduling', 'Notifications'],
    reasons: {
      default: 'Used to connect, schedule, and orchestrate workflows',
      automation: 'Builds event-driven pipelines and integrations',
      backend: 'Handles async jobs, webhooks, and notifications',
    },
  },
  {
    name: 'Perplexity',
    label: 'Research',
    category: 'research',
    role: 'Research engine',
    color: '#f59e0b',
    capabilities: ['Web search', 'Fact-checking', 'Competitive analysis', 'Docs'],
    reasons: {
      default: 'Selected for real-time research and fact-finding',
      backend: 'Researches API docs and integration patterns',
      ui: 'Finds design inspiration and component libraries',
      research: 'Performs competitive analysis and market research',
    },
  },
  {
    name: 'Mistral',
    label: 'Fast',
    category: 'thinking',
    role: 'Fast inference',
    color: '#fb923c',
    capabilities: ['Quick tasks', 'Summarization', 'Translation', 'Triage'],
    reasons: {
      default: 'Selected for fast inference on lightweight tasks',
      backend: 'Handles quick code reviews and linting suggestions',
      automation: 'Triages incoming requests and classifies intents',
      research: 'Rapidly summarizes documents and extracts key points',
    },
  },
  {
    name: 'Grok',
    label: 'Reason',
    category: 'thinking',
    role: 'Conversational reasoner',
    color: '#e44d26',
    capabilities: ['Real-time info', 'Conversational reasoning', 'Humor', 'Analysis'],
    reasons: {
      default: 'Selected for real-time reasoning with a conversational edge',
      ui: 'Generates creative copy and conversational UI text',
      backend: 'Analyzes logic and suggests unconventional solutions',
      research: 'Pulls in current information and synthesizes insights',
      automation: 'Reasons through complex routing with contextual awareness',
    },
  },
  {
    name: 'Gemma',
    label: 'Lite',
    category: 'thinking',
    role: 'Lightweight local model',
    color: '#4285f4',
    capabilities: ['Fast tasks', 'On-device', 'Summarization', 'Classification'],
    reasons: {
      default: 'Selected for fast, lightweight tasks that benefit from local execution',
      backend: 'Handles quick classification and data labeling',
      automation: 'Runs low-latency triage and intent detection',
      research: 'Summarizes short documents and extracts structured data',
    },
  },
]

export const MODEL_COLORS: Record<string, string> = {
  ...Object.fromEntries(MODEL_REGISTRY.map(m => [m.name, m.color])),
  'APIs': '#f59e0b',
}

export const MODEL_REASONS: Record<string, string> = {
  ...Object.fromEntries(MODEL_REGISTRY.map(m => [m.name, m.reasons.default])),
  'APIs': 'External API integrations and service connections',
}

export function getModelEntry(name: string): ModelEntry | undefined {
  return MODEL_REGISTRY.find(m => m.name === name)
}

export function getModelReason(name: string, context?: string): string {
  const entry = getModelEntry(name)
  if (!entry) return MODEL_REASONS[name] || ''
  if (context && entry.reasons[context]) return entry.reasons[context]
  return entry.reasons.default
}

export function getModelColor(name: string): string {
  return MODEL_COLORS[name] || '#34d399'
}
