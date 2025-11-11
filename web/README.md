## Atelier Agent · Instagram Figure Study Pipeline

This project delivers an end-to-end agentic workflow for generating human figure art with Stability AI, refining creative direction, and publishing finished pieces directly to Instagram.

### Stack

- Next.js App Router + Server Actions (Node runtime)
- Tailwind CSS design system
- Stability AI `stable-image` API for illustration generation
- Cloudinary for asset hosting
- Instagram Graph API for publishing

---

## 1. Prerequisites

Create or provision the following API credentials and add them to `.env.local` (and Vercel project settings when deploying):

```bash
STABILITY_API_KEY=sk-...

CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=1234567890
CLOUDINARY_API_SECRET=shhh

INSTAGRAM_ACCESS_TOKEN=EAAG...
INSTAGRAM_IG_USER_ID=1784...
```

> **Important:** The Instagram token must be generated through the Instagram Graph API (Business or Creator account) with `instagram_basic`, `pages_show_list`, `pages_read_engagement`, and `instagram_content_publish` scopes.

---

## 2. Local Development

```bash
cd web
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the Atelier Agent console.

---

## 3. Workflow Overview

1. Draft a prompt, select a style preset, and set aspect ratio / guidance.
2. Generate a figure study with the Stability integration.
3. Review the artwork, tweak captions, and publish directly to Instagram.
4. Previous generations stay in the session gallery for quick iteration.

---

## 4. Deployment

Build and lint before deploying:

```bash
npm run lint
npm run build
```

Deploy to Vercel (production):

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-2dbfa485
```

After deployment, verify:

```bash
curl https://agentic-2dbfa485.vercel.app
```

---

## 5. Environment Notes

- The `/api/generate` route targets Stability AI’s `stable-image` core endpoint.
- `/api/upload` first persists art to Cloudinary, then uses the Instagram Publishing API.
- Adjust presets and captions inside `src/components/ArtAgent.tsx` to align with your brand voice.

Happy creating!
