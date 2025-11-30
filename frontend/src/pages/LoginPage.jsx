import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage({ onDemoLogin }) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();

    // Pour l'inscription, vérifier que les CGU sont acceptées
    if (isRegister && !termsAccepted) {
      setError('Vous devez accepter les CGU pour créer un compte');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Pour l'inscription, vérifier que les CGU sont acceptées
    if (isRegister && !termsAccepted) {
      setError('Vous devez accepter les CGU pour créer un compte');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Erreur de connexion Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-50 to-warm-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-warm-800 mb-2">Social Prospector</h1>
          <p className="text-warm-500">Trouvez vos clients idéaux sur Instagram & TikTok</p>
        </div>

        {/* Carte de connexion */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Bouton Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-warm-200 rounded-xl hover:bg-warm-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-warm-300 border-t-brand-500 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="font-medium text-warm-700">Continuer avec Google</span>
          </button>

          {/* Séparateur */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-warm-200"></div>
            <span className="text-warm-400 text-sm">ou</span>
            <div className="flex-1 h-px bg-warm-200"></div>
          </div>

          {/* Formulaire email/mot de passe */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-warm-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                placeholder="votre@email.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-warm-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {/* Checkbox CGU pour inscription */}
            {isRegister && (
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 text-brand-600 border-warm-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="terms" className="text-sm text-warm-600">
                  J'accepte les{' '}
                  <Link to="/terms" className="text-brand-600 hover:underline" target="_blank">
                    Conditions Générales d'Utilisation
                  </Link>{' '}
                  et la{' '}
                  <Link to="/privacy" className="text-brand-600 hover:underline" target="_blank">
                    Politique de Confidentialité
                  </Link>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isRegister && !termsAccepted)}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white py-3 rounded-xl font-semibold hover:from-brand-600 hover:to-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                isRegister ? 'Créer mon compte' : 'Se connecter'
              )}
            </button>
          </form>

          {/* Toggle connexion/inscription */}
          <p className="text-center text-warm-500 text-sm mt-6">
            {isRegister ? (
              <>
                Déjà un compte ?{' '}
                <button
                  onClick={() => {
                    setIsRegister(false);
                    setError('');
                  }}
                  className="text-brand-600 font-medium hover:underline"
                >
                  Se connecter
                </button>
              </>
            ) : (
              <>
                Pas encore de compte ?{' '}
                <button
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                  }}
                  className="text-brand-600 font-medium hover:underline"
                >
                  Créer un compte
                </button>
              </>
            )}
          </p>

          {/* Liens légaux */}
          <div className="flex justify-center gap-4 mt-4 text-xs text-warm-400">
            <Link to="/terms" className="hover:text-warm-600">CGU</Link>
            <span>|</span>
            <Link to="/privacy" className="hover:text-warm-600">Confidentialité</Link>
            <span>|</span>
            <Link to="/legal" className="hover:text-warm-600">Mentions légales</Link>
          </div>
        </div>

        {/* Mode démo */}
        <div className="mt-6 text-center">
          <button
            onClick={onDemoLogin}
            className="text-warm-500 hover:text-brand-600 text-sm font-medium transition-colors"
          >
            Essayer en mode démo →
          </button>
        </div>
      </div>
    </div>
  );
}
