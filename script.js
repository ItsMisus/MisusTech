// ==================== CART MANAGEMENT ====================
let cartObj = {};

function initCart() {
    let cart = [];
    
    function updateCart() {
        const cartItems = document.getElementById('cartItems');
        const cartTotalEl = document.getElementById('cartTotal');
        if (!cartItems || !cartTotalEl) return;

        cartItems.innerHTML = "";
        
        if (cart.length === 0) {
            cartItems.innerHTML = "<p style='text-align:center; color:#aaa;'>Il carrello è vuoto</p>";
        } else {
            cart.forEach((item, index) => {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex; gap:10px; margin-bottom:15px; background:#222; padding:10px; border-radius:8px; align-items:flex-start;';
                
                div.innerHTML = `
                    <img src="${item.img}" alt="${item.name}" style="width:80px; height:60px; object-fit:cover; border-radius:6px;">
                    <div style="flex:1;">
                        <h4 style="margin:0 0 5px 0; font-size:1rem; color:#fff;">${item.name}</h4>
                        <p style="font-size:0.85rem; color:#ccc; margin:3px 0;">€ ${item.price.toFixed(2)}</p>
                        <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                            <button class="decrease" style="background:#9b59b6; border:none; color:#fff; padding:4px 8px; cursor:pointer; border-radius:4px; font-weight:600;">−</button>
                            <span style="min-width:20px; text-align:center; font-weight:600; color:#9b59b6;">${item.qty}</span>
                            <button class="increase" style="background:#9b59b6; border:none; color:#fff; padding:4px 8px; cursor:pointer; border-radius:4px; font-weight:600;">+</button>
                            <button class="remove" style="background:#e74c3c; border:none; color:#fff; padding:4px 8px; cursor:pointer; border-radius:4px; font-weight:600; margin-left:auto;">✕</button>
                        </div>
                    </div>
                `;
                
                cartItems.appendChild(div);

                div.querySelector('.increase').addEventListener('click', () => {
                    item.qty += 1;
                    updateCart();
                });
                
                div.querySelector('.decrease').addEventListener('click', () => {
                    if (item.qty > 1) {
                        item.qty -= 1;
                        updateCart();
                    }
                });
                
                div.querySelector('.remove').addEventListener('click', () => {
                    cart.splice(index, 1);
                    updateCart();
                });
            });
        }

        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        cartTotalEl.textContent = total.toFixed(2);
    }

    updateCart();
    return { cart, updateCart };
}

cartObj = initCart();

// ==================== PRODUCTS LOADING ====================
document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('productsContainer');
    if (!productsContainer) return;

    const PRODUCTS_PER_PAGE = 12;
    let allProducts = [];
    let currentPage = 1;
    let filteredProducts = [];

    fetch('products.json')
        .then(res => res.json())
        .then(products => {
            allProducts = products;
            filteredProducts = products;
            displayPage(1);
            setupPagination();
        })
        .catch(err => console.error('Errore caricamento prodotti:', err));

    function displayProducts(products) {
        productsContainer.innerHTML = '';
        
        products.forEach(prod => {
            const div = document.createElement('div');
            div.className = 'product';
            
            if (prod.discount) {
                div.classList.add('discount');
            }
            
            div.dataset.name = prod.name;
            div.dataset.price = prod.discount ? prod.discountPrice : prod.price;
            div.dataset.desc = prod.desc;
            div.dataset.img = prod.img;
            div.dataset.category = prod.category || 'all';

            let priceHTML = '';
            if (prod.discount) {
                priceHTML = `
                    <p>
                        <span style="color:#888; text-decoration:line-through; font-size:0.9rem;">€ ${prod.price.toFixed(2)}</span>
                        <span style="color:#9b59b6; font-weight:700; margin-left:10px;">€ ${prod.discountPrice.toFixed(2)}</span>
                    </p>
                `;
            } else {
                priceHTML = `<p style="color:#9b59b6; font-weight:700;">€ ${prod.price.toFixed(2)}</p>`;
            }

            div.innerHTML = `
                <img src="${prod.img}" alt="${prod.name}">
                <h3>${prod.name}</h3>
                <p>${prod.desc}</p>
                ${priceHTML}
                <button class="add-to-cart">Aggiungi al carrello</button>
            `;

            div.addEventListener('click', e => {
                if (!e.target.classList.contains('add-to-cart')) {
                    window.location.href = `product.html?name=${encodeURIComponent(prod.name)}`;
                }
            });

            productsContainer.appendChild(div);
        });

        // Event listeners per add to cart
        const addButtons = document.querySelectorAll('.add-to-cart');
        addButtons.forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const productEl = btn.closest('.product');
                if (!productEl) return;

                const name = productEl.dataset.name;
                const price = parseFloat(productEl.dataset.price);
                const img = productEl.dataset.img;
                const desc = productEl.dataset.desc;

                const existing = cartObj.cart.find(p => p.name === name);
                if (existing) {
                    existing.qty += 1;
                } else {
                    cartObj.cart.push({ name, desc, price, img, qty: 1 });
                }
                
                cartObj.updateCart();
                
                const cartSidebar = document.getElementById('cartSidebar');
                if (cartSidebar) {
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
    }

    function displayPage(pageNum) {
        const start = (pageNum - 1) * PRODUCTS_PER_PAGE;
        const end = start + PRODUCTS_PER_PAGE;
        const pageProducts = filteredProducts.slice(start, end);
        
        displayProducts(pageProducts);
        currentPage = pageNum;
    }

    function setupPagination() {
        const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
        
        let paginationDiv = document.querySelector('.pagination');
        if (!paginationDiv) {
            paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination';
            paginationDiv.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:20px; margin:40px 0;';
            productsContainer.parentElement.appendChild(paginationDiv);
        }

        paginationDiv.innerHTML = '';

        if (totalPages <= 1) return;

        if (currentPage > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'btn-primary';
            prevBtn.innerHTML = '← Indietro';
            prevBtn.addEventListener('click', () => {
                displayPage(currentPage - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            paginationDiv.appendChild(prevBtn);
        }

        const pageInfo = document.createElement('span');
        pageInfo.style.cssText = 'color:#9b59b6; font-weight:700; font-size:1.1rem;';
        pageInfo.textContent = `Pagina ${currentPage} di ${totalPages}`;
        paginationDiv.appendChild(pageInfo);

        if (currentPage < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'btn-primary';
            nextBtn.innerHTML = 'Avanti →';
            nextBtn.addEventListener('click', () => {
                displayPage(currentPage + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            paginationDiv.appendChild(nextBtn);
        }
    }

    // Esponi funzioni globalmente per i filtri
    window.filterProducts = function(category) {
        if (category === 'all') {
            filteredProducts = allProducts;
        } else {
            filteredProducts = allProducts.filter(p => p.category === category);
        }
        displayPage(1);
        setupPagination();
    };
});

// ==================== FILTERS (PC GAMING PAGE) ====================
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            
            if (typeof window.filterProducts !== 'undefined') {
                window.filterProducts(category);
            }
        });
    });
});