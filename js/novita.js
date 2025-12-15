/**
 * MIRA E-Commerce - Homepage Novità
 * Stile NZXT con slider orizzontale
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
    
    console.log('✅ Container trovato');
    
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="spinner"></div>
            <p style="margin-top: 20px; color: #666;">Caricamento...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/products.php?limit=100`);
        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.products) {
            throw new Error('Errore caricamento');
        }
        
        const allProducts = data.data.products;
        
        const novitaProducts = allProducts.filter(product => {
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
    // Resetta la pagina dello scroll
    currentPage = 0;
    
    // Pulisci tutto e rimuovi classi esistenti che potrebbero interferire
    container.innerHTML = '';
    container.className = ''; // Rimuovi tutte le classi esistenti
    container.style.display = 'block'; // Override eventuali grid
    
    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'novita-slider-wrapper';
    
    // Aggiungi classe se ci sono più di 4 prodotti
    if (products.length > 4) {
        sliderWrapper.classList.add('has-arrow');
    }
    
    const sliderTrack = document.createElement('div');
    sliderTrack.className = 'novita-slider-track';
    sliderTrack.id = 'novitaSliderTrack';
    
    products.forEach(product => {
        const card = createProductCard(product);
        sliderTrack.appendChild(card);
    });
    
    sliderWrapper.appendChild(sliderTrack);
    
    // Mostra le frecce solo se ci sono più di 4 prodotti
    if (products.length > 4) {
        // Freccia INDIETRO (sinistra)
        const arrowPrev = document.createElement('button');
        arrowPrev.className = 'slider-arrow slider-arrow-prev';
        arrowPrev.setAttribute('aria-label', 'Prodotti precedenti');
        arrowPrev.innerHTML = `
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6"/>
            </svg>
        `;
        arrowPrev.onclick = () => {
            console.log('👈 Click freccia indietro');
            window.scrollSliderPrev();
        };
        sliderWrapper.appendChild(arrowPrev);
        
        // Freccia AVANTI (destra)
        const arrowNext = document.createElement('button');
        arrowNext.className = 'slider-arrow slider-arrow-next';
        arrowNext.setAttribute('aria-label', 'Prodotti successivi');
        arrowNext.innerHTML = `
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6"/>
            </svg>
        `;
        arrowNext.onclick = () => {
            console.log('👉 Click freccia avanti');
            window.scrollSliderNext();
        };
        sliderWrapper.appendChild(arrowNext);
        
        console.log('✅ Frecce aggiunte (← →)');
    } else {
        console.log(`ℹ️ Solo ${products.length} prodotti, frecce non necessarie`);
    }
    
    container.appendChild(sliderWrapper);
    
    // Aggiorna stato iniziale dello slider (calcola totalPages e aggiorna frecce)
    if (products.length > 4) {
        setTimeout(() => updateSlider(), 100);
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
let totalPages = 0;

function updateSlider() {
    const track = document.getElementById('novitaSliderTrack');
    if (!track) return;
    
    const cards = track.querySelectorAll('.product-card-nzxt');
    const totalCards = cards.length;
    
    console.log(`🔢 Totale prodotti: ${totalCards}`);
    
    // Calcola quante pagine ci sono (sempre arrotonda per eccesso)
    totalPages = Math.ceil(totalCards / 4);
    
    console.log(`📚 Totale pagine: ${totalPages}, Pagina corrente: ${currentPage + 1}`);
    
    // Larghezza di 4 card + 3 gap
    const pageWidth = (300 * 4) + (20 * 3); // 1260px
    
    // Scroll semplice: ogni pagina scrolla di pageWidth
    const scrollAmount = currentPage * pageWidth;
    
    console.log(`📄 Scroll: ${scrollAmount}px`);
    
    track.style.transform = `translateX(-${scrollAmount}px)`;
    
    // Aggiorna stato delle frecce
    updateArrowStates();
}

function updateArrowStates() {
    const arrowPrev = document.querySelector('.slider-arrow-prev');
    const arrowNext = document.querySelector('.slider-arrow-next');
    
    if (!arrowPrev || !arrowNext) {
        console.warn('⚠️ Frecce non trovate nel DOM');
        return;
    }
    
    console.log(`🎮 Stato: currentPage=${currentPage}, totalPages=${totalPages}`);
    
    // Disabilita freccia indietro se siamo alla prima pagina
    if (currentPage === 0) {
        arrowPrev.disabled = true;
        arrowPrev.style.opacity = '0.3';
        arrowPrev.style.cursor = 'not-allowed';
        console.log('⬅️ Freccia INDIETRO disabilitata');
    } else {
        arrowPrev.disabled = false;
        arrowPrev.style.opacity = '1';
        arrowPrev.style.cursor = 'pointer';
        console.log('⬅️ Freccia INDIETRO attiva');
    }
    
    // Disabilita freccia avanti se siamo all'ultima pagina
    if (currentPage >= totalPages - 1) {
        arrowNext.disabled = true;
        arrowNext.style.opacity = '0.3';
        arrowNext.style.cursor = 'not-allowed';
        console.log('➡️ Freccia AVANTI disabilitata');
    } else {
        arrowNext.disabled = false;
        arrowNext.style.opacity = '1';
        arrowNext.style.cursor = 'pointer';
        console.log('➡️ Freccia AVANTI attiva');
    }
}

window.scrollSliderNext = function() {
    console.log('🖱️ Freccia AVANTI cliccata!');
    
    const track = document.getElementById('novitaSliderTrack');
    if (!track) {
        console.error('❌ Track non trovato!');
        return;
    }
    
    const cards = track.querySelectorAll('.product-card-nzxt');
    const totalCards = cards.length;
    
    if (totalCards <= 4) {
        console.log('⚠️ Solo 4 o meno prodotti, nessuno scroll');
        return;
    }
    
    // Non fare nulla se siamo già all'ultima pagina
    if (currentPage >= totalPages - 1) {
        console.log('⚠️ Già all\'ultima pagina');
        return;
    }
    
    // Incrementa la pagina
    currentPage++;
    
    updateSlider();
}

window.scrollSliderPrev = function() {
    console.log('🖱️ Freccia INDIETRO cliccata!');
    
    const track = document.getElementById('novitaSliderTrack');
    if (!track) {
        console.error('❌ Track non trovato!');
        return;
    }
    
    const cards = track.querySelectorAll('.product-card-nzxt');
    const totalCards = cards.length;
    
    if (totalCards <= 4) {
        console.log('⚠️ Solo 4 o meno prodotti, nessuno scroll');
        return;
    }
    
    // Non fare nulla se siamo già alla prima pagina
    if (currentPage <= 0) {
        console.log('⚠️ Già alla prima pagina');
        return;
    }
    
    // Decrementa la pagina
    currentPage--;
    
    updateSlider();
}

// ============================================================================
// CSS STILE NZXT
// ============================================================================
function injectNovitaStyles() {
    if (document.getElementById('novita-nzxt-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'novita-nzxt-styles';
    style.textContent = `
        .novita-slider-wrapper {
            position: relative;
            width: 1260px;
            max-width: 100%;
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
        
        /* Se ci sono più di 4, abilita scroll */
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
        
        .product-card-nzxt:hover {
            transform: translateY(-4px);
        }
        
        .product-link {
            text-decoration: none;
            color: inherit;
            display: block;
        }
        
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
        
        .product-card-nzxt:hover .product-image-nzxt img {
            transform: scale(1.05);
        }
        
        .product-info-nzxt {
            padding: 20px 15px;
            background: white;
        }
        
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
        
        .slider-arrow-prev {
            left: 20px;
        }
        
        .slider-arrow-next {
            right: 20px;
        }
        
        .slider-arrow:hover:not(:disabled) {
            background: #333;
            transform: scale(1.05);
        }
        
        .slider-arrow:disabled {
            opacity: 0.3;
            cursor: not-allowed;
            background: #666;
        }
        
        .slider-arrow svg {
            width: 20px;
            height: 20px;
            stroke: white;
        }
        
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
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
            .product-card-nzxt {
                flex: 0 0 250px;
            }
            .product-image-nzxt {
                height: 250px;
            }
        }
        
        @media (max-width: 768px) {
            .product-card-nzxt {
                flex: 0 0 200px;
            }
            .product-image-nzxt {
                height: 200px;
            }
            .slider-arrow {
                width: 40px;
                height: 40px;
                right: 10px;
            }
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