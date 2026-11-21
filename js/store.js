// =====================================================================
// État en mémoire et fonctions de calcul.
// Aucun accès réseau ici : uniquement de la lecture des données chargées.
// =====================================================================

export const TABLES = ['biens', 'zones', 'chantiers', 'phases', 'travaux', 'dependances'];

export const STATUTS = [
  { id: 'a_faire', label: 'À faire', icone: '○' },
  { id: 'en_cours', label: 'En cours', icone: '▶' },
  { id: 'fait', label: 'Fait', icone: '✓' },
];

export const PRIORITES = [
  { id: 'haute', label: 'Haute', rang: 0 },
  { id: 'normale', label: 'Normale', rang: 1 },
  { id: 'basse', label: 'Basse', rang: 2 },
];

export const etat = {
  donnees: Object.fromEntries(TABLES.map((t) => [t, []])),
  utilisateur: null,
  bienId: null, // V1 : un seul bien, le premier créé
};

export function remplacerDonnees(donnees) {
  for (const t of TABLES) etat.donnees[t] = donnees[t] || [];
}

export const parId = (table, id) => etat.donnees[table].find((r) => r.id === id);
export const statut = (id) => STATUTS.find((s) => s.id === id) || STATUTS[0];
export const priorite = (id) => PRIORITES.find((p) => p.id === id) || PRIORITES[1];

const parOrdre = (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0);

export function zones() {
  return etat.donnees.zones.filter((z) => z.bien_id === etat.bienId).sort(parOrdre);
}

export function phasesDe(chantierId) {
  return etat.donnees.phases.filter((p) => p.chantier_id === chantierId).sort(parOrdre);
}

export function chantiersActifs() {
  return etat.donnees.chantiers.filter((c) => !c.supprime_le && c.bien_id === etat.bienId);
}

/** Un travail est visible s'il n'est pas à la corbeille, ni son chantier. */
export function travailVisible(t) {
  if (!t || t.supprime_le || t.bien_id !== etat.bienId) return false;
  if (t.chantier_id) {
    const c = parId('chantiers', t.chantier_id);
    if (!c || c.supprime_le) return false;
  }
  return true;
}

export const travauxActifs = () => etat.donnees.travaux.filter(travailVisible);
export const tachesDe = (chantierId) => travauxActifs().filter((t) => t.chantier_id === chantierId);

/** Travaux qui doivent être faits AVANT celui-ci. */
export function prerequis(travailId) {
  return etat.donnees.dependances
    .filter((d) => d.travail_id === travailId)
    .map((d) => parId('travaux', d.bloque_par_id))
    .filter(travailVisible);
}

/** Travaux qui attendent celui-ci. */
export function dependants(travailId) {
  return etat.donnees.dependances
    .filter((d) => d.bloque_par_id === travailId)
    .map((d) => parId('travaux', d.travail_id))
    .filter(travailVisible);
}

/** Prérequis pas encore faits : si la liste n'est pas vide, le travail est bloqué. */
export const bloquants = (t) => prerequis(t.id).filter((p) => p.statut !== 'fait');

/**
 * Ajouter « prerequisId bloque travailId » créerait-il une boucle ?
 * Oui si travailId est déjà, directement ou non, un prérequis de prerequisId.
 */
export function creeraitCycle(travailId, prerequisId) {
  const vus = new Set();
  const pile = [prerequisId];
  while (pile.length) {
    const id = pile.pop();
    if (id === travailId) return true;
    if (vus.has(id)) continue;
    vus.add(id);
    for (const d of etat.donnees.dependances) if (d.travail_id === id) pile.push(d.bloque_par_id);
  }
  return false;
}
