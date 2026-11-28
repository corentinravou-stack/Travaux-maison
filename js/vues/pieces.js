// =====================================================================
// Création d'une pièce « à la volée », depuis les écrans de saisie.
// =====================================================================

import { actions, puce } from '../ui.js';
import { modifier, creerZone } from '../donnees.js';

export const NOUVELLE_PIECE = '__nouvelle__';

/** Bouton placé au bout de la rangée de pièces d'une feuille d'ajout. */
export const boutonNouvellePiece = '<button type="button" class="puce-ajout" data-action="nouvelle-piece-puce">+ Nouvelle pièce</button>';

/** Option placée en fin de liste déroulante « Pièce ». */
export const optionNouvellePiece = `<option value="${NOUVELLE_PIECE}">+ Nouvelle pièce…</option>`;

function demanderNom() {
  const nom = (prompt('Nom de la nouvelle pièce ou zone :') || '').trim();
  return nom || null;
}

// Dans une feuille d'ajout : crée la pièce et la sélectionne.
actions['nouvelle-piece-puce'] = (el) => {
  const nom = demanderNom();
  if (!nom) return;
  const zone = creerZone(nom);
  const rangee = el.closest('.puces');
  const deja = rangee.querySelector(`input[value="${zone.id}"]`);
  if (deja) deja.checked = true;
  else el.insertAdjacentHTML('beforebegin', puce('zone', { id: zone.id, label: zone.nom }, true));
};

// Dans une fiche : liste déroulante « Pièce ».
actions['choisir-zone'] = (el) => {
  const { table, id } = el.closest('[data-table]').dataset;
  let zoneId = el.value || null;
  if (zoneId === NOUVELLE_PIECE) {
    const nom = demanderNom();
    if (!nom) { actions['rendre'](); return; }
    zoneId = creerZone(nom).id;
  }
  modifier(table, id, { zone_id: zoneId });
  actions['rendre']();
};
