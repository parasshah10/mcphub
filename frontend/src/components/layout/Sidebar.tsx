import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionCheck } from '../PermissionChecker';
import UserProfileMenu from '@/components/ui/UserProfileMenu';
import { Home, Server, Box, Users, ShoppingCart, FileText } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  isMobile: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isCollapsed, isMobile, onToggle }) => {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const appVersion = import.meta.env.PACKAGE_VERSION as string;

  const menuItems: MenuItem[] = [
    { path: '/', label: t('nav.dashboard'), icon: <Home className="h-5 w-5" /> },
    { path: '/servers', label: t('nav.servers'), icon: <Server className="h-5 w-5" /> },
    { path: '/groups', label: t('nav.groups'), icon: <Box className="h-5 w-5" /> },
    { path: '/users', label: t('nav.users'), icon: <Users className="h-5 w-5" />, adminOnly: true },
    { path: '/market', label: t('nav.market'), icon: <ShoppingCart className="h-5 w-5" /> },
    { path: '/logs', label: t('nav.logs'), icon: <FileText className="h-5 w-5" /> },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || (auth.user?.isAdmin && usePermissionCheck('x')));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        <nav className="p-3 space-y-1">
          {filteredMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={isMobile ? onToggle : undefined}
              className={({ isActive }) =>
                `flex items-center px-2.5 py-2 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`
              }
              end={item.path === '/'}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="ml-3">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-shrink-0 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <UserProfileMenu collapsed={isCollapsed} version={appVersion} />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {isOpen && <div className="fixed inset-0 z-20 bg-black/30" onClick={onToggle}></div>}
        <aside
          className={`fixed top-0 left-0 z-30 h-full bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } w-64`}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  return (
    <aside
      className={`relative flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 ease-in-out h-full ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {sidebarContent}
    </aside>
  );
};

export default Sidebar;