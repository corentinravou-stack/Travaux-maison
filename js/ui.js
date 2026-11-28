// =====================================================================
// Petits outils d'affichage partagés par tous les écrans.
// =====================================================================

/** Échappe le texte saisi avant de l'insérer dans le HTML (sécurité). */
export const esc = (texte) =>
  String(texte ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Registre des actions déclenchées par l'interface.
 * Un élément HTML porte data-action="nom" (clic), data-change="nom"
 * (modification d'un champ), data-input="nom" (frappe) ou
 * data-submit="nom" (formulaire). app.js appelle actions[nom](element, evenement).
 */
export const actions = {};

/** Date du jour au format AAAA-MM-JJ (heure locale). */
export function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  const memeAnnee = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(memeAnnee ? {} : { year: 'numeric' }) });
}

export const enRetard = (t) => t.date_cible && t.statut !== 'fait' && t.date_cible < aujourdhui();

let minuteurToast;
export function toast(message, erreur = false) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.textContent = message;
  el.className = `visible${erreur ? ' erreur' : ''}`;
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => { el.className = ''; }, erreur ? 6000 : 2500);
}

/** Affiche une feuille (panneau du bas) par-dessus l'écran. */
export function ouvrirFeuille(html) {
  fermerFeuille();
  const conteneur = document.createElement('div');
  conteneur.id = 'feuille';
  conteneur.innerHTML = `<div class="feuille-fond" data-action="fermer-feuille"></div>${html}`;
  document.body.append(conteneur);
  conteneur.querySelector('[autofocus]')?.focus();
}

export function fermerFeuille() {
  document.getElementById('feuille')?.remove();
}

actions['fermer-feuille'] = fermerFeuille;

/** Pastilles « radio » horizontales (zones, priorités, phases…). */
export function puce(nom, option, coche) {
  return `<label class="puce"><input type="radio" name="${nom}" value="${esc(option.id)}" ${coche ? 'checked' : ''}><span>${esc(option.label)}</span></label>`;
}

/** `suite` : HTML ajouté en fin de rangée (ex. bouton « + Nouvelle pièce »). */
export function puces(nom, options, valeur, suite = '') {
  return `<div class="puces">${options.map((o) => puce(nom, o, o.id === valeur)).join('')}${suite}</div>`;
}
