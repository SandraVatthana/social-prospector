-- Migration 006: Séquences de conversation jusqu'au closing
-- Permet de gérer des conversations multi-messages avec objectifs

-- =====================================================
-- 1. AJOUTER LES COLONNES À LA TABLE PROSPECTS
-- =====================================================

-- Objectif de la conversation (call, link, qualify, network)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS conversation_goal TEXT;

-- Étape actuelle dans la séquence (1, 2, 3...)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS conversation_stage INTEGER DEFAULT 1;

-- Dernière réponse du prospect (collée par l'utilisateur)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS last_prospect_response TEXT;

-- Date de la dernière réponse
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS last_prospect_response_at TIMESTAMPTZ;

-- Statut de la conversation
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS conversation_status TEXT DEFAULT 'not_started';
-- Valeurs: not_started, in_progress, waiting_response, goal_achieved, abandoned

-- Ajouter une contrainte pour les valeurs valides de conversation_goal
ALTER TABLE prospects ADD CONSTRAINT check_conversation_goal
  CHECK (conversation_goal IS NULL OR conversation_goal IN ('call', 'link', 'qualify', 'network'));

-- Ajouter une contrainte pour conversation_status
ALTER TABLE prospects ADD CONSTRAINT check_conversation_status
  CHECK (conversation_status IN ('not_started', 'in_progress', 'waiting_response', 'goal_achieved', 'abandoned'));

-- =====================================================
-- 2. TABLE HISTORIQUE DES CONVERSATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Direction du message
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),

  -- Contenu du message
  content TEXT NOT NULL,

  -- Étape de la séquence au moment de l'envoi
  stage INTEGER,

  -- Méthode d'approche utilisée (pour les messages outbound)
  approach_method TEXT,

  -- Analyse du message (sentiment, signaux d'achat, objections...)
  analysis JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index pour requêtes rapides
  CONSTRAINT fk_conversation_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id)
);

-- Index pour accélérer les requêtes
CREATE INDEX IF NOT EXISTS idx_conversation_history_prospect ON conversation_history(prospect_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_user ON conversation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created ON conversation_history(created_at DESC);

-- =====================================================
-- 3. TABLE TEMPLATES DE SÉQUENCES PERSONNALISÉES
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Objectif de cette séquence
  goal TEXT NOT NULL CHECK (goal IN ('call', 'link', 'qualify', 'network')),

  -- Étape dans la séquence (1, 2, 3)
  stage INTEGER NOT NULL CHECK (stage >= 1 AND stage <= 5),

  -- Nom de l'étape (ex: "Ouverture", "Transition", "Closing")
  stage_name TEXT NOT NULL,

  -- Template du message (avec variables comme {prospect_name}, {topic}, etc.)
  template TEXT NOT NULL,

  -- Instructions pour l'IA sur comment utiliser ce template
  ai_instructions TEXT,

  -- Est-ce la séquence par défaut du système (user_id NULL) ou personnalisée
  is_system_default BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Une seule séquence par user/goal/stage (ou système)
  UNIQUE(user_id, goal, stage)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_conversation_sequences_user ON conversation_sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sequences_goal ON conversation_sequences(goal);

-- =====================================================
-- 4. INSÉRER LES SÉQUENCES PAR DÉFAUT
-- =====================================================

-- Objectif: CALL (Obtenir un appel)
INSERT INTO conversation_sequences (user_id, goal, stage, stage_name, template, ai_instructions, is_system_default) VALUES
(NULL, 'call', 1, 'Ouverture',
  'Hey {prospect_name} ! {personalized_hook_about_recent_post}. {open_question_to_engage}',
  'Créer une accroche basée sur un post/contenu récent du prospect. Terminer par une question ouverte pour engager la conversation. Ton amical et curieux.',
  TRUE),
(NULL, 'call', 2, 'Transition vers call',
  '{value_insight_related_to_their_response}. Je bosse justement sur ça avec des {similar_profile}. Tu veux qu''on en parle 15 min ? Je pense pouvoir t''aider sur {specific_benefit}.',
  'Apporter de la valeur basée sur leur réponse, puis proposer naturellement un appel. Mentionner un bénéfice concret.',
  TRUE),
(NULL, 'call', 3, 'Relance douce',
  'Je me permets de relancer — si t''as 15 min cette semaine, je pense qu''on pourrait échanger sur {benefit}. Sinon, no stress ! 😊',
  'Relance non-pushy si pas de réponse. Proposer clairement mais sans pression.',
  TRUE)
ON CONFLICT DO NOTHING;

-- Objectif: LINK (Amener vers un lien)
INSERT INTO conversation_sequences (user_id, goal, stage, stage_name, template, ai_instructions, is_system_default) VALUES
(NULL, 'link', 1, 'Ouverture + Teaser',
  'Hey {prospect_name} ! Je vois que tu parles de {topic}. J''ai créé {resource_type} qui aide justement sur ça, ça pourrait t''intéresser ?',
  'Accroche personnalisée + teaser de la ressource sans donner le lien tout de suite.',
  TRUE),
(NULL, 'link', 2, 'Valeur + Lien',
  'En gros, ça permet de {key_benefit}. Voilà le lien si tu veux jeter un œil : {link}',
  'Donner un avant-goût de la valeur puis partager le lien naturellement.',
  TRUE),
(NULL, 'link', 3, 'Suivi léger',
  'T''as eu le temps de regarder ? Dis-moi si t''as des questions ! 😊',
  'Relance légère et non-pushy pour savoir s''ils ont vu le contenu.',
  TRUE)
ON CONFLICT DO NOTHING;

-- Objectif: QUALIFY (Qualifier et orienter)
INSERT INTO conversation_sequences (user_id, goal, stage, stage_name, template, ai_instructions, is_system_default) VALUES
(NULL, 'qualify', 1, 'Ouverture + Question qualification',
  'Hey {prospect_name} ! Je vois que tu fais {activity}. Tu bosses plutôt avec {option_a} ou {option_b} ?',
  'Accroche + question de qualification pour comprendre leur situation.',
  TRUE),
(NULL, 'qualify', 2, 'Approfondissement',
  'Intéressant ! Et du coup, c''est quoi ton plus gros défi sur {topic} en ce moment ?',
  'Creuser le besoin basé sur leur réponse. Question ouverte pour comprendre leurs pain points.',
  TRUE),
(NULL, 'qualify', 3, 'Proposition adaptée',
  'Ok je vois ! J''ai justement {adapted_solution}. Tu veux que je t''explique comment ça marche ?',
  'Proposer une solution adaptée basée sur les réponses précédentes.',
  TRUE)
ON CONFLICT DO NOTHING;

-- Objectif: NETWORK (Créer une relation)
INSERT INTO conversation_sequences (user_id, goal, stage, stage_name, template, ai_instructions, is_system_default) VALUES
(NULL, 'network', 1, 'Connexion authentique',
  'Hey {prospect_name} ! Je te suis depuis un moment, j''adore ce que tu fais sur {topic}. On a {common_point} en commun, ça serait cool d''échanger !',
  'Compliment sincère + point commun. Ton authentique, pas de vente.',
  TRUE),
(NULL, 'network', 2, 'Valeur sans demande',
  'Au fait, j''ai vu {relevant_thing}, ça m''a fait penser à toi ! {share_value}',
  'Partager quelque chose d''utile sans rien demander en retour.',
  TRUE),
(NULL, 'network', 3, 'Proposition légère (optionnel)',
  'Si t''es dispo un de ces jours, ça serait cool de se faire un call pour échanger sur {topic} ! Pas de pitch, juste du partage 😊',
  'Seulement si la conversation est bien engagée. Proposition de call sans pression.',
  TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. ANALYTICS DES SÉQUENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mois de l'analyse (YYYY-MM-01)
  month DATE NOT NULL,

  -- Objectif analysé
  goal TEXT NOT NULL CHECK (goal IN ('call', 'link', 'qualify', 'network')),

  -- Stats par étape
  stage_1_sent INTEGER DEFAULT 0,
  stage_1_responses INTEGER DEFAULT 0,
  stage_2_sent INTEGER DEFAULT 0,
  stage_2_responses INTEGER DEFAULT 0,
  stage_3_sent INTEGER DEFAULT 0,
  stage_3_responses INTEGER DEFAULT 0,

  -- Conversions (objectif atteint)
  goals_achieved INTEGER DEFAULT 0,

  -- Conversations abandonnées
  abandoned INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, month, goal)
);

CREATE INDEX IF NOT EXISTS idx_conversation_analytics_user ON conversation_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_month ON conversation_analytics(month);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Activer RLS
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analytics ENABLE ROW LEVEL SECURITY;

-- Policies pour conversation_history
CREATE POLICY "Users can view own conversation history" ON conversation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation history" ON conversation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation history" ON conversation_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversation history" ON conversation_history
  FOR DELETE USING (auth.uid() = user_id);

-- Policies pour conversation_sequences
CREATE POLICY "Users can view system defaults and own sequences" ON conversation_sequences
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own sequences" ON conversation_sequences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sequences" ON conversation_sequences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sequences" ON conversation_sequences
  FOR DELETE USING (auth.uid() = user_id);

-- Policies pour conversation_analytics
CREATE POLICY "Users can view own analytics" ON conversation_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics" ON conversation_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics" ON conversation_analytics
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 7. FONCTION POUR METTRE À JOUR LES ANALYTICS
-- =====================================================

CREATE OR REPLACE FUNCTION update_conversation_analytics()
RETURNS TRIGGER AS $$
DECLARE
  current_month DATE;
  prospect_goal TEXT;
  prospect_stage INTEGER;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE);

  -- Récupérer l'objectif et l'étape du prospect
  SELECT conversation_goal, conversation_stage
  INTO prospect_goal, prospect_stage
  FROM prospects WHERE id = NEW.prospect_id;

  IF prospect_goal IS NOT NULL THEN
    -- Insérer ou mettre à jour les analytics
    INSERT INTO conversation_analytics (user_id, month, goal)
    VALUES (NEW.user_id, current_month, prospect_goal)
    ON CONFLICT (user_id, month, goal) DO NOTHING;

    -- Mettre à jour les compteurs selon la direction et l'étape
    IF NEW.direction = 'outbound' THEN
      EXECUTE format(
        'UPDATE conversation_analytics SET stage_%s_sent = stage_%s_sent + 1, updated_at = NOW() WHERE user_id = $1 AND month = $2 AND goal = $3',
        LEAST(prospect_stage, 3), LEAST(prospect_stage, 3)
      ) USING NEW.user_id, current_month, prospect_goal;
    ELSIF NEW.direction = 'inbound' THEN
      EXECUTE format(
        'UPDATE conversation_analytics SET stage_%s_responses = stage_%s_responses + 1, updated_at = NOW() WHERE user_id = $1 AND month = $2 AND goal = $3',
        LEAST(prospect_stage, 3), LEAST(prospect_stage, 3)
      ) USING NEW.user_id, current_month, prospect_goal;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement les analytics
DROP TRIGGER IF EXISTS trigger_update_conversation_analytics ON conversation_history;
CREATE TRIGGER trigger_update_conversation_analytics
  AFTER INSERT ON conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_analytics();

-- =====================================================
-- DONE!
-- =====================================================
