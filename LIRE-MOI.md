# Hybride Coaching v22 — site + comptes réels

Contenu du dossier :
- `site/` : le site (pages, images, script.js, admin.html)
- `functions/api/[[path]].js` : le petit serveur (comptes, connexion, commandes, admin)
- `wrangler.toml` : lie le site à la base de données `hybride-coaching` (déjà créée dans ton compte Cloudflare)
- `schema.sql` : plan de la base (déjà appliqué, juste pour référence)

## Mise en ligne (une seule fois, ~15 min)

Pourquoi GitHub : l'envoi par glisser-déposer de Cloudflare Pages ne prend PAS en compte le dossier `functions`. Il faut relier le site à GitHub.

1. **GitHub** : crée (ou réutilise) un dépôt, puis mets-y TOUT le contenu de ce dossier (`site`, `functions`, `wrangler.toml`, `schema.sql`) à la racine. Ne mets jamais ta clé d'administration dedans.
2. **Cloudflare** → Workers & Pages → Create → onglet **Pages** → **Connect to Git** → choisis le dépôt.
   - Framework : None
   - Build command : (laisser vide)
   - Build output directory : `site`
   → Save and Deploy.
3. **Brancher la base** : ton projet Pages → Settings → **Bindings** → Add → **D1 database** → nom de variable `DB` → base `hybride-coaching`. Fais-le pour *Production* (et *Preview* si proposé). Puis Deployments → Retry deployment.
4. **Domaine** : retire `sportifhybride.com` de l'ancien projet (Custom domains → supprimer), puis ajoute-le au nouveau projet (Custom domains → Set up a domain).
5. **Vérifier** : ouvre `https://sportifhybride.com/api/me` → tu dois voir `{"user":null,"orders":[]}`. Puis crée un compte test sur `/compte`.

## Au quotidien
- Une commande arrive → elle apparaît sur `https://sportifhybride.com/admin` (saisis ta clé d'administration). Quand tu as reçu le paiement (PayPal ou Revolut), clique **Payée ✓** : le programme passe en « Payée — disponible » dans l'espace du client.
- Tu envoies le PDF par WhatsApp/e-mail avec la référence (HC-00001…).
- Mot de passe oublié : le client te contacte, tu me demandes de le réinitialiser (pas d'envoi d'e-mail automatique pour l'instant).

## Sécurité
- Mots de passe : jamais en clair (PBKDF2 + sel). Sessions : cookie HttpOnly, 30 jours.
- Les prix sont vérifiés côté serveur (catalogue dans `[[path]].js`) : si tu changes un prix sur le site, change-le aussi dans le catalogue.
- La clé d'administration n'est stockée qu'en empreinte dans la base. Si tu la perds, demande-moi d'en créer une nouvelle.

## Limites actuelles
- Pas d'e-mail automatique (confirmation, mot de passe oublié) ni de livraison automatique du PDF : prévu pour une v23 (service d'e-mail gratuit + stockage R2).
- Vérifie ta situation légale avant de vendre régulièrement (je ne suis pas juriste).
