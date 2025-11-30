import { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  User,
  Target,
  Zap,
  MessageSquare,
  Search,
  Gift,
  Mic2,
  Instagram,
  Music2,
  Users,
  Briefcase,
  Palette,
  GraduationCap,
  ShoppingBag,
  Building2,
  Heart,
  Clock,
  DollarSign,
  HelpCircle,
  Phone,
  FileText,
  Send,
  Eye
} from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Onboarding Profond — Style SOS Storytelling
 * Capture l'essence de l'utilisateur pour personnaliser les messages IA
 *
 * Props:
 * - mode: 'self' (défaut) pour l'utilisateur, 'client' pour un client agence
 * - clientName: nom du client (requis si mode='client')
 * - onComplete: callback(data, voiceProfile, redirectTo)
 * - onSkip: callback pour passer l'onboarding
 */
// ============================================
// COMPOSANTS D'ÉTAPES
// ============================================

/**
 * Étape 1 — Identité
 */
function StepIdentite({ data, setData, mode, clientName }) {
  const typesActivite = [
    { id: 'coach', label: 'Coach', icon: Target },
    { id: 'freelance', label: 'Freelance', icon: Briefcase },
    { id: 'ecommerce', label: 'E-commerce', icon: ShoppingBag },
    { id: 'formateur', label: 'Formateur', icon: GraduationCap },
    { id: 'creatif', label: 'Créatif', icon: Palette },
    { id: 'agence', label: 'Agence', icon: Building2 },
  ];

  const anciennetes = [
    { id: 'moins_1an', label: '< 1 an' },
    { id: '1_3_ans', label: '1-3 ans' },
    { id: '3_5_ans', label: '3-5 ans' },
    { id: '5_10_ans', label: '5-10 ans' },
    { id: 'plus_10_ans', label: '10+ ans' },
  ];

  // Adaptation du texte selon le mode
  const isClientMode = mode === 'client';
  const prenomLabel = isClientMode
    ? `Quel est le prénom/nom de ${clientName} ?`
    : "Comment tu t'appelles ?";
  const prenomPlaceholder = isClientMode
    ? "Marie, Jean-Pierre..."
    : "Sandra, My Inner Quest...";
  const activiteLabel = isClientMode
    ? `En une phrase, ${clientName} fait quoi ?`
    : "En une phrase, tu fais quoi ?";

  return (
    <div className="space-y-6">
      {/* Prénom */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          {prenomLabel} <span className="text-warm-400">(ou nom de marque)</span>
        </label>
        <input
          type="text"
          value={data.prenom}
          onChange={(e) => setData(d => ({ ...d, prenom: e.target.value }))}
          placeholder={prenomPlaceholder}
          className="w-full px-4 py-3 text-lg border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
          autoFocus
        />
      </div>

      {/* Activité */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          {activiteLabel}
        </label>
        <textarea
          value={data.activite}
          onChange={(e) => setData(d => ({ ...d, activite: e.target.value }))}
          placeholder="J'aide les entrepreneures à créer des expériences digitales qui convertissent..."
          rows={2}
          className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
        />
      </div>

      {/* Type d'activité */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          💡 Tu es plutôt...
        </label>
        <div className="grid grid-cols-3 gap-2">
          {typesActivite.map(type => (
            <button
              key={type.id}
              type="button"
              onClick={() => setData(d => ({ ...d, type_activite: type.id }))}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                data.type_activite === type.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-warm-200 hover:border-warm-300 text-warm-600'
              }`}
            >
              <type.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ancienneté */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          Tu fais ça depuis...
        </label>
        <div className="flex flex-wrap gap-2">
          {anciennetes.map(anc => (
            <button
              key={anc.id}
              type="button"
              onClick={() => setData(d => ({ ...d, anciennete: anc.id }))}
              className={`px-4 py-2 rounded-xl border-2 transition-all ${
                data.anciennete === anc.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-warm-200 hover:border-warm-300 text-warm-600'
              }`}
            >
              {anc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Étape 2 — Client idéal
 */
function StepCible({ data, setData, toggleArrayValue }) {
  const genres = [
    { id: 'femmes', label: '👩 Des femmes' },
    { id: 'hommes', label: '👨 Des hommes' },
    { id: 'tous', label: '🌍 Tout le monde' },
    { id: 'entreprises', label: '🏢 Des entreprises' },
  ];

  const problemes = [
    { id: 'overwhelm', label: '😩 Overwhelm' },
    { id: 'budget', label: '💸 Pas de budget' },
    { id: 'temps', label: '⏰ Manque de temps' },
    { id: 'savoir', label: '🤷 Sait pas par où commencer' },
    { id: 'technique', label: '💻 Bloqué par la technique' },
    { id: 'visibilite', label: '👀 Manque de visibilité' },
    { id: 'confiance', label: '😰 Manque de confiance' },
    { id: 'strategie', label: '🧭 Pas de stratégie claire' },
  ];

  return (
    <div className="space-y-6">
      {/* Description du client idéal */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          Ton client idéal, c'est qui ?
        </label>
        <textarea
          value={data.cible_description}
          onChange={(e) => setData(d => ({ ...d, cible_description: e.target.value }))}
          placeholder="Des femmes entrepreneures qui veulent digitaliser leur business mais qui sont perdues avec la technique..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
          autoFocus
        />
      </div>

      {/* Genre */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          💡 C'est plutôt...
        </label>
        <div className="grid grid-cols-2 gap-2">
          {genres.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setData(d => ({ ...d, cible_genre: g.id }))}
              className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${
                data.cible_genre === g.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-warm-200 hover:border-warm-300 text-warm-600'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Problèmes */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          💡 Ses problèmes courants <span className="text-warm-400">(clique pour sélectionner)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {problemes.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleArrayValue('cible_problemes', p.id)}
              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                data.cible_problemes.includes(p.id)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-warm-200 hover:border-warm-300 text-warm-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Étape 3 — Transformation
 */
function StepTransformation({ data, setData, toggleArrayValue }) {
  const superPouvoirs = [
    { id: 'clarte', label: '🎯 Clarté' },
    { id: 'rapidite', label: '⚡ Rapidité' },
    { id: 'ecoute', label: '🤝 Écoute' },
    { id: 'strategie', label: '🧠 Stratégie' },
    { id: 'creativite', label: '🎨 Créativité' },
    { id: 'resultats', label: '💪 Résultats' },
    { id: 'energie', label: '🔥 Énergie' },
    { id: 'qualite', label: '💎 Qualité' },
    { id: 'pedagogie', label: '📚 Pédagogie' },
    { id: 'bienveillance', label: '💜 Bienveillance' },
  ];

  return (
    <div className="space-y-6">
      {/* Résultat promis */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          Après avoir travaillé avec toi, ton client...
        </label>
        <textarea
          value={data.resultat_promis}
          onChange={(e) => setData(d => ({ ...d, resultat_promis: e.target.value }))}
          placeholder="A un système automatisé qui lui fait gagner 10h/semaine et génère des leads pendant qu'elle dort..."
          rows={2}
          className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
          autoFocus
        />
      </div>

      {/* Preuve sociale */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          Un résultat concret que tu as obtenu ? <span className="text-warm-400">(chiffres, témoignage)</span>
        </label>
        <textarea
          value={data.preuve_sociale}
          onChange={(e) => setData(d => ({ ...d, preuve_sociale: e.target.value }))}
          placeholder='"Marie a triplé ses inscriptions en 2 mois grâce au funnel qu&apos;on a créé ensemble"'
          rows={2}
          className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
        />
      </div>

      {/* Différenciation */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          Ce qui te différencie des autres ?
        </label>
        <textarea
          value={data.differentiation}
          onChange={(e) => setData(d => ({ ...d, differentiation: e.target.value }))}
          placeholder="Je rends la tech accessible et même fun. Pas de jargon, que du concret."
          rows={2}
          className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
        />
      </div>

      {/* Super-pouvoirs */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          💡 Tes super-pouvoirs <span className="text-warm-400">(choisis 2-3)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {superPouvoirs.map(sp => (
            <button
              key={sp.id}
              type="button"
              onClick={() => toggleArrayValue('super_pouvoirs', sp.id)}
              className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                data.super_pouvoirs.includes(sp.id)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-warm-200 hover:border-warm-300 text-warm-600'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Étape 4 — Style de communication
 */
function StepStyle({ data, setData, toggleArrayValue }) {
  const tons = [
    { id: 'decontracte', label: '😎 Décontracté' },
    { id: 'pro', label: '💼 Pro' },
    { id: 'direct', label: '🔥 Direct' },
    { id: 'inspirant', label: '💫 Inspirant' },
    { id: 'chaleureux', label: '🤗 Chaleureux' },
    { id: 'expert', label: '🧠 Expert' },
  ];

  const emojis = ['🚀', '✨', '💪', '🎯', '🔥', '💡', '❤️', '👋', '😊', '🙌', '⚡', '💎', '🌟', '👀', '😉', '🤝'];

  return (
    <div className="space-y-6">
      {/* Tutoiement */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          Tu préfères...
        </label>
        <div className="bg-warm-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-warm-600">☀️ Tutoyer</span>
            <span className="text-sm text-warm-600">🎩 Vouvoyer</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            value={data.tutoiement === 'toujours' ? 0 : data.tutoiement === 'parfois' ? 1 : 2}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setData(d => ({ ...d, tutoiement: val === 0 ? 'toujours' : val === 1 ? 'parfois' : 'jamais' }));
            }}
            className="w-full h-2 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between mt-1 text-xs text-warm-400">
            <span>Toujours</span>
            <span>Ça dépend</span>
            <span>Jamais</span>
          </div>
        </div>
      </div>

      {/* Ton */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          Ton ton général ? <span className="text-warm-400">(choisis 1-2)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {tons.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleArrayValue('ton', t.id)}
              className={`px-3 py-3 rounded-xl border-2 transition-all text-sm ${
                data.ton.includes(t.id)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-warm-200 hover:border-warm-300 text-warm-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Emojis fréquence */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          Les emojis, pour toi c'est...
        </label>
        <div className="bg-warm-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-warm-600">🚫 Jamais</span>
            <span className="text-sm text-warm-600">🎉 Tout le temps</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            value={data.utilisation_emojis === 'jamais' ? 0 : data.utilisation_emojis === 'parfois' ? 1 : 2}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setData(d => ({ ...d, utilisation_emojis: val === 0 ? 'jamais' : val === 1 ? 'parfois' : 'souvent' }));
            }}
            className="w-full h-2 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
        </div>
      </div>

      {/* Emojis favoris */}
      {data.utilisation_emojis !== 'jamais' && (
        <div>
          <label className="block text-sm font-medium text-warm-700 mb-3">
            Tes emojis favoris ?
          </label>
          <div className="flex flex-wrap gap-2">
            {emojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => toggleArrayValue('emojis_favoris', emoji)}
                className={`w-10 h-10 rounded-lg border-2 text-xl transition-all ${
                  data.emojis_favoris.includes(emoji)
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-warm-200 hover:border-warm-300'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expressions */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          Une expression / mot que tu utilises souvent ?
        </label>
        <input
          type="text"
          value={data.expressions}
          onChange={(e) => setData(d => ({ ...d, expressions: e.target.value }))}
          placeholder='"C&apos;est parti !", "On y va ?", "Let&apos;s go"...'
          className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
        />
      </div>
    </div>
  );
}

/**
 * Étape 5 — Objectifs de prospection
 */
function StepObjectifs({ data, setData }) {
  const objectifs = [
    { id: 'clients', label: '🎯 Trouver des clients', icon: Target },
    { id: 'collabs', label: '🤝 Proposer des collabs', icon: Users },
    { id: 'influenceurs', label: '📣 Contacter des influenceurs', icon: Zap },
    { id: 'reseau', label: '🔗 Créer mon réseau', icon: Heart },
  ];

  const premiersContacts = [
    { id: 'appel', label: '📞 Un appel découverte', icon: Phone },
    { id: 'ressource', label: '🎁 Une ressource gratuite', icon: Gift },
    { id: 'echanger', label: '💬 Juste échanger', icon: MessageSquare },
    { id: 'audit', label: '🔍 Un audit gratuit', icon: Eye },
  ];

  const leadMagnets = [
    { id: 'guide', label: '📘 Guide PDF' },
    { id: 'formation', label: '🎥 Mini-formation' },
    { id: 'template', label: '📋 Template' },
    { id: 'audit', label: '🔍 Audit gratuit' },
    { id: 'aucun', label: '❌ Pas encore' },
  ];

  return (
    <div className="space-y-6">
      {/* Objectif */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          Tu contactes des gens pour...
        </label>
        <div className="grid grid-cols-2 gap-3">
          {objectifs.map(obj => (
            <button
              key={obj.id}
              type="button"
              onClick={() => setData(d => ({ ...d, objectif_prospection: obj.id }))}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                data.objectif_prospection === obj.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-warm-200 hover:border-warm-300'
              }`}
            >
              <obj.icon className={`w-5 h-5 ${data.objectif_prospection === obj.id ? 'text-brand-600' : 'text-warm-400'}`} />
              <span className={`font-medium ${data.objectif_prospection === obj.id ? 'text-brand-700' : 'text-warm-700'}`}>
                {obj.label.split(' ').slice(1).join(' ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Premier contact */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-3">
          En premier message, tu proposes quoi ?
        </label>
        <div className="grid grid-cols-2 gap-3">
          {premiersContacts.map(pc => (
            <button
              key={pc.id}
              type="button"
              onClick={() => setData(d => ({ ...d, premier_contact: pc.id }))}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                data.premier_contact === pc.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-warm-200 hover:border-warm-300'
              }`}
            >
              <pc.icon className={`w-5 h-5 ${data.premier_contact === pc.id ? 'text-brand-600' : 'text-warm-400'}`} />
              <span className={`font-medium text-sm ${data.premier_contact === pc.id ? 'text-brand-700' : 'text-warm-700'}`}>
                {pc.label.split(' ').slice(1).join(' ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lead magnet */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">
          Tu as un "cadeau" à offrir ? <span className="text-warm-400">(lead magnet)</span>
        </label>
        <input
          type="text"
          value={data.lead_magnet}
          onChange={(e) => setData(d => ({ ...d, lead_magnet: e.target.value }))}
          placeholder='Un guide "5 automations qui changent tout"'
          className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors mb-3"
        />
        <div className="flex flex-wrap gap-2">
          {leadMagnets.map(lm => (
            <button
              key={lm.id}
              type="button"
              onClick={() => setData(d => ({ ...d, lead_magnet: lm.id === 'aucun' ? '' : lm.label }))}
              className="px-3 py-1.5 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-600 text-sm transition-colors"
            >
              {lm.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Étape 6 — Génération du profil
 */
function StepGeneration({ data, isGenerating, generatedProfile, onFinish }) {
  // Labels pour l'affichage
  const getLabel = (key, value) => {
    const labels = {
      type_activite: { coach: 'Coach', freelance: 'Freelance', ecommerce: 'E-commerce', formateur: 'Formateur', creatif: 'Créatif', agence: 'Agence' },
      cible_genre: { femmes: 'Femmes', hommes: 'Hommes', tous: 'Tout le monde', entreprises: 'Entreprises' },
      objectif_prospection: { clients: 'Trouver des clients', collabs: 'Proposer des collabs', influenceurs: 'Contacter des influenceurs', reseau: 'Créer mon réseau' },
      premier_contact: { appel: 'Appel découverte', ressource: 'Ressource gratuite', echanger: 'Échanger', audit: 'Audit gratuit' },
      ton: { decontracte: 'Décontracté', pro: 'Pro', direct: 'Direct', inspirant: 'Inspirant', chaleureux: 'Chaleureux', expert: 'Expert' },
      super_pouvoirs: { clarte: 'Clarté', rapidite: 'Rapidité', ecoute: 'Écoute', strategie: 'Stratégie', creativite: 'Créativité', resultats: 'Résultats', energie: 'Énergie', qualite: 'Qualité', pedagogie: 'Pédagogie', bienveillance: 'Bienveillance' },
    };
    return labels[key]?.[value] || value;
  };

  if (isGenerating) {
    return (
      <div className="py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        </div>
        <h3 className="font-display text-xl font-semibold text-warm-900 mb-2">
          Création de ton profil MA VOIX...
        </h3>
        <p className="text-warm-500">L'IA analyse ton style unique</p>
        
        {/* Progress bar animée */}
        <div className="mt-8 max-w-xs mx-auto">
          <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full animate-pulse" style={{ width: '75%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (generatedProfile) {
    return (
      <div className="space-y-6">
        {/* Récap */}
        <div className="bg-warm-50 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-warm-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Récap de ton profil
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-warm-400">👤</span>
              <span className="text-warm-700"><strong>{data.prenom}</strong> — {data.type_activite && getLabel('type_activite', data.type_activite)}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-warm-400">🎯</span>
              <span className="text-warm-700">{data.activite}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-warm-400">👥</span>
              <span className="text-warm-700">{data.cible_description}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-warm-400">✨</span>
              <span className="text-warm-700">{data.resultat_promis}</span>
            </div>
            {data.super_pouvoirs.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-warm-400">💪</span>
                <span className="text-warm-700">
                  {data.super_pouvoirs.map(sp => getLabel('super_pouvoirs', sp)).join(', ')}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-warm-400">🎤</span>
              <span className="text-warm-700">
                {data.ton.map(t => getLabel('ton', t)).join(', ')}
                {data.tutoiement === 'toujours' && ', tutoiement'}
                {data.utilisation_emojis !== 'jamais' && data.emojis_favoris.length > 0 && ` ${data.emojis_favoris.slice(0, 4).join('')}`}
              </span>
            </div>
            {data.lead_magnet && (
              <div className="flex items-start gap-2">
                <span className="text-warm-400">🎁</span>
                <span className="text-warm-700">{data.lead_magnet}</span>
              </div>
            )}
          </div>
        </div>

        {/* Message de succès */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-display text-xl font-semibold text-green-800 mb-2">
            Ton profil MA VOIX est prêt ! 🎉
          </h3>
          <p className="text-green-700 mb-6">
            L'IA va maintenant générer des messages qui sonnent comme toi.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onFinish('search')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/25"
            >
              <Search className="w-5 h-5" />
              Trouver mes premiers prospects
            </button>
            <button
              onClick={() => onFinish('dashboard')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
            >
              <Eye className="w-5 h-5" />
              Voir le dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function OnboardingProfond({ mode = 'self', clientName = '', onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProfile, setGeneratedProfile] = useState(null);
  
  // Données collectées
  const [data, setData] = useState({
    // Étape 1 — Identité
    prenom: '',
    activite: '',
    type_activite: null,
    anciennete: null,
    
    // Étape 2 — Client idéal
    cible_description: '',
    cible_genre: null,
    cible_problemes: [],
    
    // Étape 3 — Transformation
    resultat_promis: '',
    preuve_sociale: '',
    differentiation: '',
    super_pouvoirs: [],
    
    // Étape 4 — Style
    tutoiement: 'parfois',
    ton: [],
    utilisation_emojis: 'parfois',
    emojis_favoris: [],
    expressions: '',
    
    // Étape 5 — Objectifs
    objectif_prospection: null,
    premier_contact: null,
    lead_magnet: '',
  });

  // Configuration des étapes
  const steps = [
    { id: 'identite', title: '👋 Faisons connaissance', subtitle: 'Pour que tes messages sonnent vraiment comme toi' },
    { id: 'cible', title: '🎯 À qui tu parles ?', subtitle: 'Décris la personne que tu veux attirer' },
    { id: 'transformation', title: '✨ La magie que tu apportes', subtitle: 'Ce qui te rend unique et mémorable' },
    { id: 'style', title: '🎤 Comment tu parles ?', subtitle: 'Pour que tes messages sonnent 100% comme toi' },
    { id: 'objectifs', title: '🎯 Pourquoi tu prospectes ?', subtitle: 'Pour générer des messages parfaitement ciblés' },
    { id: 'generation', title: '✨ Création de ton profil', subtitle: 'L\'IA analyse ton style unique' },
  ];

  const currentStep = steps[step];
  const isLastInputStep = step === 4;
  const isGenerationStep = step === 5;

  // Validation par étape
  const canContinue = () => {
    switch (step) {
      case 0: return data.prenom.trim() && data.activite.trim();
      case 1: return data.cible_description.trim();
      case 2: return data.resultat_promis.trim();
      case 3: return data.ton.length > 0;
      case 4: return data.objectif_prospection && data.premier_contact;
      default: return true;
    }
  };

  // Navigation
  const handleNext = async () => {
    if (isLastInputStep) {
      setStep(5);
      await generateProfile();
    } else if (!isGenerationStep) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (isGenerationStep && !isGenerating) {
      setStep(4);
      setGeneratedProfile(null);
    } else if (step > 0) {
      setStep(s => s - 1);
    }
  };

  // Génération du profil MA VOIX via l'IA
  const generateProfile = async () => {
    setIsGenerating(true);
    try {
      const response = await api.generateVoiceProfileFromOnboarding(data);
      setGeneratedProfile(response.data);
    } catch (error) {
      console.error('Error generating profile:', error);
      // En cas d'erreur, créer un profil basique
      setGeneratedProfile({
        nom: `MA VOIX — ${data.prenom}`,
        ton_dominant: data.ton[0] || 'decontracte',
        niveau_energie: data.ton.includes('direct') ? 8 : 6,
        tutoiement: data.tutoiement,
        utilisation_emojis: {
          frequence: data.utilisation_emojis,
          favoris: data.emojis_favoris,
        },
        expressions_cles: data.expressions.split(',').map(e => e.trim()).filter(Boolean),
        contexte_business: {
          activite: data.activite,
          cible: data.cible_description,
          proposition_valeur: data.resultat_promis,
          differentiation: data.differentiation,
        },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Finaliser l'onboarding
  const handleFinish = async (redirectTo = 'search') => {
    try {
      // Sauvegarder le profil MA VOIX
      if (generatedProfile) {
        await api.createVoiceProfile(generatedProfile);
      }
      // Marquer l'onboarding comme complété
      await api.saveOnboarding(data, false);
    } catch (error) {
      console.error('Error saving onboarding:', error);
      // En mode démo, on continue quand même
    }
    // Callback toujours appelé (même si les API échouent en mode démo)
    onComplete(data, generatedProfile, redirectTo);
  };

  // Helper pour toggle une valeur dans un array
  const toggleArrayValue = (key, value) => {
    setData(d => ({
      ...d,
      [key]: d[key].includes(value)
        ? d[key].filter(v => v !== value)
        : [...d[key], value]
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-brand-50 via-white to-accent-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-2xl">
          
          {/* Progress bar */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.slice(0, 5).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-8 bg-brand-500'
                    : i < step
                    ? 'w-8 bg-brand-300'
                    : 'w-2 bg-warm-200'
                }`}
              />
            ))}
          </div>

          {/* Card principale */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-brand-500/10 overflow-hidden">
            
            {/* Header */}
            <div className="px-8 pt-8 pb-4 text-center">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-2">
                {currentStep.title}
              </h1>
              <p className="text-warm-500">{currentStep.subtitle}</p>
            </div>

            {/* Contenu dynamique */}
            <div className="px-8 pb-6">
              {step === 0 && <StepIdentite data={data} setData={setData} toggleArrayValue={toggleArrayValue} mode={mode} clientName={clientName} />}
              {step === 1 && <StepCible data={data} setData={setData} toggleArrayValue={toggleArrayValue} />}
              {step === 2 && <StepTransformation data={data} setData={setData} toggleArrayValue={toggleArrayValue} />}
              {step === 3 && <StepStyle data={data} setData={setData} toggleArrayValue={toggleArrayValue} />}
              {step === 4 && <StepObjectifs data={data} setData={setData} />}
              {step === 5 && (
                <StepGeneration 
                  data={data} 
                  isGenerating={isGenerating} 
                  generatedProfile={generatedProfile}
                  onFinish={handleFinish}
                />
              )}
            </div>

            {/* Footer navigation */}
            {!isGenerationStep && (
              <div className="px-8 py-6 bg-warm-50 border-t border-warm-100 flex items-center justify-between">
                <div>
                  {step > 0 ? (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:text-warm-800 font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Retour
                    </button>
                  ) : (
                    <button
                      onClick={onSkip}
                      className="px-4 py-2 text-warm-400 hover:text-warm-600 text-sm transition-colors"
                    >
                      Passer pour l'instant
                    </button>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  disabled={!canContinue()}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-semibold rounded-xl transition-all disabled:cursor-not-allowed shadow-lg shadow-brand-500/25"
                >
                  {isLastInputStep ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Créer mon profil
                    </>
                  ) : (
                    <>
                      Continuer
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Footer pour l'étape de génération */}
            {isGenerationStep && !isGenerating && generatedProfile && (
              <div className="px-8 py-6 bg-warm-50 border-t border-warm-100 flex items-center justify-between">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:text-warm-800 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Modifier mes réponses
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
