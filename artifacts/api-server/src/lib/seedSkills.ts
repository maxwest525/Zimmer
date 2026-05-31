import { db, massaSkillsTable } from "@workspace/db";
import { logger } from "./logger.js";
import { sql } from "drizzle-orm";

const BUILT_IN_SKILLS = [
  {
    slug: "framer-motion-animations",
    name: "Framer Motion Animations",
    category: "frontend",
    description: "Production animation patterns using Framer Motion — spring physics, stagger, scroll triggers, page transitions",
    content: `# Framer Motion Animation Patterns

## Core Principles
- Always use spring physics: \`{ type: "spring", stiffness: 400, damping: 28 }\`
- Never use linear easing for UI elements
- Stagger children with 0.08s delay increments
- Use viewport triggers for scroll animations

## Entrance Animations
\`\`\`tsx
// Fade-in-up (most common)
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring", stiffness: 400, damping: 28 }
}

// Stagger container
const stagger = {
  animate: { transition: { staggerChildren: 0.08 } }
}
\`\`\`

## Scroll Triggers
\`\`\`tsx
<motion.div
  initial={{ opacity: 0, y: 32 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ type: "spring", stiffness: 300, damping: 24 }}
/>
\`\`\`

## Hover Interactions
\`\`\`tsx
<motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }} />
\`\`\`

## Page Transitions
\`\`\`tsx
const pageVariants = {
  initial: { opacity: 0, x: -20 },
  enter: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: 20 }
}
\`\`\`

## Loading States
Use AnimatePresence for mount/unmount. Skeleton screens with shimmer via CSS @keyframes.`,
  },
  {
    slug: "landing-page-conversion",
    name: "Landing Page CRO",
    category: "marketing",
    description: "Conversion rate optimization best practices — above-fold, social proof, CTAs, pricing psychology",
    content: `# Landing Page Conversion Optimization

## Above the Fold
- ONE clear headline: benefit-first, specific, bold
- Subheadline: expand on the benefit or address the primary objection
- Primary CTA: action verb + specific outcome ("Start building for free", not "Get started")
- Secondary CTA: social proof or demo ("See how it works →")
- Hero visual: UI screenshot, product mockup, or relevant image — no stock photos

## Social Proof Formula
- Logo strip (5-8 recognizable brands) immediately below hero
- Testimonials: Name + Company + Role + Photo + Specific metric ("saves us 4 hours/week")
- Numbers: Make them specific ("12,847 teams" not "thousands of teams")

## Pricing Psychology
- 3-tier structure (Basic / Pro / Enterprise)
- Highlight the middle tier ("Most Popular" badge, different styling)
- Annual toggle with explicit savings ("Save 40%")
- Risk reversal below CTA ("14-day free trial, no credit card")

## CTA Best Practices
- Use action verbs: Start, Build, Launch, Join, Get
- Repeat CTA at bottom of every section
- Color: High contrast, matches brand accent
- Size: Larger than you think necessary

## FAQ Section
Address the top 5 objections:
1. How much does it cost?
2. Is my data secure?
3. How does [core feature] work?
4. Can I [key use case]?
5. What happens when [trial/cancellation]?`,
  },
  {
    slug: "tailwind-design-system",
    name: "Tailwind Design System",
    category: "frontend",
    description: "Enterprise Tailwind config — custom tokens, component patterns, dark mode, responsive utilities",
    content: `# Enterprise Tailwind Design System

## Custom Config
\`\`\`js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0fdf4', 500: '#22c55e', 900: '#14532d' },
        neutral: { /* custom scale */ }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      }
    }
  }
}
\`\`\`

## Component Patterns

### Glass Card
\`\`\`
backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl shadow-2xl
\`\`\`

### Gradient Button
\`\`\`
bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600
text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-violet-500/25
transition-all duration-200 hover:shadow-violet-500/40 hover:-translate-y-0.5
\`\`\`

### Glow Text
\`\`\`
bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60
\`\`\`

## Spacing
- Sections: py-24 (96px top/bottom)
- Components: gap-6 or gap-8 (24-32px)
- Cards: p-6 or p-8

## Typography Scale
- Hero: text-6xl font-black tracking-tight (64px)
- Section title: text-4xl font-bold tracking-tight (36px)
- Card title: text-xl font-semibold (20px)
- Body: text-base leading-relaxed text-neutral-400 (16px)`,
  },
  {
    slug: "stripe-integration",
    name: "Stripe Integration",
    category: "backend",
    description: "Production Stripe setup — subscriptions, webhooks, customer portal, usage billing, metered pricing",
    content: `# Stripe Integration Patterns

## Setup
\`\`\`ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' })
\`\`\`

## Subscription Flow
1. Create Customer on user signup
2. Create Checkout Session → redirect to Stripe
3. Webhook: \`checkout.session.completed\` → provision access
4. Webhook: \`customer.subscription.updated/deleted\` → update DB

## Webhook Handler
\`\`\`ts
const sig = req.headers['stripe-signature']!
const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
\`\`\`

## Customer Portal
\`\`\`ts
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: \`\${baseUrl}/settings/billing\`
})
redirect(session.url)
\`\`\`

## Pricing Tiers Pattern
- Free: limits enforced in middleware, no Stripe customer needed
- Pro: \`price_xxx\` monthly/annual price IDs in env vars
- Enterprise: Contact sales, custom pricing

## Security
- Always verify webhook signatures
- Never trust client-sent price IDs — use env vars
- Store Stripe customer ID, subscription ID in your DB
- Use idempotency keys for critical operations`,
  },
  {
    slug: "postgresql-drizzle",
    name: "PostgreSQL + Drizzle ORM",
    category: "backend",
    description: "Production DB patterns — schema design, relations, migrations, query optimization, connection pooling",
    content: `# PostgreSQL + Drizzle ORM Patterns

## Schema Design Principles
- Use serial/bigserial PKs for internal IDs
- Add \`created_at\` and \`updated_at\` timestamps to every table
- Use \`text\` not \`varchar(n)\` — PostgreSQL stores them identically
- Use \`jsonb\` for semi-structured data, not JSON
- Always add \`NOT NULL\` unless null is semantically meaningful

## Standard Table Pattern
\`\`\`ts
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("member"),
  orgId: integer("org_id").notNull().references(() => orgsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
\`\`\`

## Relations
\`\`\`ts
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  org: one(orgsTable, { fields: [usersTable.orgId], references: [orgsTable.id] }),
  posts: many(postsTable),
}))
\`\`\`

## Query Patterns
\`\`\`ts
// With relations (type-safe joins)
const user = await db.query.usersTable.findFirst({
  where: eq(usersTable.email, email),
  with: { org: true, posts: { limit: 10 } }
})

// Pagination
const page = await db.query.postsTable.findMany({
  limit: 20, offset: (pageNum - 1) * 20,
  orderBy: [desc(postsTable.createdAt)]
})
\`\`\`

## Indexes
Add indexes on: foreign keys, frequently filtered columns, email fields.

## Connection Pooling
Use \`pg\` Pool with \`max: 10\` for production. Never create a new connection per request.`,
  },
  {
    slug: "react-component-library",
    name: "React Component Patterns",
    category: "frontend",
    description: "Enterprise React component architecture — compound components, headless patterns, accessibility, TypeScript",
    content: `# React Component Architecture

## Naming & Structure
- PascalCase for components, camelCase for hooks
- Co-locate: Component.tsx + Component.test.tsx + Component.types.ts
- One component per file for non-trivial components

## TypeScript Patterns
\`\`\`tsx
// Always type children explicitly
interface CardProps {
  title: string
  description?: string
  className?: string
  children?: React.ReactNode
  onClick?: () => void
}

// Use discriminated unions for variants
type ButtonProps =
  | { variant: 'primary'; loading?: boolean }
  | { variant: 'ghost'; icon?: React.ReactNode }
\`\`\`

## Headless + Styled Pattern
\`\`\`tsx
// Primitive (headless, behavior only)
function Dialog({ open, onClose, children }: DialogProps) { ... }

// Styled (wraps primitive with design system)
function Modal({ title, children, ...props }: ModalProps) {
  return (
    <Dialog {...props}>
      <div className="rounded-2xl bg-neutral-900 border border-white/10 p-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        {children}
      </div>
    </Dialog>
  )
}
\`\`\`

## Performance
- Memoize expensive renders with \`memo()\`
- Use \`useMemo\` for derived state, \`useCallback\` for handlers passed as props
- Lazy-load heavy components with \`lazy()\` + \`Suspense\`
- Avoid creating objects/arrays in JSX props`,
  },
  {
    slug: "copywriting-saas",
    name: "SaaS Copywriting",
    category: "marketing",
    description: "Conversion copy frameworks for SaaS — headlines, email sequences, onboarding copy, feature descriptions",
    content: `# SaaS Copywriting Framework

## Headline Formula
**[Verb] [Outcome] [Time frame/Qualifier]**
- "Ship features 3× faster"
- "Turn customer feedback into shipped code"
- "Build your entire data stack in one afternoon"

## Feature → Benefit Translation
Never: "Real-time collaboration"
Always: "Your whole team works in the same file, changes appear instantly — no more Slack back-and-forth"

Never: "AI-powered suggestions"
Always: "Skip the blank-page problem — AI drafts the first version, you refine it"

## Email Sequence (7-day trial)
- Day 0: Welcome + single next step (not a feature list)
- Day 1: Show them their first win ("You've done X, now try Y")
- Day 3: Social proof from a similar customer
- Day 5: Overcome the #1 objection
- Day 7: Trial ending + clear value reminder + upgrade CTA

## Onboarding Copy
- Progress bar label: "You're X% of the way to [concrete outcome]"
- Empty state: "[Verb] your first [noun] →" (never "No [noun] yet")
- Success message: Celebrate + suggest next action in same sentence

## Pricing Page Copy
- Plan names: describe the customer, not the tier (Starter / Growth / Scale)
- Feature list: lead with the constraint on lower tier ("Up to 5 projects" → "Unlimited projects")
- Guarantee: "30-day money-back, no questions asked"
- Trust signal under CTA: "Trusted by 12,000+ teams at [Logo] [Logo] [Logo]"`,
  },
];

export async function seedMassaSkills(): Promise<void> {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(massaSkillsTable);
    if (Number(existing[0]?.count) > 0) return; // already seeded

    await db.insert(massaSkillsTable).values(BUILT_IN_SKILLS).onConflictDoNothing();
    logger.info({ count: BUILT_IN_SKILLS.length }, "Seeded MASSA skills library");
  } catch (err) {
    logger.warn({ err }, "Could not seed MASSA skills (table may not exist yet)");
  }
}
