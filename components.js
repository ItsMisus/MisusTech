// ==================== COMPONENTI RIUTILIZZABILI ====================

// HEADER COMPONENT
function createHeader() {
    const header = document.createElement('header');
    header.className = 'header-container';
    header.innerHTML = `
        <div class="header-top">
            <div class="logo" onclick="window.location.href='index.html'">MISUSTECH</div>
            
            <form class="header-search" id="searchForm">
                <input type="text" placeholder="Cerca un PC" name="search">
            </form>
            
            <div class="header-actions">
                <div class="language-selector">
                    <select id="languageDropdown">
                        <option value="it">🇮🇹 ITA</option>
                        <option value="en">🇬🇧 ENG</option>
                    </select>
                </div>
                
                <button id="accountBtn" class="icon-btn" title="Account">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                </button>
                
                <button id="cartBtn" class="icon-btn" title="Carrello">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                </button>
                
                <div class="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
        
        <nav class="nav-menu">
            <ul>
                <li><a href="pcgaming.html">PC Gaming</a></li>
                <li><a href="offerte.html">Offerte</a></li>
                <li><a href="chisiamo.html">Chi siamo</a></li>
                <li><a href="discord.html">Discord</a></li>
            </ul>
        </nav>
    `;
    
    return header;
}

// FOOTER COMPONENT
function createFooter() {
    const footer = document.createElement('footer');
    footer.innerHTML = `
        <div class="footer-content">
            <div class="footer-section">
                <h3>Chi Siamo</h3>
                <ul>
                    <li><a href="chisiamo.html">La nostra storia</a></li>
                    <li><a href="contattaci.html">Contattaci</a></li>
                    <li><a href="discord.html">Community Discord</a></li>
                </ul>
            </div>

            <div class="footer-section">
                <h3>Informazioni Legali</h3>
                <p><strong>MISUSTECH s.r.l.</strong></p>
                <p>Partita IVA: <strong>IT01234567890</strong></p>
                <p>Via Roma 123, 76121<br>Barletta (BA) - Italia</p>
                <p><strong>Telefono:</strong> 377 590 0298<br><strong>Email:</strong> francesco.minutiello08@gmail.com</p>
            </div>

            <div class="footer-section">
                <h3>Supporto</h3>
                <ul>
                    <li><a href="contattaci.html">Contatti</a></li>
                    <li><a href="custom-pc.html">Crea PC Custom</a></li>
                    <li><a href="pcgaming.html">Catalogo Completo</a></li>
                </ul>
            </div>
        </div>

        <p style="text-align:center; color:#888; padding-top:20px; border-top:1px solid rgba(155,89,182,0.2);">
            © 2025 MISUSTECH | Tutti i diritti riservati
        </p>
    `;
    
    return footer;
}

// CART SIDEBAR COMPONENT
function createCart() {
    const cartSidebar = document.createElement('aside');
    cartSidebar.id = 'cartSidebar';
    cartSidebar.className = 'cart-sidebar';
    cartSidebar.innerHTML = `
        <div style="padding:25px;">
            <h2 style="font-family:'Orbitron',sans-serif; color:#9b59b6; margin-bottom:20px; text-align:center;">Carrello</h2>
            <div id="cartItems">
                <p style="text-align:center; color:#aaa;">Il carrello è vuoto</p>
            </div>
            <div style="border-top:2px solid #9b59b6; padding-top:15px; margin-top:20px;">
                <p style="font-size:1.2rem; font-weight:700; color:#9b59b6; text-align:center;">
                    Totale: € <span id="cartTotal">0.00</span>
                </p>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
                <button id="closeCart" class="btn-primary">Chiudi</button>
                <button id="navigateHome" class="btn-primary" style="background:#333;">Continua Shopping</button>
            </div>
        </div>
    `;
    
    return cartSidebar;
}

// INIZIALIZZA COMPONENTI
function initComponents() {
    // Inserisci Header se non esiste
    if (!document.querySelector('header')) {
        const body = document.body;
        body.insertBefore(createHeader(), body.firstChild);
    }
    
    // Inserisci Footer se non esiste
    if (!document.querySelector('footer')) {
        document.body.appendChild(createFooter());
    }
    
    // Inserisci Cart se non esiste
    if (!document.getElementById('cartSidebar')) {
        document.body.appendChild(createCart());
    }
    
    // Inizializza eventi
    initHeaderEvents();
}

// EVENTI HEADER
function initHeaderEvents() {
    // Hamburger Menu
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Chiudi menu quando clicchi su un link
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
    
    // Search Form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchInput = searchForm.querySelector('input[name="search"]');
            const query = searchInput ? searchInput.value.trim() : '';
            if (query) {
                sessionStorage.setItem('searchQuery', query.toLowerCase());
                window.location.href = 'risultati.html';
            }
        });
    }
    
    // Language Dropdown
    const languageDropdown = document.getElementById('languageDropdown');
    if (languageDropdown) {
        const savedLang = localStorage.getItem('siteLanguage') || 'it';
        languageDropdown.value = savedLang;
        
        languageDropdown.addEventListener('change', (e) => {
            localStorage.setItem('siteLanguage', e.target.value);
            location.reload();
        });
    }
    
    // Cart Button
    const cartBtn = document.getElementById('cartBtn');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    
    if (cartBtn && cartSidebar) {
        cartBtn.addEventListener('click', () => {
            cartSidebar.classList.toggle('active');
        });
    }
    
    if (closeCart && cartSidebar) {
        closeCart.addEventListener('click', () => {
            cartSidebar.classList.remove('active');
        });
    }
    
    // Navigate Home Button
    const navigateHome = document.getElementById('navigateHome');
    if (navigateHome) {
        navigateHome.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// CARICA COMPONENTI AL DOM READY
document.addEventListener('DOMContentLoaded', initComponents);