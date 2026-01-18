import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, Server, Mail } from 'lucide-react';

export default function Legal() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="bg-white border-b border-warm-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-warm-600 hover:text-brand-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour a l'accueil
          </Link>
          <h1 className="text-3xl font-display font-bold text-warm-900">Mentions Legales</h1>
          <p className="text-warm-500 mt-2">Informations legales obligatoires</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 md:p-12 space-y-8">

          {/* Section 1: Editeur */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">1. Editeur du site</h2>
            </div>

            <div className="bg-warm-50 rounded-xl p-6 space-y-3">
              <div>
                <p className="text-sm text-warm-500">Raison sociale</p>
                <p className="font-semibold text-warm-800">My Inner Quest</p>
              </div>
              <div>
                <p className="text-sm text-warm-500">Nom du service</p>
                <p className="font-semibold text-warm-800">SOS Prospection</p>
              </div>
              <div>
                <p className="text-sm text-warm-500">Email de contact</p>
                <p className="font-semibold text-warm-800">
                  <a href="mailto:contact@sosprospection.com" className="text-brand-600 hover:underline">
                    contact@sosprospection.com
                  </a>
                </p>
              </div>
              <div>
                <p className="text-sm text-warm-500">Site web</p>
                <p className="font-semibold text-warm-800">
                  <a href="https://sosprospection.com" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    https://sosprospection.com
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Directeur de publication */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">2. Directeur de la publication</h2>
            </div>

            <div className="bg-warm-50 rounded-xl p-6">
              <p className="text-warm-700">
                Le directeur de la publication est le representant legal de My Inner Quest.
              </p>
              <p className="text-warm-700 mt-2">
                Contact : <a href="mailto:contact@sosprospection.com" className="text-brand-600 hover:underline">contact@sosprospection.com</a>
              </p>
            </div>
          </section>

          {/* Section 3: Hebergement */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Server className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">3. Hebergement</h2>
            </div>

            <div className="bg-warm-50 rounded-xl p-6 space-y-3">
              <div>
                <p className="text-sm text-warm-500">Hebergeur du site</p>
                <p className="font-semibold text-warm-800">Netlify, Inc.</p>
              </div>
              <div>
                <p className="text-sm text-warm-500">Adresse</p>
                <p className="text-warm-700">512 2nd Street, Suite 200, San Francisco, CA 94107, USA</p>
              </div>
              <div>
                <p className="text-sm text-warm-500">Site web</p>
                <p className="font-semibold text-warm-800">
                  <a href="https://www.netlify.com" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    https://www.netlify.com
                  </a>
                </p>
              </div>
            </div>

            <div className="bg-warm-50 rounded-xl p-6 space-y-3 mt-4">
              <div>
                <p className="text-sm text-warm-500">Base de donnees</p>
                <p className="font-semibold text-warm-800">Supabase, Inc.</p>
              </div>
              <div>
                <p className="text-sm text-warm-500">Site web</p>
                <p className="font-semibold text-warm-800">
                  <a href="https://supabase.com" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    https://supabase.com
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Propriete intellectuelle */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">4. Propriete intellectuelle</h2>
            </div>

            <div className="space-y-4 text-warm-700">
              <p>
                L'ensemble du contenu de ce site (textes, images, logos, icones, elements graphiques, logiciels)
                est la propriete exclusive de My Inner Quest ou de ses partenaires, et est protege par les lois
                francaises et internationales relatives a la propriete intellectuelle.
              </p>
              <p>
                Toute reproduction, representation, modification ou exploitation non autorisee de tout ou partie
                du contenu de ce site est interdite et peut constituer une contrefacon sanctionnee par le Code
                de la propriete intellectuelle.
              </p>
            </div>
          </section>

          {/* Section 5: Donnees personnelles */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">5. Donnees personnelles</h2>
            </div>

            <div className="text-warm-700">
              <p>
                Pour toute information concernant le traitement de vos donnees personnelles, veuillez consulter
                notre <Link to="/privacy" className="text-brand-600 hover:underline">Politique de Confidentialite</Link>.
              </p>
              <p className="mt-4">
                Conformement a la loi "Informatique et Libertes" du 6 janvier 1978 modifiee et au Reglement
                General sur la Protection des Donnees (RGPD), vous disposez d'un droit d'acces, de rectification,
                de suppression et de portabilite de vos donnees.
              </p>
              <p className="mt-4">
                Pour exercer ces droits, contactez-nous a{' '}
                <a href="mailto:contact@sosprospection.com" className="text-brand-600 hover:underline">
                  contact@sosprospection.com
                </a>{' '}
                ou via notre page de{' '}
                <Link to="/opt-out" className="text-brand-600 hover:underline">
                  demande de suppression
                </Link>.
              </p>
            </div>
          </section>

          {/* Section 6: Cookies */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-warm-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">6. Cookies</h2>
            </div>

            <div className="text-warm-700">
              <p>
                Ce site utilise des cookies strictement necessaires au fonctionnement du service
                (authentification, preferences). Nous n'utilisons pas de cookies publicitaires
                ni de tracking tiers.
              </p>
            </div>
          </section>

          {/* Section 7: Limitation de responsabilite */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">7. Limitation de responsabilite</h2>
            </div>

            <div className="text-warm-700">
              <p>
                My Inner Quest s'efforce de fournir des informations aussi precises que possible.
                Toutefois, elle ne pourra etre tenue responsable des omissions, inexactitudes ou
                carences dans la mise a jour, qu'elles soient de son fait ou du fait de tiers.
              </p>
              <p className="mt-4">
                L'utilisateur est seul responsable de l'utilisation qu'il fait des messages generes
                par le service et de leur envoi sur les reseaux sociaux.
              </p>
            </div>
          </section>

          {/* Credits */}
          <section className="pt-8 border-t border-warm-200">
            <p className="text-warm-500 text-sm text-center">
              © {new Date().getFullYear()} My Inner Quest - SOS Prospection. Tous droits reserves.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
