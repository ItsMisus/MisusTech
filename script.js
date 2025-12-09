// ========================= CREA CARRELLO DINAMICAMENTE =========================
function createCart() {
    const cartSidebar = document.createElement('aside');
    cartSidebar.id = 'cartSidebar';
    cartSidebar.className = 'cart-sidebar';
    cartSidebar.innerHTML = `
        <h2 class="cart-title">Carrello</h2>
        <div id="cartItems">
            <p>Il carrello è vuoto</p>
        </div>
        <div class="cart-total">
            <p>Totale: € <span id="cartTotal">0.00</span></p>
        </div>
        <div class="cart-buttons">
            <button id="closeCart">Chiudi</button>
            <button id="navigateHome">Continua Shopping</button>
        </div>
    `;
    document.body.appendChild(cartSidebar);
}

// Crea il carrello subito
createCart();

// ========================= CONTACT WIDGET =========================
function createContactWidget() {
    const widget = document.createElement('div');
    widget.className = 'contact-widget';
    widget.innerHTML = `
        <button class="contact-btn" id="contactBtn">CONTATTACI</button>
        <div class="contact-modal" id="contactModal">
            <h3>Contattaci</h3>
            <div class="contact-info">
                <div class="contact-item">
                    <strong>📞 Telefono</strong>
                    <a href="tel:3775900298">377 590 0298</a>
                </div>
                <div class="contact-item">
                    <strong>📧 Email</strong>
                    <a href="mailto:francesco.minutiello08@gmail.com">francesco.minutiello08@gmail.com</a>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // Event listeners
    const contactBtn = document.getElementById('contactBtn');
    const contactModal = document.getElementById('contactModal');

    contactBtn.addEventListener('click', () => {
        contactModal.classList.toggle('active');
    });

    // Chiudi se clicchi fuori
    document.addEventListener('click', (e) => {
        if(!contactBtn.contains(e.target) && !contactModal.contains(e.target)) {
            contactModal.classList.remove('active');
        }
    });
}

// Crea il widget di contatto
createContactWidget();

// ========================= CART MANAGEMENT =========================
let cartObj = {};

function initCart() {
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    const navigateHome = document.getElementById('navigateHome');
    
    let cart = [];
    
    function updateCart(){
        const cartItems = document.getElementById('cartItems');
        const cartTotalEl = document.getElementById('cartTotal');
        if(!cartItems || !cartTotalEl) return;

        cartItems.innerHTML = "";
        if(cart.length === 0){
            cartItems.innerHTML = "<p style='text-align:center; color:#aaa;'>Il carrello è vuoto</p>";
        } else {
            cart.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'cart-item';
                div.innerHTML = `
                    <img src="${item.img}" alt="${item.name}">
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>€ ${item.price.toFixed(2)}</p>
                        <div class="cart-item-quantity">
                            <button class="decrease">−</button>
                            <span>${item.qty}</span>
                            <button class="increase">+</button>
                            <button class="remove">✕</button>
                        </div>
                    </div>
                `;
                cartItems.appendChild(div);

                div.querySelector('.increase').addEventListener('click', (e) => {
                    e.stopPropagation();
                    item.qty += 1;
                    updateCart();
                });
                
                div.querySelector('.decrease').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(item.qty > 1) {
                        item.qty -= 1;
                        updateCart();
                    }
                });
                
                div.querySelector('.remove').addEventListener('click', (e) => {
                    e.stopPropagation();
                    cart.splice(index, 1);
                    updateCart();
                });
            });
        }

        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        cartTotalEl.textContent = total.toFixed(2);
    }

    updateCart();

    if(cartBtn) {
        cartBtn.addEventListener('click', () => {
            cartSidebar.classList.toggle('active');
        });
    }
    
    if(closeCart) {
        closeCart.addEventListener('click', () => {
            cartSidebar.classList.remove('active');
        });
    }

    if(navigateHome) {
        navigateHome.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    return { cart, updateCart, cartSidebar };
}

// Inizializza subito
cartObj = initCart();

// ========================= PRODUCTS LOADING =========================
document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('productsContainer');
    if(!productsContainer) return;

    fetch('products.json')
        .then(res => res.json())
        .then(products => {
            products.forEach(prod => {
                const div = document.createElement('div');
                div.className = 'product';
                
                // Aggiungi classe discount se presente
                if(prod.discount) {
                    div.classList.add('discount');
                }
                
                div.dataset.name = prod.name;
                div.dataset.price = prod.discount ? prod.discountPrice : prod.price;
                div.dataset.desc = prod.desc;
                div.dataset.img = prod.img;
                div.dataset.category = prod.category || 'all';

                let priceHTML = '';
                if(prod.discount) {
                    priceHTML = `
                        <p>
                            <span class="original-price">€ ${prod.price.toFixed(2)}</span>
                            <span style="color:#9b59b6; font-weight:700; margin:10px 0;">€ ${prod.discountPrice.toFixed(2)}</span>
                        </p>
                    `;
                } else {
                    priceHTML = `<p style="color:#9b59b6; font-weight:700; margin:10px 0;">€ ${prod.price.toFixed(2)}</p>`;
                }

                div.innerHTML = `
                    <img src="${prod.img}" alt="${prod.name}">
                    <h3>${prod.name}</h3>
                    <p>${prod.desc}</p>
                    ${priceHTML}
                    <button class="add-to-cart">Aggiungi al carrello</button>
                `;

                div.addEventListener('click', e => {
                    if(!e.target.classList.contains('add-to-cart')){
                        window.location.href = `product.html?name=${encodeURIComponent(prod.name)}`;
                    }
                });

                productsContainer.appendChild(div);
            });

            // Bottoni add to cart
            const addButtons = document.querySelectorAll('.add-to-cart');
            addButtons.forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const productEl = btn.closest('.product');
                    if(!productEl) return;

                    const name = productEl.dataset.name;
                    const price = parseFloat(productEl.dataset.price);
                    const img = productEl.dataset.img;
                    const desc = productEl.dataset.desc;

                    const existing = cartObj.cart.find(p => p.name === name);
                    if(existing) {
                        existing.qty += 1;
                    } else {
                        cartObj.cart.push({name, desc, price, img, qty: 1});
                    }
                    
                    cartObj.updateCart();
                    
                    const cartSidebar = document.getElementById('cartSidebar');
                    if(cartSidebar) {
                        cartSidebar.classList.add('active');
                    }
                    
                    btn.textContent = '✓ Aggiunto';
                    btn.style.background = '#27ae60';
                    setTimeout(() => {
                        btn.textContent = 'Aggiungi al carrello';
                        btn.style.background = '';
                    }, 1500);
                });
            });
        })
        .catch(err => console.error('Errore caricamento prodotti:', err));
});

// ========================= PRODUCT DETAIL PAGE =========================
document.addEventListener('DOMContentLoaded', () => {
    const productAddBtn = document.querySelector('#addToCartBtn');
    
    if(productAddBtn){
        productAddBtn.addEventListener('click', () => {
            const productEl = document.querySelector('.product-detail-main');
            if(!productEl) return;

            const name = productEl.dataset.name;
            const price = parseFloat(productEl.dataset.price);
            const img = productEl.dataset.img;
            const desc = productEl.dataset.desc;
            const qtyInput = document.querySelector('#productQty');
            const qty = qtyInput ? parseInt(qtyInput.value) : 1;

            if(qty < 1) {
                alert('Inserisci una quantità valida');
                return;
            }

            const existing = cartObj.cart.find(p => p.name === name);
            if(existing) {
                existing.qty += qty;
            } else {
                cartObj.cart.push({name, desc, price, img, qty});
            }

            cartObj.updateCart();
            
            const cartSidebar = document.getElementById('cartSidebar');
            if(cartSidebar) {
                cartSidebar.classList.add('active');
            }
            
            productAddBtn.textContent = '✓ Aggiunto al carrello';
            productAddBtn.style.background = '#27ae60';
            
            setTimeout(() => {
                productAddBtn.textContent = 'Aggiungi al carrello';
                productAddBtn.style.background = '';
            }, 1500);
        });
    }
});

// ========================= SEARCH =========================
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    if(searchForm){
        searchForm.addEventListener('submit', e => {
            e.preventDefault();
            const searchInput = searchForm.querySelector('input[name="search"]');
            const query = searchInput ? searchInput.value.trim() : '';
            if(query){
                sessionStorage.setItem('searchQuery', query.toLowerCase());
                window.location.href = 'risultati.html';
            } else {
                window.location.href = 'notfound.html';
            }
        });
    }
});

// ========================= LANGUAGE =========================
document.addEventListener('DOMContentLoaded', () => {
    const languageDropdown = document.getElementById('languageDropdown');
    if(languageDropdown){
        languageDropdown.addEventListener('change', e => {
            console.log('Lingua:', e.target.value);
        });
    }
});

// ========================= FILTERS (PC GAMING PAGE) =========================
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Rimuovi active da tutti
            filterButtons.forEach(b => b.classList.remove('active'));
            // Aggiungi active al bottone cliccato
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            const products = document.querySelectorAll('.product');
            
            products.forEach(prod => {
                if(category === 'all' || prod.dataset.category === category) {
                    prod.style.display = 'block';
                } else {
                    prod.style.display = 'none';
                }
            });
        });
    });
});