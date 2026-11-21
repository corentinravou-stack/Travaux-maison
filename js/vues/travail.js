// =====================================================================
// Fiche d'un travail : tous les champs + prérequis (dépendances).
// Chaque champ est enregistré dès qu'on le quitte : pas de bouton
// « Enregistrer » à oublier.
// =====================================================================

import { CONFIG } from '../config.js';
import {
  parId, zones, phasesDe, chantiersActifs, travauxActifs, prerequis, dependants,
  bloquants, creeraitCycle, statut, STATUTS, PRIORITES,
} from '../store.js';
import { esc, actions, toast } from '../ui.js';
import { modifier, ajouterPrerequis, retirerPrerequis, mettreALaCorbeille } from '../donnees.js';
import { introuvable } from './chantiers.js';

export function vueTravail(id) {
  const t = parId('travaux', id);
  if (!t || t.supprime_le) return introuvable();
  const bloques = bloquants(t);
  const chantier = t.chantier_id ? parId('chantiers', t.chantier_id) : null;
  const phases = chantier ? phasesDe(chantier.id) : [];
  const personnes = [...new Set([...CONFIG.PERSONNES, ...(t.assigne_a ? [t.assigne_a] : [])])];

  const lignePrerequis = (p, retirable) => `
    <div class="ligne-lien">
      <a href="#/travail/${p.id}"><span class="mini-statut statut-${p.statut}">${statut(p.statut).icone}</span> ${esc(p.intitule)}</a>
      ${retirable ? `<button class="bouton-icone" data-action="retirer-prerequis" data-travail="${t.id}" data-prerequis="${p.id}" aria-label="Retirer ce prérequis">✕</button>` : ''}
    </div>`;

  return {
    titre: chantier ? 'Tâche' : 'Travail',
    onglet: chantier ? 'chantiers' : 'travaux',
    retour: chantier ? `#/chantier/${chantier.id}` : '#/',
    sansFab: true,
    contenu: `
      ${bloques.length ? `<div class="bandeau-bloque">🔒 Bloqué : à faire d'abord « ${bloques.map((b) => esc(b.intitule)).join(' », « ')} »</div>` : ''}
      <div class="formulaire" data-table="travaux" data-id="${t.id}">
        <label class="etiquette" for="t-intitule">Intitulé</label>
        <textarea id="t-intitule" class="champ-principal" rows="2" data-change="champ" data-champ="intitule" required>${esc(t.intitule)}</textarea>

        <p class="etiquette">Statut</p>
        <div class="segments">${STATUTS.map((s) => `
          <button class="${t.statut === s.id ? 'actif' : ''} seg-${s.id}" data-action="definir" data-champ="statut" data-valeur="${s.id}">${s.icone} ${s.label}</button>`).join('')}
        </div>

        <p class="etiquette">Priorité</p>
        <div class="segments">${PRIORITES.map((p) => `
          <button class="${t.priorite === p.id ? 'actif' : ''}" data-action="definir" data-champ="priorite" data-valeur="${p.id}">${p.label}</button>`).join('')}
        </div>

        <div class="deux-colonnes">
          <div>
            <label class="etiquette" for="t-zone">Pièce</label>
            <select id="t-zone" data-change="champ" data-champ="zone_id">
              <option value="">Aucune</option>
              ${zones().map((z) => `<option value="${z.id}" ${z.id === t.zone_id ? 'selected' : ''}>${esc(z.nom)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="etiquette" for="t-date">Date cible</label>
            <input id="t-date" type="date" data-change="champ" data-champ="date_cible" value="${t.date_cible || ''}">
          </div>
        </div>

        <label class="etiquette" for="t-assigne">Qui s'en occupe</label>
        <select id="t-assigne" data-change="champ" data-champ="assigne_a">
          <option value="">Personne en particulier</option>
          ${personnes.map((p) => `<option ${p === t.assigne_a ? 'selected' : ''}>${esc(p)}</option>`).join('')}
        </select>

        <div class="deux-colonnes">
          <div>
            <label class="etiquette" for="t-chantier">Chantier</label>
            <select id="t-chantier" data-change="changer-chantier">
              <option value="">Aucun (travail simple)</option>
              ${chantiersActifs().map((c) => `<option value="${c.id}" ${c.id === t.chantier_id ? 'selected' : ''}>${esc(c.intitule)}</option>`).join('')}
            </select>
          </div>
          ${phases.length ? `
          <div>
            <label class="etiquette" for="t-phase">Phase</label>
            <select id="t-phase" data-change="champ" data-champ="phase_id">
              <option value="">Aucune</option>
              ${phases.map((p) => `<option value="${p.id}" ${p.id === t.phase_id ? 'selected' : ''}>${esc(p.nom)}</option>`).join('')}
            </select>
          </div>` : ''}
        </div>

        <label class="etiquette" for="t-notes">Notes</label>
        <textarea id="t-notes" rows="4" data-change="champ" data-champ="notes" placeholder="Mesures, références, idées…">${esc(t.notes)}</textarea>
      </div>

      <h2 class="titre-section">À faire avant (prérequis)</h2>
      <div class="liste-liens">
        ${prerequis(t.id).map((p) => lignePrerequis(p, true)).join('') || '<p class="aide">Aucun prérequis : ce travail peut commencer quand vous voulez.</p>'}
      </div>
      <input class="recherche" type="search" placeholder="Ajouter un prérequis : rechercher un travail…" data-input="chercher-prerequis" data-travail="${t.id}" autocomplete="off">
      <div class="resultats" id="resultats-prerequis"></div>

      ${dependants(t.id).length ? `
        <h2 class="titre-section">Ce travail bloque</h2>
        <div class="liste-liens">${dependants(t.id).map((p) => lignePrerequis(p, false)).join('')}</div>` : ''}

      <button class="danger-plein" data-action="travail-corbeille" data-id="${t.id}">Mettre à la corbeille</button>`,
  };
}

// --- Enregistrement des champs (partagé avec la fiche chantier) -------

const formulaire = (el) => el.closest('[data-table]').dataset;

actions['champ'] = (el) => {
  const { table, id } = formulaire(el);
  let valeur = el.value.trim();
  if (el.required && !valeur) {
    el.value = parId(table, id)[el.dataset.champ];
    toast('Ce champ ne peut pas être vide', true);
    return;
  }
  modifier(table, id, { [el.dataset.champ]: valeur || null });
};

actions['definir'] = (el) => {
  const { table, id } = formulaire(el);
  const champ = el.dataset.champ;
  const valeur = el.dataset.valeur;
  if (table === 'travaux' && champ === 'statut' && valeur !== 'a_faire') {
    const b = bloquants(parId('travaux', id));
    if (b.length) toast(`Attention : encore bloqué par « ${b[0].intitule} »`);
  }
  modifier(table, id, { [champ]: valeur });
  actions['rendre']();
};

actions['changer-chantier'] = (el) => {
  const { id } = formulaire(el);
  modifier('travaux', id, { chantier_id: el.value || null, phase_id: null });
  actions['rendre']();
};

actions['travail-corbeille'] = async (el) => {
  const t = parId('travaux', el.dataset.id);
  await mettreALaCorbeille('travaux', t.id);
  toast('Mis à la corbeille (récupérable dans Réglages)');
  location.hash = t.chantier_id ? `#/chantier/${t.chantier_id}` : '#/';
};

// --- Prérequis --------------------------------------------------------

const normaliser = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

actions['chercher-prerequis'] = (el) => {
  const t = parId('travaux', el.dataset.travail);
  const deja = new Set(prerequis(t.id).map((p) => p.id));
  const mots = normaliser(el.value).split(/\s+/).filter(Boolean);

  const candidats = travauxActifs()
    .filter((c) => c.id !== t.id && !deja.has(c.id))
    .filter((c) => {
      const texte = normaliser(`${c.intitule} ${parId('zones', c.zone_id)?.nom || ''} ${parId('chantiers', c.chantier_id)?.intitule || ''}`);
      return mots.every((m) => texte.includes(m));
    })
    // Les tâches du même chantier et non faites d'abord.
    .sort((a, b) => (b.chantier_id === t.chantier_id) - (a.chantier_id === t.chantier_id)
      || (a.statut === 'fait') - (b.statut === 'fait'))
    .slice(0, 8);

  document.getElementById('resultats-prerequis').innerHTML = (mots.length || document.activeElement === el)
    ? candidats.map((c) => {
      const cycle = creeraitCycle(t.id, c.id);
      const contexte = [parId('chantiers', c.chantier_id)?.intitule, parId('zones', c.zone_id)?.nom].filter(Boolean).join(' · ');
      return `<button class="resultat" data-action="ajouter-prerequis" data-travail="${t.id}" data-prerequis="${c.id}" ${cycle ? 'disabled title="Impossible : ce travail dépend déjà de celui-ci"' : ''}>
        <span class="mini-statut statut-${c.statut}">${statut(c.statut).icone}</span>
        <span>${esc(c.intitule)}${contexte ? `<small>${esc(contexte)}</small>` : ''}${cycle ? '<small>Impossible : créerait une boucle</small>' : ''}</span>
      </button>`;
    }).join('') || '<p class="aide">Aucun travail trouvé.</p>'
    : '';
};

actions['ajouter-prerequis'] = async (el) => {
  const { travail, prerequis: pre } = el.dataset;
  if (creeraitCycle(travail, pre)) return;
  await ajouterPrerequis(travail, pre);
  actions['rendre']();
};

actions['retirer-prerequis'] = async (el) => {
  await retirerPrerequis(el.dataset.travail, el.dataset.prerequis);
  actions['rendre']();
};
