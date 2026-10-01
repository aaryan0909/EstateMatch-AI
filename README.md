# EstateMatch AI 🇨🇦

**Your cynical, intelligent, and helpful assistant for Canadian real estate.**

A weekend-MVP web app that reads a listing's description like a grumpy home inspector: it flags hidden red flags (strata fees, special assessments, oil tanks), grounds every claim in a quote from the text so the AI can't hallucinate, scores the listing 0-100 against your budget and must-haves, and drafts an inquiry email to the agent about what it found.

Paste listing text (e.g. copied from Realtor.ca, Zolo, or Craigslist) — the app analyzes it with Google Gemini 2.5 Flash.

---

## What it does

1. **Cynical Auditor analysis** — Structured JSON analysis of the listing text via Gemini, with every pro, con, and red flag paired with a `sourceQuote` pulled verbatim from the listing. If the listing doesn't state something, the model is instructed to say "Not specified in listing" rather than guess.
2. **Match score (0-100)** — Scored against your budget, min beds/baths, and custom must-haves, with Financial / Lifestyle / Condition sub-scores and an explicit scoring rubric (over budget, missing specs, and severe red flags deduct points).
3. **Buy vs. Rent modes** — Different audit focus per mode: buying checks strata fees, leasehold status, roof age, oil tanks, knob & tube wiring; renting checks utilities inclusions, lease terms, pet policies, laundry access.
4. **Chat with the listing** — Ask questions about the pasted text ("Is the heating gas or electric?"); answers are grounded in the listing.
5. **Inquiry email draft** — Generates a copy-to-clipboard email to the agent/landlord specifically asking about the red flags or missing info it found.

## What's honest about the scope

- This is a weekend MVP, not a production product. The app reads only the text you paste — it doesn't fetch listing URLs, scrape sites, or pull MLS data.
- Everything analytical is LLM-generated (Gemini 2.5 Flash, low temperature, structured output schema). Scores and verdicts can be wrong. It's a second pair of eyes, not a substitute for a realtor, home inspector, or lawyer.
- Styling uses the Tailwind Play CDN from `index.html`, which is fine for a demo but not how you'd ship production CSS.

---

## Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/aaryan0909/EstateMatch-AI.git
   cd EstateMatch-AI
   npm install
   ```

2. **Add a Gemini API key** (free at [Google AI Studio](https://aistudio.google.com/))
   ```bash
   cp .env.example .env
   # then put your key in .env as GEMINI_API_KEY=...
   ```

3. **Run it**
   ```bash
   npm run dev   # → http://localhost:3000
   ```

## Try it

1. Toggle **Buy** / **Rent**, set your budget and priorities in the panel.
2. Paste a listing's description into the box — or click **"Load the sample listing"** to use the included synthetic Toronto condo fixture (`sample-listing.md`).
3. Hit **Analyze Listing**. (Without a `GEMINI_API_KEY` in `.env`, the app shows a clear error instead of a spinner.)

## Example output (illustrative)

The analyzer returns structured JSON like this (exact wording is model-generated):

```json
{
  "summary": { "title": "2 bed, 2 bath corner suite", "price": "$789,000", "location": "Queens Quay, Toronto", "layout": "2 Bed / 2 Bath, 875 sq ft" },
  "matchScore": { "total": 62, "grade": "C", "categoryScores": { "financial": 55, "lifestyle": 70, "condition": 60 } },
  "details": {
    "redFlags": [
      { "claim": "Pending $4,200 special assessment per unit",
        "sourceQuote": "the building has approved a special assessment of $4,200 per unit for balcony membrane repairs",
        "confidence": "High" }
    ]
  },
  "contactDraft": { "subject": "Re: 88 Queens Wharf Blvd — questions on assessment and fees", "body": "..." }
}
```

## Tech stack

- React 19 + Vite 6 + TypeScript
- Tailwind CSS (via Play CDN in `index.html` for the demo UI)
- Google Gemini 2.5 Flash via `@google/genai`, with a strict JSON response schema and an anti-hallucination system prompt (`services/geminiService.ts`)

---

*Built for stressed home buyers who don't trust the word "cozy."*
