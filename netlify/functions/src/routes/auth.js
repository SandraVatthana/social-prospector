import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { formatResponse, formatError, isValidEmail } from '../utils/helpers.js';

const router = Router();

/**
 * POST /api/auth/signup
 * Inscription d'un nouvel utilisateur
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json(formatError('Email et mot de passe requis', 'VALIDATION_ERROR'));
    }

    if (!isValidEmail(email)) {
      return res.status(400).json(formatError('Email invalide', 'INVALID_EMAIL'));
    }

    if (password.length < 6) {
      return res.status(400).json(formatError('Mot de passe trop court (min 6 caractères)', 'WEAK_PASSWORD'));
    }

    // Créer l'utilisateur avec Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now
      user_metadata: { full_name },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(400).json(formatError('Cet email est déjà utilisé', 'EMAIL_EXISTS'));
      }
      throw authError;
    }

    // Créer le profil utilisateur dans la table users
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      email,
      full_name: full_name || null,
      plan: 'free',
      onboarding_completed: false,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Supprimer l'utilisateur auth si le profil échoue
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Générer une session
    const { data: session, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError) {
      throw sessionError;
    }

    res.status(201).json(formatResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
      },
      session: {
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
        expires_at: session.session.expires_at,
      },
    }, 'Compte créé avec succès'));

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json(formatError('Erreur lors de l\'inscription', 'SIGNUP_ERROR'));
  }
});

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(formatError('Email et mot de passe requis', 'VALIDATION_ERROR'));
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login')) {
        return res.status(401).json(formatError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS'));
      }
      throw error;
    }

    // Récupérer le profil utilisateur
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json(formatResponse({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name,
        plan: profile?.plan || 'free',
        onboarding_completed: profile?.onboarding_completed || false,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    }));

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(formatError('Erreur lors de la connexion', 'LOGIN_ERROR'));
  }
});

/**
 * POST /api/auth/logout
 * Déconnexion
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await supabaseAdmin.auth.admin.signOut(token);
    }
    res.json(formatResponse({ loggedOut: true }));
  } catch (error) {
    // Ignore errors - logout should always succeed from client perspective
    res.json(formatResponse({ loggedOut: true }));
  }
});

/**
 * POST /api/auth/refresh
 * Rafraîchir le token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json(formatError('Refresh token requis', 'VALIDATION_ERROR'));
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });

    if (error) {
      return res.status(401).json(formatError('Session expirée', 'SESSION_EXPIRED'));
    }

    res.json(formatResponse({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    }));

  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json(formatError('Erreur lors du rafraîchissement', 'REFRESH_ERROR'));
  }
});

/**
 * POST /api/auth/forgot-password
 * Mot de passe oublié
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json(formatError('Email valide requis', 'VALIDATION_ERROR'));
    }

    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
    });

    // Toujours retourner succès pour ne pas révéler si l'email existe
    res.json(formatResponse({ sent: true }, 'Si cet email existe, vous recevrez un lien de réinitialisation'));

  } catch (error) {
    console.error('Forgot password error:', error);
    res.json(formatResponse({ sent: true }, 'Si cet email existe, vous recevrez un lien de réinitialisation'));
  }
});

/**
 * POST /api/auth/reset-password
 * Réinitialiser le mot de passe
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json(formatError('Token et nouveau mot de passe requis', 'VALIDATION_ERROR'));
    }

    if (password.length < 6) {
      return res.status(400).json(formatError('Mot de passe trop court', 'WEAK_PASSWORD'));
    }

    const { error } = await supabaseAdmin.auth.updateUser({
      password,
    });

    if (error) {
      return res.status(400).json(formatError('Lien invalide ou expiré', 'INVALID_TOKEN'));
    }

    res.json(formatResponse({ reset: true }, 'Mot de passe mis à jour'));

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(formatError('Erreur lors de la réinitialisation', 'RESET_ERROR'));
  }
});

export default router;
