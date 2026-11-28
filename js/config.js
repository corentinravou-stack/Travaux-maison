// =====================================================================
// Configuration de l'application — le SEUL fichier à modifier pour
// brancher l'application sur votre base Supabase.
// =====================================================================
//
// Si SUPABASE_URL est vide, l'application tourne en « mode démo » :
// les données restent dans ce navigateur uniquement (utile pour essayer).
//
// La clé « publishable / anon » peut être publique : la sécurité est
// assurée côté base (seules les adresses autorisées voient les données,
// voir supabase/schema.sql).

export const CONFIG = {
  SUPABASE_URL: '',        // ex. 'https://abcdefgh.supabase.co'
  SUPABASE_ANON_KEY: '',   // ex. 'sb_publishable_...' ou 'eyJhbGciOi...'

  // Personnes à qui l'on peut assigner un travail.
  PERSONNES: ['Corentin', 'Cécile'],

  // Pièces / zones créées automatiquement au tout premier lancement.
  // Vide : les pièces se créent au fil de l'eau (bouton « + Nouvelle pièce »
  // dans les écrans de saisie) ou dans Réglages.
  ZONES_DEPART: [],

  // Durée de conservation des éléments dans la corbeille.
  JOURS_CORBEILLE: 30,
};
