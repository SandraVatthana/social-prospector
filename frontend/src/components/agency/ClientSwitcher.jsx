import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Plus, Check, Trash2, Building2 } from 'lucide-react';
import { useClient } from '../../contexts/ClientContext';

/**
 * Sélecteur de client pour le mode Agence
 * Affiché dans la sidebar quand l'utilisateur a un plan Agence/Agency+
 */
export default function ClientSwitcher({ onAddClient }) {
  const {
    clients,
    activeClient,
    activeClientId,
    switchClient,
    canAddMoreClients,
    maxClients,
    removeClient,
  } = useClient();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const dropdownRef = useRef(null);

  // Fermer le dropdown quand on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setConfirmDelete(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = (clientId) => {
    switchClient(clientId);
    setIsOpen(false);
  };

  const handleDelete = async (e, clientId) => {
    e.stopPropagation();
    if (confirmDelete === clientId) {
      await removeClient(clientId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(clientId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-warm-50 hover:bg-warm-100 transition-colors"
      >
        {activeClient ? (
          <>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-semibold text-sm">
              {activeClient.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium text-warm-900 truncate">{activeClient.name}</p>
              <p className="text-xs text-warm-500">Client actif</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-warm-900">Mon compte</p>
              <p className="text-xs text-warm-500">Prospection perso</p>
            </div>
          </>
        )}
        <ChevronDown className={`w-5 h-5 text-warm-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-warm-200 py-2 z-50 max-h-80 overflow-y-auto">
          {/* Option "Mon compte" */}
          <button
            onClick={() => handleSwitch(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors ${
              !activeClientId ? 'bg-brand-50' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-warm-900">Mon compte</p>
              <p className="text-xs text-warm-500">Prospection perso</p>
            </div>
            {!activeClientId && (
              <Check className="w-5 h-5 text-brand-500" />
            )}
          </button>

          {/* Séparateur */}
          {clients.length > 0 && (
            <div className="border-t border-warm-100 my-2 mx-4" />
          )}

          {/* Liste des clients */}
          {clients.map(client => (
            <div
              key={client.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors cursor-pointer ${
                activeClientId === client.id ? 'bg-brand-50' : ''
              }`}
              onClick={() => handleSwitch(client.id)}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-semibold text-sm">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-warm-900 truncate">{client.name}</p>
                <p className="text-xs text-warm-500">
                  {client.status === 'active' ? '✅ MA VOIX configurée' : '⏳ À configurer'}
                </p>
              </div>
              {activeClientId === client.id && (
                <Check className="w-5 h-5 text-brand-500 flex-shrink-0" />
              )}
              {/* Bouton supprimer */}
              <button
                onClick={(e) => handleDelete(e, client.id)}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  confirmDelete === client.id
                    ? 'bg-red-100 text-red-600'
                    : 'hover:bg-warm-100 text-warm-400 hover:text-warm-600'
                }`}
                title={confirmDelete === client.id ? 'Confirmer la suppression' : 'Supprimer'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Séparateur */}
          <div className="border-t border-warm-100 my-2 mx-4" />

          {/* Bouton ajouter un client */}
          {canAddMoreClients ? (
            <button
              onClick={() => {
                setIsOpen(false);
                onAddClient?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-warm-50 transition-colors text-brand-600"
            >
              <div className="w-9 h-9 rounded-lg border-2 border-dashed border-brand-300 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Ajouter un client</p>
              </div>
              {maxClients !== Infinity && (
                <span className="text-xs text-warm-400 bg-warm-100 px-2 py-1 rounded-full">
                  {clients.length}/{maxClients}
                </span>
              )}
            </button>
          ) : (
            <div className="px-4 py-3 text-center text-sm text-warm-500">
              <p>Limite de clients atteinte ({maxClients})</p>
              <p className="text-xs mt-1">
                <a href="/billing" className="text-brand-500 hover:underline">
                  Passer à Agency+ pour illimité
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
