import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Mic,
  Search,
  Users,
  MessageSquare,
  BarChart3,
  Building2,
  CreditCard,
  Settings,
  Menu,
  X,
  Inbox,
  Target,
} from 'lucide-react';
import { QuotaWidget } from '../dashboard';
import { DMQueueWidget, QueueNotification } from '../queue';
import { useClient } from '../../contexts/ClientContext';
import { useSidebar } from '../../contexts/SidebarContext';
import ClientSwitcher from '../agency/ClientSwitcher';
import AddClientModal from '../agency/AddClientModal';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'MA VOIX', href: '/voice', icon: Mic, indicator: true, tourId: 'voice' },
  { name: 'Recherche', href: '/search', icon: Search, tourId: 'search' },
  { name: 'Prospects', href: '/prospects', icon: Users, badge: null, tourId: 'prospects' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, badge: null, tourId: 'messages' },
];

const insights = [
  { name: 'CRM Dashboard', href: '/crm', icon: Inbox, badge: 'NEW', tourId: 'crm' },
  { name: 'ICP & Scoring', href: '/icp', icon: Target, badge: 'NEW', tourId: 'icp' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, tourId: 'analytics' },
  { name: 'Analytics Agence', href: '/analytics-agence', icon: Building2, badge: 'PRO', agencyOnly: true },
  { name: 'Mes Clients', href: '/clients', icon: Users, badge: 'PRO', agencyOnly: true },
  { name: 'Abonnement', href: '/billing', icon: CreditCard, disabled: true, badge: 'Bientôt' },
];

export default function Sidebar({ user, prospectsCount = 0, messagesCount = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAgencyMode } = useClient();
  const { isOpen, isMobile, toggleSidebar, closeSidebar } = useSidebar();
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  const navWithCounts = navigation.map(item => {
    if (item.name === 'Prospects') return { ...item, badge: prospectsCount };
    if (item.name === 'Messages') return { ...item, badge: messagesCount };
    return item;
  });

  // Fermer la sidebar après navigation sur mobile
  const handleNavClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Bouton hamburger mobile */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-warm-200"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-warm-700" />
        ) : (
          <Menu className="w-6 h-6 text-warm-700" />
        )}
      </button>

      {/* Overlay mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-warm-200 flex flex-col fixed h-full z-40 transition-transform duration-300 ease-in-out ${
          isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        }`}
      >
      {/* Logo + Slogan */}
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center gap-3">
          <img
            src="/logofinal.png"
            alt="Prospection par DM"
            className="w-10 h-10 rounded-xl"
          />
          <div>
            <h1 className="font-display font-bold text-warm-900">Prospection</h1>
            <p className="text-xs text-brand-600 font-semibold -mt-1">par DM</p>
          </div>
        </div>
        {/* Slogan */}
        <p className="text-xs text-warm-400 italic mt-3">
          La prospection qui parle avec ta vraie voix
        </p>
      </div>

      {/* Client Switcher (Mode Agence uniquement) */}
      {isAgencyMode && (
        <div className="p-4 border-b border-warm-100">
          <ClientSwitcher onAddClient={() => setShowAddClientModal(true)} />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navWithCounts.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            data-tour={item.tourId}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-gradient-to-r from-brand-50 to-accent-50 text-brand-700 border-l-3 border-brand-500'
                  : 'text-warm-600 hover:bg-warm-50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.name}</span>
            {item.indicator && (
              <span className="ml-auto w-2 h-2 rounded-full bg-green-500" />
            )}
            {item.badge !== null && item.badge > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-brand-100 text-brand-700 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {/* Divider + Insights */}
        <div className="pt-4 mt-4 border-t border-warm-100">
          <p className="px-4 text-xs font-semibold text-warm-400 uppercase tracking-wider mb-2">
            Insights
          </p>
        </div>

        {insights
          .filter(item => !item.agencyOnly || isAgencyMode)
          .map((item) => (
          item.disabled ? (
            <div
              key={item.name}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-warm-400 cursor-not-allowed opacity-60"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-warm-200 text-warm-500 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
          ) : (
            <NavLink
              key={item.name}
              to={item.href}
              data-tour={item.tourId}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-50 to-accent-50 text-brand-700 border-l-3 border-brand-500'
                    : 'text-warm-600 hover:bg-warm-50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        ))}
      </nav>

      {/* Quota Widget */}
      <div className="p-4 border-t border-warm-100" data-tour="quota">
        <QuotaWidget />
      </div>

      {/* DM Queue Widget */}
      <div className="px-4 pb-2">
        <DMQueueWidget />
      </div>

      {/* Queue Notification Modal (global) */}
      <QueueNotification />

      {/* User */}
      <div className="p-4 border-t border-warm-100">
        <button
          onClick={() => {
            handleNavClick();
            navigate('/settings');
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-warm-600 hover:bg-warm-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-medium text-warm-900 text-sm truncate">
              {user?.name || 'Utilisateur'}
            </p>
            <p className="text-xs text-warm-500 truncate">
              Plan {user?.plan || 'Solo'}
            </p>
          </div>
          <Settings className="w-4 h-4 text-warm-400" />
        </button>
      </div>

      {/* Modal Ajout Client */}
      <AddClientModal
        isOpen={showAddClientModal}
        onClose={() => setShowAddClientModal(false)}
      />
    </aside>
    </>
  );
}
