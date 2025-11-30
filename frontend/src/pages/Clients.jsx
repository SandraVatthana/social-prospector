import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
  Mic2,
  MessageSquare,
  Target,
  X,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { useClient } from '../contexts/ClientContext';
import { useAuth } from '../contexts/AuthContext';

export default function Clients() {
  const { user } = useAuth();
  const {
    clients,
    loading,
    isAgencyMode,
    canAddMoreClients,
    maxClients,
    addClient,
    removeClient,
    updateClient,
    switchClient,
    activeClientId,
  } = useClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Filtrer les clients
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleAddClient = async (clientData) => {
    try {
      await addClient(clientData);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  const handleEditClient = async (clientData) => {
    try {
      await updateClient(editingClient.id, clientData);
      setShowEditModal(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error editing client:', error);
    }
  };

  const handleDeleteClient = async (clientId) => {
    try {
      await removeClient(clientId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setShowEditModal(true);
  };

  // Si pas en mode agence
  if (!isAgencyMode) {
    return (
      <>
        <Header
          title="Mes Clients"
          subtitle="Gestion multi-clients pour les agences"
        />
        <div className="p-8">
          <div className="max-w-lg mx-auto text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-brand-500" />
            </div>
            <h2 className="font-display text-2xl font-bold text-warm-900 mb-3">
              Mode Agence requis
            </h2>
            <p className="text-warm-600 mb-6">
              La gestion multi-clients est disponible avec les plans Agence et Agency+.
              Passez au niveau supérieur pour gérer plusieurs clients depuis un seul tableau de bord.
            </p>
            <a
              href="/billing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
            >
              Voir les plans
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Mes Clients"
        subtitle={`${clients.length}/${maxClients >= 100 ? 'illimité' : maxClients} clients`}
        action={
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!canAddMoreClients}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un client
          </button>
        }
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Barre de recherche */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        {/* Liste des clients */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-warm-500">Chargement des clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-warm-400" />
            </div>
            <h3 className="font-display text-lg font-semibold text-warm-700 mb-2">
              {searchQuery ? 'Aucun client trouvé' : 'Aucun client'}
            </h3>
            <p className="text-warm-500 mb-6">
              {searchQuery
                ? 'Essayez avec un autre terme de recherche'
                : 'Ajoutez votre premier client pour commencer'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter un client
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                isActive={activeClientId === client.id}
                onSelect={() => switchClient(client.id)}
                onEdit={() => openEditModal(client)}
                onDelete={() => setDeleteConfirm(client.id)}
              />
            ))}
          </div>
        )}

        {/* Limite atteinte */}
        {!canAddMoreClients && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Limite de clients atteinte</p>
                <p className="text-sm text-amber-700 mt-1">
                  Votre plan permet {maxClients} clients maximum.{' '}
                  <a href="/billing" className="underline hover:no-underline">
                    Passez à Agency+ pour des clients illimités
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Ajouter */}
      {showAddModal && (
        <ClientModal
          title="Ajouter un client"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddClient}
        />
      )}

      {/* Modal Modifier */}
      {showEditModal && editingClient && (
        <ClientModal
          title="Modifier le client"
          client={editingClient}
          onClose={() => {
            setShowEditModal(false);
            setEditingClient(null);
          }}
          onSubmit={handleEditClient}
        />
      )}

      {/* Modal Confirmation suppression */}
      {deleteConfirm && (
        <DeleteConfirmModal
          clientName={clients.find(c => c.id === deleteConfirm)?.name}
          onConfirm={() => handleDeleteClient(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}

// Composant carte client
function ClientCard({ client, isActive, onSelect, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Actif
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      default:
        return null;
    }
  };

  const initials = client.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`card p-5 transition-all cursor-pointer ${
        isActive
          ? 'ring-2 ring-brand-500 bg-brand-50/50'
          : 'hover:border-warm-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold">
              {initials}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-warm-900">{client.name}</h3>
            {getStatusBadge(client.status)}
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-warm-500" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-warm-200 py-1 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warm-700 hover:bg-warm-50"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-warm-100">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-warm-500 mb-1">
            <Target className="w-3.5 h-3.5" />
          </div>
          <p className="text-sm font-medium text-warm-900">--</p>
          <p className="text-xs text-warm-500">Prospects</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-warm-500 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <p className="text-sm font-medium text-warm-900">--</p>
          <p className="text-xs text-warm-500">Messages</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-warm-500 mb-1">
            <Mic2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-sm font-medium text-warm-900">
            {client.voice_profile ? '1' : '0'}
          </p>
          <p className="text-xs text-warm-500">Voix</p>
        </div>
      </div>

      {isActive && (
        <div className="mt-4 pt-4 border-t border-brand-200">
          <p className="text-xs text-center text-brand-600 font-medium">
            Client actif
          </p>
        </div>
      )}
    </div>
  );
}

// Modal ajout/modification client
function ClientModal({ title, client, onClose, onSubmit }) {
  const [name, setName] = useState(client?.name || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-warm-100">
          <h2 className="font-display text-xl font-semibold text-warm-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-warm-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-warm-700 mb-2">
              Nom du client *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Marie Coaching"
              className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              autoFocus
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-warm-100 hover:bg-warm-200 text-warm-700 font-semibold rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'Enregistrement...' : client ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal confirmation suppression
function DeleteConfirmModal({ clientName, onConfirm, onCancel }) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>

        <h2 className="text-xl font-semibold text-warm-900 text-center mb-2">
          Supprimer le client ?
        </h2>
        <p className="text-warm-600 text-center mb-6">
          Vous allez supprimer <strong>{clientName}</strong> ainsi que tous ses prospects et messages.
          Cette action est irréversible.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-warm-100 hover:bg-warm-200 text-warm-700 font-semibold rounded-xl transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-xl transition-colors"
          >
            {confirming ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}
