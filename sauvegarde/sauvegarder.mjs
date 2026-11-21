// =====================================================================
// Sauvegarde quotidienne : télécharge toutes les tables de Supabase et
// les écrit dans sauvegardes/AAAA-MM-JJ.json (même format que le bouton
// « Télécharger une sauvegarde » de l'application, donc restaurable
// depuis Réglages > Restaurer une sauvegarde).
//
// Lancé chaque nuit par GitHub (voir .github/workflows/sauvegarde.yml).
// Variables nécessaires (« secrets » du dépôt GitHub) :
//   SUPABASE_URL          ex. https://abcdefgh.supabase.co
//   SUPABASE_SECRET_KEY   clé « secret » (ou « service_role ») du projet
// =====================================================================

import { mkdir, writeFile } from 'node:fs/promises';

const TABLES = ['biens', 'zones', 'chantiers', 'phases', 'travaux', 'dependances'];
const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const cle = process.env.SUPABASE_SECRET_KEY;

if (!url || !cle) {
  console.error('SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définis.');
  process.exit(1);
}

// Les anciennes clés (JWT, commençant par « eyJ ») s'envoient aussi en Authorization.
const entetes = { apikey: cle, ...(cle.startsWith('eyJ') ? { Authorization: `Bearer ${cle}` } : {}) };

const donnees = {};
for (const table of TABLES) {
  donnees[table] = [];
  // Lecture par paquets de 1000 lignes.
  for (let debut = 0; ; debut += 1000) {
    const reponse = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { ...entetes, Range: `${debut}-${debut + 999}` },
    });
    if (!reponse.ok) {
      console.error(`Échec sur la table ${table} : ${reponse.status} ${await reponse.text()}`);
      process.exit(1);
    }
    const lignes = await reponse.json();
    donnees[table].push(...lignes);
    if (lignes.length < 1000) break;
  }
}

const jour = new Date().toISOString().slice(0, 10);
await mkdir('sauvegardes', { recursive: true });
await writeFile(
  `sauvegardes/${jour}.json`,
  JSON.stringify({ application: 'travaux-maison', version: 1, exporte_le: new Date().toISOString(), donnees }, null, 2),
);
console.log(`Sauvegarde ${jour} : ${donnees.travaux.length} travaux, ${donnees.chantiers.length} chantiers.`);
