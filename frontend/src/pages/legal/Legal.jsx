import { Building2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Legal() {
  return (
    <div className="min-h-screen bg-warm-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-warm-600 hover:text-warm-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-warm-900">
              Mentions Légales
            </h1>
            <p className="text-warm-500">Informations légales obligatoires</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Éditeur */}
          <section>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">1. Éditeur du site</h2>
            <div className="bg-warm-50 rounded-xl p-4 space-y-2">
              <p><strong>Raison sociale :</strong> My Inner Quest</p>
              <p><strong>Représentant légal :</strong> Sandra Devonssay</p>
              <p><strong>Forme juridique :</strong> Micro-entreprise</p>
              <p><strong>Pays :</strong> France</p>
              <p><strong>Email :</strong> <a href="mailto:contact@myinnerquest.fr" className="text-brand-600 hover:underline">contact@myinnerquest.fr</a></p>
            </div>
          </section>

          {/* Hébergement */}
          <section>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">2. Hébergement</h2>
            <div className="bg-warm-50 rounded-xl p-4 space-y-4">
              <div>
                <p className="font-medium text-warm-700">Application web</p>
                <p className="text-warm-600">Vercel Inc.</p>
                <p className="text-sm text-warm-500">340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
              </div>
              <div>
                <p className="font-medium text-warm-700">Base de données</p>
                <p className="text-warm-600">Supabase Inc.</p>
                <p className="text-sm text-warm-500">970 Toa Payoh North, Singapore 318992</p>
                <p className="text-sm text-warm-500">Données hébergées en Europe (AWS eu-west)</p>
              </div>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">3. Propriété intellectuelle</h2>
            <p className="text-warm-600">
              L'ensemble du contenu de ce site (textes, graphiques, logos, icônes, images, clips audio et vidéo, téléchargements numériques) est la propriété de My Inner Quest ou de ses fournisseurs de contenu et est protégé par les lois françaises et internationales sur la propriété intellectuelle.
            </p>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">4. Données personnelles</h2>
            <p className="text-warm-600 mb-2">
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.
            </p>
            <p className="text-warm-600">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:privacy@myinnerquest.fr" className="text-brand-600 hover:underline">privacy@myinnerquest.fr</a>
            </p>
            <p className="mt-2">
              <Link to="/privacy" className="text-brand-600 hover:underline">
                Voir notre Politique de Confidentialité complète
              </Link>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">5. Cookies</h2>
            <p className="text-warm-600">
              Ce site utilise uniquement des cookies techniques essentiels au fonctionnement du service (authentification, préférences utilisateur). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </section>

          {/* Litiges */}
          <section>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">6. Litiges</h2>
            <p className="text-warm-600 mb-2">
              Les présentes mentions légales sont soumises au droit français. En cas de litige, et après échec de toute tentative de résolution amiable, les tribunaux français seront seuls compétents.
            </p>
            <p className="text-warm-600">
              Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir gratuitement au service de médiation de la consommation.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg font-semibold text-warm-900 mb-4">7. Contact</h2>
            <div className="bg-brand-50 rounded-xl p-4 space-y-2">
              <p><strong>Questions générales :</strong> <a href="mailto:contact@myinnerquest.fr" className="text-brand-600 hover:underline">contact@myinnerquest.fr</a></p>
              <p><strong>Protection des données :</strong> <a href="mailto:privacy@myinnerquest.fr" className="text-brand-600 hover:underline">privacy@myinnerquest.fr</a></p>
              <p><strong>Support technique :</strong> <a href="mailto:support@myinnerquest.fr" className="text-brand-600 hover:underline">support@myinnerquest.fr</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
