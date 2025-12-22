import { Link, useLocation } from 'react-router-dom';
import { Home, Clock, BarChart3, User } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Home', path: '/home' },
  { icon: Clock, label: 'History', path: '/history' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] backdrop-blur-xl bg-[var(--color-surface)]/95 pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-200 press-effect ${
                isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              {isActive ? (
                <div className="bg-[var(--color-accent)] rounded-full p-3">
                  <Icon className="w-5 h-5 text-[#0a0a0b]" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="p-3">
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
              )}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
