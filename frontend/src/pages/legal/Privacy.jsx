import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
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
            <Shield className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-warm-900">
              Politique de Confidentialité
            </h1>
            <p className="text-warm-500">Dernière mise à jour : Janvier 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 prose prose-warm max-w-none">
          <h2>1. Introduction</h2>
          <p>
            Social Prospector, édité par My Inner Quest (ci-après "nous"), s'engage à protéger la vie privée de ses utilisateurs et des personnes dont les données sont collectées via notre service.
          </p>
          <p>
            Cette politique décrit les données que nous collectons, comment nous les utilisons, et vos droits concernant ces données.
          </p>

          <h2>2. Données collectées</h2>

          <h3>2.1 Données des utilisateurs</h3>
          <ul>
            <li>Adresse email (pour la création de compte)</li>
            <li>Nom (optionnel)</li>
            <li>Informations de paiement (traitées par Lemon Squeezy, nous ne stockons pas vos coordonnées bancaires)</li>
            <li>Données d'utilisation du service</li>
          </ul>

          <h3>2.2 Données des prospects</h3>
          <p>Notre service collecte des données publiquement accessibles sur Instagram et TikTok :</p>
          <ul>
            <li>Nom d'utilisateur</li>
            <li>Biographie publique</li>
            <li>Nombre de followers/suivis</li>
            <li>Publications publiques (texte uniquement, pas d'images/vidéos)</li>
          </ul>
          <p>
            <strong>Important :</strong> Nous ne collectons PAS d'adresses email, numéros de téléphone, ou autres données de contact privées des prospects.
          </p>

          <h2>3. Base légale du traitement</h2>
          <p>Nous traitons les données sur les bases légales suivantes :</p>
          <ul>
            <li><strong>Exécution du contrat :</strong> pour les données utilisateurs nécessaires à la fourniture du service</li>
            <li><strong>Intérêt légitime :</strong> pour la collecte de données publiques à des fins de prospection B2B</li>
            <li><strong>Consentement :</strong> pour les communications marketing (si applicable)</li>
          </ul>

          <h2>4. Durée de conservation</h2>
          <ul>
            <li><strong>Données prospects :</strong> 30 jours d'inactivité maximum. Les prospects non contactés ou sans interaction sont automatiquement supprimés.</li>
            <li><strong>Messages générés :</strong> 90 jours</li>
            <li><strong>Données utilisateurs :</strong> Durée de l'abonnement + 2 ans (obligations légales)</li>
          </ul>

          <h2>5. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
            <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
            <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
          </ul>

          <h3>Pour les prospects (personnes dont les données sont collectées)</h3>
          <p>
            Si vous souhaitez que vos données soient supprimées et ne plus être collecté par notre service, vous pouvez soumettre une demande via notre{' '}
            <Link to="/opt-out" className="text-brand-600 hover:underline">
              formulaire de suppression
            </Link>
            .
          </p>

          <h2>6. Partage des données</h2>
          <p>Nous ne vendons jamais vos données. Nous les partageons uniquement avec :</p>
          <ul>
            <li><strong>Supabase :</strong> hébergement de la base de données (serveurs EU)</li>
            <li><strong>Vercel :</strong> hébergement de l'application</li>
            <li><strong>Lemon Squeezy :</strong> traitement des paiements</li>
            <li><strong>Anthropic (Claude) :</strong> génération de messages IA (données anonymisées)</li>
            <li><strong>Apify :</strong> collecte de données publiques</li>
          </ul>

          <h2>7. Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données : chiffrement en transit (HTTPS), accès restreint, et audits réguliers.
          </p>

          <h2>8. Cookies</h2>
          <p>
            Nous utilisons uniquement des cookies essentiels au fonctionnement du service (authentification, préférences). Pas de cookies publicitaires ou de tracking tiers.
          </p>

          <h2>9. Contact</h2>
          <p>
            Pour toute question relative à vos données personnelles, contactez-nous :
          </p>
          <ul>
            <li>Email : <a href="mailto:privacy@myinnerquest.fr">privacy@myinnerquest.fr</a></li>
            <li>Adresse : My Inner Quest, France</li>
          </ul>

          <h2>10. Modifications</h2>
          <p>
            Cette politique peut être modifiée. Les changements significatifs seront notifiés par email aux utilisateurs enregistrés.
          </p>
        </div>
      </div>
    </div>
  );
}
