let products = [];
let cart = JSON.parse(localStorage.getItem('zc') || '[]');
let favs = JSON.parse(localStorage.getItem('zf') || '[]');
let curView = 'products';
let curCat = 'all';
let selProd = null;
let dq = 1;
let userData = null;
let isAdmin = false;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        var loader = document.getElementById('pageLoader');
        if (loader) { loader.style.opacity = '0'; setTimeout(function() { if (loader) loader.style.display = 'none'; }, 300); }
    }, 800);

    if (window.Telegram && window.Telegram.WebApp) {
        var tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            userData = tg.initDataUnsafe.user;
            checkAdmin(userData.id);
            fetch('/api/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userData.id, username: userData.username || '', first_name: userData.first_name || '', phone: userData.phone_number || '' })
            });
        }
    }

    loadProducts();
    updateBadge();
});

async function checkAdmin(uid) {
    try { var r = await fetch('/api/check-admin?user_id=' + uid); var d = await r.json(); isAdmin = d.is_admin; } catch (e) {}
}

async function loadProducts() {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1;"><i class="fa-solid fa-spinner fa-spin" style="font-size:28px;color:#2563EB;"></i></div>';
    try {
        var r = await fetch('/api/products?category=' + curCat);
        var d = await r.json();
        if (d.success) { products = d.products; renderProducts(); }
    } catch (e) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1;color:#EF4444;">Internet yo\'q</div>';
    }
}

function inCart(id) { return cart.some(function(i) { return i.id === id; }); }
function getQty(id) { var i = cart.find(function(x) { return x.id === id; }); return i ? i.quantity : 0; }

function renderProducts() {
    var grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1;color:#6B7280;">Mahsulotlar topilmadi</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < products.length; i++) {
        var p = products[i];
        var inc = inCart(p.id);
        var q = getQty(p.id);
        html += '<div class="card" onclick="openDetail(\'' + p.id + '\')">';
        if (p.discount > 0) html += '<span class="disc">-' + p.discount + '%</span>';
        html += '<button class="fav ' + (favs.includes(p.id) ? 'act' : '') + '" onclick="event.stopPropagation();toggleFav(\'' + p.id + '\')"><i class="fa-' + (favs.includes(p.id) ? 'solid' : 'regular') + ' fa-heart"></i></button>';
        html += '<img src="' + p.image + '" alt="" onerror="this.src=\'https://placehold.co/400\'">';
        html += '<div class="info"><div class="name">' + p.name + '</div><div class="price-block"><span class="price">' + fmt(p.price) + ' so\'m</span>';
        if (p.old_price > p.price) html += '<span class="old">' + fmt(p.old_price) + ' so\'m</span>';
        html += '</div>';
        if (inc) {
            html += '<div class="qty-ctrl" onclick="event.stopPropagation()"><button onclick="chgCart(\'' + p.id + '\',-1)">-</button><span>' + q + '</span><button onclick="chgCart(\'' + p.id + '\',1)">+</button></div>';
        } else {
            html += '<button class="buy-btn" onclick="event.stopPropagation();addCart(\'' + p.id + '\')"><i class="fa-solid fa-cart-shopping"></i> Savatga</button>';
        }
        html += '</div></div>';
    }
    grid.innerHTML = html;
}

function openDetail(id) {
    selProd = products.find(function(p) { return p.id === id; });
    if (!selProd) return;
    dq = 1;
    document.getElementById('dImg').src = selProd.image;
    document.getElementById('dName').textContent = selProd.name;
    document.getElementById('dDesc').textContent = selProd.description;
    document.getElementById('dPrice').textContent = fmt(selProd.price) + ' so\'m';
    document.getElementById('dOld').textContent = selProd.old_price > selProd.price ? fmt(selProd.old_price) + ' so\'m' : '';
    document.getElementById('dStock').textContent = selProd.in_stock + ' dona';
    document.getElementById('dSold').textContent = selProd.sold_this_week;
    document.getElementById('dQty').textContent = dq;
    var disc = document.getElementById('dDisc');
    disc.textContent = selProd.discount > 0 ? '-' + selProd.discount + '%' : '';
    disc.style.display = selProd.discount > 0 ? 'inline-block' : 'none';
    updateDTotal();
    showView('detail');
}

function dQty(c) { dq = Math.max(1, Math.min(selProd.in_stock, dq + c)); document.getElementById('dQty').textContent = dq; updateDTotal(); }
function updateDTotal() { document.getElementById('dTotal').textContent = fmt(selProd.price * dq) + ' so\'m'; }
function addFromDetail() { addCart(selProd.id, dq); toast('Savatga qo\'shildi'); showView('products'); }

function addCart(id, q) {
    q = q || 1;
    var ex = cart.find(function(i) { return i.id === id; });
    if (ex) ex.quantity += q;
    else { var p = products.find(function(i) { return i.id === id; }); if (p) cart.push({...p, quantity: q}); }
    saveCart(); updateBadge(); renderProducts();
}

function chgCart(id, c) {
    var it = cart.find(function(i) { return i.id === id; });
    if (it) { it.quantity += c; if (it.quantity <= 0) cart = cart.filter(function(i) { return i.id !== id; }); }
    saveCart(); updateBadge(); renderProducts(); if (curView === 'cart') renderCart();
}

function rmCart(id) { cart = cart.filter(function(i) { return i.id !== id; }); saveCart(); updateBadge(); renderProducts(); if (curView === 'cart') renderCart(); }
function clearCart() { if (confirm('Savat tozalansinmi?')) { cart = []; saveCart(); updateBadge(); renderProducts(); renderCart(); } }
function saveCart() { localStorage.setItem('zc', JSON.stringify(cart)); }

function updateBadge() {
    var c = cart.reduce(function(s, i) { return s + i.quantity; }, 0);
    var b = document.getElementById('cartBadge');
    if (!b) return;
    b.textContent = c;
    b.style.display = c > 0 ? 'flex' : 'none';
}

function renderCart() {
    var l = document.getElementById('cartList');
    var e = document.getElementById('emptyCart');
    var b = document.getElementById('cartBottom');
    if (!l || !e || !b) return;
    if (cart.length === 0) { l.innerHTML = ''; e.style.display = 'block'; b.style.display = 'none'; return; }
    e.style.display = 'none'; b.style.display = 'block';
    l.innerHTML = cart.map(function(i) {
        return '<div class="cart-item"><img src="' + i.image + '" onerror="this.src=\'https://placehold.co/70\'"><div class="cart-info"><div class="cart-name">' + i.name + '</div><div class="cart-price">' + fmt(i.price) + ' so\'m</div></div><div class="cart-qty"><button onclick="chgCart(\'' + i.id + '\',-1)">-</button><span>' + i.quantity + '</span><button onclick="chgCart(\'' + i.id + '\',1)">+</button></div><i class="fa-solid fa-xmark rm-btn" onclick="rmCart(\'' + i.id + '\')"></i></div>';
    }).join('');
    document.getElementById('cartTotal').textContent = fmt(cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0)) + ' so\'m';
}

function openCheckout() {
    if (userData) { document.getElementById('cName').value = userData.first_name || ''; document.getElementById('cPhone').value = userData.phone_number || ''; }
    document.getElementById('checkoutItems').innerHTML = cart.map(function(i) { return '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>' + i.name + ' x' + i.quantity + '</span><span>' + fmt(i.price * i.quantity) + ' so\'m</span></div>'; }).join('');
    document.getElementById('checkoutTotal').textContent = fmt(cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0)) + ' so\'m';
    showView('checkout');
}

async function submitOrder(e) {
    e.preventDefault();
    var n = document.getElementById('cName').value.trim();
    var p = document.getElementById('cPhone').value.trim();
    var a = document.getElementById('cAddr').textContent.trim();
    var pay = document.querySelector('input[name="pay"]:checked');
    pay = pay ? pay.value : 'cash';
    if (!n || !p) { toast('Ism va telefon majburiy!', 'e'); return; }
    if (cart.length === 0) { toast('Savat bo\'sh!', 'e'); return; }
    var sub = cart.reduce(function(s, i) { return s + i.price * i.quantity; }, 0);
    try {
        var r = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userData ? userData.id : null, name: n, phone: p, address: a, payment_method: pay, items: cart.map(function(i) { return { id: i.id, name: i.name, quantity: i.quantity, price: i.price }; }), subtotal: sub })
        });
        var d = await r.json();
        if (d.success) {
            cart = []; saveCart(); updateBadge(); renderProducts();
            if (pay === 'click' && d.order.click_url) {
                window.open(d.order.click_url, '_blank');
                toast('To\'lov sahifasi ochildi. To\'lov qiling! #' + d.order.order_id);
            } else if (pay === 'payme' && d.order.payme_url) {
                window.open(d.order.payme_url, '_blank');
                toast('To\'lov sahifasi ochildi. To\'lov qiling! #' + d.order.order_id);
            } else {
                toast('Buyurtma #' + d.order.order_id + ' qabul qilindi!');
            }
            showView('products');
        }
    } catch (er) { toast('Xatolik', 'e'); }
}

function getGPS() {
    if (!navigator.geolocation) { toast('GPS yo\'q', 'e'); return; }
    navigator.geolocation.getCurrentPosition(async function(pos) {
        try {
            var r = await fetch('https://nominatim.openstreetmap.org/reverse?lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude + '&format=json&accept-language=uz');
            var d = await r.json();
            document.getElementById('cAddr').textContent = d.display_name || pos.coords.latitude + ', ' + pos.coords.longitude;
            document.getElementById('addressInput').value = d.display_name || '';
        } catch (er) { document.getElementById('cAddr').textContent = pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4); }
        closeModal('addressModal');
    }, function() { toast('GPS aniqlanmadi', 'e'); }, { enableHighAccuracy: true, timeout: 10000 });
}

function saveAddr() { var a = document.getElementById('addressInput').value.trim(); if (a) document.getElementById('cAddr').textContent = a; closeModal('addressModal'); }

function toggleFav(id) {
    var idx = favs.indexOf(id);
    if (idx > -1) favs.splice(idx, 1); else favs.push(id);
    localStorage.setItem('zf', JSON.stringify(favs));
    renderProducts(); if (curView === 'favorites') renderFavs();
}

function renderFavs() {
    var fp = products.filter(function(p) { return favs.includes(p.id); });
    var g = document.getElementById('favGrid');
    var e = document.getElementById('emptyFav');
    if (!g || !e) return;
    if (fp.length === 0) { g.innerHTML = ''; e.style.display = 'block'; return; }
    e.style.display = 'none';
    g.innerHTML = fp.map(function(p) { return '<div class="card" onclick="openDetail(\'' + p.id + '\')"><button class="fav act"><i class="fa-solid fa-heart"></i></button><img src="' + p.image + '"><div class="info"><div class="name">' + p.name + '</div><div class="price-block"><span class="price">' + fmt(p.price) + ' so\'m</span></div></div></div>'; }).join('');
}

function loadProfile() {
    if (userData) {
        document.getElementById('pName').textContent = userData.first_name || userData.username || 'Foydalanuvchi';
        document.getElementById('pPhone').textContent = userData.phone_number || 'Noma\'lum';
        document.getElementById('editUser').value = userData.username || '';
        document.getElementById('editPhone').value = userData.phone_number || '';
    }
    var as = document.getElementById('adminSection');
    if (as) as.style.display = isAdmin ? 'block' : 'none';
    loadOrders();
}

async function loadOrders() {
    var c = document.getElementById('profileOrders');
    if (!c) return;
    if (!userData || !userData.id) { c.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;">Yuklanmadi</p>'; return; }
    try {
        var r = await fetch('/api/orders?user_id=' + userData.id);
        var d = await r.json();
        if (d.success && d.orders.length > 0) {
            c.innerHTML = d.orders.map(function(o) {
                return '<div class="order-card"><div class="order-header"><span class="order-id">#' + o.order_id + '</span><span class="order-status st-' + o.status + '">' + (o.status_text || o.status) + '</span></div><div style="font-size:13px;color:#6B7280;margin-bottom:8px;">' + (o.items ? o.items.map(function(i) { return i.name + ' x' + i.quantity; }).join(', ') : '') + '</div><div style="display:flex;justify-content:space-between;"><span style="font-size:12px;color:#9CA3AF;">' + new Date(o.created_at).toLocaleDateString() + '</span><strong style="color:#2563EB;">' + fmt(o.total) + ' so\'m</strong></div></div>';
            }).join('');
        } else { c.innerHTML = '<p style="color:#9CA3AF;text-align:center;padding:20px;">Buyurtmalar yo\'q</p>'; }
    } catch (er) { c.innerHTML = '<p style="color:#EF4444;text-align:center;padding:20px;">Xatolik</p>'; }
}

async function saveProfile() {
    var u = document.getElementById('editUser').value.trim();
    var p = document.getElementById('editPhone').value.trim();
    if (userData && userData.id) {
        await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userData.id, username: u, phone: p }) });
        document.getElementById('pName').textContent = u || userData.first_name;
        document.getElementById('pPhone').textContent = p || 'Noma\'lum';
        toast('Saqlandi');
    }
    closeModal('profileModal');
}

function showView(v) {
    curView = v;
    ['productsView', 'detailView', 'cartView', 'checkoutView', 'favoritesView', 'profileView'].forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
    var header = document.getElementById('header');
    var nav = document.querySelector('.bottom-nav');
    if (header) header.style.display = (v === 'products') ? 'block' : 'none';
    if (nav) nav.style.display = (v === 'checkout') ? 'none' : 'flex';
    var map = { products: 'productsView', detail: 'detailView', cart: 'cartView', checkout: 'checkoutView', favorites: 'favoritesView', profile: 'profileView' };
    var target = document.getElementById(map[v]);
    if (target) target.style.display = 'block';
    if (v === 'cart') renderCart();
    if (v === 'favorites') renderFavs();
    if (v === 'profile') loadProfile();
    if (v === 'products') renderProducts();
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    var navBtn = document.querySelector('[data-nav="' + v + '"]');
    if (navBtn) navBtn.classList.add('active');
}

function filterCat(cat, btn) {
    curCat = cat;
    document.querySelectorAll('.cat').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    loadProducts();
}

function openModal(id) { var el = document.getElementById(id); if (el) el.style.display = 'flex'; }
function closeModal(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; }

function toast(m, t) {
    t = t || 's';
    var el = document.createElement('div');
    el.className = 'toast toast-' + t;
    el.textContent = m;
    var container = document.getElementById('toasts');
    if (container) { container.appendChild(el); setTimeout(function() { el.remove(); }, 3000); }
}

function fmt(p) { return p ? p.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '0'; }
