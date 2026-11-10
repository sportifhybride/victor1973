/* Serveur du site Hybride Coaching (Cloudflare Pages Functions + base D1)
   Toutes les routes commencent par /api/ . La base de donnees est liee sous le nom DB. */

const CATALOG = {
  "Formation PDF - Création de site": 15,
  "Performance en salle de musculation": 20,
  "Performance à la maison ou en extérieur": 20,
  "Nutrition seul": 8,
  "Nutrition avec accompagnement": 5,
  "Détente en salle de musculation": 10,
  "Détente à la maison ou en extérieur": 10,
  "Bench": 10,
  "Deadlift": 10,
  "Squat": 10,
  "Sbd Powerlifting": 20,
  "3 Fois Full": 15,
  "Gym Bro": 15,
  "Le Double Double": 15,
  "Jambe De Fer": 15,
  "Popeye": 15,
  "Coaching course à pied, 2 mois": 30,
  "Coaching course à pied, 6 mois": 75,
  "Coaching course à pied, saison complète": 120
};

const enc = new TextEncoder();
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000;
const COOKIE = 'hc_session';

/* ---------- utilitaires ---------- */
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}
const b64 = (buf) => { let s = ''; new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b))); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256hex(str) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(str))); }
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function hashPassword(password, saltBytes) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: PBKDF2_ITERATIONS }, key, 256);
  return b64(bits);
}
function getCookie(request, name) {
  const c = request.headers.get('cookie') || '';
  for (const part of c.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}
function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]{1,200}\.[^\s@]{2,}$/.test(e) && e.length <= 150;

async function readBody(request) {
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('application/json')) throw new HttpError(415, 'Format de requete invalide.');
  try { return await request.json(); } catch (e) { throw new HttpError(400, 'Requete illisible.'); }
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

/* ---------- sessions ---------- */
async function createSession(env, userId) {
  const raw = hex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256hex(raw);
  await env.DB.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`)
    .bind(tokenHash, userId).run();
  return raw;
}
async function currentUser(request, env) {
  const raw = getCookie(request, COOKIE);
  if (!raw || !/^[0-9a-f]{64}$/.test(raw)) return null;
  const tokenHash = await sha256hex(raw);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.prenom, u.nom, u.tel FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).bind(tokenHash).first();
  return row || null;
}
const publicUser = (u) => ({ prenom: u.prenom, nom: u.nom, email: u.email, tel: u.tel || '' });

/* ---------- limitation des essais ---------- */
async function tooManyFails(env, key, max) {
  const since = Date.now() - 15 * 60 * 1000;
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_fails WHERE email = ? AND ts > ?').bind(key, since).first();
  return (r?.n || 0) >= max;
}
async function addFail(env, key) {
  await env.DB.prepare('INSERT INTO login_fails (email, ts) VALUES (?, ?)').bind(key, Date.now()).run();
  if (Math.random() < 0.05) await env.DB.prepare('DELETE FROM login_fails WHERE ts < ?').bind(Date.now() - 24 * 3600 * 1000).run();
}

/* ---------- administration ---------- */
async function checkAdmin(env, key) {
  if (await tooManyFails(env, '__admin__', 10)) throw new HttpError(429, 'Trop d’essais. Reessaie dans 15 minutes.');
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'admin_key_hash'").first();
  const ok = row && typeof key === 'string' && safeEqual(row.value, await sha256hex(key));
  if (!ok) { await addFail(env, '__admin__'); throw new HttpError(401, 'Cle incorrecte.'); }
}

/* ---------- routes ---------- */
async function register(request, env) {
  const b = await readBody(request);
  const prenom = clean(b.prenom, 60), nom = clean(b.nom, 60), tel = clean(b.tel, 30);
  const email = clean(b.email, 150).toLowerCase(), password = String(b.password ?? '');
  if (!prenom || !nom) throw new HttpError(400, 'Renseigne ton prenom et ton nom.');
  if (!validEmail(email)) throw new HttpError(400, 'Renseigne une adresse email valide.');
  if (password.length < 8 || password.length > 100) throw new HttpError(400, 'Le mot de passe doit contenir entre 8 et 100 caracteres.');
  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) throw new HttpError(409, 'Un compte existe deja avec cet email. Connecte-toi.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt);
  const res = await env.DB.prepare('INSERT INTO users (email, prenom, nom, tel, pass_hash, salt) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(email, prenom, nom, tel, hash, b64(salt)).run();
  const userId = res.meta.last_row_id;
  const token = await createSession(env, userId);
  return json({ ok: true, user: { prenom, nom, email, tel } }, 200, { 'set-cookie': cookieHeader(token, SESSION_DAYS * 86400) });
}

async function login(request, env) {
  const b = await readBody(request);
  const email = clean(b.email, 150).toLowerCase(), password = String(b.password ?? '');
  if (!validEmail(email) || !password) throw new HttpError(400, 'Renseigne ton email et ton mot de passe.');
  if (await tooManyFails(env, email, 8)) throw new HttpError(429, 'Trop d’essais. Reessaie dans 15 minutes.');
  const u = await env.DB.prepare('SELECT id, email, prenom, nom, tel, pass_hash, salt FROM users WHERE email = ?').bind(email).first();
  const salt = u ? unb64(u.salt) : crypto.getRandomValues(new Uint8Array(16));
  const hash = await hashPassword(password, salt);
  if (!u || !safeEqual(hash, u.pass_hash)) {
    await addFail(env, email);
    throw new HttpError(401, 'Email ou mot de passe incorrect.');
  }
  await env.DB.prepare('DELETE FROM login_fails WHERE email = ?').bind(email).run();
  const token = await createSession(env, u.id);
  return json({ ok: true, user: publicUser(u) }, 200, { 'set-cookie': cookieHeader(token, SESSION_DAYS * 86400) });
}

async function logout(request, env) {
  const raw = getCookie(request, COOKIE);
  if (raw && /^[0-9a-f]{64}$/.test(raw)) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256hex(raw)).run();
  }
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
}

async function me(request, env) {
  const u = await currentUser(request, env);
  if (!u) return json({ user: null, orders: [] });
  const { results } = await env.DB.prepare(
    'SELECT ref, produit, prix_eur, methode, status, created_at, paid_at FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 200').bind(u.id).all();
  return json({ user: publicUser(u), orders: results });
}

async function deleteAccount(request, env) {
  const u = await currentUser(request, env);
  if (!u) throw new HttpError(401, 'Connecte-toi.');
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id).run();
  await env.DB.prepare('UPDATE orders SET user_id = NULL, client_prenom = ?, client_nom = ?, client_tel = ?, client_email = ? WHERE user_id = ?')
    .bind(u.prenom, u.nom, u.tel || '', u.email, u.id).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id).run();
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
}

async function createOrder(request, env) {
  const b = await readBody(request);
  const produit = clean(b.produit, 120);
  if (!Object.prototype.hasOwnProperty.call(CATALOG, produit)) throw new HttpError(400, 'Programme inconnu.');
  const prix = CATALOG[produit];
  const methode = ['paypal', 'revolut'].includes(b.methode) ? b.methode : null;
  const u = await currentUser(request, env);
  let c;
  if (u) {
    c = { prenom: u.prenom, nom: u.nom, tel: u.tel || '', email: u.email };
  } else {
    const g = b.client || {};
    c = { prenom: clean(g.prenom, 60), nom: clean(g.nom, 60), tel: clean(g.tel, 30), email: clean(g.email, 150).toLowerCase() };
    if (!c.prenom || !c.nom || !validEmail(c.email)) throw new HttpError(400, 'Renseigne ton prenom, ton nom et un email valide.');
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE client_email = ? AND created_at > datetime('now','-1 hour')").bind(c.email).first();
    if ((r?.n || 0) >= 10) throw new HttpError(429, 'Trop de commandes en peu de temps.');
  }
  const tmp = 'T' + hex(crypto.getRandomValues(new Uint8Array(6)));
  const ins = await env.DB.prepare(
    'INSERT INTO orders (ref, user_id, produit, prix_eur, methode, client_prenom, client_nom, client_tel, client_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(tmp, u ? u.id : null, produit, prix, methode, c.prenom, c.nom, c.tel, c.email).run();
  const id = ins.meta.last_row_id;
  const ref = 'HC-' + String(id).padStart(5, '0');
  await env.DB.prepare('UPDATE orders SET ref = ? WHERE id = ?').bind(ref, id).run();
  return json({ ok: true, ref, produit, prix_eur: prix });
}

async function adminOrders(request, env) {
  const b = await readBody(request);
  await checkAdmin(env, b.key);
  const { results } = await env.DB.prepare(
    `SELECT id, ref, produit, prix_eur, methode, status, created_at, paid_at, client_prenom, client_nom, client_tel, client_email, user_id
     FROM orders ORDER BY id DESC LIMIT 300`).all();
  return json({ orders: results });
}

async function adminMark(request, env) {
  const b = await readBody(request);
  await checkAdmin(env, b.key);
  const status = String(b.status);
  if (!['en_attente', 'payee', 'annulee'].includes(status)) throw new HttpError(400, 'Statut invalide.');
  const id = parseInt(b.id, 10);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Commande invalide.');
  await env.DB.prepare(`UPDATE orders SET status = ?, paid_at = CASE WHEN ? = 'payee' THEN datetime('now') ELSE NULL END WHERE id = ?`)
    .bind(status, status, id).run();
  return json({ ok: true });
}

/* ---------- point d'entree ---------- */
export async function onRequest(context) {
  const { request, env, params } = context;
  try {
    if (!env.DB) throw new HttpError(500, 'Base de donnees non liee au site.');
    const path = '/' + (Array.isArray(params.path) ? params.path.join('/') : params.path || '');
    const method = request.method;

    if (method === 'POST') {
      const origin = request.headers.get('origin');
      if (origin && new URL(origin).host !== new URL(request.url).host) throw new HttpError(403, 'Origine refusee.');
    }
    if (method === 'GET' && path === '/me') return await me(request, env);
    if (method === 'POST') {
      if (path === '/register') return await register(request, env);
      if (path === '/login') return await login(request, env);
      if (path === '/logout') return await logout(request, env);
      if (path === '/orders') return await createOrder(request, env);
      if (path === '/account/delete') return await deleteAccount(request, env);
      if (path === '/admin/orders') return await adminOrders(request, env);
      if (path === '/admin/mark') return await adminMark(request, env);
    }
    throw new HttpError(404, 'Introuvable.');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    return json({ error: 'Erreur du serveur. Reessaie dans un instant.' }, 500);
  }
}
