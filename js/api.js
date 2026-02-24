/**
 * MIRA E-Commerce Frontend API Client
 * FIX #10: sincronizzazione carrello eseguita una sola volta con _cartSyncDone flag
 */

const API_BASE_URL = 'http://localhost/mira_ecommerce/api';

// ==================== API CLIENT CLASS ====================
class MiraAPI {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
        this.token   = localStorage.getItem('miraToken');
    }

    async request(endpoint, options = {}) {
        const url     = `${this.baseURL}/${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });
            const data     = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Errore nella richiesta');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // ==================== PRODUCTS ====================

    async getProducts(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`products.php?${params}`);
    }

    async getProduct(id) {
        return this.request(`products.php?id=${id}`);
    }

    async getProductBySlug(slug) {
        return this.request(`products.php?slug=${slug}`);
    }

    async searchProducts(query, filters = {}) {
        return this.getProducts({ ...filters, search: query });
    }

    // ==================== REVIEWS ====================

    async getReviews(productId) {
        return this.request(`reviews.php?product_id=${productId}`);
    }

    async submitReview(productId, data) {
        return this.request('reviews.php', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, ...data })
        });
    }

    // ==================== CART ====================

    async getCart() {
        return this.request('cart.php');
    }

    async addToCart(productId, quantity = 1) {
        return this.request('cart.php', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity })
        });
    }

    async updateCartItem(itemId, quantity) {
        return this.request(`cart.php?id=${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        });
    }

    async removeFromCart(itemId) {
        return this.request(`cart.php?id=${itemId}`, { method: 'DELETE' });
    }

    async clearCart() {
        return this.request('cart.php?clear=1', { method: 'DELETE' });
    }

    // ==================== ORDERS ====================

    async createOrder(orderData) {
        return this.request('orders.php', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    async getOrders() { return this.request('orders.php'); }
    async getOrder(orderId) { return this.request(`orders.php?id=${orderId}`); }

    // ==================== AUTH ====================

    async login(email, password) {
        const response = await this.request('auth.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'login', email, password })
        });

        if (response.success && response.data.token) {
            this.token = response.data.token;
            localStorage.setItem('miraToken', this.token);
            localStorage.setItem('miraUser', JSON.stringify(response.data.user));
        }

        return response;
    }

    async register(userData) {
        const response = await this.request('auth.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'register', ...userData })
        });

        if (response.success && response.data.token) {
            this.token = response.data.token;
            localStorage.setItem('miraToken', this.token);
            localStorage.setItem('miraUser', JSON.stringify(response.data.user));
        }

        return response;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('miraToken');
        localStorage.removeItem('miraUser');
    }

    isAuthenticated() { return !!this.token; }

    getCurrentUser() {
        const user = localStorage.getItem('miraUser');
        return user ? JSON.parse(user) : null;
    }

    // ==================== CONTACT ====================

    async sendContactMessage(data) {
        return this.request('contact.php', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// ==================== EXPORT ====================
const api = new MiraAPI();

if (typeof window !== 'undefined') {
    window.MiraAPI = api;
}

// ==================== HELPER FUNCTIONS ====================

function createProductCard(product) {
    const card      = document.createElement('div');
    card.className  = 'product-card';
    const finalPrice = product.is_discount ? product.discount_price : product.price;
    const hasDiscount = product.is_discount && product.discount_price < product.price;

    card.innerHTML = `
        ${hasDiscount ? '<span class="discount-badge">OFFERTA</span>' : ''}
        <div class="product-image">
            <img src="${product.image_url}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-desc">${(product.description || '').substring(0, 80)}...</p>
            <div class="product-rating">
                <div class="stars">
                    ${[1,2,3,4,5].map(s =>
                        `<span class="star ${s <= Math.round(product.avg_rating) ? 'filled' : ''}">★</span>`
                    ).join('')}
                </div>
                <span class="rating-count">(${product.review_count})</span>
            </div>
            <div class="product-price">
                ${hasDiscount
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

// ==================== AUTO-INITIALIZE ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeHeader();

    // FIX #10: usa un flag globale per garantire che la sync avvenga
    // una sola volta per sessione, anche se più script la invocano
    const token = localStorage.getItem('miraToken');
    if (token && !window._cartSyncDone) {
        window._cartSyncDone = true;
        setTimeout(syncCartWithServer, 500);
    }

    // Intercetta operazioni carrello dopo che cart.js è pronto
    setTimeout(interceptCartOperations, 1000);
});

function initializeHeader() {
    const accountBtn = document.getElementById('accountBtn');
    if (!accountBtn) return;

    // Evita duplicazione con script.js (usa stesso flag)
    if (accountBtn._miraInitialized) return;
    accountBtn._miraInitialized = true;

    const user = api.getCurrentUser();

    if (user) {
        accountBtn.style.borderColor = '#9b59b6';
        const svg = accountBtn.querySelector('svg');
        if (svg) svg.style.fill = '#9b59b6';
        accountBtn.title = 'Il mio Account';
    } else {
        accountBtn.title = 'Accedi / Registrati';
    }

    accountBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = 'auth.html';
    });
}

// ==================== CART SYNCHRONIZATION ====================
// FIX #10: questa funzione viene chiamata una sola volta grazie al flag window._cartSyncDone
async function syncCartWithServer() {
    const token = localStorage.getItem('miraToken');
    if (!token) return;

    try {
        const localCart = JSON.parse(localStorage.getItem('miraCart') || '[]');

        if (localCart.length > 0) {
            console.log('🔄 Sincronizzazione carrello locale → server...');
            for (const item of localCart) {
                try {
                    await api.addToCart(item.id, item.qty);
                } catch (error) {
                    console.error('❌ Errore sync item:', item.id, error);
                }
            }
            // Svuota il localStorage dopo la sync per evitare ri-sincronizzazioni
            localStorage.removeItem('miraCart');
            console.log('✅ Carrello sincronizzato con il server');
        } else {
            const serverCart = await api.getCart();
            if (serverCart.success && serverCart.data.items && serverCart.data.items.length > 0) {
                console.log('📥 Caricamento carrello dal server...');
                const converted = serverCart.data.items.map(item => ({
                    id:    item.product_id,
                    name:  item.product_name,
                    price: item.unit_price,
                    img:   item.image_url,
                    qty:   item.quantity,
                    desc:  ''
                }));
                localStorage.setItem('miraCart', JSON.stringify(converted));
            }
        }

        // Aggiorna display carrello
        if (typeof window.loadCart === 'function') {
            window.loadCart();
        } else if (window.cartObj && window.cartObj.updateCart) {
            window.cartObj.updateCart();
        }

    } catch (error) {
        console.error('❌ Errore sincronizzazione carrello:', error);
    }
}

// ==================== INTERCEPT CART OPERATIONS ====================
function interceptCartOperations() {
    if (!window.cartObj) return;

    const originalSaveCart = window.cartObj.saveCart;

    window.cartObj.saveCart = function() {
        if (originalSaveCart) originalSaveCart.call(this);

        const token = localStorage.getItem('miraToken');
        if (token && !window._cartSyncDone) {
            window._cartSyncDone = true;
            syncCartWithServer().catch(err => {
                console.error('Errore sincronizzazione automatica:', err);
            });
        }
    };
}

// ==================== CART HELPER FUNCTIONS ====================

window.updateCartQuantity = async (itemId, quantity) => {
    try {
        if (window.cartObj && window.cartObj.cart) {
            const item = window.cartObj.cart.find(i => i.id === itemId);
            if (item) { item.qty = quantity; window.cartObj.saveCart(); window.cartObj.updateCart(); }
        }
        const token = localStorage.getItem('miraToken');
        if (token) await api.updateCartItem(itemId, quantity);
    } catch (error) {
        console.error('Error updating cart:', error);
    }
};

// ==================== MODULE EXPORT ====================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MiraAPI, api, createProductCard, syncCartWithServer };
}