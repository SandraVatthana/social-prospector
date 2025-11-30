import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  Play,
  Shield,
  Users,
  Zap,
  Search,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Star,
  Mic,
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  Clock,
  Heart,
  Mail,
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
};

// Hook pour animation au scroll
function useScrollAnimation() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  return { ref, isInView };
}

// ==========================================
// SECTION 1: HERO
// ==========================================
function HeroSection() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-accent-50">
        <motion.div
          className="absolute top-0 left-0 w-[800px] h-[800px] bg-gradient-to-br from-brand-200/30 to-accent-200/30 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-accent-200/30 to-brand-200/30 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 text-center">
        <motion.div style={{ y: y2, opacity }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-brand-200 mb-8"
          >
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-medium text-brand-700">Nouveau : 4 méthodes d'approche IA</span>
          </motion.div>

          {/* Main title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="font-display text-5xl md:text-7xl font-bold text-warm-900 mb-6 leading-tight"
          >
            La prospection qui parle
            <br />
            <span className="bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent">
              avec TA vraie voix
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-xl md:text-2xl text-warm-600 max-w-3xl mx-auto mb-10"
          >
            Trouve tes clients idéaux sur Instagram et TikTok.
            <br />
            L'IA t'aide à écrire des messages qui sonnent comme TOI — pas comme un robot.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Link
              to="/login"
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-2xl shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 transition-all hover:-translate-y-0.5"
            >
              <Rocket className="w-5 h-5" />
              Essayer gratuitement
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="flex items-center gap-2 px-8 py-4 bg-white text-warm-700 font-semibold rounded-2xl border-2 border-warm-200 hover:border-brand-300 hover:bg-brand-50 transition-all">
              <Play className="w-5 h-5" />
              Voir la démo 1 min
            </button>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-warm-500"
          >
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              7 jours d'essai gratuit
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Pas de CB requise
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Tu gardes le contrôle
            </span>
          </motion.div>
        </motion.div>

        {/* App preview placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          style={{ y: y1 }}
          className="mt-16"
        >
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-warm-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-warm-50 border-b border-warm-100">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="aspect-video bg-gradient-to-br from-warm-50 to-brand-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Play className="w-10 h-10 text-brand-600" />
                  </div>
                  <p className="text-warm-500">Vidéo de démo</p>
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -right-8 top-1/4 bg-white rounded-xl shadow-lg p-4 hidden lg:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-warm-500">Taux de réponse</p>
                  <p className="font-bold text-green-600">+340%</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -left-8 bottom-1/4 bg-white rounded-xl shadow-lg p-4 hidden lg:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-warm-500">Messages</p>
                  <p className="font-bold text-brand-600">Personnalisés</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-warm-300 rounded-full flex items-start justify-center p-1"
        >
          <div className="w-1.5 h-3 bg-warm-400 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ==========================================
// SECTION 2: DISCLAIMER ÉTHIQUE
// ==========================================
function DisclaimerSection() {
  const { ref, isInView } = useScrollAnimation();

  const cards = [
    {
      icon: Users,
      title: 'TOI qui envoies',
      description: 'On ne se connecte JAMAIS à ton compte. Tu copies le message et tu l\'envoies toi-même.',
      color: 'brand',
    },
    {
      icon: Shield,
      title: 'Données publiques uniquement',
      description: 'On analyse ce qui est visible par tous sur les profils publics. Rien de privé.',
      color: 'green',
    },
    {
      icon: Zap,
      title: 'Qualité > Quantité',
      description: 'On te guide pour envoyer moins mais mieux. Pas de spam, que du sur-mesure.',
      color: 'amber',
    },
  ];

  const colors = {
    brand: 'bg-brand-100 text-brand-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Une approche éthique
          </span>
          <h2 className="font-display text-4xl font-bold text-warm-900">
            Une approche éthique de la prospection
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {cards.map((card, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="bg-warm-50 rounded-2xl p-8 text-center hover:shadow-lg transition-shadow"
            >
              <div className={`w-16 h-16 ${colors[card.color]} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                <card.icon className="w-8 h-8" />
              </div>
              <h3 className="font-display text-xl font-bold text-warm-900 mb-4">{card.title}</h3>
              <p className="text-warm-600">{card.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 3: PROBLEME / DOULEUR
// ==========================================
function ProblemSection() {
  const { ref, isInView } = useScrollAnimation();

  const painPoints = [
    { emoji: '😤', text: 'Tu passes 3h à chercher des prospects un par un' },
    { emoji: '🤖', text: 'Tes DMs sonnent robot et restent sans réponse' },
    { emoji: '📋', text: 'Tu copies des scripts génériques qui ne convertissent personne' },
  ];

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-warm-100 to-warm-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
        >
          <h2 className="font-display text-4xl font-bold text-warm-900 mb-12">
            Ça te parle ?
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="space-y-6 mb-12"
        >
          {painPoints.map((point, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ scale: 1.02, x: 10 }}
              className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-4 text-left"
            >
              <span className="text-4xl">{point.emoji}</span>
              <p className="text-xl text-warm-700">{point.text}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
        >
          <p className="text-2xl font-display font-semibold text-brand-600">
            Et si tes messages sonnaient VRAIMENT comme toi ?
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 4: MA VOIX (KILLER FEATURE)
// ==========================================
function MaVoixSection() {
  const { ref, isInView } = useScrollAnimation();
  const [showAfter, setShowAfter] = useState(false);

  const beforeMessage = `Bonjour, j'ai vu votre profil et je pense que nous pourrions collaborer. N'hésitez pas à me contacter.`;
  const afterMessage = `Hey Marie ! Ton post sur l'organisation m'a trop parlé — j'ai le même problème avec mes to-do lists infinies 😅 Tu veux que je te montre un truc qui m'a aidé ?`;

  const steps = [
    { num: '1', text: 'Colle 2-10 textes que TU as écrits (posts, emails, messages...)' },
    { num: '2', text: 'L\'IA analyse ton style : ton, emojis, expressions, énergie' },
    { num: '3', text: 'Tous tes messages sonnent comme toi — Score de fidélité : 87%' },
  ];

  return (
    <section ref={ref} className="py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-4">
            <Mic className="w-4 h-4" />
            La fonctionnalité qui change tout
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-warm-900 mb-4">
            MA VOIX — Ta signature, amplifiée par l'IA
          </h2>
        </motion.div>

        {/* Before/After comparison */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="max-w-3xl mx-auto mb-16"
        >
          <div className="bg-warm-50 rounded-2xl p-8">
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setShowAfter(false)}
                className={`px-6 py-2 rounded-xl font-medium transition-all ${
                  !showAfter ? 'bg-warm-200 text-warm-800' : 'text-warm-500 hover:bg-warm-100'
                }`}
              >
                Avant
              </button>
              <button
                onClick={() => setShowAfter(true)}
                className={`px-6 py-2 rounded-xl font-medium transition-all ${
                  showAfter ? 'bg-brand-500 text-white' : 'text-warm-500 hover:bg-warm-100'
                }`}
              >
                Après (MA VOIX)
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={showAfter ? 'after' : 'before'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`bg-white rounded-xl p-6 border-2 ${
                  showAfter ? 'border-brand-200' : 'border-warm-200'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full ${showAfter ? 'bg-brand-100' : 'bg-warm-100'} flex items-center justify-center`}>
                    <MessageSquare className={`w-5 h-5 ${showAfter ? 'text-brand-600' : 'text-warm-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-warm-900">
                      {showAfter ? 'Message avec MA VOIX' : 'Message générique'}
                    </p>
                    <p className="text-sm text-warm-500">
                      {showAfter ? 'Personnalisé + ton style' : 'Template copié-collé'}
                    </p>
                  </div>
                </div>
                <p className="text-warm-700 text-lg leading-relaxed">
                  {showAfter ? afterMessage : beforeMessage}
                </p>
                <div className={`mt-4 pt-4 border-t ${showAfter ? 'border-brand-100' : 'border-warm-100'} flex items-center justify-between`}>
                  <span className={`text-sm ${showAfter ? 'text-brand-600' : 'text-warm-500'}`}>
                    {showAfter ? 'Taux de réponse' : 'Taux de réponse'}
                  </span>
                  <span className={`font-bold text-xl ${showAfter ? 'text-green-600' : 'text-warm-400'}`}>
                    {showAfter ? '28%' : '3%'}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* How it works steps */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-2xl p-6 relative"
            >
              <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center font-bold mb-4">
                {step.num}
              </div>
              <p className="text-warm-700">{step.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 5: COMMENT CA MARCHE
// ==========================================
function HowItWorksSection() {
  const { ref, isInView } = useScrollAnimation();

  const steps = [
    {
      icon: Search,
      title: 'TROUVE',
      description: 'Tape un hashtag, un lieu, ou un compte similaire. L\'IA analyse chaque profil et te donne un score de pertinence.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Sparkles,
      title: 'GÉNÈRE',
      description: 'Un clic. Un message personnalisé basé sur leurs posts récents + TON style. Choisis ta méthode : Mini-AIDA, Story Seed, Miroir...',
      color: 'from-brand-500 to-brand-600',
    },
    {
      icon: Send,
      title: 'ENVOIE (toi-même)',
      description: 'Tu copies, tu ouvres Instagram/TikTok, tu colles, tu envoies. Tu restes maître de ta prospection.',
      color: 'from-green-500 to-green-600',
    },
  ];

  return (
    <section ref={ref} className="py-24 bg-warm-900">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            De la recherche au client en 3 étapes
          </h2>
          <p className="text-warm-400 text-xl">Simple, rapide, efficace</p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="relative"
            >
              {index < 2 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-warm-700 to-transparent z-0" />
              )}
              <div className="bg-warm-800 rounded-2xl p-8 relative z-10">
                <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-warm-400">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 6: BONNES PRATIQUES
// ==========================================
function BestPracticesSection() {
  const { ref, isInView } = useScrollAnimation();

  const goodPractices = [
    '5-10 DMs par session, puis pause 30-60 min',
    'Max 20-40 DMs par jour selon ton compte',
    'Messages TOUJOURS personnalisés (c\'est tout l\'intérêt !)',
    'Utilise ton compte normalement : stories, posts, likes',
    'Réponds aux commentaires, interagis avec ta communauté',
  ];

  const badPractices = [
    'Envoyer 50 DMs d\'un coup (ça se voit)',
    'Copier-coller le même message à tout le monde',
    'Utiliser ton compte UNIQUEMENT pour prospecter',
    'Ignorer les réponses et conversations',
  ];

  return (
    <section ref={ref} className="py-24 bg-gradient-to-br from-brand-50 to-white">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-medium mb-4">
            <Target className="w-4 h-4" />
            Conseils d'expert
          </span>
          <h2 className="font-display text-4xl font-bold text-warm-900 mb-4">
            La méthode qui marche (et qui protège ton compte)
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
        >
          <p className="text-warm-600 mb-8 text-center">
            Social Prospector t'aide à prospecter INTELLIGEMMENT.
            Voici nos recommandations pour des résultats durables :
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Good practices */}
            <div>
              <h3 className="flex items-center gap-2 font-bold text-green-700 mb-4">
                <Check className="w-5 h-5" />
                CE QU'ON RECOMMANDE
              </h3>
              <ul className="space-y-3">
                {goodPractices.map((practice, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start gap-3 text-warm-600"
                  >
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    {practice}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Bad practices */}
            <div>
              <h3 className="flex items-center gap-2 font-bold text-red-700 mb-4">
                <X className="w-5 h-5" />
                CE QU'ON DÉCONSEILLE
              </h3>
              <ul className="space-y-3">
                {badPractices.map((practice, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-start gap-3 text-warm-600"
                  >
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    {practice}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* Goal */}
          <div className="mt-8 pt-8 border-t border-warm-100 text-center">
            <h3 className="flex items-center justify-center gap-2 font-bold text-brand-700 mb-2">
              <Target className="w-5 h-5" />
              L'OBJECTIF
            </h3>
            <p className="text-warm-600">
              Moins de messages, plus de réponses. Un compte actif et humain, pas un robot.
              Des conversations qui mènent à de vrais clients.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 7: SOCIAL PROOF
// ==========================================
function SocialProofSection() {
  const { ref, isInView } = useScrollAnimation();

  const testimonials = [
    {
      quote: 'J\'envoyais 50 DMs par semaine sans réponse. Maintenant j\'en envoie 20 et j\'ai 5 appels bookés.',
      author: 'Marie L.',
      role: 'Coach business',
      stat: '+340%',
      statLabel: 'de taux de réponse',
    },
    {
      quote: 'MA VOIX a tout changé. Les prospects me disent que mes messages sont "rafraîchissants".',
      author: 'Thomas D.',
      role: 'Agence social media',
      stat: '12',
      statLabel: 'nouveaux clients en 2 mois',
    },
    {
      quote: 'Enfin un outil qui ne me transforme pas en robot. Mes messages sonnent comme moi, et ça se sent.',
      author: 'Julie R.',
      role: 'Formatrice',
      stat: '32%',
      statLabel: 'de taux de réponse',
    },
  ];

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl font-bold text-warm-900 mb-4">
            Ils ont transformé leur prospection
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              whileHover={{ y: -5 }}
              className="bg-warm-50 rounded-2xl p-8"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-warm-700 mb-6 italic">"{testimonial.quote}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-warm-900">{testimonial.author}</p>
                  <p className="text-sm text-warm-500">{testimonial.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-brand-600">{testimonial.stat}</p>
                  <p className="text-xs text-warm-500">{testimonial.statLabel}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 8: PRICING
// ==========================================
function PricingSection() {
  const { ref, isInView } = useScrollAnimation();
  const navigate = useNavigate();

  const plans = [
    {
      name: 'SOLO',
      price: '55',
      features: [
        '500 prospects/mois',
        '500 messages/mois',
        '1 profil MA VOIX',
        'Instagram + TikTok',
        'Analytics de base',
      ],
      popular: false,
    },
    {
      name: 'AGENCE',
      price: '149',
      features: [
        '2 000 prospects/mois',
        '2 000 messages/mois',
        '10 clients avec chacun leur MA VOIX',
        'Analytics par client',
        'Support prioritaire',
      ],
      popular: true,
    },
    {
      name: 'AGENCY+',
      price: '299',
      features: [
        '10 000 prospects/mois',
        '10 000 messages/mois',
        'Clients illimités',
        'Rapport PDF exportable',
        'Support dédié',
      ],
      popular: false,
    },
  ];

  return (
    <section ref={ref} className="py-24 bg-warm-50">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl font-bold text-warm-900 mb-4">
            Un prix simple, un ROI évident
          </h2>
          <p className="text-xl text-warm-600">
            1 seul client signé = ton abonnement rentabilisé pour des mois
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              className={`relative bg-white rounded-2xl p-8 ${
                plan.popular
                  ? 'ring-2 ring-brand-500 shadow-xl scale-105'
                  : 'border border-warm-200'
              }`}
            >
              {plan.popular && (
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-500 to-accent-500 text-white text-sm font-bold rounded-full"
                >
                  POPULAIRE
                </motion.div>
              )}
              <h3 className="font-display text-2xl font-bold text-warm-900 mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-warm-900">{plan.price}€</span>
                <span className="text-warm-500">/mois</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-warm-600">
                    <Check className="w-5 h-5 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg'
                    : 'bg-warm-100 text-warm-700 hover:bg-warm-200'
                }`}
              >
                Commencer
              </button>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-warm-500"
        >
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Sans engagement
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Annulable en 1 clic
          </span>
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            Satisfait ou remboursé 14 jours
          </span>
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 9: FAQ
// ==========================================
function FAQSection() {
  const { ref, isInView } = useScrollAnimation();
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: 'Est-ce que je risque de me faire bannir ?',
      answer: 'Non, si tu suis nos recommandations. Tu envoies toi-même tes messages, à un rythme humain (5-10 par session). On ne se connecte jamais à ton compte. La clé : qualité > quantité, et utiliser ton compte normalement à côté.',
    },
    {
      question: 'C\'est quoi exactement "MA VOIX" ?',
      answer: 'Tu colles 2-10 textes que tu as écrits (posts, emails...). Notre IA analyse ton style : ton, expressions, emojis, énergie. Résultat : tous tes messages générés sonnent comme TOI, pas comme un template.',
    },
    {
      question: 'Vous envoyez les messages à ma place ?',
      answer: 'Non, jamais. On génère le message parfait, TU le copies et l\'envoies toi-même. C\'est plus sûr pour ton compte, et ça reste authentique.',
    },
    {
      question: 'Combien de messages je peux envoyer par jour ?',
      answer: 'On recommande 20-40 DMs max par jour, en plusieurs sessions espacées. Ce n\'est pas une limite technique, c\'est une bonne pratique pour protéger ton compte.',
    },
    {
      question: 'Ça marche pour mon secteur ?',
      answer: 'Si tes clients sont sur Instagram ou TikTok, oui. Coachs, formateurs, agences, freelances, e-commerce... MA VOIX s\'adapte à tous les styles.',
    },
    {
      question: 'Comment annuler mon abonnement ?',
      answer: 'En 1 clic dans tes paramètres. Pas de question, pas de rétention forcée. Tu peux aussi nous écrire et on s\'en occupe.',
    },
  ];

  return (
    <section ref={ref} className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h2 className="font-display text-4xl font-bold text-warm-900 mb-4">
            Questions fréquentes
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="border border-warm-200 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-warm-50 transition-colors"
              >
                <span className="font-semibold text-warm-900">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-warm-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-warm-600">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 10: CTA FINAL
// ==========================================
function FinalCTASection() {
  const { ref, isInView } = useScrollAnimation();

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500"
          animate={{
            background: [
              'linear-gradient(to bottom right, #f15a24, #df5f54)',
              'linear-gradient(to bottom right, #df5f54, #f15a24)',
              'linear-gradient(to bottom right, #f15a24, #df5f54)',
            ],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_40%)]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={fadeInUp}
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            Prêt à prospecter avec TA vraie voix ?
          </h2>
          <Link
            to="/login"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-brand-600 font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
          >
            <Rocket className="w-6 h-6" />
            Commencer gratuitement — 7 jours d'essai
          </Link>
          <p className="mt-6 text-white/80">
            Sans CB requise • Setup en 2 minutes • Tu gardes le contrôle
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ==========================================
// SECTION 11: FOOTER
// ==========================================
function Footer() {
  return (
    <footer className="bg-warm-900 text-warm-400 py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Logo */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-white">Social Prospector</span>
            </div>
            <p className="text-warm-500 mb-4">
              La prospection qui parle avec ta vraie voix
            </p>
            <p className="text-sm">
              Social Prospector est un produit My Inner Quest
              <br />
              <a href="mailto:contact@myinnerquest.fr" className="hover:text-white transition-colors">
                contact@myinnerquest.fr
              </a>
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Politique de confidentialité
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  CGU
                </Link>
              </li>
              <li>
                <Link to="/legal" className="hover:text-white transition-colors">
                  Mentions légales
                </Link>
              </li>
              <li>
                <Link to="/opt-out" className="hover:text-white transition-colors">
                  Demande de suppression
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:contact@myinnerquest.fr" className="hover:text-white transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  contact@myinnerquest.fr
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-warm-800 text-sm text-center">
          <p className="mb-2">
            © {new Date().getFullYear()} My Inner Quest. Tous droits réservés.
          </p>
          <p className="text-warm-600">
            Instagram et TikTok sont des marques déposées de leurs propriétaires respectifs.
            Social Prospector n'est pas affilié à Meta ou TikTok.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ==========================================
// MAIN LANDING PAGE COMPONENT
// ==========================================
export default function Landing() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <DisclaimerSection />
      <ProblemSection />
      <MaVoixSection />
      <HowItWorksSection />
      <BestPracticesSection />
      <SocialProofSection />
      <PricingSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
}
