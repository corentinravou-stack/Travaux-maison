// =====================================================================
// Écrans « Travaux » (liste et kanban) + feuille d'ajout rapide.
// =====================================================================

import { parId, zones, phasesDe, travauxActifs, PRIORITES } from '../store.js';
import { esc, actions, ouvrirFeuille, fermerFeuille, puces, toast } from '../ui.js';
import { creerTravail } from '../donnees.js';
import { boutonNouvellePiece } from './pieces.js';
import { barreFiltres, lireFiltres, filtrer, trier, carteTravail, colonnesKanban, vide } from './composants.js';

export function vueListe() {
  const f = lireFiltres();
  const liste = trier(filtrer(travauxActifs(), f), f.tri);
  return {
    titre: 'Travaux',
    onglet: 'travaux',
    bascule: { liste: '#/', kanban: '#/kanban', actif: 'liste' },
    contenu: barreFiltres(f) + (liste.length
      ? `<div class="liste">${liste.map((t) => carteTravail(t)).join('')}</div>`
      : vide(travauxActifs().length
        ? 'Aucun travail ne correspond à ces filtres.'
        : 'Aucun travail pour l’instant.<br>Touchez <strong>+</strong> pour noter le premier.')),
  };
}

export function vueKanban() {
  const f = lireFiltres();
  const liste = trier(filtrer(travauxActifs(), f, { avecStatut: false }), f.tri);
  return {
    titre: 'Travaux',
    onglet: 'travaux',
    bascule: { liste: '#/', kanban: '#/kanban', actif: 'kanban' },
    large: true,
    contenu: barreFiltres(f, { avecStatut: false }) + colonnesKanban(liste),
  };
}

// --- Ajout rapide -----------------------------------------------------
// Seul l'intitulé est obligatoire. Après « Ajouter », la feuille reste
// ouverte pour enchaîner plusieurs saisies sur place.

actions['ajout-rapide'] = (el) => {
  const chantierId = el.dataset.chantier || '';
  const chantier = chantierId ? parId('chantiers', chantierId) : null;
  const phases = chantier ? phasesDe(chantier.id) : [];
  const zoneDefaut = chantier?.zone_id || '';

  ouvrirFeuille(`
    <form class="feuille" data-submit="ajout-rapide-envoi" data-chantier="${esc(chantierId)}">
      <div class="feuille-entete">
        <h2>${chantier ? `Nouvelle tâche · ${esc(chantier.intitule)}` : 'Nouveau travail'}</h2>
        <button type="button" class="bouton-icone" data-action="fermer-feuille" aria-label="Fermer">✕</button>
      </div>
      <input name="intitule" class="champ-principal" placeholder="Ex. Reboucher la fissure du couloir" required autocomplete="off" enterkeyhint="done" autofocus>
      ${phases.length ? `<p class="etiquette">Phase</p>${puces('phase', [{ id: '', label: 'Aucune' }, ...phases.map((p) => ({ id: p.id, label: p.nom }))], el.dataset.phase || '')}` : ''}
      <p class="etiquette">Pièce</p>
      ${puces('zone', [{ id: '', label: 'Aucune' }, ...zones().map((z) => ({ id: z.id, label: z.nom }))], zoneDefaut, boutonNouvellePiece)}
      <p class="etiquette">Priorité</p>
      ${puces('priorite', PRIORITES.map((p) => ({ id: p.id, label: p.label })), 'normale')}
      <div class="feuille-actions">
        <button type="button" class="secondaire" data-action="ajout-details">Plus de détails</button>
        <button type="submit" class="primaire">Ajouter</button>
      </div>
    </form>`);
};

function lireAjout(form) {
  const d = new FormData(form);
  const intitule = String(d.get('intitule') || '').trim();
  if (!intitule) return null;
  return creerTravail({
    intitule,
    zone_id: d.get('zone') || null,
    priorite: d.get('priorite') || 'normale',
    chantier_id: form.dataset.chantier || null,
    phase_id: d.get('phase') || null,
  });
}

actions['ajout-rapide-envoi'] = (form) => {
  const t = lireAjout(form);
  if (!t) return;
  toast(`« ${t.intitule} » ajouté`);
  form.intitule.value = '';
  form.querySelector('input[name=priorite][value=normale]').checked = true;
  form.intitule.focus();
  actions['rendre']();
};

actions['ajout-details'] = (el) => {
  const form = el.closest('form');
  if (!form.intitule.value.trim()) {
    form.intitule.focus();
    return;
  }
  const t = lireAjout(form);
  fermerFeuille();
  location.hash = `#/travail/${t.id}`;
};

