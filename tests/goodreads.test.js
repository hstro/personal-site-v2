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
