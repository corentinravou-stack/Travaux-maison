-- =====================================================================
-- Base de données « Travaux maison »
-- À exécuter UNE fois dans Supabase : menu « SQL Editor » > « New query »,
-- coller tout ce fichier, « Run ». Puis autoriser chaque adresse (voir §1).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Personnes autorisées (seules ces adresses voient les données)
-- ---------------------------------------------------------------------
create table public.utilisateurs_autorises (
  email text primary key
);

-- Les adresses ne sont PAS écrites ici (ce fichier est public).
-- Pour autoriser une personne, exécuter dans le SQL Editor :
--   insert into public.utilisateurs_autorises (email) values ('adresse@exemple.fr');

-- Vrai si la personne connectée fait partie de la liste ci-dessus.
create or replace function public.est_autorise()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from utilisateurs_autorises
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------

-- Bien (propriété). Un seul en V1, prévu pour en gérer plusieurs plus tard.
create table public.biens (
  id       uuid primary key default gen_random_uuid(),
  nom      text not null,
  cree_le  timestamptz not null default now()
);

-- Pièces / zones d'un bien.
create table public.zones (
  id       uuid primary key default gen_random_uuid(),
  bien_id  uuid not null references public.biens on delete cascade,
  nom      text not null,
  ordre    integer not null default 0
);

create table public.chantiers (
  id             uuid primary key default gen_random_uuid(),
  bien_id        uuid not null references public.biens on delete cascade,
  intitule       text not null,
  zone_id        uuid references public.zones on delete set null,
  priorite       text not null default 'normale' check (priorite in ('haute', 'normale', 'basse')),
  date_cible     date,
  notes          text,
  budget_estime  numeric(12, 2),  -- prévu, pas encore affiché
  budget_reel    numeric(12, 2),  -- prévu, pas encore affiché
  cree_par       uuid default auth.uid(),
  modifie_par    uuid default auth.uid(),
  cree_le        timestamptz not null default now(),
  modifie_le     timestamptz not null default now(),
  supprime_le    timestamptz      -- rempli = dans la corbeille
);

create table public.phases (
  id           uuid primary key default gen_random_uuid(),
  chantier_id  uuid not null references public.chantiers on delete cascade,
  nom          text not null,
  ordre        integer not null default 0
);

-- Un « travail » est soit un travail simple (chantier_id vide),
-- soit une tâche de chantier (chantier_id rempli, phase facultative).
create table public.travaux (
  id             uuid primary key default gen_random_uuid(),
  bien_id        uuid not null references public.biens on delete cascade,
  chantier_id    uuid references public.chantiers on delete cascade,
  phase_id       uuid references public.phases on delete set null,
  intitule       text not null,
  zone_id        uuid references public.zones on delete set null,
  statut         text not null default 'a_faire' check (statut in ('a_faire', 'en_cours', 'fait')),
  priorite       text not null default 'normale' check (priorite in ('haute', 'normale', 'basse')),
  date_cible     date,
  assigne_a      text,
  notes          text,
  budget_estime  numeric(12, 2),  -- prévu, pas encore affiché
  budget_reel    numeric(12, 2),  -- prévu, pas encore affiché
  cree_par       uuid default auth.uid(),
  modifie_par    uuid default auth.uid(),
  cree_le        timestamptz not null default now(),
  modifie_le     timestamptz not null default now(),
  supprime_le    timestamptz      -- rempli = dans la corbeille
);

-- « travail_id ne peut pas commencer avant que bloque_par_id soit fait ».
create table public.dependances (
  travail_id     uuid not null references public.travaux on delete cascade,
  bloque_par_id  uuid not null references public.travaux on delete cascade,
  primary key (travail_id, bloque_par_id),
  check (travail_id <> bloque_par_id)
);

create index on public.travaux (chantier_id);
create index on public.dependances (bloque_par_id);

-- ---------------------------------------------------------------------
-- 3. Date et auteur de la dernière modification, mis à jour automatiquement
-- ---------------------------------------------------------------------
create or replace function public.noter_modification()
returns trigger language plpgsql as $$
begin
  new.modifie_le := now();
  new.modifie_par := auth.uid();
  return new;
end;
$$;

create trigger noter_modification before update on public.chantiers
  for each row execute function public.noter_modification();
create trigger noter_modification before update on public.travaux
  for each row execute function public.noter_modification();

-- ---------------------------------------------------------------------
-- 4. Sécurité : accès réservé aux personnes autorisées
--    + diffusion des modifications en temps réel
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;
alter table public.utilisateurs_autorises enable row level security;  -- aucune règle = illisible depuis l'appli
revoke all on public.utilisateurs_autorises from anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['biens', 'zones', 'chantiers', 'phases', 'travaux', 'dependances'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy acces_foyer on public.%I for all to authenticated
         using (public.est_autorise()) with check (public.est_autorise())', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
    -- Droits explicites pour les personnes connectées (rien pour les visiteurs anonymes),
    -- au cas où l'accès automatique aux nouvelles tables serait désactivé dans Supabase.
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. Le bien de départ
-- ---------------------------------------------------------------------
insert into public.biens (nom) values ('Maison');
