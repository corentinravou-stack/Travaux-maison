// =====================================================================
// Éléments réutilisés : carte d'un travail, barre de filtres, tri.
// =====================================================================

import { CONFIG } from '../config.js';
import { parId, zones, statut, priorite, bloquants, STATUTS, PRIORITES } from '../store.js';
import { esc, formatDate, enRetard, actions, toast } from '../ui.js';
import { modifier } from '../donnees.js';

// --- Carte d'un travail ----------------------------------------------

export function carteTravail(t, { afficherChantier = true, kanban = false } = {}) {
  const bloques = bloquants(t);
  const s = statut(t.statut);
  const zone = t.zone_id ? parId('zones', t.zone_id)?.nom : '';
  const chantier = afficherChantier && t.chantier_id ? parId('chantiers', t.chantier_id)?.intitule : '';
  const phase = t.phase_id ? parId('phases', t.phase_id)?.nom : '';

  const meta = [
    zone && `<span>📍 ${esc(zone)}</span>`,
    chantier && `<span>🏗 ${esc(chantier)}${phase ? ` › ${esc(phase)}` : ''}</span>`,
    !chantier && phase && `<span>${esc(phase)}</span>`,
    t.date_cible && `<span class="${enRetard(t) ? 'retard' : ''}">📅 ${formatDate(t.date_cible)}</span>`,
    t.assigne_a && `<span>👤 ${esc(t.assigne_a)}</span>`,
  ].filter(Boolean).join('');

  const iStatut = STATUTS.findIndex((x) => x.id === t.statut);
  const deplacer = kanban ? `
    <div class="carte-deplacer">
      <button data-action="deplacer-statut" data-id="${t.id}" data-sens="-1" ${iStatut === 0 ? 'disabled' : ''} aria-label="Statut précédent">‹</button>
      <button data-action="deplacer-statut" data-id="${t.id}" data-sens="1" ${iStatut === STATUTS.length - 1 ? 'disabled' : ''} aria-label="Statut suivant">›</button>
    </div>` : '';

  return `
    <article class="carte statut-${t.statut}${bloques.length ? ' est-bloque' : ''}" data-action="ouvrir-travail" data-id="${t.id}" ${kanban ? 'draggable="true"' : ''}>
      ${kanban ? '' : `<button class="pastille-statut" data-action="statut-suivant" data-id="${t.id}" title="${s.label} — toucher pour changer" aria-label="Statut : ${s.label}. Toucher pour passer au suivant">${s.icone}</button>`}
      <div class="carte-corps">
        <div class="carte-titre">${esc(t.intitule)}</div>
        ${meta ? `<div class="carte-meta">${meta}</div>` : ''}
        ${bloques.length ? `<div class="alerte-bloque">🔒 Bloqué par : ${bloques.map((b) => esc(b.intitule)).join(', ')}</div>` : ''}
      </div>
      ${t.priorite !== 'normale' ? `<span class="prio prio-${t.priorite}">${priorite(t.priorite).label}</span>` : ''}
      ${deplacer}
    </article>`;
}

function changerStatut(id, nouveau) {
  const t = parId('travaux', id);
  if (!t) return;
  const bloques = bloquants(t);
  if (nouveau !== 'a_faire' && bloques.length) {
    toast(`Attention : encore bloqué par « ${bloques[0].intitule} »`);
  }
  modifier('travaux', id, { statut: nouveau });
  actions['rendre']();
}

actions['statut-suivant'] = (el) => {
  const t = parId('travaux', el.dataset.id);
  const i = STATUTS.findIndex((s) => s.id === t.statut);
  changerStatut(t.id, STATUTS[(i + 1) % STATUTS.length].id);
};

actions['deplacer-statut'] = (el) => {
  const t = parId('travaux', el.dataset.id);
  const i = STATUTS.findIndex((s) => s.id === t.statut) + Number(el.dataset.sens);
  if (STATUTS[i]) changerStatut(t.id, STATUTS[i].id);
};

actions['deposer-statut'] = (id, nouveau) => changerStatut(id, nouveau);

actions['ouvrir-travail'] = (el) => { location.hash = `#/travail/${el.dataset.id}`; };

// --- Filtres (mémorisés sur l'appareil) -------------------------------

const CLE_FILTRES = 'travaux-maison-filtres';
const FILTRES_DEFAUT = { zone: '', statut: 'actifs', priorite: '', type: '', tri: 'date' };

export function lireFiltres() {
  try {
    return { ...FILTRES_DEFAUT, ...JSON.parse(localStorage.getItem(CLE_FILTRES)) };
  } catch {
    return { ...FILTRES_DEFAUT };
  }
}

actions['filtre'] = (el) => {
  const f = { ...lireFiltres(), [el.name]: el.value };
  try { localStorage.setItem(CLE_FILTRES, JSON.stringify(f)); } catch { /* ignoré */ }
  actions['rendre']();
};

actions['filtres-reinitialiser'] = () => {
  try { localStorage.removeItem(CLE_FILTRES); } catch { /* ignoré */ }
  actions['rendre']();
};

function selecteur(nom, libelle, options, valeur) {
  return `
    <label class="filtre${valeur && valeur !== FILTRES_DEFAUT[nom] ? ' filtre-actif' : ''}">
      <span>${libelle}</span>
      <select name="${nom}" data-change="filtre">
        ${options.map(([v, l]) => `<option value="${esc(v)}" ${v === valeur ? 'selected' : ''}>${esc(l)}</option>`).join('')}
      </select>
    </label>`;
}

export function barreFiltres(f, { avecStatut = true } = {}) {
  const modifie = Object.keys(FILTRES_DEFAUT).some((k) => (avecStatut || k !== 'statut') && f[k] !== FILTRES_DEFAUT[k]);
  return `
    <div class="filtres">
      ${selecteur('zone', 'Pièce', [['', 'Toutes'], ...zones().map((z) => [z.id, z.nom])], f.zone)}
      ${avecStatut ? selecteur('statut', 'Statut', [['actifs', 'À faire + en cours'], ['', 'Tous'], ...STATUTS.map((s) => [s.id, s.label]), ['bloques', '🔒 Bloqués']], f.statut) : ''}
      ${selecteur('priorite', 'Priorité', [['', 'Toutes'], ...PRIORITES.map((p) => [p.id, p.label])], f.priorite)}
      ${selecteur('type', 'Type', [['', 'Tout'], ['simples', 'Travaux simples'], ['chantiers', 'Tâches de chantier']], f.type)}
      ${selecteur('tri', 'Trier par', [['date', 'Date cible'], ['priorite', 'Priorité'], ['zone', 'Pièce'], ['recent', 'Plus récents']], f.tri)}
      ${modifie ? '<button class="lien" data-action="filtres-reinitialiser">Réinitialiser</button>' : ''}
    </div>`;
}

export function filtrer(liste, f, { avecStatut = true } = {}) {
  return liste.filter((t) => {
    if (f.zone && t.zone_id !== f.zone) return false;
    if (f.priorite && t.priorite !== f.priorite) return false;
    if (f.type === 'simples' && t.chantier_id) return false;
    if (f.type === 'chantiers' && !t.chantier_id) return false;
    if (avecStatut) {
      if (f.statut === 'actifs' && t.statut === 'fait') return false;
      if (f.statut === 'bloques' && (t.statut === 'fait' || !bloquants(t).length)) return false;
      if (['a_faire', 'en_cours', 'fait'].includes(f.statut) && t.statut !== f.statut) return false;
    }
    return true;
  });
}

const rangZone = (t) => parId('zones', t.zone_id)?.ordre ?? 9999;
const parDate = (a, b) => (a.date_cible || '9999').localeCompare(b.date_cible || '9999');
const parPrio = (a, b) => priorite(a.priorite).rang - priorite(b.priorite).rang;

export function trier(liste, tri) {
  const comparateurs = {
    date: (a, b) => parDate(a, b) || parPrio(a, b),
    priorite: (a, b) => parPrio(a, b) || parDate(a, b),
    zone: (a, b) => rangZone(a) - rangZone(b) || parPrio(a, b) || parDate(a, b),
    recent: (a, b) => String(b.cree_le).localeCompare(String(a.cree_le)),
  };
  return [...liste].sort(comparateurs[tri] || comparateurs.date);
}

export const optionsPersonnes = () => CONFIG.PERSONNES.map((p) => ({ id: p, label: p }));

export function vide(message) {
  return `<div class="vide"><p>${message}</p></div>`;
}

export function colonnesKanban(liste, options = {}) {
  return `
    <div class="kanban">
      ${STATUTS.map((s) => {
        const cartes = liste.filter((t) => t.statut === s.id);
        return `
          <section class="colonne" data-statut="${s.id}">
            <h2>${s.icone} ${s.label} <span class="compteur">${cartes.length}</span></h2>
            <div class="colonne-cartes">
              ${cartes.map((t) => carteTravail(t, { ...options, kanban: true })).join('') || '<p class="colonne-vide">Rien ici</p>'}
            </div>
          </section>`;
      }).join('')}
    </div>`;
}

