-- Schema de la base D1 "hybride-coaching" (deja cree dans ton compte Cloudflare).
-- Ce fichier sert seulement de reference ou pour recreer la base en local.
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, prenom TEXT NOT NULL, nom TEXT NOT NULL, tel TEXT, pass_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, ref TEXT NOT NULL UNIQUE, user_id INTEGER, produit TEXT NOT NULL, prix_eur INTEGER NOT NULL, methode TEXT, status TEXT NOT NULL DEFAULT 'en_attente', client_prenom TEXT, client_nom TEXT, client_tel TEXT, client_email TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), paid_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE login_fails (email TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX idx_fails ON login_fails(email, ts);
