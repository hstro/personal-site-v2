# Library Page Design

**Date:** 2026-06-24  
**Status:** Approved

## Overview

Add a live-updating library page to the personal site that pulls reading data from Goodreads automatically via a Vercel serverless function proxying the Goodreads public RSS feeds.

## Architecture

Three files change:

| File | Status | Purpose |
|------|--------|---------|
| `api/goodreads.js` | New | Vercel serverless function — fetches and parses Goodreads RSS, returns JSON |
| `books.js` | Modified | Replace CSV fetch with `/api/goodreads` call; update field names |
| `package.json` | New (minimal) | Declares `fast-xml-parser` dependency for RSS parsing |

`books.html` and `styles.css` get minor cleanup (remove the "Want to Read" stat card). All other files untouched.

## Data Flow

1. User loads `books.html` → `books.js` calls `GET /api/goodreads`
2. Function fetches two Goodreads RSS feeds in parallel:
   - `https://www.goodreads.com/review/list_rss/85369062?shelf=read`
   - `https://www.goodreads.com/review/list_rss/85369062?shelf=currently-reading`
3. Each RSS response parsed to normalized book objects:
   ```
   { title, author, rating, dateRead, coverUrl, pages, shelf }
   ```
4. `read` shelf filtered to books with `dateRead` within the last 12 months
5. Merged array returned as JSON to the browser
6. `books.js` passes data through existing `calculateStats()` and display functions (field names updated to match new shape)

Goodreads RSS caps at 200 items per shelf — sufficient for a personal library.

## Goodreads Account

- **User ID:** `85369062`
- **Profile:** https://www.goodreads.com/user/show/85369062-henry
- Profile must remain public for RSS feeds to be accessible

## Error Handling

- **Goodreads is down:** Function returns 502; `books.js` replaces loading spinners with "Couldn't load books right now — try again later"
- **One shelf fails, other succeeds:** Function returns partial data rather than failing the whole request
- No retry logic in v1

## Out of Scope (v1)

- "Want to Read" shelf
- Books read older than 12 months
- Caching / Vercel Blob storage
- Custom shelves or tags
