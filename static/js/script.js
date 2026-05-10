let products = [];
let cart = JSON.parse(localStorage.getItem("zc") || "[]");
let favs = JSON.parse(localStorage.getItem("zf") || "[]");
let curView = "products";
let curCat = "all";
let selProd = null;
let dq = 1;
let userData = null;
let isAdmin = false;

document.addEventListener("DOMContentLoaded", () => {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    if (tg.initDataUnsafe?.user) {
      userData = tg.initDataUnsafe.user;
      checkAdmin(userData.id);
      fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userData.id,
          username: userData.username || "",
          first_name: userData.first_name || "",
          phone: userData.phone_number || "",
        }),
      });
    }
  }
  loadProducts();
  updateBadge();
});

async function checkAdmin(uid) {
  try {
    const r = await fetch(`/api/check-admin?user_id=${uid}`);
    const d = await r.json();
    isAdmin = d.is_admin;
  } catch (e) {}
}

async function loadProducts() {
  document.getElementById("loading").style.display = "block";
  document.getElementById("productsGrid").style.display = "none";
  try {
    const r = await fetch(`/api/products?category=${curCat}`);
    const d = await r.json();
    if (d.success) {
      products = d.products;
      renderProducts();
    }
  } catch (e) {
    toast("Internet yo'q", "e");
  }
  document.getElementById("loading").style.display = "none";
  document.getElementById("productsGrid").style.display = "grid";
}

function inCart(id) {
  return cart.some((i) => i.id === id);
}
function getQty(id) {
  const i = cart.find((i) => i.id === id);
  return i ? i.quantity : 0;
}

function renderProducts() {
  document.getElementById("productsGrid").innerHTML = products
    .map((p) => {
      const inc = inCart(p.id);
      const q = getQty(p.id);
      return `<div class="card" onclick="openDetail('${p.id}')">
            ${p.discount > 0 ? `<span class="disc">-${p.discount}%</span>` : ""}
            <button class="fav ${favs.includes(p.id) ? "act" : ""}" onclick="event.stopPropagation();toggleFav('${p.id}')"><i class="fa-${favs.includes(p.id) ? "solid" : "regular"} fa-heart"></i></button>
            <img src="${p.image}" alt="" onerror="this.src='https://placehold.co/400'">
            <div class="info">
                <div class="name">${p.name}</div>
                <div class="price-row">
                    <span class="price">${fmt(p.price)} so'm</span>
                    ${p.old_price > p.price ? `<span class="old">${fmt(p.old_price)}</span>` : ""}
                </div>
                ${
                  inc
                    ? `<div class="qty-ctrl" onclick="event.stopPropagation()"><button onclick="chgCart('${p.id}',-1)">−</button><span>${q}</span><button onclick="chgCart('${p.id}',1)">+</button></div>`
                    : `<button class="buy-btn" onclick="event.stopPropagation();addCart('${p.id}')"><i class="fa-solid fa-cart-shopping"></i> Savatga</button>`
                }
            </div>
        </div>`;
    })
    .join("");
}

function openDetail(id) {
  selProd = products.find((p) => p.id === id);
  if (!selProd) return;
  dq = 1;
  document.getElementById("dImg").src = selProd.image;
  document.getElementById("dName").textContent = selProd.name;
  document.getElementById("dDesc").textContent = selProd.description;
  document.getElementById("dPrice").textContent = fmt(selProd.price) + " so'm";
  document.getElementById("dOld").textContent =
    selProd.old_price > selProd.price ? fmt(selProd.old_price) + " so'm" : "";
  document.getElementById("dStock").textContent = selProd.in_stock + " dona";
  document.getElementById("dSold").textContent = selProd.sold_this_week;
  document.getElementById("dQty").textContent = dq;
  document.getElementById("dDisc").textContent =
    selProd.discount > 0 ? "-" + selProd.discount + "%" : "";
  document.getElementById("dDisc").style.display =
    selProd.discount > 0 ? "inline-block" : "none";
  updateDTotal();
  showView("detail");
}

function dQty(c) {
  dq = Math.max(1, Math.min(selProd.in_stock, dq + c));
  document.getElementById("dQty").textContent = dq;
  updateDTotal();
}
function updateDTotal() {
  document.getElementById("dTotal").textContent =
    fmt(selProd.price * dq) + " so'm";
}
function addFromDetail() {
  addCart(selProd.id, dq);
  toast("Savatga qo'shildi");
  showView("products");
}

function addCart(id, q = 1) {
  const ex = cart.find((i) => i.id === id);
  if (ex) ex.quantity += q;
  else {
    const p = products.find((i) => i.id === id);
    if (p) cart.push({ ...p, quantity: q });
  }
  saveCart();
  updateBadge();
  renderProducts();
}
function chgCart(id, c) {
  const it = cart.find((i) => i.id === id);
  if (it) {
    it.quantity += c;
    if (it.quantity <= 0) cart = cart.filter((i) => i.id !== id);
  }
  saveCart();
  updateBadge();
  renderProducts();
  if (curView === "cart") renderCart();
}
function rmCart(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  updateBadge();
  renderProducts();
  if (curView === "cart") renderCart();
}
function clearCart() {
  if (confirm("Savat tozalansinmi?")) {
    cart = [];
    saveCart();
    updateBadge();
    renderProducts();
    renderCart();
  }
}
function saveCart() {
  localStorage.setItem("zc", JSON.stringify(cart));
}
function updateBadge() {
  const c = cart.reduce((s, i) => s + i.quantity, 0);
  const b = document.getElementById("cartBadge");
  b.textContent = c;
  b.style.display = c > 0 ? "flex" : "none";
}

function renderCart() {
  const l = document.getElementById("cartList");
  const e = document.getElementById("emptyCart");
  const b = document.getElementById("cartBottom");
  if (cart.length === 0) {
    l.innerHTML = "";
    e.style.display = "block";
    b.style.display = "none";
    return;
  }
  e.style.display = "none";
  b.style.display = "block";
  l.innerHTML = cart
    .map(
      (i) => `
        <div class="cart-item">
            <img src="${i.image}" onerror="this.src='https://placehold.co/70'">
            <div class="cart-info"><div class="cart-name">${i.name}</div><div class="cart-price">${fmt(i.price)} so'm</div></div>
            <div class="cart-qty"><button onclick="chgCart('${i.id}',-1)">−</button><span>${i.quantity}</span><button onclick="chgCart('${i.id}',1)">+</button></div>
            <i class="fa-solid fa-xmark rm-btn" onclick="rmCart('${i.id}')"></i>
        </div>
    `,
    )
    .join("");
  document.getElementById("cartTotal").textContent =
    fmt(cart.reduce((s, i) => s + i.price * i.quantity, 0)) + " so'm";
}

function openCheckout() {
  if (userData) {
    document.getElementById("cName").value = userData.first_name || "";
    document.getElementById("cPhone").value = userData.phone_number || "";
  }
  document.getElementById("checkoutItems").innerHTML = cart
    .map(
      (i) =>
        `<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>${i.name} × ${i.quantity}</span><span>${fmt(i.price * i.quantity)} so'm</span></div>`,
    )
    .join("");
  document.getElementById("checkoutTotal").textContent =
    fmt(cart.reduce((s, i) => s + i.price * i.quantity, 0)) + " so'm";
  showView("checkout");
}

async function submitOrder(e) {
  e.preventDefault();
  const n = document.getElementById("cName").value.trim();
  const p = document.getElementById("cPhone").value.trim();
  const a = document.getElementById("cAddr").textContent.trim();
  const pay =
    document.querySelector('input[name="pay"]:checked')?.value || "cash";
  if (!n || !p) {
    toast("Ism va telefon majburiy!", "e");
    return;
  }
  if (cart.length === 0) {
    toast("Savat bo'sh!", "e");
    return;
  }
  const sub = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  try {
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userData?.id,
        name: n,
        phone: p,
        address: a,
        payment_method: pay,
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        subtotal: sub,
      }),
    });
    const d = await r.json();
    if (d.success) {
      cart = [];
      saveCart();
      updateBadge();
      renderProducts();
      toast("Buyurtma #" + d.order.order_id);
      showView("products");
    }
  } catch (er) {
    toast("Xatolik", "e");
  }
}

function getGPS() {
  if (!navigator.geolocation) {
    toast("GPS yo'q", "e");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=uz`,
        );
        const d = await r.json();
        document.getElementById("cAddr").textContent =
          d.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}`;
        document.getElementById("addressInput").value = d.display_name || "";
      } catch (er) {
        document.getElementById("cAddr").textContent =
          `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      }
      closeModal("addressModal");
    },
    (err) => {
      let m = "GPS aniqlanmadi";
      if (err.code === 1) m = "GPS ruxsati berilmadi!";
      toast(m, "e");
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}
function saveAddr() {
  const a = document.getElementById("addressInput").value.trim();
  if (a) document.getElementById("cAddr").textContent = a;
  closeModal("addressModal");
}

function toggleFav(id) {
  const idx = favs.indexOf(id);
  if (idx > -1) favs.splice(idx, 1);
  else favs.push(id);
  localStorage.setItem("zf", JSON.stringify(favs));
  renderProducts();
  if (curView === "favorites") renderFavs();
}
function renderFavs() {
  const fp = products.filter((p) => favs.includes(p.id));
  const g = document.getElementById("favGrid");
  const e = document.getElementById("emptyFav");
  if (fp.length === 0) {
    g.innerHTML = "";
    e.style.display = "block";
    return;
  }
  e.style.display = "none";
  g.innerHTML = fp
    .map(
      (p) =>
        `<div class="card" onclick="openDetail('${p.id}')"><button class="fav act"><i class="fa-solid fa-heart"></i></button><img src="${p.image}"><div class="info"><div class="name">${p.name}</div><div class="price-row"><span class="price">${fmt(p.price)} so'm</span></div></div></div>`,
    )
    .join("");
}

function loadProfile() {
  if (userData) {
    document.getElementById("pName").textContent =
      userData.first_name || userData.username || "Foydalanuvchi";
    document.getElementById("pPhone").textContent =
      userData.phone_number || "Noma'lum";
    document.getElementById("editUser").value = userData.username || "";
    document.getElementById("editPhone").value = userData.phone_number || "";
  }
  document.getElementById("adminSection").style.display = isAdmin
    ? "block"
    : "none";
  loadOrders();
}
async function loadOrders() {
  const c = document.getElementById("profileOrders");
  if (!userData?.id) {
    c.innerHTML =
      '<p style="color:#9CA3AF;text-align:center;padding:20px;">Yuklanmadi</p>';
    return;
  }
  try {
    const r = await fetch(`/api/orders?user_id=${userData.id}`);
    const d = await r.json();
    if (d.success && d.orders.length > 0) {
      c.innerHTML = d.orders
        .map(
          (o) =>
            `<div class="order-card"><div class="order-header"><span class="order-id">#${o.order_id}</span><span class="order-status st-${o.status}">${o.status_text || o.status}</span></div><div style="font-size:13px;color:#6B7280;margin-bottom:8px;">${o.items?.map((i) => i.name + " ×" + i.quantity).join(", ")}</div><div style="display:flex;justify-content:space-between;"><span style="font-size:12px;color:#9CA3AF;">${new Date(o.created_at).toLocaleDateString()}</span><strong style="color:#2563EB;">${fmt(o.total)} so'm</strong></div></div>`,
        )
        .join("");
    } else {
      c.innerHTML =
        '<p style="color:#9CA3AF;text-align:center;padding:20px;">Buyurtmalar yo\'q</p>';
    }
  } catch (er) {
    c.innerHTML =
      '<p style="color:#EF4444;text-align:center;padding:20px;">Xatolik</p>';
  }
}
async function saveProfile() {
  const u = document.getElementById("editUser").value.trim();
  const p = document.getElementById("editPhone").value.trim();
  if (userData?.id) {
    await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userData.id, username: u, phone: p }),
    });
    document.getElementById("pName").textContent = u || userData.first_name;
    document.getElementById("pPhone").textContent = p || "Noma'lum";
    toast("Saqlandi");
  }
  closeModal("profileModal");
}

function showView(v) {
  curView = v;
  [
    "productsView",
    "detailView",
    "cartView",
    "checkoutView",
    "favoritesView",
    "profileView",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  document.getElementById("header").style.display =
    v === "products" ? "block" : "none";
  document.querySelector(".bottom-nav").style.display =
    v === "checkout" ? "none" : "flex";
  const map = {
    products: "productsView",
    detail: "detailView",
    cart: "cartView",
    checkout: "checkoutView",
    favorites: "favoritesView",
    profile: "profileView",
  };
  const el = document.getElementById(map[v]);
  if (el) el.style.display = "block";
  if (v === "cart") renderCart();
  if (v === "favorites") renderFavs();
  if (v === "profile") loadProfile();
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  document.querySelector(`[data-nav="${v}"]`)?.classList.add("active");
}
function filterCat(cat, btn) {
  curCat = cat;
  document
    .querySelectorAll(".cat")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  loadProducts();
}
function openModal(id) {
  document.getElementById(id).style.display = "flex";
}
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}
function toast(m, t = "s") {
  const el = document.createElement("div");
  el.className = `toast toast-${t}`;
  el.textContent = m;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
function fmt(p) {
  return p?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "0";
}
