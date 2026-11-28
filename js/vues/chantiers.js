// =====================================================================
// Écrans « Chantiers » : liste, détail (phases + tâches), modification.
// =====================================================================

import { parId, zones, phasesDe, tachesDe, chantiersActifs, bloquants, priorite, PRIORITES } from '../store.js';
import { esc, actions, ouvrirFeuille, fermerFeuille, puces, formatDate, toast } from '../ui.js';
import { creerChantier, modifier, inserer, supprimer, nouvelId, mettreALaCorbeille, echangerOrdre } from '../donnees.js';
import { carteTravail, colonnesKanban, vide } from './composants.js';
import { boutonNouvellePiece, optionNouvellePiece } from './pieces.js';

// --- Liste des chantiers ---------------------------------------------

function avancement(chantierId) {
  const taches = tachesDe(chantierId);
  const faits = taches.filter((t) => t.statut === 'fait').length;
  const bloques = taches.filter((t) => t.statut !== 'fait' && bloquants(t).length).length;
  return { total: taches.length, faits, bloques, pourcent: taches.length ? Math.round((faits / taches.length) * 100) : 0 };
}

export function vueChantiers() {
  const liste = chantiersActifs().sort((a, b) =>
    priorite(a.priorite).rang - priorite(b.priorite).rang || (a.date_cible || '9999').localeCompare(b.date_cible || '9999'));

  const cartes = liste.map((c) => {
    const a = avancement(c.id);
    const zone = c.zone_id ? parId('zones', c.zone_id)?.nom : '';
    return `
      <a class="carte carte-chantier" href="#/chantier/${c.id}">
        <div class="carte-corps">
          <div class="carte-titre">${esc(c.intitule)}</div>
          <div class="carte-meta">
            ${zone ? `<span>📍 ${esc(zone)}</span>` : ''}
            ${c.date_cible ? `<span>📅 ${formatDate(c.date_cible)}</span>` : ''}
            <span>${a.faits}/${a.total} faits</span>
            ${a.bloques ? `<span class="texte-bloque">🔒 ${a.bloques} bloqué${a.bloques > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="barre"><div style="width:${a.pourcent}%"></div></div>
        </div>
        ${c.priorite !== 'normale' ? `<span class="prio prio-${c.priorite}">${priorite(c.priorite).label}</span>` : ''}
      </a>`;
  }).join('');

  return {
    titre: 'Chantiers',
    onglet: 'chantiers',
    fab: { action: 'nouveau-chantier', libelle: 'Nouveau chantier' },
    contenu: liste.length
      ? `<div class="liste">${cartes}</div>`
      : vide('Aucun chantier.<br>Un chantier regroupe des tâches organisées en phases (ex. « Rénovation salle de bain »).<br>Touchez <strong>+</strong> pour en créer un.'),
  };
}

actions['nouveau-chantier'] = () => {
  ouvrirFeuille(`
    <form class="feuille" data-submit="nouveau-chantier-envoi">
      <div class="feuille-entete">
        <h2>Nouveau chantier</h2>
        <button type="button" class="bouton-icone" data-action="fermer-feuille" aria-label="Fermer">✕</button>
      </div>
      <input name="intitule" class="champ-principal" placeholder="Ex. Rénovation salle de bain" required autocomplete="off" autofocus>
      <p class="etiquette">Pièce</p>
      ${puces('zone', [{ id: '', label: 'Aucune' }, ...zones().map((z) => ({ id: z.id, label: z.nom }))], '', boutonNouvellePiece)}
      <p class="etiquette">Priorité</p>
      ${puces('priorite', PRIORITES.map((p) => ({ id: p.id, label: p.label })), 'normale')}
      <label class="etiquette" for="phases-nouveau">Phases (facultatif, une par ligne)</label>
      <textarea id="phases-nouveau" name="phases" rows="4" placeholder="Démolition&#10;Électricité&#10;Plomberie&#10;Plâtre&#10;Finitions"></textarea>
      <div class="feuille-actions">
        <button type="submit" class="primaire">Créer le chantier</button>
      </div>
    </form>`);
};

actions['nouveau-chantier-envoi'] = (form) => {
  const d = new FormData(form);
  const intitule = String(d.get('intitule') || '').trim();
  if (!intitule) return;
  const phases = String(d.get('phases') || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const c = creerChantier({ intitule, zone_id: d.get('zone') || null, priorite: d.get('priorite') || 'normale' }, phases);
  fermerFeuille();
  location.hash = `#/chantier/${c.id}`;
};

// --- Détail d'un chantier --------------------------------------------

export function vueChantier(id, enKanban) {
  const c = parId('chantiers', id);
  if (!c || c.supprime_le) return introuvable();
  const taches = tachesDe(id);
  const phases = phasesDe(id);
  const a = avancement(id);
  const zone = c.zone_id ? parId('zones', c.zone_id)?.nom : '';

  // Ordre dans une phase : non faits d'abord, puis par date cible.
  const ordonner = (liste) => [...liste].sort((x, y) =>
    (x.statut === 'fait') - (y.statut === 'fait') || (x.date_cible || '9999').localeCompare(y.date_cible || '9999'));

  const section = (phase, liste) => `
    <section class="phase">
      <h2>${phase ? esc(phase.nom) : 'Sans phase'}
        <span class="compteur">${liste.filter((t) => t.statut === 'fait').length}/${liste.length}</span></h2>
      <div class="liste">${ordonner(liste).map((t) => carteTravail(t, { afficherChantier: false })).join('')}</div>
      <button class="ajouter-ligne" data-action="ajout-rapide" data-chantier="${id}" data-phase="${phase ? phase.id : ''}">+ Ajouter une tâche</button>
    </section>`;

  const sansPhase = taches.filter((t) => !t.phase_id || !phases.some((p) => p.id === t.phase_id));

  const resume = `
    <div class="resume-chantier">
      <div class="carte-meta">
        ${zone ? `<span>📍 ${esc(zone)}</span>` : ''}
        ${c.date_cible ? `<span>📅 ${formatDate(c.date_cible)}</span>` : ''}
        ${c.priorite !== 'normale' ? `<span class="prio prio-${c.priorite}">${priorite(c.priorite).label}</span>` : ''}
        <span>${a.faits}/${a.total} faits</span>
        ${a.bloques ? `<span class="texte-bloque">🔒 ${a.bloques} bloqué${a.bloques > 1 ? 's' : ''}</span>` : ''}
      </div>
      <div class="barre"><div style="width:${a.pourcent}%"></div></div>
      ${c.notes ? `<p class="notes">${esc(c.notes)}</p>` : ''}
      <a class="lien" href="#/chantier/${id}/modifier">Modifier le chantier et ses phases</a>
    </div>`;

  const corps = enKanban
    ? colonnesKanban(taches, { afficherChantier: false })
    : phases.map((p) => section(p, taches.filter((t) => t.phase_id === p.id))).join('')
      + (sansPhase.length || !phases.length ? section(null, sansPhase) : '');

  return {
    titre: c.intitule,
    onglet: 'chantiers',
    retour: '#/chantiers',
    large: enKanban,
    bascule: { liste: `#/chantier/${id}`, kanban: `#/chantier/${id}/kanban`, actif: enKanban ? 'kanban' : 'liste' },
    fab: { action: 'ajout-rapide', chantier: id, libelle: 'Nouvelle tâche' },
    contenu: resume + corps,
  };
}

// --- Modification d'un chantier et de ses phases ----------------------

export function vueModifierChantier(id) {
  const c = parId('chantiers', id);
  if (!c || c.supprime_le) return introuvable();
  const phases = phasesDe(id);

  return {
    titre: 'Modifier le chantier',
    onglet: 'chantiers',
    retour: `#/chantier/${id}`,
    sansFab: true,
    contenu: `
      <div class="formulaire" data-table="chantiers" data-id="${id}">
        <label class="etiquette" for="c-intitule">Intitulé</label>
        <input id="c-intitule" data-change="champ" data-champ="intitule" value="${esc(c.intitule)}" required>

        <p class="etiquette">Priorité</p>
        <div class="segments">${PRIORITES.map((p) => `
          <button class="${c.priorite === p.id ? 'actif' : ''}" data-action="definir" data-champ="priorite" data-valeur="${p.id}">${p.label}</button>`).join('')}
        </div>

        <label class="etiquette" for="c-zone">Pièce</label>
        <select id="c-zone" data-change="choisir-zone">
          <option value="">Aucune</option>
          ${zones().map((z) => `<option value="${z.id}" ${z.id === c.zone_id ? 'selected' : ''}>${esc(z.nom)}</option>`).join('')}
          ${optionNouvellePiece}
        </select>

        <label class="etiquette" for="c-date">Date cible</label>
        <input id="c-date" type="date" data-change="champ" data-champ="date_cible" value="${c.date_cible || ''}">

        <label class="etiquette" for="c-notes">Notes</label>
        <textarea id="c-notes" rows="3" data-change="champ" data-champ="notes">${esc(c.notes)}</textarea>
      </div>

      <h2 class="titre-section">Phases</h2>
      <p class="aide">Dans l'ordre du chantier. Supprimer une phase ne supprime pas ses tâches.</p>
      <div class="liste-edition">
        ${phases.map((p, i) => `
          <div class="ligne-edition">
            <input value="${esc(p.nom)}" data-change="renommer-phase" data-id="${p.id}" aria-label="Nom de la phase">
            <button class="bouton-icone" data-action="phase-ordre" data-index="${i}" data-sens="-1" data-chantier="${id}" ${i === 0 ? 'disabled' : ''} aria-label="Monter">↑</button>
            <button class="bouton-icone" data-action="phase-ordre" data-index="${i}" data-sens="1" data-chantier="${id}" ${i === phases.length - 1 ? 'disabled' : ''} aria-label="Descendre">↓</button>
            <button class="bouton-icone danger" data-action="phase-supprimer" data-id="${p.id}" aria-label="Supprimer la phase">🗑</button>
          </div>`).join('') || '<p class="aide">Aucune phase pour l’instant.</p>'}
      </div>
      <form class="ligne-edition" data-submit="phase-ajouter" data-chantier="${id}">
        <input name="nom" placeholder="Nouvelle phase (ex. Électricité)" autocomplete="off">
        <button type="submit" class="secondaire">Ajouter</button>
      </form>

      <button class="danger-plein" data-action="chantier-corbeille" data-id="${id}">Mettre le chantier à la corbeille</button>`,
  };
}

actions['renommer-phase'] = (el) => {
  const nom = el.value.trim();
  if (nom) modifier('phases', el.dataset.id, { nom });
};

actions['phase-ordre'] = async (el) => {
  await echangerOrdre('phases', phasesDe(el.dataset.chantier), Number(el.dataset.index), Number(el.dataset.sens));
  actions['rendre']();
};

actions['phase-supprimer'] = async (el) => {
  const p = parId('phases', el.dataset.id);
  if (!confirm(`Supprimer la phase « ${p.nom} » ? Ses tâches seront conservées, sans phase.`)) return;
  await supprimer('phases', { id: p.id });
};

actions['phase-ajouter'] = async (form) => {
  const nom = form.nom.value.trim();
  if (!nom) return;
  const phases = phasesDe(form.dataset.chantier);
  await inserer('phases', { id: nouvelId(), chantier_id: form.dataset.chantier, nom, ordre: phases.length });
  actions['rendre']();
  document.querySelector('[data-submit="phase-ajouter"] input')?.focus();
};

actions['chantier-corbeille'] = async (el) => {
  const c = parId('chantiers', el.dataset.id);
  if (!confirm(`Mettre « ${c.intitule} » et toutes ses tâches à la corbeille ? Vous pourrez le restaurer depuis Réglages.`)) return;
  await mettreALaCorbeille('chantiers', c.id);
  toast('Chantier mis à la corbeille');
  location.hash = '#/chantiers';
};

export function introuvable() {
  return {
    titre: 'Introuvable',
    retour: '#/',
    contenu: vide('Cet élément n’existe plus (il a peut-être été supprimé).'),
  };
}
