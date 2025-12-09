fetch('products.json')
    .then(res => res.json())
    .then(async (products) => {
        
        const params = new URLSearchParams(window.location.search);
        const productName = params.get('name');
        const product = products.find(p => p.name === productName);

        const detailContainer = document.querySelector('.product-detail');

        if(product){
            const actualPrice = product.discount ? product.discountPrice : product.price;
            
            let priceHTML = '';
            if(product.discount) {
                priceHTML = `
                    <p><span style="color:#888; text-decoration:line-through; font-size:1.5rem;">€ ${product.price.toFixed(2)}</span></p>
                    <p class="price">€ ${product.discountPrice.toFixed(2)}</p>
                `;
            } else {
                priceHTML = `<p class="price">€ ${product.price.toFixed(2)}</p>`;
            }
            
            detailContainer.innerHTML = `
                <div class="product-detail-main" data-name="${product.name}" data-price="${actualPrice}" data-desc="${product.desc}" data-img="${product.img}">
                    <div class="product-image">
                        <img src="${product.img}" alt="${product.name}">
                        <div class="product-rating" id="productRating"></div>
                    </div>
                    <div class="product-info">
                        <h1>${product.name}</h1>
                        <p class="desc">${product.desc}</p>
                        ${product.components ? `<p><strong>Componenti:</strong> ${product.components}</p>` : ''}
                        ${priceHTML}
                        <div class="quantity-section">
                            <label>Quantità: </label>
                            <input type="number" id="productQty" value="1" min="1">
                            <button id="addToCartBtn">Aggiungi al carrello</button>
                        </div>
                    </div>
                </div>
                <div class="also-like">
                    <h2>Potrebbe piacerti anche:</h2>
                    <div class="also-products"></div>
                </div>
            `;

            // Carica e mostra media recensioni
            try {
                const storageKey = `reviews_${productName}`;
                const result = await window.storage.get(storageKey, true);
                
                const ratingContainer = detailContainer.querySelector('#productRating');
                
                if(result && result.value) {
                    const reviews = JSON.parse(result.value);
                    const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                    const roundedAvg = Math.round(average);

                    for(let i = 1; i <= 5; i++){
                        const star = document.createElement('span');
                        star.className = 'star';
                        if(i <= roundedAvg) {
                            star.classList.add('filled');
                        }
                        star.innerHTML = '★';
                        star.addEventListener('click', () => {
                            window.location.href = `reviews.html?name=${encodeURIComponent(product.name)}`;
                        });
                        ratingContainer.appendChild(star);
                    }

                    const reviewText = document.createElement('p');
                    reviewText.style.color = '#9b59b6';
                    reviewText.style.fontSize = '0.95rem';
                    reviewText.style.marginTop = '8px';
                    reviewText.style.cursor = 'pointer';
                    reviewText.textContent = `${average.toFixed(1)} stelle (${reviews.length} recensioni) - Clicca per leggere`;
                    reviewText.addEventListener('click', () => {
                        window.location.href = `reviews.html?name=${encodeURIComponent(product.name)}`;
                    });
                    ratingContainer.appendChild(reviewText);
                } else {
                    // Nessuna recensione
                    for(let i = 1; i <= 5; i++){
                        const star = document.createElement('span');
                        star.className = 'star';
                        star.innerHTML = '★';
                        star.addEventListener('click', () => {
                            window.location.href = `reviews.html?name=${encodeURIComponent(product.name)}`;
                        });
                        ratingContainer.appendChild(star);
                    }

                    const reviewText = document.createElement('p');
                    reviewText.style.color = '#aaa';
                    reviewText.style.fontSize = '0.9rem';
                    reviewText.style.marginTop = '8px';
                    reviewText.style.cursor = 'pointer';
                    reviewText.textContent = 'Nessuna recensione - Sii il primo!';
                    reviewText.addEventListener('click', () => {
                        window.location.href = `reviews.html?name=${encodeURIComponent(product.name)}`;
                    });
                    ratingContainer.appendChild(reviewText);
                }
            } catch(error) {
                console.log('Errore caricamento recensioni:', error);
                const ratingContainer = detailContainer.querySelector('#productRating');
                for(let i = 1; i <= 5; i++){
                    const star = document.createElement('span');
                    star.className = 'star';
                    star.innerHTML = '★';
                    star.addEventListener('click', () => {
                        window.location.href = `reviews.html?name=${encodeURIComponent(product.name)}`;
                    });
                    ratingContainer.appendChild(star);
                }
            }

            // Suggerimenti
            const suggestionsContainer = detailContainer.querySelector('.also-products');
            const otherProducts = products
                .filter(p => p.name !== productName)
                .sort(() => Math.random() - 0.5)
                .slice(0, 4);
            
            otherProducts.forEach(p => {
                const div = document.createElement('div');
                div.className = 'also-product';
                const displayPrice = p.discount ? p.discountPrice : p.price;
                div.innerHTML = `
                    <img src="${p.img}" alt="${p.name}">
                    <h4>${p.name}</h4>
                    <p>€ ${displayPrice.toFixed(2)}</p>
                    <p style="font-size:0.85rem; color:#ccc;">${p.desc.substring(0, 60)}...</p>
                `;
                div.addEventListener('click', () => {
                    window.location.href = `product.html?name=${encodeURIComponent(p.name)}`;
                });
                suggestionsContainer.appendChild(div);
            });

        } else {
            detailContainer.innerHTML = `
                <div style="text-align:center; padding:50px; color:#aaa;">
                    <h2>Prodotto non trovato</h2>
                    <p>Scusa, il prodotto che stai cercando non esiste.</p>
                    <a href="index.html" style="color:#9b59b6; text-decoration:none; margin-top:20px; display:inline-block;">← Torna alla home</a>
                </div>
            `;
        }

    })
    .catch(err => console.error('Errore caricamento prodotto:', err));