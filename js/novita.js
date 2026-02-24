/**
 * MIRA E-Commerce - Homepage Novità
 * FIX #12: larghezza card letta dal DOM dinamicamente, non hardcodata a 300px
 */

const API_BASE = 'http://localhost/mira_ecommerce/api';

// ============================================================================
// CARICAMENTO PRODOTTI NOVITÀ
// ============================================================================
async function loadNovitaProducts() {
    const container = document.getElementById('novitaContainer');

    if (!container) {
        console.error('❌ Container #novitaContainer NON trovato!');
        return;
    }

    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="spinner"></div>
            <p style="margin-top: 20px; color: #666;">Caricamento...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/products.php?limit=100`);
        const data     = await response.json();

        if (!data.success || !data.data || !data.data.products) {
            throw new Error('Errore caricamento');
        }

        const novitaProducts = data.data.products.filter(product => {
            const categoryName = (product.category_name || '').toLowerCase().trim();
            const categorySlug = (product.category_slug || '').toLowerCase().trim();
            return categoryName === 'novità' || categoryName === 'novita' ||
                   categorySlug === 'novita' || categorySlug === 'novità';
        });

        console.log(`✅ ${novitaProducts.length} prodotti Novità trovati`);

        if (novitaProducts.length === 0) {
            container.innerHTML = `<p style="text-align:center;color:#666;">Nessuna novità</p>`;
            return;
        }

        renderNovitaSlider(novitaProducts, container);

    } catch (error) {
        console.error('❌ Errore:', error);
        container.innerHTML = `<p style="text-align:center;color:#e74c3c;">Errore caricamento</p>`;
    }
}

// ============================================================================
// RENDERING SLIDER
// ============================================================================
function renderNovitaSlider(products, container) {
    currentPage = 0;

    container.innerHTML = '';
    container.className = '';
    container.style.display = 'block';

    const sliderWrapper   = document.createElement('div');
    sliderWrapper.className = 'novita-slider-wrapper';

    const hasArrows = products.length > 4;
    if (hasArrows) sliderWrapper.classList.add('has-arrow');

    const sliderTrack   = document.createElement('div');
    sliderTrack.className = 'novita-slider-track';
    sliderTrack.id = 'novitaSliderTrack';

    products.forEach(product => {
        sliderTrack.appendChild(createProductCard(product));
    });

    sliderWrapper.appendChild(sliderTrack);

    if (hasArrows) {
        const arrowPrev = document.createElement('button');
        arrowPrev.className = 'slider-arrow slider-arrow-prev';
        arrowPrev.setAttribute('aria-label', 'Prodotti precedenti');
        arrowPrev.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>`;
        arrowPrev.onclick = () => window.scrollSliderPrev();
        sliderWrapper.appendChild(arrowPrev);

        const arrowNext = document.createElement('button');
        arrowNext.className = 'slider-arrow slider-arrow-next';
        arrowNext.setAttribute('aria-label', 'Prodotti successivi');
        arrowNext.innerHTML = `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>`;
        arrowNext.onclick = () => window.scrollSliderNext();
        sliderWrapper.appendChild(arrowNext);
    }

    container.appendChild(sliderWrapper);

    if (hasArrows) {
        setTimeout(() => updateSlider(), 150);
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card-nzxt';

    card.innerHTML = `
        <a href="product.html?id=${product.id}" class="product-link">
            <div class="product-image-nzxt">
                <img src="${product.image_url}"
                     alt="${product.name}"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22 viewBox=%220 0 400 400%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22400%22/%3E%3C/svg%3E'">
            </div>
            <div class="product-info-nzxt">
                <h3 class="product-name-nzxt">${product.name}</h3>
                <p class="product-desc-nzxt">${product.description ? product.description.substring(0, 60) + '...' : ''}</p>
            </div>
        </a>
    `;

    return card;
}

// ============================================================================
// SCROLL SLIDER
// ============================================================================
let currentPage = 0;
let totalPages  = 0;

/**
 * FIX #12: getCardWidth() legge la larghezza reale della card dal DOM
 * invece di usare la costante hardcodata 300px che non funzionava sui breakpoint tablet.
 */
function getCardWidth() {
    const track = document.getElementById('novitaSliderTrack');
    if (!track) return 300;

    const firstCard = track.querySelector('.product-card-nzxt');
    if (!firstCard) return 300;

    const rect = firstCard.getBoundingClientRect();

    // Leggi anche il gap dal computed style del track
    const trackStyle = window.getComputedStyle(track);
    const gap = parseFloat(trackStyle.gap || trackStyle.columnGap || '20') || 20;

    return rect.width + gap;
}

function updateSlider() {
    const track = document.getElementById('novitaSliderTrack');
    if (!track) return;

    const cards      = track.querySelectorAll('.product-card-nzxt');
    const totalCards = cards.length;

    totalPages = Math.ceil(totalCards / 4);

    // FIX #12: usa la larghezza reale della card (responsive-aware)
    const cardWidth   = getCardWidth();
    const pageWidth   = cardWidth * 4;
    const scrollAmount = currentPage * pageWidth;

    console.log(`📄 Scroll: ${scrollAmount}px (cardWidth: ${cardWidth.toFixed(1)}px)`);

    track.style.transform = `translateX(-${scrollAmount}px)`;
    updateArrowStates();
}

function updateArrowStates() {
    const arrowPrev = document.querySelector('.slider-arrow-prev');
    const arrowNext = document.querySelector('.slider-arrow-next');
    if (!arrowPrev || !arrowNext) return;

    arrowPrev.disabled = currentPage === 0;
    arrowPrev.style.opacity = currentPage === 0 ? '0.3' : '1';
    arrowPrev.style.cursor  = currentPage === 0 ? 'not-allowed' : 'pointer';

    arrowNext.disabled = currentPage >= totalPages - 1;
    arrowNext.style.opacity = currentPage >= totalPages - 1 ? '0.3' : '1';
    arrowNext.style.cursor  = currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer';
}

window.scrollSliderNext = function() {
    const track = document.getElementById('novitaSliderTrack');
    if (!track) return;
    if (track.querySelectorAll('.product-card-nzxt').length <= 4) return;
    if (currentPage >= totalPages - 1) return;
    currentPage++;
    updateSlider();
};

window.scrollSliderPrev = function() {
    const track = document.getElementById('novitaSliderTrack');
    if (!track) return;
    if (track.querySelectorAll('.product-card-nzxt').length <= 4) return;
    if (currentPage <= 0) return;
    currentPage--;
    updateSlider();
};

// Ricalcola al resize della finestra (FIX #12: mantiene lo slider corretto dopo resize)
window.addEventListener('resize', () => {
    if (document.getElementById('novitaSliderTrack')) {
        updateSlider();
    }
});

// ============================================================================
// CSS STILE NZXT
// ============================================================================
function injectNovitaStyles() {
    if (document.getElementById('novita-nzxt-styles')) return;

    const style = document.createElement('style');
    style.id    = 'novita-nzxt-styles';
    style.textContent = `
        .novita-slider-wrapper {
            position: relative;
            width: 100%;
            max-width: 1260px;
            padding: 20px 0;
            display: block !important;
            margin: 0 auto;
        }

        .novita-slider-track {
            display: flex !important;
            gap: 20px;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            flex-wrap: nowrap !important;
        }

        .novita-slider-wrapper.has-arrow {
            overflow: hidden;
        }

        .product-card-nzxt {
            flex: 0 0 300px;
            background: #fff;
            border-radius: 0;
            overflow: visible;
            transition: transform 0.3s ease;
            position: relative;
        }

        .product-card-nzxt:hover { transform: translateY(-4px); }

        .product-link { text-decoration: none; color: inherit; display: block; }

        .product-image-nzxt {
            position: relative;
            width: 100%;
            height: 300px;
            background: #f5f5f5;
            overflow: hidden;
        }

        .product-image-nzxt img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .product-card-nzxt:hover .product-image-nzxt img { transform: scale(1.05); }

        .product-info-nzxt { padding: 20px 15px; background: white; }

        .product-name-nzxt {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #000;
            line-height: 1.3;
        }

        .product-desc-nzxt {
            font-size: 13px;
            color: #666;
            margin: 0 0 12px 0;
            line-height: 1.4;
        }

        .slider-arrow {
            position: absolute;
            top: 140px;
            width: 48px;
            height: 48px;
            background: #000;
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            z-index: 10;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            color: white;
        }

        .slider-arrow-prev { left: 20px; }
        .slider-arrow-next { right: 20px; }

        .slider-arrow:hover:not(:disabled) { background: #333; transform: scale(1.05); }
        .slider-arrow:disabled { opacity: 0.3; cursor: not-allowed; background: #666; }
        .slider-arrow svg { width: 20px; height: 20px; stroke: white; }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #000;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto;
        }

        @keyframes spin {
            0%   { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* FIX #12: breakpoint tablet → card 250px */
        @media (max-width: 1024px) {
            .product-card-nzxt { flex: 0 0 250px; }
            .product-image-nzxt { height: 250px; }
        }

        /* FIX #12: breakpoint mobile → card 200px */
        @media (max-width: 768px) {
            .product-card-nzxt { flex: 0 0 200px; }
            .product-image-nzxt { height: 200px; }
            .slider-arrow { width: 40px; height: 40px; right: 10px; }
        }
    `;

    document.head.appendChild(style);
}

// ============================================================================
// INIT
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Novità NZXT caricato');
    injectNovitaStyles();
    loadNovitaProducts();
});