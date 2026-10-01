# EstateMatch AI 🇨🇦

**Your cynical, intelligent, and helpful assistant for Canadian real estate.**

A web app that reads a listing's description like a grumpy home inspector: it flags hidden red flags (strata fees, special assessments, oil tanks), grounds every claim in a quote from the text, scores the listing 0-100 against your budget and must-haves with a score calculated in code, and drafts an inquiry email to the agent about what it found.

Paste listing text or HTML (e.g. copied from Realtor.ca, Zolo, or Craigslist). No account, no API key needed for the default mode.

---

## Two analysis modes

**Instant local mode (default, no key required)**
A deterministic analyzer (`services/analyzerCore.ts`) runs entirely in the browser. It strips HTML, extracts structured facts (price, beds/baths, sq ft, fees, special assessments, taxes, parking, locker, pets, laundry, utilities, lease terms, renovation year, and a dictionary of Canadian risk phrases), and calculates the Financial / Lifestyle / Condition scores in code with an explicit deduction ledger. Changing your preferences on the results page rescales a local result instantly. Chat answers quote the listing back or say "The listing doesn't mention that."

**Live AI mode (optional, server-side Gemini)**
When `GEMINI_API_KEY` is set on the server, the `/api/analyze` and `/api/chat` Vercel functions call Gemini 2.5 Flash for the narrative. The model proposes claims; the server then validates every quote against the listing text (fabricated quotes are dropped) and recalculates the final score and market disclaimer in code before returning anything. If live AI is unconfigured or fails, the app falls back to local analysis automatically.

The Gemini key is **server-side only**. It is never defined, injected, or bundled into the client. (An earlier architecture injected the key into the browser bundle at build time. That is removed; do not reintroduce `VITE_*` key variables.)

## What it does

1. **Fact extraction and red flags** — price, fees, assessments, leasehold, mold, knob and tube wiring, oil tanks, flood or foundation wording, litigation, pet restrictions, and more, each paired with the exact listing quote that supports it.
2. **Match score (0-100), calculated in code** — budget overage, fee load, assessment cost, layout shortfalls, pet and laundry fit, location and must-have checks, renovation age, and risk deductions. The results page shows the deduction ledger, not a black box.
3. **Buy vs. Rent modes** — buying checks fees, taxes, assessments, parking, and heating; renting checks utilities, lease term, deposits, laundry, and pet policy.
4. **Missing information is a first-class result** — taxes, heating, lease terms, and other unstated facts appear as cons and become questions in the inquiry draft. The app never invents market comps: with no data source connected, the market section says value cannot be verified from the listing alone.
5. **Chat with the listing** — quote-backed local Q&A by default, Gemini chat in live mode.
6. **Inquiry email draft** — copy-to-clipboard email asking about the red flags and missing facts it actually found.

## Sample listings

Three fictional fixtures ship with the app: a risky condo with an assessment and pet limits (`sample-listing.md`), a clean updated condo (`sample-clean-condo.md`), and a rental with lease traps (`sample-rental.md`).

## What's honest about the scope

- The app reads only the text you paste. It does not fetch listing URLs, scrape sites, or pull MLS data. The landing copy says paste text or HTML, because that is what it accepts.
- Local mode is rules-based. Unusual wording can be missed, and negations are handled for common patterns only.
- Scores are a second pair of eyes, not a substitute for a realtor, home inspector, or lawyer.
- Rate limiting on `/api` uses Upstash Redis when configured, otherwise a per-instance in-memory bucket. For a public deployment, configure Upstash plus a provider spend alert and a kill switch (clearing `GEMINI_API_KEY` disables live mode instantly).
- Styling uses the Tailwind Play CDN from `index.html`, fine for a demo, not how you'd ship production CSS.

---

## Setup

```bash
git clone https://github.com/aaryan0909/EstateMatch-AI.git
cd EstateMatch-AI
npm install
npm run dev   # → http://localhost:3000, local mode works immediately
```

**Optional: enable live AI locally**

```bash
cp .env.example .env   # set GEMINI_API_KEY in .env (server-side only)
npx vercel dev         # serves the /api functions alongside the app
```

Plain `npm run dev` does not run the `/api` functions, so the app stays in local mode. On Vercel, set `GEMINI_API_KEY` (and optionally the Upstash variables) in the project settings. Never set it as a `VITE_*` variable.

## Tests and CI

```bash
npm run typecheck
npm test        # vitest: extraction, scoring, grounding, Q&A, HTML cleaning
npm run build
```

GitHub Actions runs install, typecheck, tests, and build on pushes to `main` and on pull requests.

## Tech stack

- React 19 + Vite 6 + TypeScript
- Deterministic local analyzer and scoring engine (`services/analyzerCore.ts`)
- Vercel serverless functions (`api/`) with same-origin checks, input caps, and rate limiting
- Google Gemini 2.5 Flash via `@google/genai`, server-side only, strict JSON schema (`api/_lib/gemini.ts`)
- Tailwind CSS via Play CDN in `index.html` (demo UI)

---

*Built for stressed home buyers who don't trust the word "cozy."*
