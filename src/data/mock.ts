import type { Conversation, ModelOption } from '../types'

export const MODELS: ModelOption[] = [
  { id: 'maia-2.5', name: 'Maia 2.5', caption: 'Balanced speed and depth', badge: 'Default' },
  { id: 'maia-2.5-pro', name: 'Maia 2.5 Pro', caption: 'Extended reasoning for hard problems' },
  { id: 'maia-lite', name: 'Maia Lite', caption: 'Instant answers for quick tasks' },
]

export const SUGGESTIONS = [
  'Plan a focused deep-work morning',
  'Explain vector databases, simply',
  'Draft a warm interview follow-up',
  'What can I cook with miso and rice?',
]

/**
 * The flagship scripted response, split into semantic chunks.
 * Chunks are markdown fragments that concatenate into one document;
 * they stream block-by-block (or bullet-by-bullet), never per-character.
 */
export const ARCH_RESPONSE: string[] = [
  'Short answer: build a **thin chat core with a capability layer around it** — a modular monolith today, with clean seams for tools and automation later.\n\n',
  '### Start with the conversation loop\n\n',
  'Treat chat as the kernel of the system: a message arrives, context is assembled, the model is called, and a response streams back out. ',
  'Keep this loop boring and reliable — everything interesting should plug *into* it rather than live inside it.\n\n',
  '### Design the seams early\n\n',
  'Most assistant projects weld features directly onto the chat loop, then pay for it for years. Define three seams now, even if each has a single implementation:\n\n',
  '- **Context providers** — anything that contributes to the prompt: history, files, and eventually memory\n',
  '- **Capabilities** — typed actions the assistant may invoke; shipping with zero is fine\n',
  '- **Surfaces** — chat today, automations and background jobs tomorrow\n\n',
  '### A capability contract\n\n',
  'Even before the first tool exists, the interface keeps the door open:\n\n',
  '```ts\ninterface Capability<In, Out> {\n  name: string\n  description: string\n  schema: Schema<In>\n  execute(input: In, ctx: SessionContext): Promise<Out>\n}\n\n// Later: registry.register(webSearch) — no core changes\nconst registry = new CapabilityRegistry()\n```\n\n',
  '### The takeaway\n\n',
  "Ship a chatbot built on a pipeline that doesn't know it's *only* a chatbot. ",
  'When tools and automation arrive, they should feel like additions — not a rewrite.',
]

/** Alternate opening used when regenerating, so a rerun feels alive. */
export const ARCH_RESPONSE_ALT: string[] = [
  "Here's the shape I'd commit to: a **small, stable conversation core** with every future ambition expressed as a plug-in seam — not a feature folder.\n\n",
  ...ARCH_RESPONSE.slice(1),
]

/** Generic follow-up responses, cycled for free-form messages. */
export const FOLLOW_UPS: string[][] = [
  [
    "Good question — here's the distilled version.\n\n",
    'If you only keep three things from this conversation, keep these:\n\n',
    '- Keep the chat loop **stateless and boring** — state lives beside it, never inside it\n',
    '- Type every boundary now, so future-you can refactor without fear\n',
    '- Let the interface *hint* at growth without shipping empty rooms\n\n',
    'Want me to sketch how the context-assembly step would look in code?',
  ],
  [
    "Let me think about that from first principles.\n\n",
    'The pattern that matters here: **favor whichever option keeps tomorrow’s decisions cheap**. ',
    'Reversible choices should be fast, and expensive ones deserve a written rationale.\n\n',
    '- Prototype the risky part first, in isolation\n',
    '- Prefer plain data at the boundaries — easy to log, test, and replay\n',
    '- Decide with a deadline; revisit with evidence\n\n',
    'If you tell me which constraint worries you most, I can go deeper on it.',
  ],
  [
    "Here's a concise take.\n\n",
    'Two forces are pulling at each other: momentum and correctness. You rarely need to fully satisfy both at once.\n\n',
    '- Ship the smallest version that teaches you something real\n',
    '- Write down what would make you *reverse* the decision\n',
    '- Re-evaluate once real usage exists, not before\n\n',
    'Happy to turn this into a short plan with rough milestones.',
  ],
]

const gifts: string[] = [
  "Sixty deserves something with weight to it — here's where I'd land.\n\n",
  'The best gifts at this age are **time made tangible**: things that acknowledge a whole life while still looking forward.\n\n',
  '- A restored print of a photo from his twenties, properly framed\n',
  '- A weekend trip built around something he loved before life got busy\n',
  '- A really good chef’s knife or turntable — one serious upgrade to a daily ritual\n\n',
  'If you tell me what he does on a free Saturday, I can narrow this to one confident pick.',
]

const playwright: string[] = [
  'Flaky Playwright tests are almost always a **waiting problem**, not a testing problem.\n\n',
  'Start with the three usual suspects:\n\n',
  '- Replace every `waitForTimeout` with a wait on a visible condition\n',
  '- Check for animations — assert after `transitionend`, or disable motion in test config\n',
  '- Look for network races: mock the response, or await the specific request\n\n',
  'Paste the failing spec and I’ll point at the exact line that races.',
]

const tokyo: string[] = [
  'Five days is enough for Tokyo to feel unhurried — if each day has one anchor, not five.\n\n',
  '- **Day 1** — Yanaka and Ueno: old streets, quiet temples, jet-lag friendly\n',
  '- **Day 2** — Tsukiji outer market early, then teamLab in the afternoon\n',
  '- **Day 3** — Shimokitazawa for records and coffee, Golden Gai at night\n',
  '- **Day 4** — Day trip to Kamakura, back for dinner in Ebisu\n',
  '- **Day 5** — Meiji Shrine at opening, then wander Omotesande with no plan\n\n',
  'Want restaurant picks for any of these days?',
]

const sql: string[] = [
  'Window functions click once you see them as **aggregates that refuse to collapse rows**.\n\n',
  '```sql\nSELECT name, dept,\n       salary,\n       AVG(salary) OVER (PARTITION BY dept) AS dept_avg,\n       RANK()      OVER (PARTITION BY dept ORDER BY salary DESC) AS dept_rank\nFROM employees;\n```\n\n',
  'Every row survives, but each one can now see its neighborhood: the partition average, its rank within it, the row before it.\n\n',
  'Want the same tour for `LAG`, `LEAD`, and running totals?',
]

const cover: string[] = [
  'Your draft is close — it mostly needs **compression and one proof point**.\n\n',
  '- Cut the first paragraph; open with the second sentence, which is the strong one\n',
  '- Replace “passionate about” with the metric from the launch you led\n',
  '- End on a specific: name the team’s product decision you admired\n\n',
  'Send the revision and I’ll do a final tone pass.',
]

const hike: string[] = [
  'For this weekend, two hikes stand out — both under an hour from Berkeley.\n\n',
  '- **Redwood Regional, French Trail** — shaded, quiet, surprisingly deep forest for the East Bay\n',
  '- **Mount Tamalpais, Matt Davis loop** — open coastal views, best started before 9am\n\n',
  'Matt Davis wins if fog stays away; check the marine layer Saturday morning.',
]

const renaming: string[] = [
  'Renaming is worth doing early — names shape how people reason about the project.\n\n',
  'A few directions that fit what you described:\n\n',
  '- **Quiet nouns** — Loom, Ledger, Field: calm, tool-like, easy to say\n',
  '- **Invented-but-warm** — Maia, Sonder, Arlo: personal without being cute\n',
  '- **Descriptive** — Harness, Relay: honest, but harder to trademark\n\n',
  'My instinct: the invented-warm lane matches the product’s tone best.',
]

function conv(
  id: string,
  title: string,
  group: Conversation['group'],
  userText: string,
  chunks: string[],
): Conversation {
  return {
    id,
    title,
    group,
    messages: [
      { id: `${id}-u1`, role: 'user', text: userText, attachments: [] },
      { id: `${id}-a1`, role: 'assistant', md: chunks.join(''), status: 'complete', model: 'maia-2.5' },
    ],
  }
}

export const SEED_CONVERSATIONS: Conversation[] = [
  conv(
    'c-arch',
    'Architecture for a personal AI assistant',
    'today',
    'Help me think through the architecture for a personal AI assistant that starts as a chatbot but can expand into tools and automation later.',
    ARCH_RESPONSE,
  ),
  conv('c-rename', 'Renaming the side project', 'today', "I'm renaming my side project — it's an AI assistant. Current name is Harness, but it feels too mechanical.", renaming),
  conv('c-playwright', 'Debugging a flaky Playwright test', 'yesterday', 'My Playwright test passes locally but fails in CI about 30% of the time. Where do I start?', playwright),
  conv('c-gift', "Gift ideas for Dad's 60th", 'yesterday', "My dad turns 60 next month. He's hard to shop for — any gift ideas that aren't clichés?", gifts),
  conv('c-tokyo', 'Tokyo itinerary — five days in April', 'week', "I'll be in Tokyo for 5 days in April, first time. Can you sketch an itinerary that isn't exhausting?", tokyo),
  conv('c-sql', 'SQL window functions refresher', 'week', 'I always forget how SQL window functions work. Can you give me a refresher with a concrete example?', sql),
  conv('c-cover', 'Cover letter polish', 'week', 'Can you critique my cover letter for a senior product engineer role? It feels flabby.', cover),
  conv('c-hike', 'Weekend hike near Berkeley', 'week', 'Looking for a good day hike near Berkeley this weekend — forest or coast, not too crowded.', hike),
]

export const GROUP_LABELS: Record<Conversation['group'], string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Previous 7 days',
}

let fileIdx = 0
export const MOCK_FILES = [
  { name: 'assistant-notes.md', size: 18_204, kind: 'document' as const },
  { name: 'roadmap-q3.pdf', size: 482_133, kind: 'document' as const },
  { name: 'pipeline.ts', size: 6_410, kind: 'code' as const },
  { name: 'whiteboard.jpg', size: 1_204_512, kind: 'image' as const },
]

export function nextMockFile() {
  const f = MOCK_FILES[fileIdx % MOCK_FILES.length]
  fileIdx += 1
  return f
}

export function kindForFileName(name: string): 'document' | 'image' | 'code' | 'data' {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg'].includes(ext)) return 'image'
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'swift', 'css', 'html', 'json'].includes(ext)) return 'code'
  if (['csv', 'xlsx', 'parquet', 'sql'].includes(ext)) return 'data'
  return 'document'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Up late, Ronald'
  if (hour < 12) return 'Good morning, Ronald'
  if (hour < 17) return 'Good afternoon, Ronald'
  return 'Good evening, Ronald'
}
