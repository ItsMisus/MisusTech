/**
 * MIRA E-Commerce - Carrello JavaScript
 * Gestione carrello con apertura automatica e stile NZXT
 */

// ============================================================================
// STATO CARRELLO
// ============================================================================
let cart = [];

// ============================================================================
// INIZIALIZZAZIONE
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛒 Carrello inizializzato');
    
    // Carica carrello dal localStorage
    loadCart();
    
    // Setup event listeners
    setupCartListeners();
    
    // Renderizza carrello
    renderCart();
});

// ============================================================================
// APERTURA/CHIUSURA CARRELLO
// ============================================================================
function openCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    
    if (sidebar) {
        sidebar.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    if (overlay) {
        overlay.classList.add('active');
    }
    
    console.log('🛒 Carrello aperto');
}

function closeCart() {
    const sidebar = document.getElementById('cartSidebar');
    const overlay = document.getElementById('cartOverlay');
    
    if (sidebar) {
        sidebar.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (overlay) {
        overlay.classList.remove('active');
    }
    
    console.log('🛒 Carrello chiuso');
}

function setupCartListeners() {
    // Bottone carrello header
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', openCart);
    }
    
    // Bottone chiudi
    const closeBtn = document.getElementById('cartClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCart);
    }
    
    // Overlay
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeCart);
    }
}

// ============================================================================
// GESTIONE CARRELLO
// ============================================================================
function addToCart(product, quantity = 1) {
    console.log('➕ Aggiunta al carrello:', product.name);
    
    // Verifica se prodotto già nel carrello
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex > -1) {
        // Incrementa quantità
        cart[existingIndex].quantity += quantity;
    } else {
        // Aggiungi nuovo prodotto
        cart.push({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            image_url: product.image_url,
            quantity: quantity
        });
    }
    
    // Salva e renderizza
    saveCart();
    renderCart();
    
    // APRI AUTOMATICAMENTE IL CARRELLO
    openCart();
    
    console.log('✅ Carrello aggiornato:', cart);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
    console.log('🗑️ Prodotto rimosso');
}

function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            saveCart();
            renderCart();
        }
    }
}

function clearCart() {
    cart = [];
    saveCart();
    renderCart();
    console.log('🗑️ Carrello svuotato');
}

// ============================================================================
// STORAGE
// ============================================================================
function saveCart() {
    localStorage.setItem('mira_cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('mira_cart');
    if (saved) {
        cart = JSON.parse(saved);
        console.log('📦 Carrello caricato:', cart.length, 'prodotti');
    }
}

// ============================================================================
// RENDERING
// ============================================================================
function renderCart() {
    const container = document.getElementById('cartContent');
    if (!container) return;
    
    // Aggiorna badge
    updateCartBadge();
    
    if (cart.length === 0) {
        container.innerHTML = '<p class="cart-empty">Il tuo carrello è vuoto</p>';
        updateCartFooter(0);
        return;
    }
    
    container.innerHTML = '';
    
    cart.forEach(item => {
        const itemEl = createCartItem(item);
        container.appendChild(itemEl);
    });
    
    // Calcola totale
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updateCartFooter(total);
}

function createCartItem(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';
    
    div.innerHTML = `
        <div class="cart-item-image">
            <img src="${item.image_url}" 
                 alt="${item.name}"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
        </div>
        <div class="cart-item-details">
            <h4 class="cart-item-name">${item.name}</h4>
            <p class="cart-item-desc">${item.description ? item.description.substring(0, 50) + '...' : ''}</p>
            <div class="cart-item-price">€${parseFloat(item.price).toFixed(2)}</div>
            <div class="cart-item-quantity">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">−</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Rimuovi</button>
            </div>
        </div>
    `;
    
    return div;
}

function updateCartFooter(total) {
    const footerValue = document.querySelector('.cart-subtotal-value');
    if (footerValue) {
        footerValue.textContent = `€${total.toFixed(2)}`;
    }
}

function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Aggiorna badge se esiste
    let badge = document.querySelector('.cart-badge');
    
    if (totalItems > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            const cartBtn = document.getElementById('cartBtn');
            if (cartBtn) {
                cartBtn.style.position = 'relative';
                cartBtn.appendChild(badge);
            }
        }
        badge.textContent = totalItems;
        badge.style.display = 'flex';
    } else if (badge) {
        badge.style.display = 'none';
    }
}

// ============================================================================
// ESPORTA FUNZIONI GLOBALI
// ============================================================================
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.clearCart = clearCart;
window.openCart = openCart;
window.closeCart = closeCart;

console.log('✅ Carrello script caricato');