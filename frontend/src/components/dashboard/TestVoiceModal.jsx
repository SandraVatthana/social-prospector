import { useState } from 'react';
import { Copy, Check, Loader2, Sparkles, User } from 'lucide-react';
import Modal from '../ui/Modal';

/**
 * Modal "Tester ma voix"
 * Permet de tester la génération de message avec un prospect fictif
 */
export default function TestVoiceModal({ isOpen, onClose, voiceProfile }) {
  const [prospectInfo, setProspectInfo] = useState({
    username: '',
    platform: 'instagram',
    bio: '',
    followers: '',
  });
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prospectInfo.username.trim()) {
      setError('Entre au moins un nom d\'utilisateur');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedMessage('');

    try {
      // Appel API pour générer le message de test
      const response = await fetch('/api/voice/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          prospect: prospectInfo,
          voiceProfile,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération');
      }

      const data = await response.json();
      setGeneratedMessage(data.message);
    } catch (err) {
      // En mode démo, générer un message exemple
      const demoMessage = generateDemoMessage(prospectInfo, voiceProfile);
      setGeneratedMessage(demoMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setProspectInfo({ username: '', platform: 'instagram', bio: '', followers: '' });
    setGeneratedMessage('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tester ma voix"
      description="Génère un message de test avec un prospect fictif pour voir ta voix en action"
      size="large"
    >
      <div className="space-y-6">
        {/* Formulaire prospect fictif */}
        <div className="p-4 bg-warm-50 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-warm-700 font-medium">
            <User className="w-4 h-4" />
            <span>Prospect fictif</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                Nom d'utilisateur *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400">@</span>
                <input
                  type="text"
                  value={prospectInfo.username}
                  onChange={(e) => setProspectInfo({ ...prospectInfo, username: e.target.value })}
                  placeholder="marie_coaching"
                  className="w-full pl-8 pr-4 py-2 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Plateforme */}
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                Plateforme
              </label>
              <select
                value={prospectInfo.platform}
                onChange={(e) => setProspectInfo({ ...prospectInfo, platform: e.target.value })}
                className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              Bio / Description
            </label>
            <textarea
              value={prospectInfo.bio}
              onChange={(e) => setProspectInfo({ ...prospectInfo, bio: e.target.value })}
              placeholder="Coach en développement personnel, j'aide les femmes à prendre confiance en elles..."
              rows={2}
              className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
            />
          </div>

          {/* Followers */}
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              Nombre d'abonnés
            </label>
            <input
              type="text"
              value={prospectInfo.followers}
              onChange={(e) => setProspectInfo({ ...prospectInfo, followers: e.target.value })}
              placeholder="12.4K"
              className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Bouton générer */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Générer le message test
            </>
          )}
        </button>

        {/* Message généré */}
        {generatedMessage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-warm-700">Message généré :</p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copier
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-warm-50 rounded-xl border border-warm-100">
              <p className="text-warm-700 whitespace-pre-line">{generatedMessage}</p>
            </div>

            <p className="text-xs text-warm-400 text-center">
              Ce message a été généré avec ton profil MA VOIX actif
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Génère un message de démo basé sur le profil vocal
 */
function generateDemoMessage(prospect, voiceProfile) {
  const { username, bio, platform } = prospect;
  const tone = voiceProfile?.tone || 'Décontracté';
  const tutoie = voiceProfile?.tutoiement !== 'Jamais';
  const emojis = voiceProfile?.emojis || ['default'];

  // Sélection d'emojis basée sur le profil
  const emoji1 = emojis.includes('default') ? '' : (emojis[0] || '');
  const emoji2 = emojis.includes('default') ? '' : (emojis[1] || '');
  const emoji3 = emojis.includes('default') ? '' : (emojis[2] || '');

  // Construire le message selon le ton
  let greeting = tutoie ? `Hey ${username} !` : `Bonjour ${username} !`;
  let hook = '';
  let pitch = '';
  let cta = '';

  if (bio) {
    hook = tutoie
      ? `J'ai vu ton profil et ${bio.toLowerCase().includes('coach') ? 'j\'adore ce que tu partages sur le coaching' : 'ton contenu m\'a parlé'} ${emoji1}`
      : `J'ai découvert votre profil et ${bio.toLowerCase().includes('coach') ? 'j\'apprécie beaucoup ce que vous partagez' : 'votre contenu m\'a interpellé'}`;
  } else {
    hook = tutoie
      ? `Je viens de découvrir ton profil ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} ${emoji1}`
      : `Je viens de découvrir votre profil ${platform === 'tiktok' ? 'TikTok' : 'Instagram'}`;
  }

  pitch = tutoie
    ? `Je travaille avec des créatrices comme toi sur l'automatisation et le gain de temps. ${emoji2}`
    : 'Je travaille avec des créatrices sur l\'automatisation et le gain de temps.';

  cta = tutoie
    ? `Ça te dit qu'on en parle ? ${emoji3}`
    : 'Seriez-vous intéressée pour en discuter ?';

  return `${greeting}\n\n${hook}\n\n${pitch}\n\n${cta}`;
}
