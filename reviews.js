// ========================= RECENSIONI CON STORAGE =========================

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productName = params.get('name');
    
    if(!productName) {
        window.location.href = 'index.html';
        return;
    }

    // Carica prodotto e recensioni
    try {
        const response = await fetch('products.json');
        const products = await response.json();
        const product = products.find(p => p.name === productName);

        if(!product) {
            window.location.href = 'notfound.html';
            return;
        }

        // Mostra dettagli prodotto
        const mainContainer = document.querySelector('main');
        mainContainer.innerHTML = `
            <div class="product-detail">
                <div class="product-detail-main">
                    <div class="product-image">
                        <img src="${product.img}" alt="${product.name}">
                        <div class="product-rating" id="averageRating"></div>
                    </div>
                    <div class="product-info">
                        <h1>${product.name}</h1>
                        <p class="desc">${product.desc}</p>
                        ${product.components ? `<p><strong>Componenti:</strong> ${product.components}</p>` : ''}
                        <p class="price">€ ${product.price.toFixed(2)}</p>
                        <a href="product.html?name=${encodeURIComponent(productName)}" style="color:#9b59b6; text-decoration:none; font-weight:700;">← Torna al prodotto</a>
                    </div>
                </div>
                
                <div class="reviews-section">
                    <h2>Recensioni</h2>
                    
                    <div class="review-form">
                        <h3 style="color:#9b59b6; margin-bottom:15px;">Lascia la tua recensione</h3>
                        <input type="text" id="reviewerName" placeholder="Nome e Cognome" required>
                        <div class="star-rating" id="starRating">
                            <span data-value="1">★</span>
                            <span data-value="2">★</span>
                            <span data-value="3">★</span>
                            <span data-value="4">★</span>
                            <span data-value="5">★</span>
                        </div>
                        <textarea id="reviewText" placeholder="Scrivi la tua recensione..." required></textarea>
                        <button id="submitReview">Invia Recensione</button>
                    </div>
                    
                    <div class="reviews-list" id="reviewsList">
                        <p style="color:#aaa; text-align:center;">Nessuna recensione ancora. Sii il primo a recensire!</p>
                    </div>
                </div>
            </div>
        `;

        // Sistema stelle per rating
        let selectedRating = 0;
        const starRating = document.getElementById('starRating');
        const stars = starRating.querySelectorAll('span');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.value);
                updateStarSelection();
            });
        });

        function updateStarSelection() {
            stars.forEach((star, index) => {
                if(index < selectedRating) {
                    star.classList.add('selected');
                } else {
                    star.classList.remove('selected');
                }
            });
        }

        // Carica recensioni dal storage
        async function loadReviews() {
            try {
                const storageKey = `reviews_${productName}`;
                const result = await window.storage.get(storageKey, true);
                
                if(result && result.value) {
                    const reviews = JSON.parse(result.value);
                    displayReviews(reviews);
                    updateAverageRating(reviews);
                } else {
                    document.getElementById('reviewsList').innerHTML = '<p style="color:#aaa; text-align:center;">Nessuna recensione ancora. Sii il primo a recensire!</p>';
                }
            } catch(error) {
                console.log('Nessuna recensione trovata per questo prodotto');
                document.getElementById('reviewsList').innerHTML = '<p style="color:#aaa; text-align:center;">Nessuna recensione ancora. Sii il primo a recensire!</p>';
            }
        }

        // Mostra recensioni
        function displayReviews(reviews) {
            const reviewsList = document.getElementById('reviewsList');
            
            if(reviews.length === 0) {
                reviewsList.innerHTML = '<p style="color:#aaa; text-align:center;">Nessuna recensione ancora. Sii il primo a recensire!</p>';
                return;
            }

            reviewsList.innerHTML = '';
            reviews.reverse().forEach(review => {
                const reviewDiv = document.createElement('div');
                reviewDiv.className = 'review-item';
                reviewDiv.innerHTML = `
                    <div class="review-header">
                        <h4>${review.name}</h4>
                        <div class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                    </div>
                    <p class="review-text">${review.text}</p>
                    <p class="review-date">${new Date(review.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                    })}</p>
                `;
                reviewsList.appendChild(reviewDiv);
            });
        }

        // Aggiorna media stelle
        function updateAverageRating(reviews) {
            const averageRatingDiv = document.getElementById('averageRating');
            
            if(reviews.length === 0) {
                averageRatingDiv.innerHTML = '<p style="color:#aaa; font-size:0.9rem;">Nessuna recensione</p>';
                return;
            }

            const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
            const roundedAvg = Math.round(average);

            averageRatingDiv.innerHTML = '';
            for(let i = 1; i <= 5; i++) {
                const star = document.createElement('span');
                star.className = 'star';
                if(i <= roundedAvg) {
                    star.classList.add('filled');
                }
                star.innerHTML = '★';
                averageRatingDiv.appendChild(star);
            }

            const avgText = document.createElement('p');
            avgText.style.color = '#9b59b6';
            avgText.style.fontSize = '0.95rem';
            avgText.style.marginTop = '5px';
            avgText.textContent = `${average.toFixed(1)} stelle (${reviews.length} recensioni)`;
            averageRatingDiv.appendChild(avgText);
        }

        // Invia recensione
        document.getElementById('submitReview').addEventListener('click', async () => {
            const name = document.getElementById('reviewerName').value.trim();
            const text = document.getElementById('reviewText').value.trim();

            if(!name || !text) {
                alert('Compila tutti i campi!');
                return;
            }

            if(selectedRating === 0) {
                alert('Seleziona un numero di stelle!');
                return;
            }

            try {
                const storageKey = `reviews_${productName}`;
                let reviews = [];

                // Carica recensioni esistenti
                try {
                    const result = await window.storage.get(storageKey, true);
                    if(result && result.value) {
                        reviews = JSON.parse(result.value);
                    }
                } catch(error) {
                    console.log('Creazione nuova lista recensioni');
                }

                // Aggiungi nuova recensione
                const newReview = {
                    name,
                    rating: selectedRating,
                    text,
                    date: new Date().toISOString()
                };

                reviews.push(newReview);

                // Salva nel storage
                await window.storage.set(storageKey, JSON.stringify(reviews), true);

                // Ricarica recensioni
                await loadReviews();

                // Reset form
                document.getElementById('reviewerName').value = '';
                document.getElementById('reviewText').value = '';
                selectedRating = 0;
                updateStarSelection();

                alert('Recensione inviata con successo!');
            } catch(error) {
                console.error('Errore salvataggio recensione:', error);
                alert('Errore durante l\'invio della recensione. Riprova.');
            }
        });

        // Carica recensioni iniziali
        await loadReviews();

    } catch(error) {
        console.error('Errore:', error);
        window.location.href = 'notfound.html';
    }
});