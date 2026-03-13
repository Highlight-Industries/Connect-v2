const SHOPIFY_URL = "https://www.highlightindustries.net/pages/connect-v2";
const CSV_URL = "./employees.csv";
const DEFAULT_PHOTO = "./assets/building.png";
const VCARD_PHOTO_URL = "./assets/building.png";
const WEBSITE_URL = "https://www.highlightindustries.com";

const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed", left: "50%", bottom: "22px", transform: "translateX(-50%)",
    background: "rgba(0,0,0,.78)", border: "1px solid rgba(255,255,255,.16)", color: "#fff",
    padding: "10px 12px", borderRadius: "14px", zIndex: "9999", fontWeight: "700"
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .25s"; }, 1400);
  setTimeout(() => t.remove(), 1750);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function normalize(s) { return String(s ?? "").trim().toLowerCase(); }
function buildPhoneDisplay(phone, ext) { return phone ? `${String(phone).replace(/\s+/g, " ").trim()}${ext ? ` ext ${ext}` : ""}` : ""; }
function buildTelHref(phone) { return phone ? `tel:${String(phone).replace(/[^0-9+]/g, "")}` : "#"; }
function buildMailHref(email) { return email ? `mailto:${email}` : "#"; }
function qrImgUrl(text) { return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=220`; }
function safeWebUrl(emp) {
  const raw = (emp.website && String(emp.website).trim()) ? String(emp.website).trim() : WEBSITE_URL;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}
function profileUrlFor(emp){
  const id = encodeURIComponent(String(emp?.id || "").trim().toLowerCase());
  return `${SHOPIFY_URL}?id=${id}#${id}`;
}

function parseCsv(text) {
  const rows = []; let row = []; let cur = ""; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"') { if (inQuotes && next === '"') { cur += '"'; i++; } else inQuotes = !inQuotes; continue; }
    if (!inQuotes && ch === ',') { row.push(cur); cur = ""; continue; }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cur); cur = "";
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = []; continue;
    }
    cur += ch;
  }
  row.push(cur);
  if (row.some(cell => cell.length > 0)) rows.push(row);
  if (!rows.length) return [];
  const header = rows[0].map(h => normalize(h));
  return rows.slice(1).map(cols => {
    const obj = {};
    header.forEach((h, idx) => obj[h] = (cols[idx] ?? "").trim());
    return obj;
  }).filter(r => Object.values(r).some(v => String(v).trim().length));
}

let EMPLOYEES = [];
let current = null;

const els = {
  employeeSearch: $("#employeeSearch"),
  deskSaveHit: $("#deskSaveHit"),
  deskShareHit: $("#deskShareHit"),
  openBtn: $("#openBtn"),
  clearBtn: $("#clearBtn"),
  deskPhoto: $("#deskPhoto"),
  deskName: $("#deskName"),
  deskTitle: $("#deskTitle"),
  deskBooth: $("#deskBooth"),
  deskPhone: $("#deskPhone"),
  deskEmail: $("#deskEmail"),
  deskWeb: $("#deskWeb"),
  mobQr: $("#mobQr"),
  mobPhoto: $("#mobPhoto"),
  mobName: $("#mobName"),
  mobTitle: $("#mobTitle"),
  mobBooth: $("#mobBooth"),
  mobPhone: $("#mobPhone"),
  mobEmail2: $("#mobEmail2"),
  mobShareBtn: $("#mobShareBtn"),
  mobDirectoryBtn: $("#mobDirectoryBtn"),
  mobAddBtn: $("#mobAddBtn"),
  modal: $("#modal"),
  modalBody: $("#modalBody"),
  modalTitle: $("#modalTitle"),
  mobCallHit: $("#mobCallHit"),
  mobEmailHit: $("#mobEmailHit"),
  mobWebHit: $("#mobWebHit"),
};

function findEmployee(query) {
  const q = normalize(query);
  if (!q) return null;
  return EMPLOYEES.find(e =>
    normalize(e.id) === q ||
    normalize(e.first) === q ||
    normalize(e.last) === q ||
    normalize(`${e.first} ${e.last}`) === q ||
    normalize(`${e.last}, ${e.first}`) === q
  ) || EMPLOYEES.find(e => normalize(`${e.first} ${e.last}`).includes(q));
}

function photoSrc(emp) {
  if (!emp || !emp.id) return DEFAULT_PHOTO;
  return `./assets/${String(emp.id).trim().toLowerCase()}.jpg`;
}

function renderEmployee(emp) {
  current = emp;
  const full = `${emp.first || ""} ${emp.last || ""}`.trim() || "Employee";
  const title = emp.title || "";
  const booth = (emp.booth || "").trim();
  const phoneDisp = buildPhoneDisplay(emp.phone, emp.phone_ext);
  const telHref = buildTelHref(emp.phone);
  const email = emp.email || "";
  const webUrl = safeWebUrl(emp);
  const cardUrl = profileUrlFor(emp);

  if (els.deskPhoto) { els.deskPhoto.src = photoSrc(emp); els.deskPhoto.onerror = () => { els.deskPhoto.src = DEFAULT_PHOTO; }; }
  if (els.mobPhoto) { els.mobPhoto.src = photoSrc(emp); els.mobPhoto.onerror = () => { els.mobPhoto.src = DEFAULT_PHOTO; }; }

  if (els.deskName) els.deskName.textContent = full;
  if (els.deskTitle) els.deskTitle.textContent = title;
  if (els.mobName) els.mobName.textContent = full;
  if (els.mobTitle) els.mobTitle.textContent = title;
  if (els.deskBooth) {
  if (booth) {
    els.deskBooth.textContent = `Booth: ${booth}`;
    els.deskBooth.hidden = false;
  } else {
    els.deskBooth.textContent = "";
    els.deskBooth.hidden = true;
  }
}

if (els.mobBooth) {
  if (booth) {
    els.mobBooth.textContent = `Booth: ${booth}`;
    els.mobBooth.hidden = false;
  } else {
    els.mobBooth.textContent = "";
    els.mobBooth.hidden = true;
  }
}

  if (els.deskPhone) { els.deskPhone.textContent = phoneDisp || "—"; els.deskPhone.href = telHref; }
  if (els.deskEmail) { els.deskEmail.textContent = email || "—"; els.deskEmail.href = buildMailHref(email); }
  if (els.deskWeb) els.deskWeb.href = webUrl;

  if (els.mobPhone) { els.mobPhone.textContent = phoneDisp || "—"; els.mobPhone.href = telHref; }
  if (els.mobEmail2) { els.mobEmail2.textContent = email || "—"; els.mobEmail2.href = buildMailHref(email); }

  if (els.mobQr) els.mobQr.src = qrImgUrl(cardUrl);
}

function makeVCard(emp) {
  const full = `${emp.first || ""} ${emp.last || ""}`.trim();
  const n = `${emp.last || ""};${emp.first || ""};;;`;
  const tel = (emp.phone || "").trim().replace(/[^0-9+]/g, "");
  const email = (emp.email || "").trim();
  const title = (emp.title || "").trim();
  const photoAbs = new URL(VCARD_PHOTO_URL, window.location.href).href;
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${n}`,
    `FN:${full || "Highlight Industries"}`,
    title ? `TITLE:${title}` : null,
    "ORG:Highlight Industries",
    tel ? `TEL;TYPE=WORK,VOICE:${tel}` : null,
    email ? `EMAIL;TYPE=INTERNET:${email}` : null,
    `URL:${WEBSITE_URL}`,
    `PHOTO;VALUE=URI:${photoAbs}`,
    "END:VCARD",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function downloadVCard(emp) {
  const blob = new Blob([makeVCard(emp)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = `${(emp.first || "").trim()}_${(emp.last || "").trim()}`.replace(/\s+/g, "_") || "contact";
  a.href = url;
  a.download = `${safeName}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

async function nativeShare(emp) {
  const full = `${emp.first || ""} ${emp.last || ""}`.trim() || "Highlight Industries";
  const phoneDisp = buildPhoneDisplay(emp.phone, emp.phone_ext);
  const text = [full, emp.title || "", phoneDisp ? `Phone: ${phoneDisp}` : "", emp.email ? `Email: ${emp.email}` : "", `Connect: ${profileUrlFor(emp)}`].filter(Boolean).join("\n");
  if (!navigator.share) return false;
  try {
    await navigator.share({ title: `HI | Connect — ${full}`, text, url: profileUrlFor(emp) });
    return true;
  } catch {
    return false;
  }
}

function openModal(title, innerHtml) {
  if (!els.modal || !els.modalBody || !els.modalTitle) return;
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = innerHtml;
  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  if (!els.modal) return;
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
}

function openShareModal(emp) {
  const full = `${emp.first || ""} ${emp.last || ""}`.trim() || "Highlight Industries";
  const link = profileUrlFor(emp);
  openModal("Share", `
    <div class="card">
      <div class="share-grid">
        <div class="qrbox"><img alt="QR code to HI Connect" src="${qrImgUrl(link)}"></div>
        <div class="share-actions">
          <div style="font-weight:900;font-size:18px;">${escapeHtml(full)}</div>
          <div class="list">
            <button class="btn btn--solid" type="button" data-action="nativeShare">Share (AirDrop / Text / Email)</button>
            <button class="btn" type="button" data-action="copyLink">Copy Link</button>
            <button class="btn" type="button" data-action="downloadVcard">Download Contact (.vcf)</button>
          </div>
          <div class="small">If Share is not available, Copy Link works everywhere.</div>
        </div>
      </div>
    </div>
  `);

  els.modalBody?.querySelector('[data-action="nativeShare"]')?.addEventListener("click", async () => {
    const ok = await nativeShare(emp);
    if (ok) closeModal(); else toast("Share not available here — try Copy Link.");
  });
  els.modalBody?.querySelector('[data-action="copyLink"]')?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(link); toast("Copied!"); }
    catch {
      const inp = document.createElement("input"); inp.value = link; document.body.appendChild(inp); inp.select(); document.execCommand("copy"); inp.remove(); toast("Copied!");
    }
  });
  els.modalBody?.querySelector('[data-action="downloadVcard"]')?.addEventListener("click", () => downloadVCard(emp));
}

function openDirectoryModal() {
  const items = EMPLOYEES.map(e => `
    <div class="emp-item" data-emp="${escapeHtml(e.id)}">
      <div style="font-weight:900;font-size:16px;">${escapeHtml(`${e.first || ""} ${e.last || ""}`.trim())}</div>
      <div class="emp-sub">${escapeHtml(e.title || "")}</div>
    </div>
  `).join("");

  openModal("Find Employee", `
    <div class="card">
      <div style="display:flex;gap:10px;align-items:center;">
        <input id="dirSearch" type="search" placeholder="Search…" style="flex:1;padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;outline:0;">
        <button class="btn btn--solid" type="button" id="dirGo">Go</button>
      </div>
      <div style="height:10px"></div>
      <div id="dirList" style="display:grid;gap:10px;max-height:46vh;overflow:auto;">${items}</div>
    </div>
  `);

  const dirSearch = $("#dirSearch"), dirGo = $("#dirGo"), dirList = $("#dirList");
  function filter() {
    const q = normalize(dirSearch.value);
    Array.from(dirList.children).forEach(el => {
      const id = el.getAttribute("data-emp") || "";
      const emp = EMPLOYEES.find(e => normalize(e.id) === normalize(id));
      const full = normalize(`${emp?.first || ""} ${emp?.last || ""}`);
      const title = normalize(emp?.title || "");
      el.style.display = (!q || full.includes(q) || title.includes(q) || normalize(id).includes(q)) ? "" : "none";
    });
  }
  dirSearch.addEventListener("input", filter);
  dirGo.addEventListener("click", () => {
    const hit = findEmployee(dirSearch.value);
    if (hit) { renderEmployee(hit); closeModal(); }
    else toast("No match found.");
  });
  dirSearch.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); dirGo.click(); } });
  dirList.querySelectorAll(".emp-item").forEach(el => el.addEventListener("click", () => {
    const hit = EMPLOYEES.find(e => normalize(e.id) === normalize(el.getAttribute("data-emp")));
    if (hit) { renderEmployee(hit); closeModal(); }
  }));
}

function wireUI() {
  els.deskSaveHit?.addEventListener("click", () => current && downloadVCard(current));
  els.deskShareHit?.addEventListener("click", () => current && openShareModal(current));
  els.openBtn?.addEventListener("click", () => {
    const hit = findEmployee(els.employeeSearch?.value);
    if (hit) renderEmployee(hit); else toast("No match found.");
  });
  els.employeeSearch?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); els.openBtn?.click(); } });
  els.clearBtn?.addEventListener("click", () => { if (els.employeeSearch) els.employeeSearch.value = ""; toast("Cleared."); });
  els.mobAddBtn?.addEventListener("click", () => current && downloadVCard(current));
  els.mobShareBtn?.addEventListener("click", () => current && openShareModal(current));
  els.mobDirectoryBtn?.addEventListener("click", openDirectoryModal);
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.dataset.close === "1") closeModal();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

async function init() {
  try {
    const res = await fetch(`${CSV_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV load failed: ${res.status}`);
    EMPLOYEES = parseCsv(await res.text());
    if (!EMPLOYEES.length) throw new Error("No employees found in CSV.");
    wireUI();

    const params = new URLSearchParams(window.location.search);
    const hash = (window.location.hash || "").replace(/^#/, "").trim();
    const requestedId = normalize(params.get("id") || hash);
    const match = requestedId ? EMPLOYEES.find(e => normalize(e.id) === requestedId) : null;
    renderEmployee(match || EMPLOYEES.find(e => normalize(e.id) === "jessica") || EMPLOYEES[0]);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  } catch (err) {
    console.error(err);
    toast("Couldn't load employees.csv");
    if (els.deskName) els.deskName.textContent = "Error loading employees.csv";
    if (els.mobName) els.mobName.textContent = "Error loading employees.csv";
  }
}
init();
