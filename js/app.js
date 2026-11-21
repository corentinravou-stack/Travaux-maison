// =====================================================================
// Point d'entrée : démarrage, connexion, navigation et écoute des clics.
//
// Navigation : l'adresse après « # » choisit l'écran.
//   #/                     liste des travaux
//   #/kanban               kanban des travaux
//   #/chantiers            liste des chantiers
//   #/chantier/ID          détail d'un chantier (#/chantier/ID/kanban)
//   #/chantier/ID/modifier modification du chantier et de ses phases
//   #/travail/ID           fiche d'un travail
//   #/reglages             réglages
// =====================================================================

import { creerBackend } from './db.js';
import { etat, remplacerDonnees } from './store.js';
import { esc, actions, toast, fermerFeuille } from './ui.js';
import { brancher, preparer, recharger } from './donnees.js';
import { vueListe, vueKanban } from './vues/travaux.js';
import { vueChantiers, vueChantier, vueModifierChantier } from './vues/chantiers.js';
import { vueTravail } from './vues/travail.js';
import { vueReglages } from './vues/reglages.js';

const app = document.getElementById('app');
let backend;

// --- Choix de l'écran -------------------------------------------------

function choisirVue() {
  const morceaux = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [ecran, id, option] = morceaux;
  switch (ecran) {
    case 'kanban': return vueKanban();
    case 'chantiers': return vueChantiers();
    case 'chantier': return option === 'modifier' ? vueModifierChantier(id) : vueChantier(id, option === 'kanban');
    case 'travail': return vueTravail(id);
    case 'reglages': return vueReglages();
    default: return vueListe();
  }
}

// --- Affichage --------------------------------------------------------

let rendreEnAttente = false;

/** Un champ de l'écran est-il en cours de saisie ? */
const saisieEnCours = () => document.activeElement?.matches('input, textarea, select') && app.contains(document.activeElement);

function rendre() {
  rendreEnAttente = false;
  const v = choisirVue();
  const defilement = window.scrollY;
  const bascule = v.bascule ? `
    <div class="bascule" role="tablist">
      <a href="${v.bascule.liste}" class="${v.bascule.actif === 'liste' ? 'actif' : ''}">☰ Liste</a>
      <a href="${v.bascule.kanban}" class="${v.bascule.actif === 'kanban' ? 'actif' : ''}">▥ Kanban</a>
    </div>` : '';
  const fab = v.sansFab ? '' : (() => {
    const f = v.fab || { action: 'ajout-rapide', libelle: 'Nouveau travail' };
    return `<button class="fab" data-action="${f.action}" ${f.chantier ? `data-chantier="${f.chantier}"` : ''} aria-label="${f.libelle}"><span>+</span><span class="fab-texte">${f.libelle}</span></button>`;
  })();
  const onglet = (cle, href, icone, libelle) =>
    `<a href="${href}" class="${v.onglet === cle ? 'actif' : ''}"><span aria-hidden="true">${icone}</span>${libelle}</a>`;

  app.innerHTML = `
    <nav class="navigation">
      <div class="marque">🏠 Travaux</div>
      ${onglet('travaux', '#/', '✓', 'Travaux')}
      ${onglet('chantiers', '#/chantiers', '🏗', 'Chantiers')}
      ${onglet('reglages', '#/reglages', '⚙', 'Réglages')}
    </nav>
    <div class="page${v.large ? ' page-large' : ''}">
      <header class="entete">
        ${v.retour ? `<a class="retour" href="${v.retour}" aria-label="Retour">‹</a>` : ''}
        <h1>${esc(v.titre)}</h1>
        ${bascule}
      </header>
      ${backend.mode === 'demo' ? '<div class="bandeau-demo">Mode démo : données enregistrées sur cet appareil uniquement.</div>' : ''}
      <main class="contenu">${v.contenu}</main>
    </div>
    ${fab}`;
  window.scrollTo(0, defilement);
}

actions['rendre'] = rendre;

/** Quand l'autre personne modifie quelque chose : on recharge (en différé). */
let minuteurRechargement;
function surModificationDistante() {
  clearTimeout(minuteurRechargement);
  minuteurRechargement = setTimeout(async () => {
    remplacerDonnees(await backend.toutCharger());
    // Ne pas effacer ce que l'utilisateur est en train de taper.
    if (saisieEnCours() || document.getElementById('feuille')) rendreEnAttente = true;
    else rendre();
  }, 400);
}

// --- Écoute des événements (un seul écouteur par type) ----------------

function brancherEvenements() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const action = actions[el.dataset.action];
    if (!action) return;
    if (el.tagName !== 'A') e.preventDefault();
    e.stopPropagation();
    action(el, e);
  });

  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el) actions[el.dataset.change]?.(el, e);
  });

  const surSaisie = (e) => {
    const el = e.target.closest('[data-input]');
    if (el) actions[el.dataset.input]?.(el, e);
  };
  document.addEventListener('input', surSaisie);
  document.addEventListener('focusin', surSaisie);

  document.addEventListener('focusout', () => {
    // Un rendu a été retardé pendant la saisie : on le fait maintenant.
    setTimeout(() => { if (rendreEnAttente && !saisieEnCours() && !document.getElementById('feuille')) rendre(); }, 50);
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-submit]');
    if (!form) return;
    e.preventDefault();
    actions[form.dataset.submit]?.(form, e);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fermerFeuille();
  });

  // Glisser-déposer des cartes du kanban (ordinateur).
  document.addEventListener('dragstart', (e) => {
    const carte = e.target.closest('.carte[draggable]');
    if (carte) e.dataTransfer.setData('text/plain', carte.dataset.id);
  });
  document.addEventListener('dragover', (e) => {
    const colonne = e.target.closest('.colonne');
    if (!colonne) return;
    e.preventDefault();
    document.querySelectorAll('.colonne.survol').forEach((c) => c !== colonne && c.classList.remove('survol'));
    colonne.classList.add('survol');
  });
  document.addEventListener('drop', (e) => {
    const colonne = e.target.closest('.colonne');
    if (!colonne) return;
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      actions['deposer-statut'](id, colonne.dataset.statut);
    }
  });
  document.addEventListener('dragend', () => document.querySelectorAll('.colonne.survol').forEach((c) => c.classList.remove('survol')));

  window.addEventListener('hashchange', () => {
    fermerFeuille();
    window.scrollTo(0, 0);
    rendre();
  });
}

// --- Connexion --------------------------------------------------------

function afficherConnexion(message = '') {
  app.innerHTML = `
    <div class="connexion">
      <h1>🏠 Travaux maison</h1>
      <form data-submit="connexion">
        <label class="etiquette" for="email">E-mail</label>
        <input id="email" name="email" type="email" autocomplete="username" required>
        <label class="etiquette" for="mdp">Mot de passe</label>
        <input id="mdp" name="mdp" type="password" autocomplete="current-password" required>
        ${message ? `<p class="erreur-texte">${esc(message)}</p>` : ''}
        <button type="submit" class="primaire">Se connecter</button>
      </form>
    </div>`;
}

actions['connexion'] = async (form) => {
  const bouton = form.querySelector('button');
  bouton.disabled = true;
  bouton.textContent = 'Connexion…';
  try {
    etat.utilisateur = await backend.connexion(form.email.value.trim(), form.mdp.value);
    await ouvrirApplication();
  } catch (e) {
    afficherConnexion(e.message);
  }
};

// --- Démarrage --------------------------------------------------------

async function ouvrirApplication() {
  remplacerDonnees(await backend.toutCharger());
  await preparer();
  remplacerDonnees(await backend.toutCharger());
  backend.ecouter(surModificationDistante);
  rendre();
}

async function demarrer() {
  brancherEvenements();
  try {
    backend = await creerBackend();
    brancher(backend, rendre);
    etat.utilisateur = await backend.utilisateur();
    if (!etat.utilisateur) return afficherConnexion();
    await ouvrirApplication();
  } catch (e) {
    console.error(e);
    app.innerHTML = `
      <div class="connexion">
        <h1>Connexion impossible</h1>
        <p>${esc(e.message)}</p>
        <p class="aide">Vérifiez votre connexion internet puis réessayez.</p>
        <button class="primaire" onclick="location.reload()">Réessayer</button>
      </div>`;
  }
}

// Recharger les données en revenant sur l'appli (téléphone mis en veille).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && backend && etat.bienId) recharger().catch(() => toast('Hors connexion', true));
});

demarrer();
