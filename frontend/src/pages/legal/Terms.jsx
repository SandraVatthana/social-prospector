import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle, CreditCard } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="bg-white border-b border-warm-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to="/" className="inline-flex items-center gap-2 text-warm-600 hover:text-brand-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour a l'accueil
          </Link>
          <h1 className="text-3xl font-display font-bold text-warm-900">Conditions Generales d'Utilisation</h1>
          <p className="text-warm-500 mt-2">Derniere mise a jour : Janvier 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 md:p-12 space-y-8">

          {/* Introduction */}
          <section>
            <p className="text-warm-700 leading-relaxed">
              Les presentes Conditions Generales d'Utilisation (CGU) regissent l'utilisation de <strong>SOS Prospection</strong>,
              un service edite par <strong>My Inner Quest</strong>. En utilisant notre service, vous acceptez ces conditions.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">1. Description du service</h2>
            </div>

            <p className="text-warm-700 mb-4">
              SOS Prospection est un outil d'aide a la prospection sur les reseaux sociaux (LinkedIn, Instagram, TikTok).
              Le service propose :
            </p>

            <ul className="space-y-2 text-warm-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Analyse de profils publics pour identifier des prospects potentiels</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Generation de messages personnalises avec l'IA</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Profil "MA VOIX" pour adapter les messages a votre style</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Gestion de prospects et suivi de conversations</span>
              </li>
            </ul>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-amber-800 font-medium flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Important
              </p>
              <p className="mt-2 text-amber-700 text-sm">
                SOS Prospection est un outil d'<strong>aide a la redaction</strong>. Vous restez responsable de l'envoi
                de vos messages. Nous ne nous connectons jamais a vos comptes sociaux et n'envoyons jamais de messages a votre place.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">2. Utilisation acceptable</h2>
            </div>

            <p className="text-warm-700 mb-4">En utilisant SOS Prospection, vous vous engagez a :</p>

            <ul className="space-y-2 text-warm-700 mb-6">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Respecter les conditions d'utilisation des plateformes (LinkedIn, Instagram, TikTok)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Envoyer des messages personnalises et pertinents (pas de spam)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Respecter un rythme d'envoi raisonnable (20-40 DMs/jour max recommande)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Utiliser le service de maniere ethique et professionnelle</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">3. Utilisations interdites</h2>
            </div>

            <p className="text-warm-700 mb-4">Il est strictement interdit de :</p>

            <ul className="space-y-2 text-warm-700">
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span>
                <span>Utiliser le service pour du spam ou du harcelement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span>
                <span>Collecter des donnees a des fins de revente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span>
                <span>Utiliser des bots ou automatisations non autorisees</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span>
                <span>Contourner les limites d'utilisation du service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span>
                <span>Usurper l'identite d'autrui</span>
              </li>
            </ul>

            <p className="mt-4 text-warm-600 text-sm">
              Tout manquement a ces regles peut entrainer la suspension immediate de votre compte.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">4. Abonnement et paiement</h2>
            </div>

            <div className="space-y-4 text-warm-700">
              <div>
                <h3 className="font-semibold text-warm-800 mb-2">Essai gratuit</h3>
                <p>Un essai gratuit de 7 jours est propose sans carte bancaire requise.</p>
              </div>

              <div>
                <h3 className="font-semibold text-warm-800 mb-2">Abonnement</h3>
                <p>Les abonnements sont factures mensuellement. Vous pouvez annuler a tout moment depuis vos parametres.</p>
              </div>

              <div>
                <h3 className="font-semibold text-warm-800 mb-2">Remboursement</h3>
                <p>Une garantie satisfait ou rembourse de 14 jours est offerte apres le premier paiement.</p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">5. Limitation de responsabilite</h2>
            </div>

            <div className="space-y-3 text-warm-700">
              <p>
                SOS Prospection fournit un service "tel quel". Nous ne garantissons pas :
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Un taux de reponse specifique a vos messages</li>
                <li>Que votre compte social ne sera pas restreint (cela depend de votre usage)</li>
                <li>La disponibilite ininterrompue du service</li>
              </ul>
              <p className="mt-4">
                Vous etes seul responsable de l'utilisation que vous faites des messages generes et de leur envoi.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-warm-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-warm-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">6. Propriete intellectuelle</h2>
            </div>

            <p className="text-warm-700">
              L'Application, son design, son code et son contenu sont la propriete de My Inner Quest.
              Les messages que vous generez vous appartiennent et peuvent etre utilises librement.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">7. Modifications des CGU</h2>
            </div>

            <p className="text-warm-700">
              Nous nous reservons le droit de modifier ces CGU. En cas de modification substantielle,
              vous serez informe par email. La poursuite de l'utilisation du service vaut acceptation
              des nouvelles conditions.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-warm-900">8. Droit applicable</h2>
            </div>

            <p className="text-warm-700">
              Les presentes CGU sont soumises au droit francais. En cas de litige, les tribunaux
              francais seront competents.
            </p>

            <div className="mt-6 p-4 bg-warm-50 rounded-xl">
              <p className="font-semibold text-warm-800">Contact</p>
              <p className="text-warm-600">
                Pour toute question : <a href="mailto:contact@sosprospection.com" className="text-brand-600 hover:underline">contact@sosprospection.com</a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
