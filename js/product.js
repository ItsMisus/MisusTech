/**
 * MIRA E-Commerce - Product Pages con Integrazione Carrello
 * FIX #13: filtri catalogo usano sia tags che category_slug per matching robusto
 */

const PRODUCTS_API = 'http://localhost/mira_ecommerce/api/products.php';
let currentProduct = null;

// ============================================================================
// INIT PAGINA PRODOTTO
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;

    if (path.includes('product.html')) {
        initProductDetailPage();
    } else if (path.includes('pcgaming.html')) {
        initPCGamingPage();
    }
});

// ============================================================================
// PAGINA DETTAGLIO PRODOTTO
// ============================================================================
async function initProductDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'notfound.html';
        return;
    }

    try {
        const response = await fetch(`${PRODUCTS_API}?id=${productId}`);
        const data     = await response.json();

        if (!data.success || !data.data) {
            window.location.href = 'notfound.html';
            return;
        }

        currentProduct = data.data;
        renderProductDetail(currentProduct);

    } catch (error) {
        console.error('Errore caricamento prodotto:', error);
        window.location.href = 'notfound.html';
    }
}

// ============================================================================
// RENDER DETTAGLIO PRODOTTO
// ============================================================================
function renderProductDetail(product) {
    const container = document.querySelector('.product-detail');
    if (!container) return;

    const finalPrice = product.is_discount ? product.discount_price : product.price;

    container.innerHTML = `
        <div class="product-detail-container">
            <div class="product-detail-images">
                <div class="main-image">
                    <img src="${product.image_url}" alt="${product.name}">
                </div>
            </div>

            <div class="product-detail-info">
                <h1>${product.name}</h1>

                <div class="product-rating-detail">
                    ${renderStars(product.avg_rating)}
                    <span class="rating-text">
                        ${product.avg_rating > 0 ? `${product.avg_rating.toFixed(1)} stelle` : 'Nessuna recensione'}
                        ${product.review_count > 0 ? `(${product.review_count})` : ''}
                    </span>
                </div>

                <p class="product-detail-desc">${product.description}</p>

                ${renderSpecs(product.specs)}

                <div class="product-detail-price">
                    ${product.is_discount
                        ? `<span class="original-price">€${parseFloat(product.price).toFixed(2)}</span>
                           <span class="current-price">€${parseFloat(finalPrice).toFixed(2)}</span>`
                        : `<span class="current-price">€${parseFloat(finalPrice).toFixed(2)}</span>`
                    }
                </div>

                <button class="btn-add-to-cart-detail" onclick="handleAddToCart(${product.id})">
                    Aggiungi al carrello
                </button>

                <a href="pcgaming.html" class="btn-back">← Torna ai prodotti</a>
            </div>
        </div>
    `;
}

// ============================================================================
// RENDER SPECIFICHE
// ============================================================================
function renderSpecs(specs) {
    if (!specs || Object.keys(specs).length === 0) return '';

    const specsHTML = Object.entries(specs).map(([key, value]) => `
        <div class="spec-item">
            <strong>${key.toUpperCase()}:</strong> ${value}
        </div>
    `).join('');

    return `
        <div class="product-options">
            <h3>Specifiche Tecniche</h3>
            <div class="specs-list">${specsHTML}</div>
        </div>
    `;
}

// ============================================================================
// RENDER STELLE
// ============================================================================
function renderStars(rating) {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        stars.push(`<span class="star ${i <= Math.round(rating) ? 'filled' : ''}">★</span>`);
    }
    return `<div class="stars">${stars.join('')}</div>`;
}

// ============================================================================
// HANDLER AGGIUNGI AL CARRELLO
// ============================================================================
async function handleAddToCart(productId) {
    const button = document.querySelector('.btn-add-to-cart-detail');
    if (!button) return;

    button.disabled     = true;
    button.textContent  = 'Aggiunta in corso...';

    try {
        await window.addToCart(productId, 1);
        button.textContent      = '✓ Aggiunto al carrello';
        button.style.background = '#10b981';

        setTimeout(() => {
            button.disabled         = false;
            button.textContent      = 'Aggiungi al carrello';
            button.style.background = '';
        }, 2000);

    } catch (error) {
        console.error('Errore aggiunta al carrello:', error);
        button.textContent      = '✗ Errore';
        button.style.background = '#ef4444';

        setTimeout(() => {
            button.disabled         = false;
            button.textContent      = 'Aggiungi al carrello';
            button.style.background = '';
        }, 2000);
    }
}

// ============================================================================
// PAGINA PC GAMING (CATALOGO)
// FIX #13: setupFilters() controlla sia tags che category_slug e category_name
// ============================================================================
async function initPCGamingPage() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    let allProducts      = [];
    let filteredProducts = [];
    let currentPage      = 1;
    const PRODUCTS_PER_PAGE = 9;

    try {
        const response = await fetch(`${PRODUCTS_API}?limit=100`);
        const data     = await response.json();

        if (data.success && data.data && data.data.products) {
            allProducts      = data.data.products;
            filteredProducts = [...allProducts];
            renderProductsGrid(1);
            updatePagination();
            setupFilters();
            setupSort();
        }
    } catch (error) {
        console.error('Errore caricamento prodotti:', error);
    }

    // ========== RENDER GRID ==========
    function renderProductsGrid(page) {
        const start      = (page - 1) * PRODUCTS_PER_PAGE;
        const pageProducts = filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);

        productsGrid.innerHTML = '';

        if (pageProducts.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#999;padding:40px;">Nessun prodotto trovato</p>';
            return;
        }

        pageProducts.forEach(product => productsGrid.appendChild(createProductCard(product)));

        const countEl = document.getElementById('productsCount');
        if (countEl) countEl.textContent = `${filteredProducts.length} prodotti`;
    }

    // ========== CREATE CARD ==========
    function createProductCard(product) {
        const card       = document.createElement('div');
        card.className   = 'product-card';
        card.style.cursor = 'pointer';

        const finalPrice = product.is_discount ? product.discount_price : product.price;

        card.innerHTML = `
            ${product.is_discount ? '<span class="discount-badge">OFFERTA</span>' : ''}
            <div class="product-image">
                <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-desc">${(product.description || '').substring(0, 80)}...</p>
                <div class="product-rating">
                    ${renderStars(product.avg_rating)}
                    <span class="rating-count">(${product.review_count})</span>
                </div>
                <div class="product-price">
                    ${product.is_discount
                        ? `<span class="original-price">€${parseFloat(product.price).toFixed(2)}</span>
                           <span class="current-price">€${parseFloat(finalPrice).toFixed(2)}</span>`
                        : `<span class="current-price">€${parseFloat(finalPrice).toFixed(2)}</span>`
                    }
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            window.location.href = `product.html?id=${product.id}`;
        });

        return card;
    }

    // ========== PAGINATION ==========
    function updatePagination() {
        const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
        const container  = document.querySelector('.pagination-modern');

        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        container.innerHTML = '';

        const prev = document.createElement('button');
        prev.className = 'pagination-arrow';
        prev.innerHTML = '←';
        prev.disabled  = currentPage === 1;
        prev.onclick   = () => { if (currentPage > 1) { currentPage--; renderProductsGrid(currentPage); updatePagination(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
        container.appendChild(prev);

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `page-number ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => { currentPage = i; renderProductsGrid(currentPage); updatePagination(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
            container.appendChild(btn);
        }

        const next = document.createElement('button');
        next.className = 'pagination-arrow';
        next.innerHTML = '→';
        next.disabled  = currentPage === totalPages;
        next.onclick   = () => { if (currentPage < totalPages) { currentPage++; renderProductsGrid(currentPage); updatePagination(); window.scrollTo({ top: 0, behavior: 'smooth' }); } };
        container.appendChild(next);
    }

    // ========== FILTRI ==========
    /**
     * FIX #13: productMatchesCategory() controlla:
     *  1) p.tags.includes(category)          — slug nei tag
     *  2) p.category_slug === category       — slug della categoria
     *  3) p.category_name (lowercase) === category — nome categoria normalizzato
     *
     * Questo copre tutti i casi di mismatch tra data-category dell'HTML e slugs del DB.
     */
    function productMatchesCategory(product, category) {
        if (category === 'all') return true;

        const catLower = category.toLowerCase();

        // Controlla tags
        if (Array.isArray(product.tags) && product.tags.some(t => t.toLowerCase() === catLower)) {
            return true;
        }

        // Controlla category_slug
        if ((product.category_slug || '').toLowerCase() === catLower) {
            return true;
        }

        // Controlla category_name normalizzato (rimuove spazi, accenti semplici)
        const normalizedName = (product.category_name || '')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[àá]/g, 'a')
            .replace(/[èé]/g, 'e')
            .replace(/[ìí]/g, 'i')
            .replace(/[òó]/g, 'o')
            .replace(/[ùú]/g, 'u');

        if (normalizedName === catLower) return true;

        return false;
    }

    function setupFilters() {
        document.querySelectorAll('.filter-category').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const category = btn.dataset.category;

                // FIX #13: usa productMatchesCategory() invece di p.tags.includes()
                filteredProducts = category === 'all'
                    ? [...allProducts]
                    : allProducts.filter(p => productMatchesCategory(p, category));

                currentPage = 1;
                renderProductsGrid(1);
                updatePagination();
            });
        });
    }

    // ========== ORDINAMENTO ==========
    function setupSort() {
        const sortSelect = document.getElementById('sortSelect');
        if (!sortSelect) return;

        sortSelect.addEventListener('change', (e) => {
            switch (e.target.value) {
                case 'price-asc':
                    filteredProducts.sort((a, b) => {
                        const pA = a.is_discount ? a.discount_price : a.price;
                        const pB = b.is_discount ? b.discount_price : b.price;
                        return pA - pB;
                    });
                    break;
                case 'price-desc':
                    filteredProducts.sort((a, b) => {
                        const pA = a.is_discount ? a.discount_price : a.price;
                        const pB = b.is_discount ? b.discount_price : b.price;
                        return pB - pA;
                    });
                    break;
                case 'name':
                    filteredProducts.sort((a, b) => a.name.localeCompare(b.name, 'it'));
                    break;
            }

            renderProductsGrid(currentPage);
        });
    }
}

// ============================================================================
// ESPORTA FUNZIONI GLOBALI
// ============================================================================
window.handleAddToCart = handleAddToCart;

console.log('✅ Product.js caricato con integrazione carrello');