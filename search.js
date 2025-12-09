document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('productsContainer');
    if(!productsContainer) return;

    const searchQuery = sessionStorage.getItem('searchQuery')?.toLowerCase() || "";

    if(!searchQuery) {
        window.location.href = 'notfound.html';
        return;
    }

    fetch('products.json')
        .then(res => res.json())
        .then(products => {
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(searchQuery) ||
                p.desc.toLowerCase().includes(searchQuery) ||
                (p.components && p.components.toLowerCase().includes(searchQuery))
            );

            if(filtered.length === 0){
                window.location.href = 'notfound.html';
                return;
            }

            filtered.forEach(p => {
                const div = document.createElement('div');
                div.className = 'product';
                
                if(p.discount) {
                    div.classList.add('discount');
                }
                
                const displayPrice = p.discount ? p.discountPrice : p.price;
                
                div.dataset.name = p.name;
                div.dataset.price = displayPrice;
                div.dataset.desc = p.desc;
                div.dataset.img = p.img;

                let priceHTML = '';
                if(p.discount) {
                    priceHTML = `
                        <p>
                            <span class="original-price">€ ${p.price.toFixed(2)}</span>
                            <span style="color:#9b59b6; font-weight:700; margin:10px 0;">€ ${p.discountPrice.toFixed(2)}</span>
                        </p>
                    `;
                } else {
                    priceHTML = `<p style="color:#9b59b6; font-weight:700; margin:10px 0;">€ ${p.price.toFixed(2)}</p>`;
                }

                div.innerHTML = `
                    <img src="${p.img}" alt="${p.name}">
                    <h3>${p.name}</h3>
                    <p>${p.desc}</p>
                    ${priceHTML}
                    <button class="add-to-cart">Aggiungi al carrello</button>
                `;

                div.addEventListener('click', e => {
                    if(!e.target.classList.contains('add-to-cart')){
                        window.location.href = `product.html?name=${encodeURIComponent(p.name)}`;
                    }
                });

                productsContainer.appendChild(div);
            });

            const addButtons = document.querySelectorAll('.add-to-cart');
            addButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const productEl = btn.closest('.product');
                    if(!productEl) return;

                    const name = productEl.dataset.name;
                    const price = parseFloat(productEl.dataset.price);
                    const img = productEl.dataset.img;
                    const desc = productEl.dataset.desc;

                    if(typeof cartObj !== 'undefined'){
                        const existing = cartObj.cart.find(item => item.name === name);
                        if(existing){
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
                    }
                });
            });
        })
        .catch(err => {
            console.error("Errore caricamento prodotti:", err);
            window.location.href = 'notfound.html';
        });
});