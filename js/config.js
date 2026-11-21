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
  PERSONNES: ['Moi', 'Ma conjointe'],

  // Pièces / zones créées automatiquement au tout premier lancement.
  // Ensuite, elles se gèrent dans l'écran Réglages.
  ZONES_DEPART: [
    'Entrée', 'Salon', 'Cuisine', 'Salle de bain', 'WC', 'Chambre',
    'Couloir', 'Garage', 'Extérieur', 'Toute la maison',
  ],

  // Durée de conservation des éléments dans la corbeille.
  JOURS_CORBEILLE: 30,
};
