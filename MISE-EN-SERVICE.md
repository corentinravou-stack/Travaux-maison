# Mise en service — pas à pas

Durée totale : environ 30 minutes, une seule fois. Les écrans des sites
évoluent parfois : si un libellé diffère un peu, cherchez le plus proche.

Ce qui est **public** et ce qui est **privé** :

- le **code** de l'application est dans un dépôt GitHub public : c'est ce qui
  rend l'hébergement gratuit. Il ne contient aucune donnée ;
- vos **données** sont dans Supabase, accessibles uniquement aux deux adresses
  e-mail autorisées ;
- les **sauvegardes** sont dans un second dépôt GitHub, **privé**.

---

## Étape 1 — GitHub (le code et l'hébergement)

1. Créez un compte sur https://github.com/signup (si vous n'en avez pas).
2. En haut à droite : **+** › **New repository**.
   - Repository name : `travaux-maison`
   - Visibilité : **Public**
   - Ne cochez rien d'autre › **Create repository**.
3. Recommencez pour un second dépôt :
   - Repository name : `travaux-maison-sauvegardes`
   - Visibilité : **Private** › **Create repository**.
4. Donnez-moi accès à ces deux dépôts depuis Claude (je vous indiquerai
   le bouton au moment voulu), puis j'y dépose le code.

## Étape 2 — Supabase (la base de données)

1. Allez sur https://supabase.com › **Start your project** › connectez-vous
   avec **GitHub** (pas de mot de passe de plus à retenir).
2. **New project** :
   - Name : `travaux-maison`
   - Database Password : cliquez sur **Generate a password** et
     conservez-le dans votre gestionnaire de mots de passe (il ne servira
     normalement jamais) ;
   - Region : **West EU (Paris)** ;
   - Plan : **Free** › **Create new project**. Attendez 1 à 2 minutes.
3. Menu de gauche › **SQL Editor** › **New query**. Collez le contenu du
   fichier `supabase/schema.sql` (je vous le fournirai déjà rempli avec vos
   deux adresses), puis cliquez **Run**. Le message attendu est « Success ».
4. Menu de gauche › **Authentication** › **Sign In / Providers** (ou *Settings*) :
   **désactivez** « Allow new users to sign up », puis **Save**.
   Ainsi personne d'autre ne peut créer de compte.
5. **Authentication** › **Users** › **Add user** › **Create new user** :
   - votre e-mail et un mot de passe de votre choix ;
   - cochez **Auto Confirm User** › **Create user**.

   Recommencez pour votre conjointe.
6. Menu de gauche › **Project Settings** (roue dentée) › **API Keys**
   (ou **Data API**) :
   - copiez la **Project URL** (`https://xxxx.supabase.co`) ;
   - copiez la clé **publishable** (ou **anon public**).

   Envoyez-moi ces deux valeurs : elles sont faites pour être publiques.
   ⚠️ Ne m'envoyez **jamais** la clé **secret** / **service_role** : elle ne
   sert qu'à l'étape 4, directement dans GitHub.

## Étape 3 — Mise en ligne de l'application

Une fois que j'ai déposé le code avec vos valeurs Supabase :

1. Sur GitHub, dépôt `travaux-maison` › **Settings** › **Pages**.
2. Source : **Deploy from a branch** › Branch : **main**, dossier **/ (root)** › **Save**.
3. Après 1 à 2 minutes, l'adresse s'affiche en haut de la page :
   `https://VOTRE-PSEUDO.github.io/travaux-maison/`.

Ensuite, chaque évolution que je dépose est mise en ligne automatiquement.

## Étape 4 — Sauvegarde automatique quotidienne

1. Dans Supabase › **Project Settings** › **API Keys** : copiez la clé
   **secret** (ou **service_role**).
2. Sur GitHub, dépôt **privé** `travaux-maison-sauvegardes` › **Settings** ›
   **Secrets and variables** › **Actions** › **New repository secret** :
   - Name `SUPABASE_URL`, Secret : la Project URL › **Add secret** ;
   - Name `SUPABASE_SECRET_KEY`, Secret : la clé secret › **Add secret**.
3. Onglet **Actions** › **Sauvegarde quotidienne** › **Run workflow**. Au bout
   d'une minute, un dossier `sauvegardes/` apparaît avec le fichier du jour.

Ensuite, la sauvegarde se fait seule chaque nuit. Cette activité quotidienne
devrait aussi éviter la mise en pause du projet Supabase gratuit. Si le projet
se met tout de même en pause, ouvrez Supabase et cliquez **Restore project** :
aucune donnée n'est perdue.

## Étape 5 — Sur vos téléphones

1. Ouvrez l'adresse de l'étape 3 et connectez-vous.
2. Ajoutez l'application à l'écran d'accueil :
   - **iPhone (Safari)** : bouton Partager › **Sur l'écran d'accueil** ;
   - **Android (Chrome)** : menu ⋮ › **Installer l'application** (ou
     **Ajouter à l'écran d'accueil**).

Sur ordinateur, ajoutez simplement l'adresse à vos favoris.
