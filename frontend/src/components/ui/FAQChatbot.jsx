import { useState } from 'react';
import { MessageCircle, X, ChevronRight, Mail, ArrowLeft, Search } from 'lucide-react';

// Questions fréquentes organisées par catégorie
const FAQ_DATA = {
  categories: [
    {
      id: 'getting-started',
      title: 'Premiers pas',
      icon: '🚀',
      questions: [
        {
          q: 'Comment lancer ma première recherche ?',
          a: 'Cliquez sur "Nouvelle recherche" dans le menu ou le dashboard. Choisissez une source (compte, hashtag ou lieu), entrez votre critère et lancez la recherche. Les profils seront analysés automatiquement.',
        },
        {
          q: 'Comment configurer MA VOIX ?',
          a: 'Rendez-vous dans la section "MA VOIX" du menu. Répondez aux questions pour définir votre ton, vos expressions favorites et votre style. Ces paramètres seront utilisés pour générer des messages personnalisés.',
        },
        {
          q: 'Comment générer un message personnalisé ?',
          a: 'Après une recherche, cliquez sur un prospect puis sur "Générer un message". L\'IA analysera le profil et créera un message adapté à votre voix.',
        },
      ],
    },
    {
      id: 'features',
      title: 'Fonctionnalités',
      icon: '✨',
      questions: [
        {
          q: 'Qu\'est-ce que le score de pertinence ?',
          a: 'Le score (affiché en %) indique la qualité du prospect basée sur son engagement, nombre de followers, et activité récente. Plus le score est élevé, plus le prospect est susceptible de répondre.',
        },
        {
          q: 'Comment fonctionne le filtre francophone ?',
          a: 'Notre algorithme analyse les bios, noms et contenus pour identifier les profils francophones. Vous pouvez désactiver ce filtre dans les paramètres de recherche.',
        },
        {
          q: 'Puis-je exporter mes prospects ?',
          a: 'Oui ! Allez dans "Mes prospects" puis cliquez sur "Exporter". Vous pouvez télécharger la liste en CSV ou Excel.',
        },
      ],
    },
    {
      id: 'account',
      title: 'Mon compte',
      icon: '👤',
      questions: [
        {
          q: 'Comment voir mon quota restant ?',
          a: 'Votre quota est affiché dans le dashboard (section "Usage ce mois") et également accessible dans les paramètres de votre compte.',
        },
        {
          q: 'Comment changer de forfait ?',
          a: 'Rendez-vous dans Paramètres > Abonnement pour voir les différents plans et effectuer une mise à niveau.',
        },
        {
          q: 'Comment supprimer mon compte ?',
          a: 'Contactez-nous à contact@sosprospection.com pour demander la suppression de votre compte et de vos données.',
        },
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Problèmes',
      icon: '🔧',
      questions: [
        {
          q: 'La recherche ne retourne aucun résultat',
          a: 'Vérifiez l\'orthographe du hashtag ou du compte. Pour les hashtags, essayez sans le #. Si le problème persiste, le compte/hashtag n\'a peut-être pas assez de contenu récent.',
        },
        {
          q: 'Les images des profils ne s\'affichent pas',
          a: 'C\'est un problème temporaire lié aux restrictions Instagram. Rafraîchissez la page ou attendez quelques minutes. Les données du profil restent accessibles.',
        },
        {
          q: 'Je n\'arrive pas à me connecter',
          a: 'Vérifiez votre email et mot de passe. Utilisez "Mot de passe oublié" si nécessaire. Si vous utilisez Google, assurez-vous d\'utiliser le même compte.',
        },
      ],
    },
  ],
};

export default function FAQChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState('categories'); // 'categories' | 'questions' | 'answer'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setCurrentView('questions');
  };

  const handleSelectQuestion = (question) => {
    setSelectedQuestion(question);
    setCurrentView('answer');
  };

  const handleBack = () => {
    if (currentView === 'answer') {
      setCurrentView('questions');
      setSelectedQuestion(null);
    } else if (currentView === 'questions') {
      setCurrentView('categories');
      setSelectedCategory(null);
    }
  };

  const handleReset = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
    setSelectedQuestion(null);
    setSearchQuery('');
  };

  // Recherche dans toutes les questions
  const searchResults = searchQuery.length > 2
    ? FAQ_DATA.categories.flatMap(cat =>
        cat.questions
          .filter(q =>
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.a.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(q => ({ ...q, category: cat.title }))
      )
    : [];

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bg-warm-600 hover:bg-warm-700 rotate-0'
            : 'bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 animate-pulse'
        }`}
        title="Aide & FAQ"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Panel du chatbot */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-warm-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-500 to-accent-500 p-4 text-white">
            <div className="flex items-center gap-3">
              {currentView !== 'categories' && (
                <button
                  onClick={handleBack}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1">
                <h3 className="font-semibold">
                  {currentView === 'categories' && 'Comment puis-je vous aider ?'}
                  {currentView === 'questions' && selectedCategory?.title}
                  {currentView === 'answer' && 'Réponse'}
                </h3>
                <p className="text-white/70 text-xs">FAQ & Support</p>
              </div>
              {currentView !== 'categories' && (
                <button
                  onClick={handleReset}
                  className="text-xs text-white/70 hover:text-white"
                >
                  Retour au menu
                </button>
              )}
            </div>
          </div>

          {/* Contenu */}
          <div className="max-h-96 overflow-y-auto">
            {/* Vue catégories */}
            {currentView === 'categories' && (
              <div className="p-4">
                {/* Barre de recherche */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une question..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-warm-200 rounded-xl text-sm focus:border-brand-500 focus:ring-0 outline-none"
                  />
                </div>

                {/* Résultats de recherche */}
                {searchQuery.length > 2 ? (
                  <div className="space-y-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectQuestion(result)}
                          className="w-full text-left p-3 bg-warm-50 hover:bg-warm-100 rounded-xl transition-colors"
                        >
                          <p className="text-sm font-medium text-warm-800 line-clamp-2">{result.q}</p>
                          <p className="text-xs text-warm-500 mt-1">{result.category}</p>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-warm-500 text-center py-4">
                        Aucun résultat trouvé
                      </p>
                    )}
                  </div>
                ) : (
                  /* Liste des catégories */
                  <div className="space-y-2">
                    {FAQ_DATA.categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleSelectCategory(category)}
                        className="w-full flex items-center gap-3 p-3 bg-warm-50 hover:bg-warm-100 rounded-xl transition-colors group"
                      >
                        <span className="text-xl">{category.icon}</span>
                        <span className="flex-1 text-left font-medium text-warm-800">
                          {category.title}
                        </span>
                        <ChevronRight className="w-4 h-4 text-warm-400 group-hover:text-brand-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vue questions d'une catégorie */}
            {currentView === 'questions' && selectedCategory && (
              <div className="p-4 space-y-2">
                {selectedCategory.questions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuestion(question)}
                    className="w-full text-left p-3 bg-warm-50 hover:bg-warm-100 rounded-xl transition-colors group"
                  >
                    <p className="text-sm font-medium text-warm-800 group-hover:text-brand-600 transition-colors">
                      {question.q}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Vue réponse */}
            {currentView === 'answer' && selectedQuestion && (
              <div className="p-4">
                <div className="bg-brand-50 rounded-xl p-4 mb-4">
                  <p className="font-medium text-warm-800 mb-2">{selectedQuestion.q}</p>
                  <p className="text-sm text-warm-600 leading-relaxed">{selectedQuestion.a}</p>
                </div>

                <p className="text-xs text-warm-500 text-center">
                  Cette réponse vous a-t-elle aidé ?
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Oui, merci !
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Autre question
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Contact */}
          <div className="border-t border-warm-100 p-4 bg-warm-50">
            <p className="text-xs text-warm-500 text-center mb-2">
              Vous ne trouvez pas votre réponse ?
            </p>
            <a
              href="mailto:contact@sosprospection.com"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-white hover:bg-warm-100 border border-warm-200 rounded-xl text-sm font-medium text-warm-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contactez-nous
            </a>
            <p className="text-xs text-warm-400 text-center mt-2">
              contact@sosprospection.com
            </p>
          </div>
        </div>
      )}
    </>
  );
}
