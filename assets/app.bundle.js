(function () {
  "use strict";

  const STORE_KEY = "shaolema.v1";

  function safeJsonParse(str, fallback) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
  }

  function loadStore() {
    const raw = localStorage.getItem(STORE_KEY);
    const base = {
      usersById: {},
      currentUserId: null,
      products: [
        // 衣
        { id: "yi_spirit_robe", cat: "衣", name: "靈衣・霓縫袍", desc: "紙紮靈衣，霓光走線。", tag: "NEW" },
        { id: "yi_brocade", cat: "衣", name: "錦衣・護符披", desc: "披掛護印，安穩隨行。", tag: "HOT" },
        { id: "yi_shoes", cat: "衣", name: "步履・雲紋履", desc: "雲紋紙履，步步不沉。", tag: "NEW" },
        { id: "yi_bundle", cat: "衣", name: "衣・思念套裝", desc: "靈衣＋履具＋護符。", tag: "HOT", bundle: true },

        // 食
        { id: "shi_feast", cat: "食", name: "供奉・饗宴盤", desc: "供品紙紮，滿滿心意。", tag: "NEW" },
        { id: "shi_tea", cat: "食", name: "清茶・安魂盞", desc: "一盞清茶，息怒安魂。", tag: "HOT" },
        { id: "shi_incense", cat: "食", name: "香火・長明香", desc: "長明不滅，煙路通達。", tag: "NEW" },
        { id: "shi_bundle", cat: "食", name: "食・禮敬套裝", desc: "饗宴＋清茶＋香火。", tag: "HOT", bundle: true },

        // 住
        { id: "zhu_house", cat: "住", name: "靜夜・安居宅", desc: "紙屋宅第，歸處安穩。", tag: "NEW" },
        { id: "zhu_furniture", cat: "住", name: "寢居・羅帳榻", desc: "帳榻成套，夢裡安睡。", tag: "NEW" },
        { id: "zhu_bagua", cat: "住", name: "八卦・鎮宅印", desc: "鎮宅辟邪，四方皆安。", tag: "HOT" },
        { id: "zhu_bundle", cat: "住", name: "住・安宅套裝", desc: "安居宅＋羅帳榻＋鎮宅印。", tag: "HOT", bundle: true },

        // 行
        { id: "xing_lantern", cat: "行", name: "引路・燈火符", desc: "照見歸途，路不迷。", tag: "HOT" },
        { id: "xing_carriage", cat: "行", name: "遠行・順行輿", desc: "行裝紙紮，平安到達。", tag: "NEW" },
        { id: "xing_gold", cat: "行", name: "金銀・通達元寶", desc: "路路皆通，事事可行。", tag: "HOT" },
        { id: "xing_bundle", cat: "行", name: "行・順途套裝", desc: "燈火符＋順行輿＋通達元寶。", tag: "HOT", bundle: true }
      ]
    };
    if (!raw) return base;
    const parsed = safeJsonParse(raw, base);
    return { ...base, ...parsed, products: base.products };
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function getOrCreateUser(displayName) {
    const store = loadStore();
    if (store.currentUserId && store.usersById[store.currentUserId]) {
      return { store, user: store.usersById[store.currentUserId] };
    }
    const newUserId = uid("user");
    const user = {
      id: newUserId,
      displayName: displayName || "旅者",
      createdAt: Date.now(),
      cart: [],
      orders: []
    };
    store.usersById[newUserId] = user;
    store.currentUserId = newUserId;
    saveStore(store);
    return { store, user };
  }

  function requireUser() {
    const store = loadStore();
    const user = store.currentUserId ? store.usersById[store.currentUserId] : null;
    if (!user) return getOrCreateUser("旅者");
    return { store, user };
  }

  function updateUser(mutator) {
    const store = loadStore();
    const id = store.currentUserId;
    if (!id || !store.usersById[id]) {
      getOrCreateUser("旅者");
      return updateUser(mutator);
    }
    const nextUser = mutator({ ...store.usersById[id] });
    store.usersById[id] = nextUser;
    saveStore(store);
    return { store, user: nextUser };
  }

  function addToCart(product) {
    return updateUser((u) => {
      const existing = u.cart.find((x) => x.id === product.id);
      if (existing) existing.qty += 1;
      else u.cart.push({ ...product, qty: 1 });
      return u;
    });
  }

  function removeFromCart(productId) {
    return updateUser((u) => {
      u.cart = u.cart.filter((x) => x.id !== productId);
      return u;
    });
  }

  function setCartQty(productId, qty) {
    return updateUser((u) => {
      u.cart = u.cart.map((x) => (x.id === productId ? { ...x, qty: Math.max(1, qty) } : x));
      return u;
    });
  }

  function placeOrder({ note, uploadedImages = [] }) {
    return updateUser((u) => {
      const order = {
        id: uid("order"),
        createdAt: Date.now(),
        items: u.cart.map((x) => ({ id: x.id, name: x.name, qty: x.qty })),
        note: note || "",
        images: uploadedImages,
        status: "已遞交冥府處理"
      };
      u.orders = [order, ...u.orders];
      u.cart = [];
      return u;
    });
  }

  function formatTime(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function ensureTraditionalChinese() {
    document.documentElement.lang = "zh-Hant";
  }

  function qs(sel) {
    return document.querySelector(sel);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("讀取失敗"));
      reader.readAsDataURL(file);
    });
  }

  async function readImageAsDataUrlCompressed(file, { maxSide = 1400, quality = 0.86 } = {}) {
    // 非圖片就照原樣讀取
    if (!file || !file.type || !file.type.startsWith("image/")) return readFileAsDataUrl(file);

    const original = await readFileAsDataUrl(file);
    // 用 <img> 解碼 dataURL（兼容性最好）
    const img = new Image();
    img.decoding = "async";
    img.src = original;
    await new Promise((r, j) => {
      img.onload = () => r();
      img.onerror = () => j(new Error("圖片解碼失敗"));
    });

    const w = img.naturalWidth || img.width || 1;
    const h = img.naturalHeight || img.height || 1;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    // 不需要縮就直接回傳原檔（避免重編碼造成畫質損失）
    if (scale >= 1) return original;

    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, cw, ch);

    // 優先輸出 JPEG 以節省空間（透明度不重要：供品照片通常不需要 alpha）
    const out = canvas.toDataURL("image/jpeg", quality);
    return out;
  }

  // 扣除背景：支援棋盤格假透明、或純黑底（本次火焰素材）
  // 策略：
  // - 先從邊緣做 flood fill，清掉連通背景
  // - 再做全圖清理：針對低飽和/接近背景色的殘留像素
  // - 若背景主色偏黑，額外把「近黑」像素做羽化透明（沿火焰邊緣更乾淨）
  async function cutoutByEdgeFlood(imgEl, tolerance = 54) {
    const img = imgEl;
    if (!img.complete) {
      await new Promise((r) => img.addEventListener("load", r, { once: true }));
    }
    const w = Math.max(1, img.naturalWidth || img.width || 1);
    const h = Math.max(1, img.naturalHeight || img.height || 1);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);

    const dist = (a, b) => {
      const dr = a[0] - b[0];
      const dg = a[1] - b[1];
      const db = a[2] - b[2];
      return Math.sqrt(dr * dr + dg * dg + db * db);
    };

    const lum = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

    // 收集邊緣顏色，對棋盤格通常會有兩個主色
    const edgeSamples = [];
    const pushRgb = (x, y) => {
      const i = (y * w + x) * 4;
      edgeSamples.push([data.data[i], data.data[i + 1], data.data[i + 2]]);
    };
    const step = Math.max(6, Math.floor(Math.min(w, h) / 80));
    for (let x = 0; x < w; x += step) {
      pushRgb(x, 0);
      pushRgb(x, h - 1);
    }
    for (let y = 0; y < h; y += step) {
      pushRgb(0, y);
      pushRgb(w - 1, y);
    }

    // 將顏色做粗量化後統計頻率，取前 3 名當背景色集合
    const keyOf = (rgb) => rgb.map((v) => Math.round(v / 16) * 16).join(",");
    const freq = new Map();
    for (const c of edgeSamples) {
      const k = keyOf(c);
      freq.set(k, (freq.get(k) || 0) + 1);
    }
    const bgKeys = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
    const bgColors = bgKeys.map((k) => k.split(",").map((n) => Number(n)));

    const isBg = (rgb) => {
      for (const bc of bgColors) {
        if (dist(rgb, bc) <= tolerance) return true;
      }
      return false;
    };

    // 背景是否偏黑（本次火焰素材通常是純黑）
    const bgIsDark = bgColors.length ? bgColors.every((c) => lum(c) < 54) : false;

    // flood fill：從四周邊緣開始，把連通的背景像素透明化
    const visited = new Uint8Array(w * h);
    const qx = new Int32Array(w * 2 + h * 2 + 16);
    const qy = new Int32Array(w * 2 + h * 2 + 16);
    let qs = 0;
    let qe = 0;
    const enqueue = (x, y) => {
      const idx = y * w + x;
      if (visited[idx]) return;
      visited[idx] = 1;
      qx[qe] = x;
      qy[qe] = y;
      qe++;
    };

    // 種子：邊界所有點
    for (let x = 0; x < w; x += 1) {
      enqueue(x, 0);
      enqueue(x, h - 1);
    }
    for (let y = 1; y < h - 1; y += 1) {
      enqueue(0, y);
      enqueue(w - 1, y);
    }

    const getRgb = (x, y) => {
      const i = (y * w + x) * 4;
      return [data.data[i], data.data[i + 1], data.data[i + 2]];
    };

    while (qs < qe) {
      const x = qx[qs];
      const y = qy[qs];
      qs++;

      const i = (y * w + x) * 4;
      const rgb = [data.data[i], data.data[i + 1], data.data[i + 2]];
      if (isBg(rgb)) {
        data.data[i + 3] = 0;
        // 4-neighborhood
        if (x > 0) enqueue(x - 1, y);
        if (x + 1 < w) enqueue(x + 1, y);
        if (y > 0) enqueue(x, y - 1);
        if (y + 1 < h) enqueue(x, y + 1);
      }
    }

    // 第二階段：把殘留的棋盤格（通常為低飽和灰白）也清掉
    // 這能處理「未連通到邊緣」或被抗鋸齒切斷的背景塊
    const tolerance2 = Math.max(tolerance, 84);
    const lowChroma = (rgb) => {
      const mx = Math.max(rgb[0], rgb[1], rgb[2]);
      const mn = Math.min(rgb[0], rgb[1], rgb[2]);
      return (mx - mn) <= 26; // 越小越灰
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data.data[i + 3] === 0) continue;
        const rgb = [data.data[i], data.data[i + 1], data.data[i + 2]];
        // 只清掉接近背景主色的灰白像素，避免誤傷符紙暖色
        if (lowChroma(rgb)) {
          let hit = false;
          for (const bc of bgColors) {
            if (dist(rgb, bc) <= tolerance2) { hit = true; break; }
          }
          if (hit) data.data[i + 3] = 0;
        }

        // 黑底羽化去背（沿火焰邊緣扣得更乾淨）
        if (bgIsDark) {
          const l = lum(rgb);
          // 近黑區域：做漸層透明，保留火焰高亮
          // 0..255 → alpha
          if (l < 70) {
            const keep = Math.min(1, Math.max(0, (l - 18) / (70 - 18))); // 0~1
            const a = data.data[i + 3] / 255;
            data.data[i + 3] = Math.round(255 * a * keep);
          }
        }
      }
    }

    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL("image/png");
  }

  // -------- Pages --------

  function renderRecommended() {
    const store = loadStore();
    const root = qs("#recommended");
    if (!root) return;
    root.innerHTML = "";
    const rec = store.products.filter((p) => p.bundle).slice(0, 8);
    for (const p of rec) {
      const card = document.createElement("a");
      card.className = "card";
      card.href = "order.html";
      card.innerHTML = `
        <div class="card-inner">
          <span class="tag ${p.tag === "HOT" ? "hot" : "new"}">${p.tag === "HOT" ? "HOT" : "NEW"}</span>
          <div style="font-weight:800; letter-spacing:.02em">${p.name}</div>
          <div class="muted" style="font-size:12px">${p.desc}</div>
        </div>
      `;
      root.appendChild(card);
    }
  }

  async function handleUpload(ev) {
    const input = ev.currentTarget;
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("請上傳圖片檔。");
      input.value = "";
      return;
    }
    const dataUrl = await readImageAsDataUrlCompressed(file, { maxSide: 1400, quality: 0.86 });
    const img = qs("#uploadPreviewImg");
    const wrap = qs("#uploadPreview");
    if (img && wrap) {
      img.src = dataUrl;
      wrap.style.display = "flex";
    }
    sessionStorage.setItem("shaolema.pendingUpload", dataUrl);
  }

  function bootHome() {
    getOrCreateUser("旅者");
    renderRecommended();

    const upload = qs("#uploadInput");
    if (upload) upload.addEventListener("change", handleUpload);

    const next = qs("#nextStep");
    if (next) next.addEventListener("click", () => (location.href = "order.html"));

    const goOrder = qs("#goOrder");
    if (goOrder) goOrder.addEventListener("click", () => (location.href = "order.html"));

    const goBurn = qs("#goBurn");
    if (goBurn) goBurn.addEventListener("click", () => (location.href = "checkout.html"));

    const goStation = qs("#goStation");
    if (goStation) goStation.addEventListener("click", () => (location.href = "station.html"));

    const quickSend = qs("#quickSend");
    if (quickSend) {
      quickSend.addEventListener("click", () => {
        const img = sessionStorage.getItem("shaolema.pendingUpload");
        const uploadedImages = img ? [{ id: "img0", dataUrl: img, caption: "上傳供品" }] : [];
        placeOrder({ note: "快速投遞（體驗）", uploadedImages });
        sessionStorage.removeItem("shaolema.pendingUpload");
        alert("已投遞至冥界空間站。");
        location.href = "station.html";
      });
    }
  }

  function renderCatalog() {
    const store = loadStore();
    const root = qs("#products");
    if (!root) return;

    const catName = qs("#catName");
    let activeCat = "衣";

    const renderList = () => {
      root.innerHTML = "";
      const list = store.products.filter((p) => p.cat === activeCat);
      for (const p of list) {
        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div class="thumb" aria-hidden="true"></div>
          <div style="flex:1">
            <h3>${p.name}</h3>
            <p>${p.desc}</p>
            <div class="row" style="margin-top:8px">
              <button class="btn btn-small btn-primary" data-add="${p.id}">加入購物籃</button>
            </div>
          </div>
        `;
        root.appendChild(el);
      }
    };

    const setActive = (cat) => {
      activeCat = cat;
      if (catName) catName.textContent = cat;
      for (const b of document.querySelectorAll("[data-cat]")) {
        const isHit = b.getAttribute("data-cat") === cat;
        b.classList.toggle("btn-primary", isHit);
      }
      renderList();
    };

    // 分類切換
    document.addEventListener("click", (e) => {
      const t = e.target && e.target.closest ? e.target.closest("[data-cat]") : null;
      if (!t) return;
      setActive(t.getAttribute("data-cat") || "衣");
    });

    // 加入購物籃
    root.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("[data-add]") : null;
      if (!btn) return;
      const id = btn.getAttribute("data-add");
      const prod = store.products.find((x) => x.id === id);
      if (!prod) return;
      addToCart({ id: prod.id, name: prod.name });
      renderCart();
    });

    setActive("衣");
  }

  function renderCart() {
    const { user } = requireUser();
    const root = qs("#cart");
    const badge = qs("#cartCount");
    const empty = qs("#cartEmpty");
    const checkout = qs("#goCheckout");

    if (badge) badge.textContent = String(user.cart.reduce((a, x) => a + (x.qty || 1), 0));
    if (!root) return;
    root.innerHTML = "";

    if (!user.cart.length) {
      if (empty) empty.style.display = "block";
      if (checkout) checkout.setAttribute("disabled", "disabled");
      return;
    }
    if (empty) empty.style.display = "none";
    if (checkout) checkout.removeAttribute("disabled");

    for (const it of user.cart) {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div class="thumb" aria-hidden="true"></div>
        <div style="flex:1">
          <h3>${it.name}</h3>
          <p>數量：${it.qty}</p>
          <div class="row" style="margin-top:8px">
            <button class="btn btn-small" data-dec="${it.id}" type="button">－</button>
            <button class="btn btn-small" data-inc="${it.id}" type="button">＋</button>
            <button class="btn btn-small btn-ghost" data-rm="${it.id}" type="button">移除</button>
          </div>
        </div>
      `;
      root.appendChild(row);
    }

    root.onclick = (e) => {
      const t = e.target && e.target.closest ? e.target.closest("[data-dec],[data-inc],[data-rm]") : null;
      if (!t) return;
      const dec = t.getAttribute("data-dec");
      const inc = t.getAttribute("data-inc");
      const rm = t.getAttribute("data-rm");
      const { user: u } = requireUser();
      if (rm) {
        removeFromCart(rm);
        renderCart();
        return;
      }
      if (dec) {
        const it = u.cart.find((x) => x.id === dec);
        if (it) setCartQty(dec, Math.max(1, (it.qty || 1) - 1));
        renderCart();
        return;
      }
      if (inc) {
        const it = u.cart.find((x) => x.id === inc);
        if (it) setCartQty(inc, (it.qty || 1) + 1);
        renderCart();
        return;
      }
    };
  }

  function bootOrder() {
    renderCatalog();
    renderCart();
    const go = qs("#goCheckout");
    if (go) go.addEventListener("click", () => (location.href = "checkout.html"));
  }

  function renderSummary() {
    const { user } = requireUser();
    const root = qs("#summary");
    const empty = qs("#summaryEmpty");
    if (!root) return;
    root.innerHTML = "";

    if (!user.cart.length) {
      if (empty) empty.style.display = "block";
      return;
    }
    if (empty) empty.style.display = "none";
    for (const it of user.cart) {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="thumb" aria-hidden="true"></div>
        <div style="flex:1">
          <h3>${it.name}</h3>
          <p>數量：${it.qty}</p>
        </div>
      `;
      root.appendChild(el);
    }
  }

  async function collectUploads() {
    const pending = sessionStorage.getItem("shaolema.pendingUpload");
    const uploads = [];
    if (pending) uploads.push({ id: "pending", dataUrl: pending, caption: "上傳供品" });

    const input = qs("#extraUpload");
    const files = input && input.files ? Array.from(input.files) : [];
    for (const f of files.slice(0, 6)) {
      if (!f.type.startsWith("image/")) continue;
      const dataUrl = await readImageAsDataUrlCompressed(f, { maxSide: 1400, quality: 0.86 });
      uploads.push({ id: f.name + "_" + Date.now(), dataUrl, caption: "追加供品" });
    }
    return uploads;
  }

  function bootCheckout() {
    renderSummary();
    const goBack = qs("#backToOrder");
    if (goBack) goBack.addEventListener("click", () => (location.href = "order.html"));

    const form = qs("#checkoutForm");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const { user } = requireUser();
      if (!user.cart.length && !sessionStorage.getItem("shaolema.pendingUpload")) {
        alert("請先加入商品，或至少上傳一張圖片。");
        return;
      }
      const note = String(qs("#note")?.value || "").trim();
      const uploads = await collectUploads();

      // 隨機祝福文案（由 assets/blessings.js 提供）
      const list = Array.isArray(window.SHAOLEMA_BLESSINGS) ? window.SHAOLEMA_BLESSINGS : [];
      const pick = list.length ? list[Math.floor(Math.random() * list.length)] : "願你所念，皆有回音。";
      const el = qs("#burnBlessing");
      if (el) el.textContent = pick;

      document.body.classList.add("burning");
      setTimeout(() => {
        placeOrder({ note, uploadedImages: uploads });
        sessionStorage.removeItem("shaolema.pendingUpload");
        document.body.classList.remove("burning");
        location.href = "station.html";
      }, 3250);
    });
  }

  function renderSpace() {
    const { user } = requireUser();
    const name = qs("#displayName");
    const created = qs("#createdAt");
    const stats = qs("#stats");
    const recent = qs("#recent");

    if (name) name.value = user.displayName;
    if (created) created.textContent = formatTime(user.createdAt);
    if (stats) {
      const orderCount = user.orders.length;
      const imgCount = user.orders.reduce((a, o) => a + (o.images ? o.images.length : 0), 0);
      stats.innerHTML = `
        <span class="pill">訂單：<strong>${orderCount}</strong></span>
        <span class="pill">圖片：<strong>${imgCount}</strong></span>
      `;
    }
    if (recent) {
      recent.innerHTML = "";
      if (!user.orders.length) {
        recent.innerHTML = `<div class="empty">你還沒有投遞紀錄。可以先去「下單」或在首頁上傳圖片後快速投遞。</div>`;
      } else {
        for (const o of user.orders.slice(0, 4)) {
          const el = document.createElement("div");
          el.className = "item";
          const cover = o.images && o.images[0] ? `<img src="${o.images[0].dataUrl}" alt="訂單圖片" />` : "";
          el.innerHTML = `
            <div class="thumb" aria-hidden="true">${cover}</div>
            <div style="flex:1">
              <h3>投遞時間：${formatTime(o.createdAt)}</h3>
              <p>${o.status}${o.note ? ` · ${o.note}` : ""}</p>
            </div>
          `;
          recent.appendChild(el);
        }
      }
    }
  }

  function bootSpace() {
    renderSpace();
    const saveBtn = qs("#saveProfile");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const { store, user } = requireUser();
        const v = String(qs("#displayName")?.value || "").trim();
        user.displayName = v || "旅者";
        store.usersById[user.id] = user;
        saveStore(store);
        alert("已保存。");
        renderSpace();
      });
    }
    const resetBtn = qs("#resetUser");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const ok = confirm("要切換成新的使用者嗎？（本機獨立空間會重新開始）");
        if (!ok) return;
        const store = loadStore();
        store.currentUserId = null;
        saveStore(store);
        location.reload();
      });
    }
  }

  function renderStation(mode) {
    const { user } = requireUser();
    const root = qs("#gallery");
    const title = qs("#stationTitle");
    const empty = qs("#empty");
    if (!root || !title || !empty) return;

    const items = [];
    for (const o of user.orders) {
      for (const img of o.images || []) {
        items.push({
          createdAt: o.createdAt,
          note: o.note,
          dataUrl: img.dataUrl,
          caption: img.caption || "供品"
        });
      }
    }

    const isPublic = mode === "public";
    title.textContent = isPublic ? "冥界空間站（公開區）" : "冥界空間站（個人區）";
    root.innerHTML = "";

    if (!items.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    for (const it of items) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `
        <img src="${it.dataUrl}" alt="供品圖片" loading="lazy" />
        <div class="cap">
          <div style="font-weight:800; letter-spacing:.02em">${it.caption}</div>
          <div class="muted" style="margin-top:4px">
            ${formatTime(it.createdAt)}${it.note ? ` · ${it.note}` : ""}
          </div>
        </div>
      `;
      root.appendChild(tile);
    }
  }

  function bootStation() {
    const mode = location.hash === "#public" ? "public" : "personal";
    renderStation(mode);
    const personalBtn = qs("#tabPersonal");
    const publicBtn = qs("#tabPublic");
    if (personalBtn) personalBtn.addEventListener("click", () => {
      history.replaceState(null, "", "station.html");
      renderStation("personal");
    });
    if (publicBtn) publicBtn.addEventListener("click", () => {
      history.replaceState(null, "", "station.html#public");
      renderStation("public");
    });
  }

  // -------- Boot --------

  function boot() {
    ensureTraditionalChinese();
    const page = document.body.getAttribute("data-page");
    if (page === "home") bootHome();
    else if (page === "order") bootOrder();
    else if (page === "checkout") bootCheckout();
    else if (page === "space") bootSpace();
    else if (page === "station") bootStation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

