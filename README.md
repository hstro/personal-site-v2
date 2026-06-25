# Henry's Clubhouse

A personal website built as an ode to the computer games and internet use of my childhood.

## The Idea

I find a lot of cool people online. Almost always, it's through their personal websites — not their LinkedIn, not their Twitter bio, but a page they actually built and control.

This site is my version of that. It serves two purposes: a place to show my work, and a way to open [side doors](https://substack.com/@velvetnoise/p-197796461) — unexpected entry points that let the right people find me in the right context.

It's also an escape from walled gardens. My reading lives here instead of on Goodreads. My film log links out to Letterboxd rather than being trapped there. The things that matter most to me stay on a page I own.

## The Design

The container is a Backyard Sports clubhouse — a piece of early 2000s internet and childhood gaming that I've always loved. Each object in the room is a hotspot that opens a different section: the trophy case for projects, the crate for my resume, the window for who I am.

The deeper inspiration is the Pokémon game overworld — a fixed-perspective room where everything is interactive and the map expands as you explore. The goal is a site that feels like a place, not a page.

The design is intentionally malleable. Right now the room reflects where I am. Eventually I'll add a TV with a Roku homescreen on it — something that updates as my work does.

## Stack

- Vanilla HTML, CSS, JavaScript
- Vercel serverless functions (Node.js) for live data
- No frameworks, no build step

## Structure

```
/
├── index.html                   # The clubhouse room
├── books.html                   # Library page
├── books.js                     # Library page logic
├── styles.css
├── api/
│   └── goodreads.js             # Vercel function: proxies Goodreads RSS
├── Reve-Backyard-Sports.png     # Background scene
├── Backyard-Sports.png          # Alternate/source asset
└── favicon.png
```

## Running Locally

```bash
# Clone the repo
git clone https://github.com/hstro/personal-site-v2.git
cd personal-site-v2
npm install

# Run with Vercel CLI (needed for the /api routes)
npx vercel dev

# Or open index.html directly — the clubhouse works without a server,
# but books.html requires the Vercel dev server for live Goodreads data
open index.html
```

## Deploying

Connected to Vercel. Every push to `main` deploys automatically.

## Inspirations

- [Alana Goyal](https://www.alanagoyal.com/notes/about-me)
- [udara.io](https://udara.io)
- [radbackwards.com](https://radbackwards.com)
- [Brie Wolfson](https://www.briewolfson.com)
- [Steph Ango](https://stephango.com)
