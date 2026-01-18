import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Eye, Trash2, Mail } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="bg-white border-b border-warm-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-warm-600 hover:text-brand-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour a l'accueil
          </Link>
          <h1 className="text-3xl font-display font-bold text-warm-900">Politique de Confidentialite</h1>
          <p className="text-warm-500 mt-2">Derniere mise a jour : Janvier 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 md:p-12 space-y-8">

          {/* Introduction */}
          <section>
            <p className="text-warm-700 leading-relaxed">
              <strong>SOS Prospection</strong> (ci-apres "nous", "notre", "l'Application") est un service edite par
              <strong> My Inner Quest</strong>. Nous nous engageons a proteger votre vie privee et vos donnees personnelles.
              Cette politique explique comment nous collectons, utilisons et protegeons vos informations.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">1. Donnees que nous collectons</h2>
            </div>

            <div className="space-y-4 text-warm-700">
              <div>
                <h3 className="font-semibold text-warm-800 mb-2">Donnees de compte</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Adresse email (pour l'authentification)</li>
                  <li>Prenom (optionnel, pour personnaliser l'experience)</li>
                  <li>Informations de profil MA VOIX (ton style de communication)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-warm-800 mb-2">Donnees de prospects</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Informations publiques de profils (nom, bio, titre)</li>
                  <li>URL des profils LinkedIn/Instagram</li>
                  <li>Notes et commentaires que vous ajoutez</li>
                </ul>
                <p className="mt-2 text-sm text-warm-500 italic">
                  Ces donnees proviennent uniquement de profils publics et sont importees uniquement a votre demande explicite.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-warm-800 mb-2">Donnees d'utilisation</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Nombre de messages generes</li>
                  <li>Fonctionnalites utilisees</li>
                  <li>Statistiques anonymisees pour ameliorer le service</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">2. Comment nous utilisons vos donnees</h2>
            </div>

            <ul className="space-y-3 text-warm-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Fournir le service :</strong> Generer des messages personnalises, analyser des profils</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Personnaliser l'experience :</strong> Adapter les suggestions a votre style (MA VOIX)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Ameliorer l'Application :</strong> Analyser l'usage pour ameliorer les fonctionnalites</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Communiquer avec vous :</strong> Emails transactionnels et support</span>
              </li>
            </ul>

            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 font-medium">Ce que nous ne faisons JAMAIS :</p>
              <ul className="mt-2 space-y-1 text-red-700 text-sm">
                <li>✗ Vendre vos donnees a des tiers</li>
                <li>✗ Acceder a vos comptes sociaux (nous n'avons pas vos identifiants)</li>
                <li>✗ Collecter des donnees sans votre consentement explicite</li>
                <li>✗ Envoyer des messages a votre place</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">3. Partage et sous-traitants</h2>
            </div>

            <p className="text-warm-700 mb-4">
              Nous utilisons des services tiers pour faire fonctionner l'Application :
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200">
                    <th className="text-left py-2 font-semibold text-warm-800">Service</th>
                    <th className="text-left py-2 font-semibold text-warm-800">Usage</th>
                    <th className="text-left py-2 font-semibold text-warm-800">Donnees</th>
                  </tr>
                </thead>
                <tbody className="text-warm-600">
                  <tr className="border-b border-warm-100">
                    <td className="py-2">Supabase</td>
                    <td className="py-2">Base de donnees</td>
                    <td className="py-2">Toutes les donnees utilisateur</td>
                  </tr>
                  <tr className="border-b border-warm-100">
                    <td className="py-2">Anthropic (Claude AI)</td>
                    <td className="py-2">Generation de messages</td>
                    <td className="py-2">Contexte pour generation (non stocke)</td>
                  </tr>
                  <tr className="border-b border-warm-100">
                    <td className="py-2">Netlify</td>
                    <td className="py-2">Hebergement</td>
                    <td className="py-2">Logs techniques</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">4. Vos droits (RGPD)</h2>
            </div>

            <p className="text-warm-700 mb-4">
              Conformement au RGPD, vous disposez des droits suivants :
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-warm-50 rounded-xl">
                <h4 className="font-semibold text-warm-800 mb-1">Droit d'acces</h4>
                <p className="text-sm text-warm-600">Obtenir une copie de vos donnees</p>
              </div>
              <div className="p-4 bg-warm-50 rounded-xl">
                <h4 className="font-semibold text-warm-800 mb-1">Droit de rectification</h4>
                <p className="text-sm text-warm-600">Corriger vos informations</p>
              </div>
              <div className="p-4 bg-warm-50 rounded-xl">
                <h4 className="font-semibold text-warm-800 mb-1">Droit a l'effacement</h4>
                <p className="text-sm text-warm-600">Supprimer votre compte et donnees</p>
              </div>
              <div className="p-4 bg-warm-50 rounded-xl">
                <h4 className="font-semibold text-warm-800 mb-1">Droit a la portabilite</h4>
                <p className="text-sm text-warm-600">Exporter vos donnees</p>
              </div>
            </div>

            <p className="mt-4 text-warm-700">
              Pour exercer ces droits, contactez-nous a{' '}
              <a href="mailto:contact@sosprospection.com" className="text-brand-600 hover:underline">
                contact@sosprospection.com
              </a>
              {' '}ou utilisez la page{' '}
              <Link to="/opt-out" className="text-brand-600 hover:underline">
                Demande de suppression
              </Link>.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">5. Securite des donnees</h2>
            </div>

            <ul className="space-y-2 text-warm-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">🔒</span>
                <span>Connexions chiffrees (HTTPS/TLS)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">🔒</span>
                <span>Base de donnees securisee avec Supabase (Row Level Security)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">🔒</span>
                <span>Authentification securisee (tokens JWT)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">🔒</span>
                <span>Pas de stockage de mots de passe en clair</span>
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-warm-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">6. Contact</h2>
            </div>

            <p className="text-warm-700">
              Pour toute question concernant cette politique de confidentialite :
            </p>
            <div className="mt-4 p-4 bg-warm-50 rounded-xl">
              <p className="font-semibold text-warm-800">My Inner Quest</p>
              <p className="text-warm-600">Email : <a href="mailto:contact@sosprospection.com" className="text-brand-600 hover:underline">contact@sosprospection.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
