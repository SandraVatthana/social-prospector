-- Migration 009: Ajout des notes/commentaires sur les prospects
-- Permet d'ajouter des commentaires personnels sur chaque prospect

-- Ajouter la colonne notes
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ajouter la date de dernière modification de la note
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS notes_updated_at TIMESTAMP WITH TIME ZONE;

-- Index pour rechercher dans les notes
CREATE INDEX IF NOT EXISTS idx_prospects_notes_search
ON prospects USING gin(to_tsvector('french', COALESCE(notes, '')));

-- Commentaire
COMMENT ON COLUMN prospects.notes IS 'Notes personnelles sur le prospect (ex: profil intéressant, ancienne cadre, etc.)';
