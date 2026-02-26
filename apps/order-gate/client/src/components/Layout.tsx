import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { LayoutDashboard, ShieldCheck, LogOut } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItemClass = (path: string) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
    location.pathname === path ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
  }`;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">OG</div>
          <span className="text-xl font-bold text-gray-900">Order Gate</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard" className={navItemClass('/dashboard')}>
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>

          {user?.role === 'ADMIN' && (
            <Link to="/admin/prices" className={navItemClass('/admin/prices')}>
              <ShieldCheck size={20} />
              <span className="font-medium">Price Catalog</span>
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
