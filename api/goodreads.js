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

  const anySucceeded = results.some(r => r.status === 'fulfilled');
  if (!anySucceeded) {
    return res.status(502).json({ error: 'Failed to load books' });
  }

  res.status(200).json(books);
}

module.exports = handler;
module.exports.parseRSS = parseRSS;
