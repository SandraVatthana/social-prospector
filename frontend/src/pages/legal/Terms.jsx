import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
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
            <FileText className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-warm-900">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-warm-500">Dernière mise à jour : Janvier 2025</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 prose prose-warm max-w-none">
          <h2>1. Objet</h2>
          <p>
            Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation du service Social Prospector, édité par My Inner Quest (Sandra Devonssay).
          </p>
          <p>
            En utilisant ce service, vous acceptez ces conditions dans leur intégralité.
          </p>

          <h2>2. Description du service</h2>
          <p>
            Social Prospector est un outil SaaS de prospection sociale qui permet :
          </p>
          <ul>
            <li>La recherche et l'analyse de profils publics sur Instagram et TikTok</li>
            <li>La génération de messages de prospection personnalisés via intelligence artificielle</li>
            <li>Le suivi et la gestion des prospects</li>
            <li>L'analyse des performances de prospection</li>
          </ul>

          <h2>3. Création de compte</h2>
          <p>
            Pour utiliser le service, vous devez créer un compte avec une adresse email valide. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité sur votre compte.
          </p>

          <h2>4. Obligations de l'utilisateur</h2>

          <h3>4.1 Utilisation éthique</h3>
          <p>Vous vous engagez à :</p>
          <ul>
            <li>Utiliser le service de manière éthique et respectueuse</li>
            <li>Ne pas envoyer de spam ou de messages non sollicités en masse</li>
            <li>Respecter les conditions d'utilisation d'Instagram et TikTok</li>
            <li>Ne pas harceler ou importuner les personnes contactées</li>
          </ul>

          <h3>4.2 Interdictions</h3>
          <p>Il est strictement interdit de :</p>
          <ul>
            <li>Revendre ou partager les données collectées</li>
            <li>Utiliser le service pour des activités illégales</li>
            <li>Contourner les limites de quotas par des moyens techniques</li>
            <li>Créer plusieurs comptes pour contourner les limites</li>
            <li>Utiliser des scripts ou bots automatisés en dehors de l'interface du service</li>
          </ul>

          <h2>5. Quotas et limites</h2>
          <p>
            Chaque plan dispose de quotas mensuels et journaliers. Ces limites sont des <strong>maximums</strong>, pas des objectifs. Elles visent à :
          </p>
          <ul>
            <li>Protéger votre compte Instagram/TikTok des suspensions</li>
            <li>Garantir une prospection de qualité plutôt que de quantité</li>
            <li>Assurer une utilisation responsable du service</li>
          </ul>
          <p>
            Le non-respect répété des recommandations d'usage peut entraîner une suspension du compte.
          </p>

          <h2>6. Responsabilité partagée RGPD</h2>
          <p>
            En tant qu'utilisateur de Social Prospector, vous êtes <strong>co-responsable du traitement</strong> des données des prospects que vous collectez et contactez.
          </p>
          <p>Vous vous engagez à :</p>
          <ul>
            <li>Traiter les demandes de suppression reçues directement</li>
            <li>Ne pas utiliser les données à des fins autres que la prospection B2B légitime</li>
            <li>Supprimer les données des personnes qui le demandent</li>
          </ul>

          <h2>7. Tarification et paiement</h2>
          <ul>
            <li>Les prix sont indiqués en euros TTC</li>
            <li>Le paiement est effectué via Lemon Squeezy (carte bancaire)</li>
            <li>Les abonnements sont renouvelés automatiquement</li>
            <li>Vous pouvez annuler à tout moment, l'accès reste actif jusqu'à la fin de la période payée</li>
          </ul>

          <h2>8. Remboursement</h2>
          <p>
            Nous offrons un remboursement complet dans les <strong>14 jours</strong> suivant votre premier paiement si le service ne vous convient pas. Aucune condition, contactez-nous simplement.
          </p>

          <h2>9. Suspension et résiliation</h2>
          <p>Nous nous réservons le droit de suspendre ou résilier un compte en cas de :</p>
          <ul>
            <li>Violation des présentes CGU</li>
            <li>Utilisation abusive du service</li>
            <li>Non-paiement</li>
            <li>Activité suspecte ou frauduleuse</li>
          </ul>

          <h2>10. Limitation de responsabilité</h2>
          <ul>
            <li>Le service est fourni "en l'état"</li>
            <li>Nous ne garantissons pas de résultats spécifiques</li>
            <li>Nous ne sommes pas responsables des suspensions de vos comptes Instagram/TikTok</li>
            <li>Notre responsabilité est limitée au montant payé pour le service</li>
          </ul>

          <h2>11. Propriété intellectuelle</h2>
          <p>
            Le service, son code, son design et sa documentation sont la propriété exclusive de My Inner Quest. Les profils "MA VOIX" créés vous appartiennent.
          </p>

          <h2>12. Modifications</h2>
          <p>
            Ces CGU peuvent être modifiées. En cas de changement significatif, vous serez notifié par email au moins 30 jours avant l'entrée en vigueur.
          </p>

          <h2>13. Droit applicable</h2>
          <p>
            Ces CGU sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents de Paris.
          </p>

          <h2>14. Contact</h2>
          <p>
            Pour toute question : <a href="mailto:contact@myinnerquest.fr">contact@myinnerquest.fr</a>
          </p>
        </div>
      </div>
    </div>
  );
}
