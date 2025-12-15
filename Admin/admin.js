/**
 * MIRA E-Commerce - Admin Panel JavaScript
 * Integrato con API PHP Backend
 */

// ============================================================================
// CONFIGURAZIONE
// ============================================================================
const API_BASE = 'http://localhost/mira_ecommerce/api';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let currentProducts = [];
let allProducts = [];
let filteredProducts = []; // Nuova variabile per i prodotti filtrati
let currentCategories = [];
let currentTags = [];
let currentPage = 1;
const itemsPerPage = 10;
let editingProductId = null;

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 MIRA Admin Panel inizializzato');
    
    // Verifica autenticazione admin
    checkAdminAuth();
    
    // Inizializza componenti UI
    initNavigation();
    initModals();
    initProductForm();
    initFilters();
    
    // Carica dati iniziali
    loadProducts();
    loadCategories();
    loadTags();
});

// ============================================================================
// AUTHENTICATION
// ============================================================================
function checkAdminAuth() {
    const token = localStorage.getItem('miraToken');
    const user = localStorage.getItem('miraUser');
    
    if (!token || !user) {
        alert('⚠️ Accesso non autorizzato. Effettua il login.');
        window.location.href = '../auth.html';
        return;
    }
    
    try {
        const userData = JSON.parse(user);
        
        // Verifica permessi admin
        if (!userData.is_admin && userData.email !== 'francminu08@gmail.com') {
            alert('⚠️ Non hai i permessi necessari per accedere al pannello admin');
            window.location.href = '../index.html';
            return;
        }
        
        // Mostra info utente nella UI
        const adminUsername = document.getElementById('adminUsername');
        if (adminUsername) {
            adminUsername.textContent = `${userData.first_name} ${userData.last_name}`;
        }
        
        console.log('✅ Autenticazione admin verificata:', userData.email);
        
    } catch (error) {
        console.error('❌ Errore parsing user data:', error);
        logout();
    }
}

function logout() {
    if (confirm('Sei sicuro di voler uscire?')) {
        localStorage.removeItem('miraToken');
        localStorage.removeItem('miraUser');
        window.location.href = '../auth.html';
    }
}

// ============================================================================
// API HELPERS
// ============================================================================
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('miraToken');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };
    
    try {
        const url = `${API_BASE}${endpoint}`;
        console.log('📡 API Request:', url, config.method || 'GET');
        
        const response = await fetch(url, config);
        
        console.log('📡 Response status:', response.status);
        
        // Prova a parsare JSON anche se status non è OK
        let data;
        try {
            data = await response.json();
        } catch (e) {
            console.error('❌ Errore parsing JSON:', e);
            throw new Error('Risposta non valida dal server');
        }
        
        console.log('📦 API Response:', data);
        
        // Gestione errori API
        if (!data.success) {
            throw new Error(data.message || 'Errore sconosciuto');
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ API Error:', error);
        
        // Se token scaduto, redirect al login
        if (error.message && (error.message.includes('Token') || error.message.includes('401'))) {
            alert('⚠️ Sessione scaduta. Effettua nuovamente il login.');
            logout();
        }
        
        throw error;
    }
}

// ============================================================================
// DATA LOADING
// ============================================================================
async function loadProducts() {
    showLoading();
    
    try {
        console.log('🔄 Caricamento prodotti...');
        
        // Chiamata diretta con fetch per avere più controllo
        const token = localStorage.getItem('miraToken');
        const response = await fetch(`${API_BASE}/products.php?limit=1000`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        const data = await response.json();
        console.log('📦 Response data:', data);
        
        if (data.success && data.data && data.data.products) {
            allProducts = data.data.products;
            console.log('✅ Prodotti caricati:', allProducts.length);
            
            // Carica anche categorie e tags dopo aver caricato i prodotti
            await loadCategories();
            await loadTags();
            
            applyFilters();
        } else {
            console.error('❌ Formato risposta non valido:', data);
            showToast('Errore nel caricamento dei prodotti', 'error');
            allProducts = [];
            renderProducts();
        }
        
    } catch (error) {
        console.error('❌ Errore caricamento prodotti:', error);
        showToast('Errore nel caricamento dei prodotti: ' + error.message, 'error');
        allProducts = [];
        renderProducts();
    } finally {
        hideLoading();
    }
}

async function loadCategories() {
    try {
        // Estrai categorie univoche dai prodotti
        const categoriesMap = new Map();
        
        allProducts.forEach(p => {
            if (p.category_id && p.category_name) {
                categoriesMap.set(p.category_id, {
                    id: p.category_id,
                    name: p.category_name,
                    slug: p.category_slug
                });
            }
        });
        
        currentCategories = Array.from(categoriesMap.values());
        populateCategorySelects();
        populateCategoryFilter();
        
        console.log('✅ Categorie caricate:', currentCategories.length);
        
    } catch (error) {
        console.error('❌ Errore caricamento categorie:', error);
    }
}

async function loadTags() {
    try {
        // Estrai tags univoci dai prodotti
        const allTags = new Set();
        
        allProducts.forEach(product => {
            if (product.tags && Array.isArray(product.tags)) {
                product.tags.forEach(tag => allTags.add(tag));
            }
        });
        
        currentTags = Array.from(allTags).map(tag => ({ slug: tag, name: tag }));
        
        console.log('✅ Tags caricati:', currentTags.length);
        
    } catch (error) {
        console.error('❌ Errore caricamento tags:', error);
    }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================
async function createProduct(formData) {
    try {
        showLoading();
        
        const response = await apiRequest('/products.php', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            showToast('✅ Prodotto creato con successo!', 'success');
            closeModal('productModal');
            loadProducts();
        }
        
    } catch (error) {
        console.error('❌ Errore creazione prodotto:', error);
        showToast(`Errore: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function updateProduct(productId, formData) {
    try {
        showLoading();
        
        const response = await apiRequest(`/products.php?id=${productId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        if (response.success) {
            showToast('✅ Prodotto aggiornato con successo!', 'success');
            closeModal('productModal');
            loadProducts();
        }
        
    } catch (error) {
        console.error('❌ Errore aggiornamento prodotto:', error);
        showToast(`Errore: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteProduct(productId) {
    if (!confirm('⚠️ Sei sicuro di voler eliminare questo prodotto?')) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await apiRequest(`/products.php?id=${productId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showToast('✅ Prodotto eliminato con successo', 'success');
            loadProducts();
        }
        
    } catch (error) {
        console.error('❌ Errore eliminazione prodotto:', error);
        showToast(`Errore: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ============================================================================
// UI RENDERING
// ============================================================================
function renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (currentProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    ${allProducts.length === 0 ? 'Nessun prodotto nel database' : 'Nessun prodotto trovato con i filtri selezionati'}
                </td>
            </tr>
        `;
        return;
    }
    
    currentProducts.forEach(product => {
        const row = document.createElement('tr');
        
        const price = product.is_discount && product.discount_price 
            ? product.discount_price 
            : product.price;
        
        const priceDisplay = product.is_discount && product.discount_price
            ? `<span style="text-decoration: line-through; color: #999;">€${parseFloat(product.price).toFixed(2)}</span><br>
               <strong style="color: #e74c3c;">€${parseFloat(product.discount_price).toFixed(2)}</strong>`
            : `€${parseFloat(product.price).toFixed(2)}`;
        
        const statusClass = product.is_active ? 'active' : 'inactive';
        const statusText = product.is_active ? 'Attivo' : 'Inattivo';
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="product-checkbox" data-id="${product.id}">
            </td>
            <td>
                <div class="product-image-cell">
                    <img src="${product.image_url}" alt="${product.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22%3E%3Crect fill=%22%23e5e7eb%22 width=%2260%22 height=%2260%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-size=%2212%22 fill=%22%239ca3af%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                </div>
            </td>
            <td><strong>${product.name}</strong></td>
            <td>${product.category_name || '-'}</td>
            <td>${priceDisplay}</td>
            <td>
                <span class="badge ${product.stock > 10 ? 'badge-success' : 'badge-warning'}">
                    ${product.stock} unità
                </span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="editProduct(${product.id})" title="Modifica">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                        </svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteProduct(${product.id})" title="Elimina">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Aggiorna info pagination
    updatePaginationInfo();
}

function updatePaginationInfo() {
    const info = document.getElementById('paginationInfo');
    if (!info) return;
    
    const total = filteredProducts.length;
    
    if (total === 0) {
        info.textContent = '0-0 di 0';
        return;
    }
    
    const start = ((currentPage - 1) * itemsPerPage) + 1;
    const end = Math.min(currentPage * itemsPerPage, total);
    
    info.textContent = `${start}-${end} di ${total}`;
}

// ============================================================================
// FILTERS & SEARCH
// ============================================================================
function initFilters() {
    // Search
    const searchInput = document.getElementById('searchProducts');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentPage = 1; // Reset a pagina 1 quando cerco
            applyFilters();
        }, 300));
    }
    
    // Category filter
    const categoryFilter = document.getElementById('filterCategory');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentPage = 1; // Reset a pagina 1 quando cambio categoria
            applyFilters();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1; // Reset a pagina 1 quando cambio stato
            applyFilters();
        });
    }
}

function applyFilters() {
    let filtered = [...allProducts];
    
    // Search
    const searchTerm = document.getElementById('searchProducts')?.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Category
    const categoryId = document.getElementById('filterCategory')?.value;
    if (categoryId) {
        filtered = filtered.filter(p => p.category_id == categoryId);
    }
    
    // Status
    const status = document.getElementById('filterStatus')?.value;
    if (status === '1') {
        filtered = filtered.filter(p => p.is_active);
    } else if (status === '0') {
        filtered = filtered.filter(p => !p.is_active);
    }
    
    // Salva i prodotti filtrati
    filteredProducts = filtered;
    
    // Applica paginazione sui prodotti filtrati
    paginateProducts();
}

function paginateProducts() {
    // Applica paginazione
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    currentProducts = filteredProducts.slice(startIndex, endIndex);
    
    renderProducts();
    renderPagination(filteredProducts.length);
}

// ============================================================================
// PAGINATION
// ============================================================================
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const controls = document.getElementById('paginationControls');
    
    if (!controls) return;
    
    controls.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '←';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            paginateProducts();
        }
    };
    controls.appendChild(prevBtn);
    
    // Calcola quali pagine mostrare
    let startPage = 1;
    let endPage = totalPages;
    
    if (totalPages > 5) {
        if (currentPage <= 3) {
            endPage = 5;
        } else if (currentPage >= totalPages - 2) {
            startPage = totalPages - 4;
        } else {
            startPage = currentPage - 2;
            endPage = currentPage + 2;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            paginateProducts();
        };
        controls.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '→';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            paginateProducts();
        }
    };
    controls.appendChild(nextBtn);
}

// ============================================================================
// PRODUCT FORM
// ============================================================================
function initProductForm() {
    const form = document.getElementById('productForm');
    if (!form) return;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('productName').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            discount_price: document.getElementById('productDiscountPrice').value 
                ? parseFloat(document.getElementById('productDiscountPrice').value) 
                : null,
            is_discount: document.getElementById('productIsDiscount').checked ? 1 : 0,
            stock: parseInt(document.getElementById('productStock').value),
            image_url: document.getElementById('productImage').value.trim(),
            category_id: document.getElementById('productCategory').value || null,
            is_featured: document.getElementById('productIsFeatured').checked ? 1 : 0,
            is_active: document.getElementById('productIsActive').checked ? 1 : 0,
            tags: [], // Implementare se necessario
            specs: getSpecifications()
        };
        
        // Validazione
        if (!formData.name || !formData.description || !formData.price || !formData.image_url) {
            showToast('⚠️ Compila tutti i campi obbligatori', 'error');
            return;
        }
        
        if (editingProductId) {
            await updateProduct(editingProductId, formData);
        } else {
            await createProduct(formData);
        }
    });
    
    // Add spec row button
    const addSpecBtn = document.getElementById('btnAddSpec');
    if (addSpecBtn) {
        addSpecBtn.addEventListener('click', () => addSpecificationRow());
    }
}

function openProductModal(productId = null) {
    editingProductId = productId;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    
    if (!modal || !form) return;
    
    if (productId) {
        // Edit mode
        title.textContent = 'Modifica Prodotto';
        const product = allProducts.find(p => p.id === productId);
        if (product) {
            populateProductForm(product);
        }
    } else {
        // Create mode
        title.textContent = 'Nuovo Prodotto';
        form.reset();
        clearSpecifications();
        editingProductId = null;
    }
    
    modal.classList.add('active');
}

function populateProductForm(product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDiscountPrice').value = product.discount_price || '';
    document.getElementById('productIsDiscount').checked = product.is_discount;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productImage').value = product.image_url;
    document.getElementById('productCategory').value = product.category_id || '';
    document.getElementById('productIsFeatured').checked = product.is_featured;
    document.getElementById('productIsActive').checked = product.is_active;
    
    // Set specs
    clearSpecifications();
    if (product.specs && typeof product.specs === 'object') {
        Object.entries(product.specs).forEach(([key, value]) => {
            addSpecificationRow(key, value);
        });
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

function addSpecificationRow(key = '', value = '') {
    const container = document.getElementById('specsContainer');
    if (!container) return;
    
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `
        <input type="text" class="spec-key" placeholder="Nome (es: CPU)" value="${key}">
        <input type="text" class="spec-value" placeholder="Valore (es: Intel i7)" value="${value}">
        <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
            </svg>
        </button>
    `;
    container.appendChild(row);
}

function clearSpecifications() {
    const container = document.getElementById('specsContainer');
    if (container) {
        container.innerHTML = '';
    }
}

function getSpecifications() {
    const specs = {};
    document.querySelectorAll('.spec-row').forEach(row => {
        const key = row.querySelector('.spec-key').value.trim();
        const value = row.querySelector('.spec-value').value.trim();
        if (key && value) {
            specs[key] = value;
        }
    });
    return specs;
}

function populateCategorySelects() {
    const select = document.getElementById('productCategory');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Seleziona Categoria --</option>';
    currentCategories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

function populateCategoryFilter() {
    const select = document.getElementById('filterCategory');
    if (!select) return;
    
    select.innerHTML = '<option value="">Tutte le categorie</option>';
    currentCategories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

// ============================================================================
// MODALS
// ============================================================================
function initModals() {
    // Add Product button
    const btnAddProduct = document.getElementById('btnAddProduct');
    if (btnAddProduct) {
        btnAddProduct.addEventListener('click', () => openProductModal());
    }
    
    // Close buttons
    const closeButtons = document.querySelectorAll('.modal-close, #btnCancelProduct');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-overlay');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Click outside to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// ============================================================================
// NAVIGATION
// ============================================================================
function initNavigation() {
    // Logout button
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }
    
    // Nav links
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Switch sections
            const section = link.getAttribute('data-section');
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            
            const targetSection = document.getElementById(`${section}Section`);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    if (type === 'error') {
        toast.classList.add('error');
        icon.innerHTML = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
        </svg>`;
    } else {
        toast.classList.remove('error');
        icon.innerHTML = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </svg>`;
    }
    
    messageEl.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading() {
    const loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    loader.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 15px; color: #333;">Caricamento...</p>
        </div>
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.remove();
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================================
// CSS ANIMATIONS (injected dynamically)
// ============================================================================
const style = document.createElement('style');
style.textContent = `
    .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #9b59b6;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

console.log('✅ Admin Panel completamente caricato');