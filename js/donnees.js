// =====================================================================
// Modifications des données.
// Principe : on met d'abord à jour l'état local (l'écran réagit tout de
// suite), puis on enregistre en base. En cas d'échec, on prévient et on
// recharge tout depuis la base pour rester cohérent.
// =====================================================================

import { CONFIG } from './config.js';
import { etat, parId, remplacerDonnees } from './store.js';
import { toast } from './ui.js';

let backend;
let rendre = () => {};

export function brancher(moteur, fonctionRendu) {
  backend = moteur;
  rendre = fonctionRendu;
}

export const moteur = () => backend;
export const nouvelId = () => crypto.randomUUID();
const maintenant = () => new Date().toISOString();

// Nombre d'enregistrements partis vers la base et pas encore confirmés.
let ecritures = 0;
export const ecrituresEnCours = () => ecritures > 0;

async function enregistrer(operation) {
  ecritures += 1;
  try {
    await operation;
  } catch (e) {
    console.error(e);
    toast(`Échec de l'enregistrement : ${e.message}`, true);
    await recharger();
  } finally {
    ecritures -= 1;
  }
}

export async function recharger() {
  remplacerDonnees(await backend.toutCharger());
  rendre();
}

// --- Opérations génériques -------------------------------------------

export function inserer(table, ligne) {
  etat.donnees[table].push(ligne);
  return enregistrer(backend.inserer(table, ligne));
}

export function modifier(table, id, champs) {
  const ligne = parId(table, id);
  if (!ligne) return Promise.resolve();
  if ('modifie_le' in ligne) champs = { ...champs, modifie_le: maintenant() };
  Object.assign(ligne, champs);
  return enregistrer(backend.modifier(table, id, champs));
}

/** Suppression définitive (les éléments liés suivent les règles de la base). */
export async function supprimer(table, filtre) {
  await enregistrer(backend.supprimer(table, filtre));
  await recharger();
}

// --- Opérations métier -----------------------------------------------

export function creerTravail(champs) {
  const ligne = {
    id: nouvelId(),
    bien_id: etat.bienId,
    chantier_id: null,
    phase_id: null,
    zone_id: null,
    statut: 'a_faire',
    priorite: 'normale',
    date_cible: null,
    assigne_a: null,
    notes: null,
    budget_estime: null,
    budget_reel: null,
    cree_le: maintenant(),
    modifie_le: maintenant(),
    supprime_le: null,
    ...champs,
  };
  inserer('travaux', ligne);
  return ligne;
}

export function creerChantier(champs, nomsPhases = []) {
  const chantier = {
    id: nouvelId(),
    bien_id: etat.bienId,
    zone_id: null,
    priorite: 'normale',
    date_cible: null,
    notes: null,
    budget_estime: null,
    budget_reel: null,
    cree_le: maintenant(),
    modifie_le: maintenant(),
    supprime_le: null,
    ...champs,
  };
  // Le chantier doit exister en base avant ses phases : on enchaîne.
  etat.donnees.chantiers.push(chantier);
  const phases = nomsPhases.map((nom, i) => ({ id: nouvelId(), chantier_id: chantier.id, nom, ordre: i }));
  etat.donnees.phases.push(...phases);
  enregistrer((async () => {
    await backend.inserer('chantiers', chantier);
    for (const p of phases) await backend.inserer('phases', p);
  })());
  return chantier;
}

/** Crée une pièce (ou renvoie celle qui porte déjà ce nom). */
export function creerZone(nom) {
  const existante = etat.donnees.zones.find(
    (z) => z.bien_id === etat.bienId && z.nom.toLowerCase() === nom.toLowerCase());
  if (existante) return existante;
  const ordre = etat.donnees.zones.filter((z) => z.bien_id === etat.bienId).length;
  const zone = { id: nouvelId(), bien_id: etat.bienId, nom, ordre };
  inserer('zones', zone);
  return zone;
}

export const mettreALaCorbeille = (table, id) => modifier(table, id, { supprime_le: maintenant() });
export const sortirDeLaCorbeille = (table, id) => modifier(table, id, { supprime_le: null });

export function ajouterPrerequis(travailId, prerequisId) {
  return inserer('dependances', { travail_id: travailId, bloque_par_id: prerequisId });
}

export function retirerPrerequis(travailId, prerequisId) {
  etat.donnees.dependances = etat.donnees.dependances.filter(
    (d) => !(d.travail_id === travailId && d.bloque_par_id === prerequisId));
  return enregistrer(backend.supprimer('dependances', { travail_id: travailId, bloque_par_id: prerequisId }));
}

/** Échange la position de deux éléments ordonnés (zones, phases). */
export async function echangerOrdre(table, liste, index, sens) {
  const cible = index + sens;
  if (cible < 0 || cible >= liste.length) return;
  const a = liste[index];
  const b = liste[cible];
  // On renumérote toute la liste pour éviter les égalités d'ordre.
  const nouvelle = [...liste];
  nouvelle[index] = b;
  nouvelle[cible] = a;
  await Promise.all(nouvelle.map((el, i) => (el.ordre !== i ? modifier(table, el.id, { ordre: i }) : null)));
}

/**
 * Au démarrage : crée le bien et les zones si la base est vide, puis
 * vide la corbeille des éléments trop anciens.
 */
export async function preparer() {
  const biens = [...etat.donnees.biens].sort((a, b) => String(a.cree_le).localeCompare(String(b.cree_le)));
  if (!biens.length) {
    const bien = { id: nouvelId(), nom: 'Maison', cree_le: maintenant() };
    await backend.inserer('biens', bien);
    etat.donnees.biens.push(bien);
    biens.push(bien);
  }
  etat.bienId = biens[0].id;

  if (!etat.donnees.zones.some((z) => z.bien_id === etat.bienId)) {
    for (const [i, nom] of CONFIG.ZONES_DEPART.entries()) {
      const zone = { id: nouvelId(), bien_id: etat.bienId, nom, ordre: i };
      await backend.inserer('zones', zone);
      etat.donnees.zones.push(zone);
    }
  }

  const limite = Date.now() - CONFIG.JOURS_CORBEILLE * 86400000;
  for (const table of ['chantiers', 'travaux']) {
    for (const ligne of etat.donnees[table]) {
      if (ligne.supprime_le && new Date(ligne.supprime_le).getTime() < limite) {
        await backend.supprimer(table, { id: ligne.id });
      }
    }
  }
}
