const firebaseConfig = {
  apiKey: "AIzaSyBjFPSFYsEbuNiijOOXQEFhN1pByCyPm0U",
  authDomain: "e-book-261f9.firebaseapp.com",
  projectId: "e-book-261f9",
  storageBucket: "e-book-261f9.firebasestorage.app",
  messagingSenderId: "373941060602",
  appId: "1:373941060602:web:fbb529a90c163ddcad1a43"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Generate unique ID
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Toast notification
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="${isError ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle'}"></i> ${message}`;
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1f3b4c;padding:12px 28px;border-radius:60px;z-index:9999;border:1px solid #00d4ff;color:white;';
    if (isError) toast.style.background = '#8b2c2c';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function escapeHtml(str) {
    if (!str) return '—';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== PDF STORAGE ==========
function savePDFToLocal(id, dataUrl) {
    const pdfs = JSON.parse(localStorage.getItem('elysian_pdfs') || '{}');
    pdfs[id] = dataUrl;
    localStorage.setItem('elysian_pdfs', JSON.stringify(pdfs));
}

function getPDFFromLocal(id) {
    const pdfs = JSON.parse(localStorage.getItem('elysian_pdfs') || '{}');
    return pdfs[id];
}

// ========== BOOK FUNCTIONS ==========
async function loadBooks() {
    const snapshot = await db.collection("books").get();
    let books = [];

    snapshot.forEach((doc) => {
        books.push(doc.data());
    });

    return books;
}
function saveBooks(books) {
    console.log("Books now saved in Firebase");
}
function loadFavorites() {
    const fav = localStorage.getItem('elysian_favorites');
    return fav ? JSON.parse(fav) : [];
}

function saveFavorites(fav) {
    localStorage.setItem('elysian_favorites', JSON.stringify(fav));
}

// Add book with PDF support
async function addBook(bookData, pdfFile) {
   
    const newId = generateId();
    
    const newBook = { 
        id: newId, 
        title: bookData.title,
        author: bookData.author,
        genre: bookData.genre || 'Uncategorised',
        year: bookData.year || '',
        description: bookData.description || '',
        hasPDF: !!pdfFile
    };
    
    try {
    await db.collection("books").add(newBook);
    showToast("Book added successfully!");
} catch (error) {
    console.log(error);
    showToast("Error adding book", true);
    return;
}
    
    if (pdfFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            savePDFToLocal(newId, e.target.result);
        };
        reader.readAsDataURL(pdfFile);
    }
    
    return newBook;
}

// Delete book
async function deleteBook(id) {
    let books = await loadBooks();
    const book = books.find(b => b.id === id);
    books = books.filter(b => b.id !== id);
    saveBooks(books);
    let fav = loadFavorites();
    fav = fav.filter(f => f !== id);
    saveFavorites(fav);
    showToast(`"${book.title}" removed`, true);
    if (document.getElementById('bookList')) displayBooks();
    if (document.getElementById('recentBooksList')) displayRecentBooks();
    if (document.getElementById('favoritesList') && document.getElementById('favoritesList').style.display === 'flex') {
        displayFavorites();
    }
}

// Toggle favorite
async function toggleFavorite(id) {
    let fav = await loadFavorites();
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (fav.includes(id)) {
        fav = fav.filter(f => f !== id);
        showToast(`Removed "${book.title}" from favorites`);
    } else {
        fav.push(id);
        showToast(`❤️ Added "${book.title}" to favorites`);
    }
    saveFavorites(fav);
    if (document.getElementById('bookList')) displayBooks();
    if (document.getElementById('recentBooksList')) displayRecentBooks();
    if (document.getElementById('favoritesList') && document.getElementById('favoritesList').style.display === 'flex') {
        displayFavorites();
    }
}

// View book modal
async function viewBook(id) {
    const books = await loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;
    
    let modal = document.getElementById('viewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'viewModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2 id="modalTitle"></h2>
                <p id="modalAuthor"></p>
                <div class="modal-genre" id="modalGenre"></div>
                <div class="modal-year" id="modalYear"></div>
                <div class="modal-description" id="modalDescription"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
        window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
    }
    
    document.getElementById('modalTitle').innerText = book.title;
    document.getElementById('modalAuthor').innerHTML = `<i class="fas fa-user"></i> ${escapeHtml(book.author)}`;
    document.getElementById('modalGenre').innerHTML = `<i class="fas fa-tag"></i> ${escapeHtml(book.genre)}`;
    document.getElementById('modalYear').innerHTML = book.year ? `<i class="fas fa-calendar"></i> ${escapeHtml(book.year)}` : '';
    document.getElementById('modalDescription').innerHTML = book.description ? `<i class="fas fa-file-alt"></i> ${escapeHtml(book.description)}` : 'No description available.';
    modal.style.display = 'flex';
}

// View PDF
function viewPDF(id) {
    const pdfData = getPDFFromLocal(id);
    if (pdfData) {
        const pdfWindow = window.open();
        pdfWindow.document.write(`<iframe src="${pdfData}" width="100%" height="100%" style="border:none;"></iframe>`);
    } else {
        showToast('No PDF file attached to this book', true);
    }
}

// ========== DISPLAY BOOKS ON BOOKS PAGE ==========
let showOnlyFavorites = false;

async function displayBooks() {
    let books = await loadBooks();
    let favorites = loadFavorites();
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const genreFilter = document.getElementById('genreFilter')?.value || 'All';
    
    let filteredBooks = [...books];
    
    if (showOnlyFavorites) {
        filteredBooks = filteredBooks.filter(book => favorites.includes(book.id));
    }
    
    if (searchTerm) {
        filteredBooks = filteredBooks.filter(book => 
            book.title.toLowerCase().includes(searchTerm) || 
            book.author.toLowerCase().includes(searchTerm) ||
            (book.genre && book.genre.toLowerCase().includes(searchTerm))
        );
    }
    
    if (genreFilter !== 'All') {
        filteredBooks = filteredBooks.filter(book => book.genre === genreFilter);
    }
    
    const genreSelect = document.getElementById('genreFilter');
    if (genreSelect) {
        const genres = ['All', ...new Set(books.map(b => b.genre).filter(g => g))];
        genreSelect.innerHTML = genres.map(g => `<option value="${g}">${g}</option>`).join('');
    }
    
    const bookCountSpan = document.getElementById('bookCount');
    if (bookCountSpan) bookCountSpan.innerText = `${books.length} book${books.length !== 1 ? 's' : ''}`;
    
    const favCountSpan = document.getElementById('favCount');
    if (favCountSpan) favCountSpan.innerText = `${favorites.length} favourite${favorites.length !== 1 ? 's' : ''}`;
    
    const shownCountSpan = document.getElementById('shownCount');
    if (shownCountSpan) shownCountSpan.innerText = `${filteredBooks.length} shown`;
    
    const container = document.getElementById('bookList');
    if (!container) return;
    
    if (filteredBooks.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-book-open"></i><h3>No Books Found</h3><p>Add your first book to get started!</p></div>`;
    } else {
        container.innerHTML = filteredBooks.map(book => `
            <div class="book-card">
                <div class="fav-star ${favorites.includes(book.id) ? 'active' : ''}" onclick="toggleFavorite('${book.id}')">
                    <i class="fas fa-star"></i>
                </div>
                <div class="card-genre">${escapeHtml(book.genre).toUpperCase()}</div>
                <h3>${escapeHtml(book.title)}</h3>
                <div class="book-author"><i class="fas fa-user"></i> ${escapeHtml(book.author)}</div>
                ${book.year ? `<div class="book-year"><i class="fas fa-calendar"></i> ${escapeHtml(book.year)}</div>` : ''}
                ${book.description ? `<div class="book-description">${escapeHtml(book.description.substring(0, 80))}${book.description.length > 80 ? '...' : ''}</div>` : ''}
                <div class="card-buttons">
                    <button class="view-btn" onclick="viewBook('${book.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="pdf-btn" onclick="viewPDF('${book.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="delete-btn" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
}

// ========== HOME PAGE FUNCTIONS ==========
async function displayRecentBooks() {
    const books = await loadBooks();
    const favorites = loadFavorites();
    const recentBooks = [...books].reverse().slice(0, 4);
    const container = document.getElementById('recentBooksList');
    
    if (!container) return;
    
    if (recentBooks.length === 0) {
        container.innerHTML = '<p style="color:#b8d0ff; text-align:center;">No books yet. <a href="add.html" style="color:#00d4ff;">Add your first book!</a></p>';
    } else {
        container.innerHTML = recentBooks.map(book => `
            <div class="recent-card">
                <div class="recent-genre">${escapeHtml(book.genre).toUpperCase()}</div>
                <h4>${escapeHtml(book.title)}</h4>
                <p>${escapeHtml(book.author)}</p>
                <div class="recent-buttons">
                    <button class="read-btn-small" onclick="viewBook('${book.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="fav-btn-small ${favorites.includes(book.id) ? 'active' : ''}" onclick="toggleFavorite('${book.id}')"><i class="fas fa-star"></i></button>
                </div>
            </div>
        `).join('');
    }
}

async function displayFavorites() {
    const books = await loadBooks();
    const favorites = loadFavorites();
    const favoriteBooks = books.filter(book => favorites.includes(book.id));
    const container = document.getElementById('favoritesList');
    
    if (!container) return;
    
    if (favoriteBooks.length === 0) {
        container.innerHTML = '<div class="empty-favorites"><i class="fas fa-heart"></i><h3>No Favorite Books Yet</h3><p>Click the star on any book to add it to your favorites!</p><a href="books.html" class="btn-primary">Browse Books</a></div>';
    } else {
        container.innerHTML = favoriteBooks.map(book => `
            <div class="favorite-card">
                <div class="fav-star active" onclick="toggleFavorite('${book.id}')">
                    <i class="fas fa-star"></i>
                </div>
                <div class="card-genre">${escapeHtml(book.genre).toUpperCase()}</div>
                <h3>${escapeHtml(book.title)}</h3>
                <p><i class="fas fa-user"></i> ${escapeHtml(book.author)}</p>
                ${book.year ? `<p><i class="fas fa-calendar"></i> ${escapeHtml(book.year)}</p>` : ''}
                <div class="card-buttons">
                    <button class="view-btn" onclick="viewBook('${book.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="pdf-btn" onclick="viewPDF('${book.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="delete-btn" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
}

function toggleFavoritesView() {
    const favoritesList = document.getElementById('favoritesList');
    const viewBtn = document.getElementById('viewFavoritesBtn');
    
    if (favoritesList.style.display === 'none') {
        displayFavorites();
        favoritesList.style.display = 'flex';
        viewBtn.innerHTML = '<i class="fas fa-times"></i> Hide Favorites';
        viewBtn.style.background = 'rgba(255,193,7,0.2)';
        viewBtn.style.borderColor = '#ffc107';
    } else {
        favoritesList.style.display = 'none';
        viewBtn.innerHTML = '<i class="fas fa-heart"></i> View My Favorite Books';
        viewBtn.style.background = 'rgba(0,212,255,0.15)';
        viewBtn.style.borderColor = '#00d4ff';
    }
}

// ========== FILTER FUNCTIONS ==========
function toggleFavoritesFilter() {
    showOnlyFavorites = !showOnlyFavorites;
    const favBtn = document.getElementById('favoritesFilterBtn');
    if (favBtn) {
        if (showOnlyFavorites) {
            favBtn.classList.add('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Showing Favourites';
        } else {
            favBtn.classList.remove('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Favourites';
        }
    }
    displayBooks();
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    
    if (searchInput) searchInput.value = '';
    if (genreFilter) genreFilter.value = 'All';
    
    if (showOnlyFavorites) {
        showOnlyFavorites = false;
        const favBtn = document.getElementById('favoritesFilterBtn');
        if (favBtn) {
            favBtn.classList.remove('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Favourites';
        }
    }
    
    displayBooks();
}

function setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const resetBtn = document.getElementById('resetBtn');
    const favoritesBtn = document.getElementById('favoritesFilterBtn');
    
    if (searchBtn) searchBtn.addEventListener('click', displayBooks);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') displayBooks(); });
    if (genreFilter) genreFilter.addEventListener('change', displayBooks);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (favoritesBtn) favoritesBtn.addEventListener('click', toggleFavoritesFilter);
}

// ========== ADD BOOK FORM HANDLER ==========
const form = document.getElementById('bookForm');
if (form) {
    let selectedPdfFile = null;
    
    const dropzone = document.getElementById('pdfDropzone');
    const pdfInput = document.getElementById('pdfFile');
    const pdfFileNameDiv = document.getElementById('pdfFileName');
    const pdfFileNameSpan = pdfFileNameDiv?.querySelector('span');
    const removePdfBtn = document.getElementById('removePdfBtn');
    
    if (dropzone) {
        dropzone.addEventListener('click', () => pdfInput.click());
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#00d4ff';
            dropzone.style.background = 'rgba(0, 212, 255, 0.15)';
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = 'rgba(0, 212, 255, 0.5)';
            dropzone.style.background = 'rgba(0, 212, 255, 0.05)';
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'rgba(0, 212, 255, 0.5)';
            dropzone.style.background = 'rgba(0, 212, 255, 0.05)';
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                selectedPdfFile = file;
                showPdfFileName(file.name);
            } else {
                showToast('Please drop a valid PDF file', true);
            }
        });
    }
    
    if (pdfInput) {
        pdfInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                selectedPdfFile = e.target.files[0];
                showPdfFileName(e.target.files[0].name);
            }
        });
    }
    
    function showPdfFileName(name) {
        if (dropzone) dropzone.style.display = 'none';
        if (pdfFileNameDiv) {
            pdfFileNameSpan.innerText = name;
            pdfFileNameDiv.style.display = 'flex';
        }
    }
    
    function hidePdfFileName() {
        if (dropzone) dropzone.style.display = 'block';
        if (pdfFileNameDiv) pdfFileNameDiv.style.display = 'none';
        selectedPdfFile = null;
        if (pdfInput) pdfInput.value = '';
    }
    
    if (removePdfBtn) {
        removePdfBtn.addEventListener('click', hidePdfFileName);
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('title').value = '';
            document.getElementById('author').value = '';
            document.getElementById('genre').value = '';
            document.getElementById('year').value = '';
            document.getElementById('description').value = '';
            hidePdfFileName();
            showToast('Form cleared');
        });
    }
    
    form.addEventListener('submit',async function(e) {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const genre = document.getElementById('genre').value;
        const year = document.getElementById('year').value.trim();
        const description = document.getElementById('description').value.trim();
        
        if (!title || !author) {
            showToast('Please enter title and author', true);
            return;
        }
        
         await addBook({ title, author, genre, year, description }, selectedPdfFile);
        showToast(`📚 "${title}" added!`);
        form.reset();
        hidePdfFileName();
        
        setTimeout(() => {
            window.location.href = 'books.html';
        }, 2000);
    });
}

// ========== INITIALIZE ==========
if (document.getElementById('recentBooksList')) {
    displayRecentBooks();
}

if (document.getElementById('bookList')) {
    setupEventListeners();
    displayBooks();
}

const viewFavBtn = document.getElementById('viewFavoritesBtn');
if (viewFavBtn) {
    viewFavBtn.addEventListener('click', toggleFavoritesView);
}const firebaseConfig = {
  apiKey: "AIzaSyBjFPSFYsEbuNiijOOXQEFhN1pByCyPm0U",
  authDomain: "e-book-261f9.firebaseapp.com",
  projectId: "e-book-261f9",
  storageBucket: "e-book-261f9.firebasestorage.app",
  messagingSenderId: "373941060602",
  appId: "1:373941060602:web:fbb529a90c163ddcad1a43"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Generate unique ID
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Toast notification
function showToast(message, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="${isError ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle'}"></i> ${message}`;
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1f3b4c;padding:12px 28px;border-radius:60px;z-index:9999;border:1px solid #00d4ff;color:white;';
    if (isError) toast.style.background = '#8b2c2c';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function escapeHtml(str) {
    if (!str) return '—';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== PDF STORAGE ==========
function savePDFToLocal(id, dataUrl) {
    const pdfs = JSON.parse(localStorage.getItem('elysian_pdfs') || '{}');
    pdfs[id] = dataUrl;
    localStorage.setItem('elysian_pdfs', JSON.stringify(pdfs));
}

function getPDFFromLocal(id) {
    const pdfs = JSON.parse(localStorage.getItem('elysian_pdfs') || '{}');
    return pdfs[id];
}

// ========== BOOK FUNCTIONS ==========
async function loadBooks() {
    const snapshot = await db.collection("books").get();
    let books = [];

    snapshot.forEach((doc) => {
        books.push(doc.data());
    });

    return books;
}
function saveBooks(books) {
    console.log("Books now saved in Firebase");
}
function loadFavorites() {
    const fav = localStorage.getItem('elysian_favorites');
    return fav ? JSON.parse(fav) : [];
}

function saveFavorites(fav) {
    localStorage.setItem('elysian_favorites', JSON.stringify(fav));
}

// Add book with PDF support
function addBook(bookData, pdfFile) {
    const books = loadBooks();
    const newId = generateId();
    
    const newBook = { 
        id: newId, 
        title: bookData.title,
        author: bookData.author,
        genre: bookData.genre || 'Uncategorised',
        year: bookData.year || '',
        description: bookData.description || '',
        hasPDF: !!pdfFile
    };
    
    db.collection("books").add(newBook)
    .then(() => {
      alert("Book added successfully!");
    })
    .catch((error) => {
      console.log(error);
    });
    
    /*if (pdfFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            savePDFToLocal(newId, e.target.result);
        };
        reader.readAsDataURL(pdfFile);
    }*/
    
    return newBook;
}

// Delete book
function deleteBook(id) {
    let books = loadBooks();
    const book = books.find(b => b.id === id);
    books = books.filter(b => b.id !== id);
    saveBooks(books);
    let fav = loadFavorites();
    fav = fav.filter(f => f !== id);
    saveFavorites(fav);
    showToast(`"${book.title}" removed`, true);
    if (document.getElementById('bookList')) displayBooks();
    if (document.getElementById('recentBooksList')) displayRecentBooks();
    if (document.getElementById('favoritesList') && document.getElementById('favoritesList').style.display === 'flex') {
        displayFavorites();
    }
}

// Toggle favorite
function toggleFavorite(id) {
    let fav = loadFavorites();
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (fav.includes(id)) {
        fav = fav.filter(f => f !== id);
        showToast(`Removed "${book.title}" from favorites`);
    } else {
        fav.push(id);
        showToast(`❤️ Added "${book.title}" to favorites`);
    }
    saveFavorites(fav);
    if (document.getElementById('bookList')) displayBooks();
    if (document.getElementById('recentBooksList')) displayRecentBooks();
    if (document.getElementById('favoritesList') && document.getElementById('favoritesList').style.display === 'flex') {
        displayFavorites();
    }
}

// View book modal
function viewBook(id) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;
    
    let modal = document.getElementById('viewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'viewModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2 id="modalTitle"></h2>
                <p id="modalAuthor"></p>
                <div class="modal-genre" id="modalGenre"></div>
                <div class="modal-year" id="modalYear"></div>
                <div class="modal-description" id="modalDescription"></div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
        window.onclick = (event) => { if (event.target === modal) modal.style.display = 'none'; };
    }
    
    document.getElementById('modalTitle').innerText = book.title;
    document.getElementById('modalAuthor').innerHTML = `<i class="fas fa-user"></i> ${escapeHtml(book.author)}`;
    document.getElementById('modalGenre').innerHTML = `<i class="fas fa-tag"></i> ${escapeHtml(book.genre)}`;
    document.getElementById('modalYear').innerHTML = book.year ? `<i class="fas fa-calendar"></i> ${escapeHtml(book.year)}` : '';
    document.getElementById('modalDescription').innerHTML = book.description ? `<i class="fas fa-file-alt"></i> ${escapeHtml(book.description)}` : 'No description available.';
    modal.style.display = 'flex';
}

// View PDF
function viewPDF(id) {
    const pdfData = getPDFFromLocal(id);
    if (pdfData) {
        const pdfWindow = window.open();
        pdfWindow.document.write(`<iframe src="${pdfData}" width="100%" height="100%" style="border:none;"></iframe>`);
    } else {
        showToast('No PDF file attached to this book', true);
    }
}

// ========== DISPLAY BOOKS ON BOOKS PAGE ==========
let showOnlyFavorites = false;

async function displayBooks() {
    let books = await loadBooks();
    let favorites = loadFavorites();
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const genreFilter = document.getElementById('genreFilter')?.value || 'All';
    
    let filteredBooks = [...books];
    
    if (showOnlyFavorites) {
        filteredBooks = filteredBooks.filter(book => favorites.includes(book.id));
    }
    
    if (searchTerm) {
        filteredBooks = filteredBooks.filter(book => 
            book.title.toLowerCase().includes(searchTerm) || 
            book.author.toLowerCase().includes(searchTerm) ||
            (book.genre && book.genre.toLowerCase().includes(searchTerm))
        );
    }
    
    if (genreFilter !== 'All') {
        filteredBooks = filteredBooks.filter(book => book.genre === genreFilter);
    }
    
    const genreSelect = document.getElementById('genreFilter');
    if (genreSelect) {
        const genres = ['All', ...new Set(books.map(b => b.genre).filter(g => g))];
        genreSelect.innerHTML = genres.map(g => `<option value="${g}">${g}</option>`).join('');
    }
    
    const bookCountSpan = document.getElementById('bookCount');
    if (bookCountSpan) bookCountSpan.innerText = `${books.length} book${books.length !== 1 ? 's' : ''}`;
    
    const favCountSpan = document.getElementById('favCount');
    if (favCountSpan) favCountSpan.innerText = `${favorites.length} favourite${favorites.length !== 1 ? 's' : ''}`;
    
    const shownCountSpan = document.getElementById('shownCount');
    if (shownCountSpan) shownCountSpan.innerText = `${filteredBooks.length} shown`;
    
    const container = document.getElementById('bookList');
    if (!container) return;
    
    if (filteredBooks.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-book-open"></i><h3>No Books Found</h3><p>Add your first book to get started!</p></div>`;
    } else {
        container.innerHTML = filteredBooks.map(book => `
            <div class="book-card">
                <div class="fav-star ${favorites.includes(book.id) ? 'active' : ''}" onclick="toggleFavorite('${book.id}')">
                    <i class="fas fa-star"></i>
                </div>
                <div class="card-genre">${escapeHtml(book.genre).toUpperCase()}</div>
                <h3>${escapeHtml(book.title)}</h3>
                <div class="book-author"><i class="fas fa-user"></i> ${escapeHtml(book.author)}</div>
                ${book.year ? `<div class="book-year"><i class="fas fa-calendar"></i> ${escapeHtml(book.year)}</div>` : ''}
                ${book.description ? `<div class="book-description">${escapeHtml(book.description.substring(0, 80))}${book.description.length > 80 ? '...' : ''}</div>` : ''}
                <div class="card-buttons">
                    <button class="view-btn" onclick="viewBook('${book.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="pdf-btn" onclick="viewPDF('${book.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="delete-btn" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
}

// ========== HOME PAGE FUNCTIONS ==========
async function displayRecentBooks() {
    const books = await loadBooks();
    const favorites = loadFavorites();
    const recentBooks = [...books].reverse().slice(0, 4);
    const container = document.getElementById('recentBooksList');
    
    if (!container) return;
    
    if (recentBooks.length === 0) {
        container.innerHTML = '<p style="color:#b8d0ff; text-align:center;">No books yet. <a href="add.html" style="color:#00d4ff;">Add your first book!</a></p>';
    } else {
        container.innerHTML = recentBooks.map(book => `
            <div class="recent-card">
                <div class="recent-genre">${escapeHtml(book.genre).toUpperCase()}</div>
                <h4>${escapeHtml(book.title)}</h4>
                <p>${escapeHtml(book.author)}</p>
                <div class="recent-buttons">
                    <button class="read-btn-small" onclick="viewBook('${book.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="fav-btn-small ${favorites.includes(book.id) ? 'active' : ''}" onclick="toggleFavorite('${book.id}')"><i class="fas fa-star"></i></button>
                </div>
            </div>
        `).join('');
    }
}

async function displayFavorites() {
    const books = await loadBooks();
    const favorites = loadFavorites();
    const favoriteBooks = books.filter(book => favorites.includes(book.id));
    const container = document.getElementById('favoritesList');
    
    if (!container) return;
    
    if (favoriteBooks.length === 0) {
        container.innerHTML = '<div class="empty-favorites"><i class="fas fa-heart"></i><h3>No Favorite Books Yet</h3><p>Click the star on any book to add it to your favorites!</p><a href="books.html" class="btn-primary">Browse Books</a></div>';
    } else {
        container.innerHTML = favoriteBooks.map(book => `
            <div class="favorite-card">
                <div class="fav-star active" onclick="toggleFavorite('${book.id}')">
                    <i class="fas fa-star"></i>
                </div>
                <div class="card-genre">${escapeHtml(book.genre).toUpperCase()}</div>
                <h3>${escapeHtml(book.title)}</h3>
                <p><i class="fas fa-user"></i> ${escapeHtml(book.author)}</p>
                ${book.year ? `<p><i class="fas fa-calendar"></i> ${escapeHtml(book.year)}</p>` : ''}
                <div class="card-buttons">
                    <button class="view-btn" onclick="viewBook('${book.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="pdf-btn" onclick="viewPDF('${book.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="delete-btn" onclick="deleteBook('${book.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }
}

function toggleFavoritesView() {
    const favoritesList = document.getElementById('favoritesList');
    const viewBtn = document.getElementById('viewFavoritesBtn');
    
    if (favoritesList.style.display === 'none') {
        displayFavorites();
        favoritesList.style.display = 'flex';
        viewBtn.innerHTML = '<i class="fas fa-times"></i> Hide Favorites';
        viewBtn.style.background = 'rgba(255,193,7,0.2)';
        viewBtn.style.borderColor = '#ffc107';
    } else {
        favoritesList.style.display = 'none';
        viewBtn.innerHTML = '<i class="fas fa-heart"></i> View My Favorite Books';
        viewBtn.style.background = 'rgba(0,212,255,0.15)';
        viewBtn.style.borderColor = '#00d4ff';
    }
}

// ========== FILTER FUNCTIONS ==========
function toggleFavoritesFilter() {
    showOnlyFavorites = !showOnlyFavorites;
    const favBtn = document.getElementById('favoritesFilterBtn');
    if (favBtn) {
        if (showOnlyFavorites) {
            favBtn.classList.add('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Showing Favourites';
        } else {
            favBtn.classList.remove('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Favourites';
        }
    }
    displayBooks();
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    
    if (searchInput) searchInput.value = '';
    if (genreFilter) genreFilter.value = 'All';
    
    if (showOnlyFavorites) {
        showOnlyFavorites = false;
        const favBtn = document.getElementById('favoritesFilterBtn');
        if (favBtn) {
            favBtn.classList.remove('active');
            favBtn.innerHTML = '<i class="fas fa-heart"></i> Favourites';
        }
    }
    
    displayBooks();
}

function setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const genreFilter = document.getElementById('genreFilter');
    const resetBtn = document.getElementById('resetBtn');
    const favoritesBtn = document.getElementById('favoritesFilterBtn');
    
    if (searchBtn) searchBtn.addEventListener('click', displayBooks);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') displayBooks(); });
    if (genreFilter) genreFilter.addEventListener('change', displayBooks);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (favoritesBtn) favoritesBtn.addEventListener('click', toggleFavoritesFilter);
}

// ========== ADD BOOK FORM HANDLER ==========
const form = document.getElementById('bookForm');
if (form) {
    let selectedPdfFile = null;
    
    const dropzone = document.getElementById('pdfDropzone');
    const pdfInput = document.getElementById('pdfFile');
    const pdfFileNameDiv = document.getElementById('pdfFileName');
    const pdfFileNameSpan = pdfFileNameDiv?.querySelector('span');
    const removePdfBtn = document.getElementById('removePdfBtn');
    
    if (dropzone) {
        dropzone.addEventListener('click', () => pdfInput.click());
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#00d4ff';
            dropzone.style.background = 'rgba(0, 212, 255, 0.15)';
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = 'rgba(0, 212, 255, 0.5)';
            dropzone.style.background = 'rgba(0, 212, 255, 0.05)';
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'rgba(0, 212, 255, 0.5)';
            dropzone.style.background = 'rgba(0, 212, 255, 0.05)';
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                selectedPdfFile = file;
                showPdfFileName(file.name);
            } else {
                showToast('Please drop a valid PDF file', true);
            }
        });
    }
    
    if (pdfInput) {
        pdfInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                selectedPdfFile = e.target.files[0];
                showPdfFileName(e.target.files[0].name);
            }
        });
    }
    
    function showPdfFileName(name) {
        if (dropzone) dropzone.style.display = 'none';
        if (pdfFileNameDiv) {
            pdfFileNameSpan.innerText = name;
            pdfFileNameDiv.style.display = 'flex';
        }
    }
    
    function hidePdfFileName() {
        if (dropzone) dropzone.style.display = 'block';
        if (pdfFileNameDiv) pdfFileNameDiv.style.display = 'none';
        selectedPdfFile = null;
        if (pdfInput) pdfInput.value = '';
    }
    
    if (removePdfBtn) {
        removePdfBtn.addEventListener('click', hidePdfFileName);
    }
    
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('title').value = '';
            document.getElementById('author').value = '';
            document.getElementById('genre').value = '';
            document.getElementById('year').value = '';
            document.getElementById('description').value = '';
            hidePdfFileName();
            showToast('Form cleared');
        });
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const title = document.getElementById('title').value.trim();
        const author = document.getElementById('author').value.trim();
        const genre = document.getElementById('genre').value;
        const year = document.getElementById('year').value.trim();
        const description = document.getElementById('description').value.trim();
        
        if (!title || !author) {
            showToast('Please enter title and author', true);
            return;
        }
        
        await addBook({ title, author, genre, year, description }, selectedPdfFile);
        showToast(`📚 "${title}" added!`);
        form.reset();
        hidePdfFileName();
        
        setTimeout(() => {
            window.location.href = 'books.html';
        }, 800);
    });
}

// ========== INITIALIZE ==========
if (document.getElementById('recentBooksList')) {
    displayRecentBooks();
}

if (document.getElementById('bookList')) {
    setupEventListeners();
    displayBooks();
}

const viewFavBtn = document.getElementById('viewFavoritesBtn');
if (viewFavBtn) {
    viewFavBtn.addEventListener('click', toggleFavoritesView);
}

// Make functions global
window.toggleFavorite = toggleFavorite;
window.deleteBook = deleteBook;
window.viewBook = viewBook;
window.viewPDF = viewPDF;
window.displayBooks = displayBooks;
window.displayRecentBooks = displayRecentBooks;

// Make functions global
window.toggleFavorite = toggleFavorite;
window.deleteBook = deleteBook;
window.viewBook = viewBook;
window.viewPDF = viewPDF;
window.displayBooks = displayBooks;
window.displayRecentBooks = displayRecentBooks;