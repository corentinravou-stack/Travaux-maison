# Notes pour les évolutions futures

- Propriétaire non développeur : expliquer en français, sans jargon, et
  détailler pas à pas toute action qui lui revient (compte, réglage, déploiement).
- Code et interface en français. JavaScript sans framework ni étape de
  compilation (modules ES servis tels quels par GitHub Pages). Garder ce choix.
- `js/config.js` est le seul fichier de réglage. Vide = mode démo (localStorage).
- Toute modification du modèle de données doit être faite à trois endroits :
  1. une migration SQL ajoutée dans `supabase/` (ne pas modifier `schema.sql`
     déjà exécuté ; créer `supabase/migrations/AAAA-MM-JJ-description.sql`
     et donner à l'utilisateur la marche à suivre dans le SQL Editor) ;
  2. `REGLES_SUPPRESSION` dans `js/db.js` si une clé étrangère est ajoutée ;
  3. les valeurs par défaut dans `js/donnees.js` (`creerTravail`, `creerChantier`).
- Les événements passent par des attributs `data-action` / `data-change` /
  `data-input` / `data-submit`, branchés sur le registre `actions` de `js/ui.js`.
- `modifier()` et `inserer()` ne redessinent pas l'écran, pour ne pas
  interrompre une saisie : appeler `actions.rendre()` quand l'affichage doit changer.
- Tester avant de livrer : servir le dossier (`python3 -m http.server`) et
  piloter avec Playwright en mode démo (viewport téléphone et ordinateur).
- Sauvegardes : `sauvegarde/` contient les fichiers du dépôt GitHub PRIVÉ séparé
  (le dépôt de l'application est public pour GitHub Pages gratuit, il ne doit
  jamais contenir de données).
