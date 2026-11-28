# Travaux maison

Application web pour suivre les travaux de la maison, à deux, depuis un
téléphone ou un ordinateur. Elle s'installe sur l'écran d'accueil du
téléphone comme une application.

## Ce que fait la V1

- **Travaux simples** (liste à plat) et **chantiers** (tâches organisées en phases).
- Pour chaque travail : intitulé, pièce, statut (à faire / en cours / fait),
  priorité (haute / normale / basse), date cible, personne qui s'en occupe, notes.
- **Prérequis** : un travail peut attendre un ou plusieurs autres travaux.
  Tant qu'un prérequis n'est pas fait, le travail est marqué 🔒 bloqué.
  Les boucles (A attend B qui attend A) sont refusées.
- **Deux vues** : liste filtrable et triable, et kanban par statut.
- **Partage en temps réel** : une modification apparaît chez l'autre en quelques secondes.
- **Corbeille** de 30 jours, **export / import** d'une sauvegarde, sauvegarde automatique quotidienne.

Prévu dans la base mais pas encore affiché : budget estimé et réel, gestion de plusieurs biens.

## Architecture

```
Téléphone / ordinateur ──► Page web (GitHub Pages, gratuit)
                                │
                                ▼
                        Supabase (base de données + comptes, gratuit)
                                ▲
       Chaque nuit : GitHub Actions copie toutes les données
       dans un dépôt privé de sauvegarde (un fichier JSON par jour)
```

| Dossier / fichier | Rôle |
|---|---|
| `index.html`, `css/style.css` | La page et son apparence |
| `js/config.js` | **Seul fichier de réglage** : adresse et clé Supabase, personnes, pièces de départ |
| `js/app.js` | Démarrage, connexion, navigation entre les écrans |
| `js/store.js` | Données en mémoire et calculs (bloqué ou non, boucles…) |
| `js/donnees.js` | Création / modification / suppression des données |
| `js/db.js` | Dialogue avec Supabase, ou stockage local en mode démo |
| `js/vues/` | Un fichier par groupe d'écrans |
| `js/lib/` | Bibliothèque officielle Supabase (copie de la version 2.118.0) |
| `supabase/schema.sql` | Création des tables et règles de sécurité |
| `EVOLUTIONS.md` | Liste des évolutions demandées |
| `sauvegarde/` | Fichiers du dépôt privé de sauvegarde quotidienne |

Pas d'outil de compilation : les fichiers sont servis tels quels.
Sans configuration Supabase, l'application démarre en **mode démo**
(données stockées dans le navigateur uniquement).

## Mise en service (une seule fois)

Le pas-à-pas détaillé est dans [MISE-EN-SERVICE.md](MISE-EN-SERVICE.md).

## Récupérer ses données

- **À tout moment** : Réglages > « Télécharger une sauvegarde » (fichier JSON).
- **Automatiquement** : chaque nuit, un fichier `sauvegardes/AAAA-MM-JJ.json`
  dans le dépôt GitHub privé de sauvegarde.
- **Restaurer** : Réglages > « Restaurer une sauvegarde », avec l'un de ces fichiers.
  La restauration ajoute ou remplace les éléments du fichier sans rien effacer d'autre.
- **Élément supprimé par erreur** : Réglages > Corbeille (30 jours).

## Essayer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000 (mode démo si `js/config.js` n'est pas rempli).
