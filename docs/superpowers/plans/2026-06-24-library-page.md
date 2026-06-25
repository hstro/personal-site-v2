# Library Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static CSV-based books page with a live-updating page that fetches reading data from Goodreads via a Vercel serverless function.

**Architecture:** A single Vercel serverless function (`api/goodreads.js`) fetches the `read` and `currently-reading` RSS shelves from Goodreads in parallel, filters `read` to the last 12 months, normalizes each shelf to a common book object shape, and returns JSON. The existing `books.js` is updated to call `/api/goodreads` instead of loading a local CSV, with field names updated to match the new shape. Dead CSV-parsing code is removed.

**Tech Stack:** Node.js 18+ (Vercel serverless), `fast-xml-parser` v4, vanilla JS (no framework)

## Global Constraints

- Goodreads user ID: `85369062`
- `read` shelf filtered to last 12 months (rolling window from request time)
- No `to-read` shelf in v1
- Partial data (one shelf fails) is returned rather than erroring the whole request
- No framework, no bundler — plain HTML/CSS/JS on the frontend
- Node.js CommonJS (`require`) in the API function

---

### Task 1: Initialize package and install dependency

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: `fast-xml-parser` available to `require` in `api/goodreads.js`

- [ ] **Step 1: Create `package.json`**

Create `/Users/henrystromberg/Documents/dev/personal-site/package.json` with this exact content:

```json
{
  "name": "personal-site",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "fast-xml-parser": "^4.4.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

Create `/Users/henrystromberg/Documents/dev/personal-site/.gitignore` with this exact content:

```
node_modules/
.vercel/
```

- [ ] **Step 3: Install dependencies**

Run from `/Users/henrystromberg/Documents/dev/personal-site`:

```bash
npm install
```

Expected: `node_modules/` created, `package-lock.json` created.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "feat: add package.json with fast-xml-parser"
```

---

### Task 2: Create `api/goodreads.js`

**Files:**
- Create: `api/goodreads.js`
- Create: `tests/goodreads.test.js`

**Interfaces:**
- Consumes: `fast-xml-parser` from Task 1
- Produces:
  - `GET /api/goodreads` → `200 { title, author, rating, dateRead, coverUrl, pages, shelf }[]` or `502 { error: string }`
  - `module.exports.parseRSS(xml: string, shelf: string): BookObject[]` — exported for tests

- [ ] **Step 1: Create `tests/goodreads.test.js`**

Create `/Users/henrystromberg/Documents/dev/personal-site/tests/goodreads.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseRSS } = require('../api/goodreads.js');

const recentDate = new Date();
recentDate.setMonth(recentDate.getMonth() - 2);
const recentDateStr = recentDate.toUTCString();

const oldDate = new Date();
oldDate.setFullYear(oldDate.getFullYear() - 2);
const oldDateStr = oldDate.toUTCString();

const SAMPLE_READ_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title><![CDATA[Educated by Tara Westover]]></title>
    <author_name><![CDATA[Tara Westover]]></author_name>
    <user_rating>5</user_rating>
    <user_read_at><![CDATA[${recentDateStr}]]></user_read_at>
    <book_large_image_url><![CDATA[https://example.com/cover.jpg]]></book_large_image_url>
    <num_pages>334</num_pages>
  </item>
  <item>
    <title><![CDATA[Old Book by Old Author]]></title>
    <author_name><![CDATA[Old Author]]></author_name>
    <user_rating>3</user_rating>
    <user_read_at><![CDATA[${oldDateStr}]]></user_read_at>
    <book_large_image_url><![CDATA[https://example.com/old.jpg]]></book_large_image_url>
    <num_pages>200</num_pages>
  </item>
</channel></rss>`;

const SAMPLE_CURRENT_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title><![CDATA[Dune by Frank Herbert]]></title>
    <author_name><![CDATA[Frank Herbert]]></author_name>
    <user_rating>0</user_rating>
    <user_read_at></user_read_at>
    <book_large_image_url><![CDATA[https://example.com/dune.jpg]]></book_large_image_url>
    <num_pages>412</num_pages>
  </item>
</channel></rss>`;

test('parseRSS strips author from title for read shelf', () => {
  const books = parseRSS(SAMPLE_READ_RSS, 'read');
  assert.equal(books[0].title, 'Educated');
  assert.equal(books[0].author, 'Tara Westover');
});

test('parseRSS filters read books older than 12 months', () => {
  const books = parseRSS(SAMPLE_READ_RSS, 'read');
  assert.equal(books.length, 1);
  assert.equal(books[0].title, 'Educated');
});

test('parseRSS does not date-filter currently-reading', () => {
  const books = parseRSS(SAMPLE_CURRENT_RSS, 'currently-reading');
  assert.equal(books.length, 1);
  assert.equal(books[0].shelf, 'currently-reading');
});

test('parseRSS normalizes numeric fields', () => {
  const books = parseRSS(SAMPLE_READ_RSS, 'read');
  assert.equal(books[0].rating, 5);
  assert.equal(books[0].pages, 334);
});

test('parseRSS returns empty array for empty channel', () => {
  const emptyRSS = `<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`;
  assert.deepEqual(parseRSS(emptyRSS, 'read'), []);
});
```

- [ ] **Step 2: Run tests — expect FAIL (module not found)**

```bash
node --test tests/goodreads.test.js
```

Expected output: error like `Cannot find module '../api/goodreads.js'`

- [ ] **Step 3: Create `api/goodreads.js`**

Create `/Users/henrystromberg/Documents/dev/personal-site/api/goodreads.js`:

```javascript
const { XMLParser } = require('fast-xml-parser');

const USER_ID = '85369062';
const SHELVES = ['read', 'currently-reading'];
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseRSS(xml, shelf) {
  const parser = new XMLParser({ cdataPropName: '__cdata' });
  const parsed = parser.parse(xml);
  const items = parsed?.rss?.channel?.item ?? [];
  const itemArray = Array.isArray(items) ? items : [items];
  const cutoff = Date.now() - TWELVE_MONTHS_MS;

  return itemArray.map(item => {
    const get = val => (val?.__cdata ?? String(val ?? '')).trim();
    const author = get(item.author_name);
    const rawTitle = get(item.title);
    const title = author
      ? rawTitle.replace(new RegExp(` by ${escapeRegex(author)}$`), '')
      : rawTitle;
    return {
      title,
      author,
      rating: parseInt(item.user_rating) || 0,
      dateRead: get(item.user_read_at) || null,
      coverUrl: get(item.book_large_image_url),
      pages: parseInt(item.num_pages) || 0,
      shelf,
    };
  }).filter(book => {
    if (shelf !== 'read') return true;
    if (!book.dateRead) return false;
    return new Date(book.dateRead).getTime() >= cutoff;
  });
}

async function fetchShelf(shelf) {
  const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=${shelf}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for shelf "${shelf}"`);
  const xml = await res.text();
  return parseRSS(xml, shelf);
}

async function handler(req, res) {
  const results = await Promise.allSettled(SHELVES.map(fetchShelf));

  const books = results.flatMap((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    console.error(`Shelf "${SHELVES[i]}" failed:`, result.reason.message);
    return [];
  });

  if (books.length === 0) {
    return res.status(502).json({ error: 'Failed to load books' });
  }

  res.status(200).json(books);
}

module.exports = handler;
module.exports.parseRSS = parseRSS;
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
node --test tests/goodreads.test.js
```

Expected: 5 passing tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add api/goodreads.js tests/goodreads.test.js
git commit -m "feat: add Goodreads RSS serverless function"
```

---

### Task 3: Update `books.js`

**Files:**
- Modify: `books.js`

**Interfaces:**
- Consumes: `GET /api/goodreads` from Task 2 — returns `{ title, author, rating, dateRead, coverUrl, pages, shelf }[]`

- [ ] **Step 1: Replace entire `books.js`**

Overwrite `/Users/henrystromberg/Documents/dev/personal-site/books.js` with:

```javascript
function calculateStats(books) {
  const stats = {
    totalBooks: 0,
    booksRead: 0,
    currentlyReading: 0,
    totalPages: 0,
    avgRating: 0,
    booksByYear: {},
    topRatedBooks: [],
    recentlyRead: [],
  };

  let ratingSum = 0;
  let ratedCount = 0;

  books.forEach(book => {
    stats.totalBooks++;

    if (book.shelf === 'read') {
      stats.booksRead++;

      if (book.dateRead) {
        const year = new Date(book.dateRead).getFullYear().toString();
        stats.booksByYear[year] = (stats.booksByYear[year] || 0) + 1;
        stats.recentlyRead.push({
          title: book.title,
          author: book.author,
          rating: book.rating,
          dateRead: book.dateRead,
          coverUrl: book.coverUrl,
        });
      }
    } else if (book.shelf === 'currently-reading') {
      stats.currentlyReading++;
    }

    if (book.pages > 0) stats.totalPages += book.pages;

    if (book.rating > 0) {
      ratingSum += book.rating;
      ratedCount++;
    }

    if (book.rating === 5 && book.shelf === 'read') {
      stats.topRatedBooks.push({ title: book.title, author: book.author });
    }
  });

  stats.avgRating = ratedCount > 0 ? (ratingSum / ratedCount).toFixed(2) : 0;
  stats.recentlyRead.sort((a, b) => new Date(b.dateRead) - new Date(a.dateRead));
  stats.recentlyRead = stats.recentlyRead.slice(0, 10);

  return stats;
}

function displayStats(stats) {
  document.getElementById('total-books').textContent = stats.totalBooks;
  document.getElementById('books-read').textContent = stats.booksRead;
  document.getElementById('currently-reading').textContent = stats.currentlyReading;
  document.getElementById('total-pages').textContent = stats.totalPages.toLocaleString();
  document.getElementById('avg-rating').textContent = stats.avgRating;
  displayBooksByYear(stats.booksByYear);
  displayRecentBooks(stats.recentlyRead);
  displayTopRated(stats.topRatedBooks);
}

function displayBooksByYear(booksByYear) {
  const container = document.getElementById('books-by-year');
  const years = Object.keys(booksByYear).sort((a, b) => b - a);
  const maxCount = Math.max(...Object.values(booksByYear));

  let html = '<div class="year-chart">';
  years.forEach(year => {
    const count = booksByYear[year];
    const barWidth = (count / maxCount) * 100;
    html += `
      <div class="year-row">
        <span class="year-label">${year}</span>
        <div class="year-bar" style="width: ${barWidth}%">
          <span class="year-count">${count}</span>
        </div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function displayRecentBooks(recentBooks) {
  const container = document.getElementById('recent-books');
  let html = '<div class="book-grid">';
  recentBooks.forEach(book => {
    const stars = '⭐'.repeat(book.rating || 0);
    const date = book.dateRead ? new Date(book.dateRead).toLocaleDateString() : '';
    html += `
      <div class="book-card">
        <h3>${book.title}</h3>
        <p class="author">by ${book.author}</p>
        <p class="rating">${stars}</p>
        <p class="date">Read: ${date}</p>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function displayTopRated(topBooks) {
  const container = document.getElementById('top-rated');
  let html = '<ul class="top-rated-list">';
  topBooks.slice(0, 10).forEach(book => {
    html += `<li><strong>${book.title}</strong> by ${book.author}</li>`;
  });
  html += '</ul>';
  container.innerHTML = html;
}

async function loadGoodreadsData() {
  try {
    const response = await fetch('/api/goodreads');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const books = await response.json();
    const stats = calculateStats(books);
    displayStats(stats);
  } catch (error) {
    console.error('Error loading Goodreads data:', error);
    ['books-by-year', 'recent-books', 'top-rated'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = "<p class='loading'>Couldn't load books right now — try again later.</p>";
    });
  }
}

window.addEventListener('DOMContentLoaded', loadGoodreadsData);
```

- [ ] **Step 2: Commit**

```bash
git add books.js
git commit -m "feat: update books.js to fetch from /api/goodreads"
```

---

### Task 4: Update `books.html`

**Files:**
- Modify: `books.html`

**Interfaces:**
- Consumes: DOM IDs from Task 3 — `total-books`, `books-read`, `currently-reading`, `total-pages`, `avg-rating`

- [ ] **Step 1: Remove the "Want to Read" stat card**

In `books.html`, remove these lines (the entire stat-card div for to-read):

```html
                <div class="stat-card">
                    <div class="stat-number" id="to-read">-</div>
                    <div class="stat-label">Want to Read</div>
                </div>
```

- [ ] **Step 2: Update the page subtitle**

Change:
```html
            <p>Powered by my Goodreads history</p>
```

To:
```html
            <p>Last 12 months + currently reading, via Goodreads</p>
```

- [ ] **Step 3: Commit**

```bash
git add books.html
git commit -m "feat: remove to-read stat card from books page"
```

---

### Task 5: Smoke test on Vercel preview

- [ ] **Step 1: Push to GitHub and open a Vercel preview**

```bash
git push origin main
```

Then open the Vercel preview URL for the deployment. Navigate to `/books.html`.

- [ ] **Step 2: Verify the page loads data**

Confirm:
- Stats cards show real numbers (not `-`)
- "Recently Read" shows books from the last 12 months
- "Top Rated" shows 5-star books
- "Books Read by Year" chart renders
- "Currently Reading" stat shows a non-zero number (if you're actively reading something)

- [ ] **Step 3: Verify error handling**

Open browser DevTools → Network tab. If you want to test the error path, temporarily add a typo to the shelf name in `api/goodreads.js` locally, deploy a preview, and confirm the "Couldn't load books right now" message appears instead of a blank/broken page. Revert after confirming.
