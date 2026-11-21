// =====================================================================
// Accès aux données. Deux « moteurs » offrent exactement les mêmes
// fonctions, le reste de l'application ne sait pas lequel est utilisé :
//   - Supabase : la vraie base partagée (si config.js est rempli) ;
//   - Démo     : stockage local dans le navigateur (sinon).
// =====================================================================

import { CONFIG } from './config.js';
import { TABLES } from './store.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

export function creerBackend() {
  return CONFIG.SUPABASE_URL ? creerSupabase() : creerDemo();
}

// --------------------------------------------------------------------
// Moteur Supabase
// --------------------------------------------------------------------
async function creerSupabase() {
  const { createClient } = await import(SUPABASE_JS);
  const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  const verifier = ({ data, error }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  return {
    mode: 'supabase',

    async utilisateur() {
      const { data } = await client.auth.getSession();
      return data.session?.user ?? null;
    },

    async connexion(email, motDePasse) {
      const { data, error } = await client.auth.signInWithPassword({ email, password: motDePasse });
      if (error) {
        throw new Error(/invalid/i.test(error.message)
          ? 'E-mail ou mot de passe incorrect.'
          : error.message);
      }
      return data.user;
    },

    async deconnexion() {
      await client.auth.signOut();
    },

    async toutCharger() {
      const reponses = await Promise.all(TABLES.map((t) => client.from(t).select('*')));
      return Object.fromEntries(TABLES.map((t, i) => [t, verifier(reponses[i])]));
    },

    async inserer(table, ligne) {
      verifier(await client.from(table).insert(ligne));
    },

    async modifier(table, id, champs) {
      verifier(await client.from(table).update(champs).eq('id', id));
    },

    /** filtre = { colonne: valeur, ... } — supprime les lignes correspondantes. */
    async supprimer(table, filtre) {
      let requete = client.from(table).delete();
      for (const [colonne, valeur] of Object.entries(filtre)) requete = requete.eq(colonne, valeur);
      verifier(await requete);
    },

    /** Réimporte une sauvegarde : ajoute ou remplace, ne supprime rien. */
    async restaurer(donnees) {
      for (const t of TABLES) {
        const lignes = donnees[t] || [];
        if (lignes.length) verifier(await client.from(t).upsert(lignes));
      }
    },

    /** Appelle `rappel` dès que l'autre personne modifie quelque chose. */
    ecouter(rappel) {
      client
        .channel('modifications')
        .on('postgres_changes', { event: '*', schema: 'public' }, rappel)
        .subscribe();
    },
  };
}

// --------------------------------------------------------------------
// Moteur Démo (localStorage) — imite les règles de la base Supabase.
// --------------------------------------------------------------------
const CLE_DEMO = 'travaux-maison-demo';

// Règles « on delete » identiques à supabase/schema.sql :
// [table liée, colonne, 'cascade' (supprimer) ou 'null' (vider le champ)]
const REGLES_SUPPRESSION = {
  biens: [['zones', 'bien_id', 'cascade'], ['chantiers', 'bien_id', 'cascade'], ['travaux', 'bien_id', 'cascade']],
  zones: [['chantiers', 'zone_id', 'null'], ['travaux', 'zone_id', 'null']],
  chantiers: [['phases', 'chantier_id', 'cascade'], ['travaux', 'chantier_id', 'cascade']],
  phases: [['travaux', 'phase_id', 'null']],
  travaux: [['dependances', 'travail_id', 'cascade'], ['dependances', 'bloque_par_id', 'cascade']],
};

function creerDemo() {
  let donnees = Object.fromEntries(TABLES.map((t) => [t, []]));
  try {
    Object.assign(donnees, JSON.parse(localStorage.getItem(CLE_DEMO)) || {});
  } catch { /* stockage indisponible : on repart de zéro */ }

  const ecrire = () => {
    try { localStorage.setItem(CLE_DEMO, JSON.stringify(donnees)); } catch { /* ignoré */ }
  };

  function retirer(table, correspond) {
    const retires = donnees[table].filter(correspond);
    donnees[table] = donnees[table].filter((r) => !correspond(r));
    for (const ligne of retires) {
      for (const [lie, colonne, regle] of REGLES_SUPPRESSION[table] || []) {
        if (regle === 'cascade') retirer(lie, (r) => r[colonne] === ligne.id);
        else donnees[lie].forEach((r) => { if (r[colonne] === ligne.id) r[colonne] = null; });
      }
    }
  }

  const cle = (table, r) => (table === 'dependances' ? `${r.travail_id}|${r.bloque_par_id}` : r.id);

  return {
    mode: 'demo',
    async utilisateur() { return { id: null, email: 'mode démo' }; },
    async connexion() {},
    async deconnexion() {},
    async toutCharger() { return structuredClone(donnees); },
    async inserer(table, ligne) { donnees[table].push(structuredClone(ligne)); ecrire(); },
    async modifier(table, id, champs) {
      const ligne = donnees[table].find((r) => r.id === id);
      if (ligne) Object.assign(ligne, champs);
      ecrire();
    },
    async supprimer(table, filtre) {
      retirer(table, (r) => Object.entries(filtre).every(([k, v]) => r[k] === v));
      ecrire();
    },
    async restaurer(source) {
      for (const t of TABLES) {
        for (const ligne of source[t] || []) {
          const i = donnees[t].findIndex((r) => cle(t, r) === cle(t, ligne));
          if (i >= 0) donnees[t][i] = ligne; else donnees[t].push(ligne);
        }
      }
      ecrire();
    },
    ecouter() {},
    async effacerTout() {
      donnees = Object.fromEntries(TABLES.map((t) => [t, []]));
      ecrire();
    },
  };
}
