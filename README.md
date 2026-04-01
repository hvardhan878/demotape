# Demotape (DemoForge)

Generate cinematic animated product demo videos with AI. Describe your product → Claude writes the component + Playwright script → Daytona sandbox renders a WebM → you download it.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth | Clerk |
| Payments | Stripe (GBP, subscription) |
| Sandbox | Daytona SDK |
| Storage | Supabase Storage (WebM, signed URLs) |
| Database | Supabase (Postgres) |
| Deployment | Vercel |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                   # Landing page
│   ├── onboarding/page.tsx        # Claude API key entry
│   ├── dashboard/page.tsx         # Project list
│   ├── projects/
│   │   ├── new/page.tsx           # Create project form
│   │   └── [id]/page.tsx         # Project detail + video player
│   ├── settings/
│   │   ├── page.tsx              # Settings shell (server)
│   │   └── SettingsClient.tsx    # Settings UI (client)
│   └── api/
│       ├── projects/route.ts     # POST /api/projects
│       ├── jobs/
│       │   ├── route.ts          # POST /api/jobs (triggers render)
│       │   └── [jobId]/route.ts  # GET /api/jobs/:id (polling)
│       ├── stripe/
│       │   ├── checkout/route.ts # Stripe Checkout
│       │   └── portal/route.ts   # Stripe Portal
│       ├── user/
│       │   ├── onboard/route.ts  # Save encrypted API key
│       │   └── delete/route.ts   # Delete account
│       └── webhooks/
│           ├── clerk/route.ts    # Clerk user sync
│           └── stripe/route.ts   # Stripe subscription events
├── components/
│   ├── AppNav.tsx                # Top navigation bar
│   └── JobPoller.tsx             # Job status + video player component
└── lib/
    ├── supabase.ts               # Supabase admin client + types
    ├── encryption.ts             # AES-256 API key encryption
    ├── stripe.ts                 # Stripe client
    └── claude.ts                 # Claude API call + prompt builder

demo-renderer/                    # Minimal Next.js app for the Docker image
├── pages/
│   ├── _app.tsx
│   ├── index.tsx
│   ├── demo-record.tsx           # The page Playwright navigates to
│   └── component.tsx             # Placeholder — replaced at render time by Claude's output
└── package.json                  # Pre-installed Next.js + Framer Motion

supabase/schema.sql               # Full DB schema + RLS
Dockerfile                        # Docker image for Daytona sandbox
test-pipeline.ts                  # Standalone pipeline test script
```

## Quick Start

### 1. Clone and install

```bash
git clone <repo>
cd demo-video
npm install
cp .env.example .env.local
```

### 2. Set up services

#### Clerk
1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Copy publishable key and secret key to `.env.local`
3. Add a webhook endpoint pointing to `https://your-domain.com/api/webhooks/clerk`
   - Add `CLERK_WEBHOOK_SECRET` to `.env.local`
   - Enable the `user.created` and `user.deleted` events

#### Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Create a `videos` storage bucket (private, no public access)
4. Copy URL and service role key to `.env.local`

#### Stripe
1. Create a product with a recurring price of £20/mo in [Stripe Dashboard](https://dashboard.stripe.com)
2. Copy secret key, publishable key, and price ID to `.env.local`
3. Add a webhook endpoint for `checkout.session.completed` and `customer.subscription.deleted`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

#### Daytona
1. Get an API key from [app.daytona.io](https://app.daytona.io)
2. Add it to `DAYTONA_API_KEY`
3. **CI image (recommended):** Push to `main` — GitHub Actions builds and pushes to **GitHub Container Registry**:
   - **Packages:** GitHub profile → **Packages**, or `https://github.com/<username>?tab=packages`
   - **Image:** `ghcr.io/<your-github-username>/demotape-renderer:latest`
   - Set `DAYTONA_RENDERER_IMAGE` in `.env.local` / Vercel to that full URL.
4. **Private packages:** If the package is private, configure registry access in Daytona so sandboxes can pull it (or make the package public for pull-only).

### 3. Build the Docker image

**On your machine (linux/amd64 — same as CI / Daytona):**

```bash
npm run docker:build
# optional: npm run docker:run   # serves renderer on http://localhost:3100
```

**Or manually push** (after `docker login ghcr.io`):

```bash
docker build --platform linux/amd64 -t ghcr.io/YOUR_USER/demotape-renderer:latest .
docker push ghcr.io/YOUR_USER/demotape-renderer:latest
```

### 4. Run locally

```bash
npm run dev
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_SECRET` | 32-char random string for AES-256 API key encryption |
| `DEMO_TOKEN` | Secret token that the renderer checks before showing the demo page |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS, server-side only |

## Testing the Render Pipeline

```bash
# Use sample component (no Claude call)
USE_SAMPLE=1 DAYTONA_API_KEY=xxx npx tsx test-pipeline.ts

# Use real Claude generation
DAYTONA_API_KEY=xxx CLAUDE_API_KEY=sk-ant-xxx npx tsx test-pipeline.ts
```

Output is saved to `./test-output/demo.webm`.

## Render Pipeline Flow

```
POST /api/jobs
  ↓
Create job (status: queued)
  ↓
Call Claude API with user's key
  → Returns { component: "...", script: "..." }
  ↓  (status: generating)
Create Daytona sandbox (demo-renderer Docker image)
  ↓  (status: rendering)
Upload component.tsx + record.py + demo-record.tsx to sandbox
npm install → npm run build → npm start (port 3100)
python3 record.py  ← Playwright records /demo-record?token=XXX
  ↓  (status: uploading)
Download demo.webm from sandbox
Upload to Supabase Storage
Delete sandbox
  ↓  (status: complete)
Return signed URL on GET /api/jobs/:id
```

## Deployment (Vercel)

```bash
vercel --prod
```

Add all environment variables in the Vercel dashboard. The render pipeline runs as a long Next.js API handler — consider enabling [Vercel Functions Max Duration](https://vercel.com/docs/functions/runtimes#max-duration) (up to 5 minutes on Pro plan) for the `/api/jobs` route.

## Free vs Pro

| Feature | Free | Pro (£20/mo) |
|---------|------|--------------|
| Projects | 1 | Unlimited |
| Watermark | Yes (UI overlay) | No |
| Download | WebM | WebM |
| Reprompt | ✓ | ✓ |
