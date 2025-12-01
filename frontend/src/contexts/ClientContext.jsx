import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../lib/api';

const ClientContext = createContext(null);

/**
 * Provider pour gérer le mode agence multi-clients
 */
export function ClientProvider({ children }) {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [activeClientId, setActiveClientId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mode agence manuel (pour tests/démo)
  const [agencyOverride, setAgencyOverride] = useState(() => {
    const saved = localStorage.getItem('agencyMode');
    return saved ? JSON.parse(saved) : null;
  });

  // Déterminer si l'utilisateur est en mode agence (plan OU override manuel)
  const hasAgencyPlan = ['agence', 'agency_plus'].includes(user?.plan);
  const isAgencyMode = hasAgencyPlan || agencyOverride?.enabled;
  const agencyName = agencyOverride?.name || user?.agency_name || null;
  const maxClients = user?.plan === 'agence' ? 10 : (agencyOverride?.enabled ? 10 : Infinity);

  // Fonction pour activer/désactiver le mode agence manuellement
  const toggleAgencyMode = (enabled, name = '') => {
    const newOverride = enabled ? { enabled: true, name } : null;
    setAgencyOverride(newOverride);
    if (newOverride) {
      localStorage.setItem('agencyMode', JSON.stringify(newOverride));
    } else {
      localStorage.removeItem('agencyMode');
    }
  };

  // Charger les clients si mode agence
  useEffect(() => {
    if (isAgencyMode && user) {
      fetchClients();
    } else {
      setClients([]);
      setActiveClientId(null);
    }
  }, [isAgencyMode, user]);

  // Récupérer les clients depuis l'API
  const fetchClients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Mode démo - clients fictifs
        setClients(getMockClients());
        return;
      }

      const response = await fetch(`${API_BASE_URL}/clients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      // En cas d'erreur, utiliser les clients mock
      setClients(getMockClients());
    } finally {
      setLoading(false);
    }
  };

  // Ajouter un client
  const addClient = async (clientData) => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        // Mode démo
        const newClient = {
          id: `demo-${Date.now()}`,
          ...clientData,
          status: 'active',
          created_at: new Date().toISOString(),
        };
        setClients(prev => [...prev, newClient]);
        return newClient;
      }

      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(clientData),
      });

      if (response.ok) {
        const data = await response.json();
        setClients(prev => [...prev, data.data]);
        return data.data;
      }
      throw new Error('Erreur lors de la création du client');
    } catch (error) {
      console.error('Error adding client:', error);
      throw error;
    }
  };

  // Supprimer un client
  const removeClient = async (clientId) => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        // Mode démo
        setClients(prev => prev.filter(c => c.id !== clientId));
        if (activeClientId === clientId) {
          setActiveClientId(null);
        }
        return;
      }

      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setClients(prev => prev.filter(c => c.id !== clientId));
        if (activeClientId === clientId) {
          setActiveClientId(null);
        }
      }
    } catch (error) {
      console.error('Error removing client:', error);
      throw error;
    }
  };

  // Mettre à jour un client
  const updateClient = async (clientId, updates) => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        // Mode démo
        setClients(prev => prev.map(c =>
          c.id === clientId ? { ...c, ...updates } : c
        ));
        return;
      }

      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setClients(prev => prev.map(c =>
          c.id === clientId ? data.data : c
        ));
      }
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  };

  // Changer le client actif
  const switchClient = useCallback((clientId) => {
    setActiveClientId(clientId);
    // Sauvegarder dans localStorage pour persistance
    if (clientId) {
      localStorage.setItem('activeClientId', clientId);
    } else {
      localStorage.removeItem('activeClientId');
    }
  }, []);

  // Restaurer le client actif depuis localStorage
  useEffect(() => {
    const savedClientId = localStorage.getItem('activeClientId');
    if (savedClientId && clients.some(c => c.id === savedClientId)) {
      setActiveClientId(savedClientId);
    }
  }, [clients]);

  // Client actif
  const activeClient = clients.find(c => c.id === activeClientId) || null;

  // Peut-on ajouter plus de clients ?
  const canAddMoreClients = clients.length < maxClients;

  const value = {
    // État
    isAgencyMode,
    hasAgencyPlan,
    agencyName,
    agencyOverride,
    clients,
    activeClientId,
    activeClient,
    loading,
    maxClients,
    canAddMoreClients,

    // Actions
    switchClient,
    addClient,
    removeClient,
    updateClient,
    refreshClients: fetchClients,
    toggleAgencyMode,
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

/**
 * Hook pour accéder au contexte client
 */
export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}

/**
 * Clients mock pour le mode démo
 */
function getMockClients() {
  return [
    {
      id: 'demo-1',
      name: 'Marie Coaching',
      status: 'active',
      logo_url: null,
      onboarding_data: {
        prenom: 'Marie',
        activite: 'Coach en développement personnel',
      },
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'demo-2',
      name: 'Studio Pilates Lyon',
      status: 'pending',
      logo_url: null,
      onboarding_data: null,
      created_at: '2024-02-20T14:30:00Z',
    },
  ];
}

export default ClientContext;
