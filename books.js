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
