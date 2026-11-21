// =====================================================================
// Réglages : pièces/zones, sauvegarde (export/import), corbeille, compte.
// =====================================================================

import { CONFIG } from '../config.js';
import { etat, parId, zones, TABLES } from '../store.js';
import { esc, actions, toast, aujourdhui } from '../ui.js';
import {
  modifier, inserer, supprimer, nouvelId, echangerOrdre, sortirDeLaCorbeille, moteur, recharger,
} from '../donnees.js';

export function vueReglages() {
  const listeZones = zones();
  const corbeille = [
    ...etat.donnees.chantiers.filter((c) => c.supprime_le).map((c) => ({ ...c, table: 'chantiers', type: 'Chantier' })),
    ...etat.donnees.travaux
      .filter((t) => t.supprime_le && !parId('chantiers', t.chantier_id)?.supprime_le)
      .map((t) => ({ ...t, table: 'travaux', type: t.chantier_id ? 'Tâche' : 'Travail' })),
  ].sort((a, b) => b.supprime_le.localeCompare(a.supprime_le));
  const demo = moteur().mode === 'demo';

  return {
    titre: 'Réglages',
    onglet: 'reglages',
    sansFab: true,
    contenu: `
      <h2 class="titre-section">Pièces et zones</h2>
      <div class="liste-edition">
        ${listeZones.map((z, i) => `
          <div class="ligne-edition">
            <input value="${esc(z.nom)}" data-change="renommer-zone" data-id="${z.id}" aria-label="Nom de la pièce">
            <button class="bouton-icone" data-action="zone-ordre" data-index="${i}" data-sens="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
            <button class="bouton-icone" data-action="zone-ordre" data-index="${i}" data-sens="1" ${i === listeZones.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
            <button class="bouton-icone danger" data-action="zone-supprimer" data-id="${z.id}" aria-label="Supprimer">🗑</button>
          </div>`).join('')}
      </div>
      <form class="ligne-edition" data-submit="zone-ajouter">
        <input name="nom" placeholder="Nouvelle pièce ou zone" autocomplete="off">
        <button type="submit" class="secondaire">Ajouter</button>
      </form>

      <h2 class="titre-section">Sauvegarde</h2>
      <p class="aide">${demo ? '' : 'Les données sont enregistrées en ligne et sauvegardées automatiquement chaque jour. '}Vous pouvez aussi télécharger une copie complète à tout moment.</p>
      <div class="boutons">
        <button class="secondaire" data-action="exporter">⬇ Télécharger une sauvegarde</button>
        <label class="secondaire bouton-fichier">⬆ Restaurer une sauvegarde
          <input type="file" accept=".json,application/json" data-change="importer" hidden>
        </label>
      </div>
      <p class="aide">La restauration ajoute ou remplace les éléments du fichier, sans rien effacer d'autre.</p>

      <h2 class="titre-section">Corbeille <span class="compteur">${corbeille.length}</span></h2>
      <p class="aide">Les éléments supprimés sont conservés ${CONFIG.JOURS_CORBEILLE} jours.</p>
      <div class="liste-liens">
        ${corbeille.map((x) => `
          <div class="ligne-lien">
            <span><small>${x.type}</small> ${esc(x.intitule)}</span>
            <span class="boutons-ligne">
              <button class="secondaire petit" data-action="restaurer" data-table="${x.table}" data-id="${x.id}">Restaurer</button>
              <button class="bouton-icone danger" data-action="supprimer-definitivement" data-table="${x.table}" data-id="${x.id}" aria-label="Supprimer définitivement">🗑</button>
            </span>
          </div>`).join('') || '<p class="aide">La corbeille est vide.</p>'}
      </div>

      <h2 class="titre-section">Compte</h2>
      ${demo ? `
        <p class="aide"><strong>Mode démo :</strong> les données restent sur cet appareil uniquement. Elles seront partagées une fois l'application reliée à la base en ligne.</p>
        <button class="danger-plein" data-action="effacer-demo">Effacer les données de démo</button>` : `
        <p class="aide">Connecté avec <strong>${esc(etat.utilisateur?.email)}</strong></p>
        <button class="secondaire" data-action="deconnexion">Se déconnecter</button>`}`,
  };
}

// --- Zones ------------------------------------------------------------

actions['renommer-zone'] = (el) => {
  const nom = el.value.trim();
  if (nom) modifier('zones', el.dataset.id, { nom });
};

actions['zone-ordre'] = async (el) => {
  await echangerOrdre('zones', zones(), Number(el.dataset.index), Number(el.dataset.sens));
  actions['rendre']();
};

actions['zone-supprimer'] = async (el) => {
  const z = parId('zones', el.dataset.id);
  const n = etat.donnees.travaux.filter((t) => t.zone_id === z.id).length;
  if (!confirm(`Supprimer « ${z.nom} » ?${n ? ` ${n} travail(s) n'auront plus de pièce.` : ''}`)) return;
  await supprimer('zones', { id: z.id });
};

actions['zone-ajouter'] = async (form) => {
  const nom = form.nom.value.trim();
  if (!nom) return;
  await inserer('zones', { id: nouvelId(), bien_id: etat.bienId, nom, ordre: zones().length });
  actions['rendre']();
  document.querySelector('[data-submit="zone-ajouter"] input')?.focus();
};

// --- Sauvegarde -------------------------------------------------------
// Même format que les sauvegardes automatiques quotidiennes.

actions['exporter'] = () => {
  const contenu = {
    application: 'travaux-maison',
    version: 1,
    exporte_le: new Date().toISOString(),
    donnees: Object.fromEntries(TABLES.map((t) => [t, etat.donnees[t]])),
  };
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' }));
  lien.download = `travaux-maison-${aujourdhui()}.json`;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
};

actions['importer'] = async (el) => {
  const fichier = el.files[0];
  el.value = '';
  if (!fichier) return;
  try {
    const contenu = JSON.parse(await fichier.text());
    if (contenu.application !== 'travaux-maison' || !contenu.donnees) throw new Error('Ce fichier n’est pas une sauvegarde de l’application.');
    const n = (contenu.donnees.travaux || []).length;
    if (!confirm(`Restaurer la sauvegarde du ${new Date(contenu.exporte_le).toLocaleString('fr-FR')} (${n} travaux) ?`)) return;
    await moteur().restaurer(contenu.donnees);
    await recharger();
    toast('Sauvegarde restaurée');
  } catch (e) {
    toast(`Restauration impossible : ${e.message}`, true);
  }
};

// --- Corbeille --------------------------------------------------------

actions['restaurer'] = async (el) => {
  await sortirDeLaCorbeille(el.dataset.table, el.dataset.id);
  toast('Restauré');
  actions['rendre']();
};

actions['supprimer-definitivement'] = async (el) => {
  const x = parId(el.dataset.table, el.dataset.id);
  if (!confirm(`Supprimer définitivement « ${x.intitule} » ? Cette action est irréversible.`)) return;
  await supprimer(el.dataset.table, { id: x.id });
};

// --- Compte -----------------------------------------------------------

actions['deconnexion'] = async () => {
  await moteur().deconnexion();
  location.hash = '#/';
  location.reload();
};

actions['effacer-demo'] = async () => {
  if (!confirm('Effacer toutes les données de démo de cet appareil ?')) return;
  await moteur().effacerTout();
  location.reload();
};
