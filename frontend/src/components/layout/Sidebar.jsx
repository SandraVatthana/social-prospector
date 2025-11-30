import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Mic,
  Search,
  Users,
  MessageSquare,
  BarChart3,
  CreditCard,
  Settings,
} from 'lucide-react';
import { QuotaWidget } from '../dashboard';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'MA VOIX', href: '/voice', icon: Mic, indicator: true, tourId: 'voice' },
  { name: 'Recherche', href: '/search', icon: Search, tourId: 'search' },
  { name: 'Prospects', href: '/prospects', icon: Users, badge: null, tourId: 'prospects' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, badge: null, tourId: 'messages' },
];

const insights = [
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Abonnement', href: '/billing', icon: CreditCard },
];

export default function Sidebar({ user, prospectsCount = 0, messagesCount = 0 }) {
  const navigate = useNavigate();

  const navWithCounts = navigation.map(item => {
    if (item.name === 'Prospects') return { ...item, badge: prospectsCount };
    if (item.name === 'Messages') return { ...item, badge: messagesCount };
    return item;
  });

  return (
    <aside className="w-64 bg-white border-r border-warm-200 flex flex-col fixed h-full z-40">
      {/* Logo + Slogan */}
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-warm-900">Social</h1>
            <p className="text-xs text-brand-600 font-semibold -mt-1">Prospector</p>
          </div>
        </div>
        {/* Slogan */}
        <p className="text-xs text-warm-400 italic mt-3">
          La prospection qui parle avec ta vraie voix
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navWithCounts.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            data-tour={item.tourId}
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

        {insights.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
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
          </NavLink>
        ))}
      </nav>

      {/* Quota Widget */}
      <div className="p-4 border-t border-warm-100" data-tour="quota">
        <QuotaWidget />
      </div>

      {/* User */}
      <div className="p-4 border-t border-warm-100">
        <button
          onClick={() => navigate('/settings')}
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
    </aside>
  );
}
