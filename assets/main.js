/**
 * DERYA MENSUCAT SANAYİ VE TİCARET A.Ş. — EST. 1978
 * Core Client-Side Logic & Ordering Engine
 * Vanilla JavaScript (Zero Build Step - GitHub Pages Compatible)
 */

// Cart & Order State Keys
const STORAGE_CART_KEY = 'derya_rfq_cart';
const STORAGE_LANG_KEY = 'derya_pref_lang';

// Default initial demo items if cart is empty
const DEFAULT_CART_ITEMS = [
  { id: '1', name: "Derya Düğümlü Poliamid Balık Ağı (210/24, 24mm)", qty: 10, unit: "Top", category: "Balık Ağı" },
  { id: '2', name: "Düğümsüz PE Kafes / Çiftlik Ağı (18mm, 15x30m Panel)", qty: 4, unit: "Panel", category: "Kafes Ağı" },
  { id: '3', name: "Penguen Tescilli Balık Ağı Dikiş & Tamir İpi (210/18)", qty: 50, unit: "Bobin", category: "İplik" }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initCart();
  initLanguage();
  initMobileMenu();
  syncCartBadges();
  highlightActiveNav();
});

/* ==========================================================================
   CART SYSTEM (LOCAL STORAGE BASED)
   ========================================================================== */

function getCart() {
  try {
    const raw = localStorage.getItem(STORAGE_CART_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(DEFAULT_CART_ITEMS));
      return [...DEFAULT_CART_ITEMS];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error("Cart read error", e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    syncCartBadges();
  } catch (e) {
    console.error("Cart save error", e);
  }
}

function initCart() {
  if (!localStorage.getItem(STORAGE_CART_KEY)) {
    saveCart(DEFAULT_CART_ITEMS);
  } else {
    syncCartBadges();
  }
}

function syncCartBadges() {
  const cart = getCart();
  const count = cart.length;
  document.querySelectorAll('.cart-badge-count').forEach(el => {
    el.textContent = count;
  });
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.name === item.name);
  if (existing) {
    existing.qty = (parseInt(existing.qty, 10) || 0) + (parseInt(item.qty, 10) || 1);
  } else {
    cart.push({
      id: Date.now().toString(),
      name: item.name,
      qty: parseInt(item.qty, 10) || 1,
      unit: item.unit || 'Adet',
      category: item.category || 'Genel'
    });
  }
  saveCart(cart);
  showToast(`"${item.name}" teklif sepetinize eklendi!`, 'success');
}

function removeCartItem(id) {
  let cart = getCart();
  cart = cart.filter(i => i.id !== id);
  saveCart(cart);
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
  showToast("Ürün sepetten çıkarıldı.", 'info');
}

function clearCart() {
  saveCart([]);
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
  showToast("Teklif sepeti sıfırlandı.", 'info');
}

function restoreDefaultCart() {
  saveCart(DEFAULT_CART_ITEMS);
  if (typeof renderCartPage === 'function') {
    renderCartPage();
  }
  showToast("Örnek ürünler geri yüklendi.", 'success');
}

/* ==========================================================================
   ORDERING DISPATCHERS (WHATSAPP & TELEGRAM)
   ========================================================================== */

const CONTACT_INFO = {
  phone: "+90 262 751 35 55",
  whatsappNumber: "905326128383",
  telegramUser: "deryamensucat",
  email: "info@deryamensucat.com.tr"
};

/**
 * Generate formatted order text for WhatsApp or Telegram
 */
function generateOrderMessage(details) {
  let text = `⚓ *DERYA MENSUCAT B2B TEKLİF & SİPARİŞ TALEBİ*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (details.isSingleProduct) {
    text += `*Ürün:* ${details.productName}\n`;
    text += `*Miktar:* ${details.quantity} ${details.unit}\n`;
    if (details.specs) {
      for (const [key, val] of Object.entries(details.specs)) {
        text += `• ${key}: ${val}\n`;
      }
    }
  } else if (details.cartItems && details.cartItems.length > 0) {
    text += `*Sepetteki Ürünler (${details.cartItems.length} Kalem):*\n`;
    details.cartItems.forEach((item, idx) => {
      text += `${idx + 1}) ${item.name} — ${item.qty} ${item.unit}\n`;
    });
  }

  text += `\n*Firma / Müşteri Bilgileri:*\n`;
  text += `• Yetkili: ${details.contact || 'Belirtilmedi'}\n`;
  text += `• Firma / Gemi: ${details.company || 'Belirtilmedi'}\n`;
  text += `• Liman / Şehir: ${details.location || 'Belirtilmedi'}\n`;
  text += `• İletişim Tel: ${details.phone || 'Belirtilmedi'}\n`;

  if (details.notes) {
    text += `\n*Teknik Donam & Özel Notlar:*\n${details.notes}\n`;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Gebze OSB Fabrika teslim fiyatı, üretim termin süresi ve teknik şartname uygunluğunu rica ederim.`;

  return text;
}

/**
 * Send order via WhatsApp
 */
function sendWhatsAppOrder(details) {
  const message = generateOrderMessage(details);
  const url = `https://wa.me/${CONTACT_INFO.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/**
 * Send order via Telegram
 */
function sendTelegramOrder(details) {
  const message = generateOrderMessage(details);
  // Telegram direct message or Telegram Web Share protocol
  const url = `https://t.me/share/url?url=${encodeURIComponent('https://deryamensucat.com.tr')}&text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/* ==========================================================================
   GLOBAL TOAST NOTIFICATION
   ========================================================================== */

function showToast(message, type = 'success') {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-white font-title-md text-sm shadow-2xl flex items-center gap-3 transition-all duration-300 opacity-0 pointer-events-none';
    document.body.appendChild(toast);
  }

  const iconName = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');
  const bgClass = type === 'error' ? 'bg-[#ba1a1a]' : 'bg-[#000e1d] border border-[#39608f]';

  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-white font-medium text-sm shadow-2xl flex items-center gap-3 transition-all duration-300 opacity-100 pointer-events-auto ${bgClass}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] text-[#25D366]">${iconName}</span>
    <span>${message}</span>
  `;

  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => {
    toast.className = toast.className.replace('opacity-100 pointer-events-auto', 'opacity-0 pointer-events-none');
  }, 3500);
}

/* ==========================================================================
   BILINGUAL LANGUAGE TOGGLE (TR / EN)
   ========================================================================== */

function initLanguage() {
  const currentLang = localStorage.getItem(STORAGE_LANG_KEY) || 'tr';
  setLanguage(currentLang, false);
}

function setLanguage(lang, persist = true) {
  if (persist) {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  }

  const isEn = lang === 'en';
  document.querySelectorAll('.lang-tr').forEach(el => {
    el.style.display = isEn ? 'none' : '';
  });
  document.querySelectorAll('.lang-en').forEach(el => {
    el.style.display = isEn ? '' : 'none';
  });

  // Sync TR/EN toggle buttons
  document.querySelectorAll('.btn-lang-tr').forEach(b => {
    if (!isEn) {
      b.classList.add('bg-primary-container', 'text-on-primary', 'font-bold');
      b.classList.remove('text-on-surface-variant');
    } else {
      b.classList.remove('bg-primary-container', 'text-on-primary', 'font-bold');
      b.classList.add('text-on-surface-variant');
    }
  });

  document.querySelectorAll('.btn-lang-en').forEach(b => {
    if (isEn) {
      b.classList.add('bg-primary-container', 'text-on-primary', 'font-bold');
      b.classList.remove('text-on-surface-variant');
    } else {
      b.classList.remove('bg-primary-container', 'text-on-primary', 'font-bold');
      b.classList.add('text-on-surface-variant');
    }
  });
}

/* ==========================================================================
   MOBILE MENU TOGGLE
   ========================================================================== */

function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu-drawer');
  if (toggleBtn && mobileMenu) {
    toggleBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

/* ==========================================================================
   ACTIVE NAVIGATION HIGHLIGHT
   ========================================================================== */

function highlightActiveNav() {
  const path = window.location.pathname;
  let page = 'home';
  if (path.includes('products') || path.includes('product-detail')) page = 'products';
  else if (path.includes('about')) page = 'about';
  else if (path.includes('contact')) page = 'contact';
  else if (path.includes('cart')) page = 'cart';

  document.querySelectorAll(`[data-nav="${page}"]`).forEach(link => {
    link.classList.add('bg-primary-container', 'text-on-primary');
    link.classList.remove('text-on-surface-variant');
  });
}
