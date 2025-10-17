import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import LanguageSwitch from '@/components/ui/LanguageSwitch';
import GitHubIcon from '@/components/icons/GitHubIcon';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useTranslation();

  return (
    <header className="relative z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center">
        {/* Sidebar toggle for mobile */}
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          aria-label={t('app.toggleSidebar')}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Sidebar toggle for desktop */}
        <button
          onClick={onToggleSidebar}
          className="hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:block"
          aria-label={t('app.toggleSidebar')}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* App Title */}
        <h1 className="ml-2 text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
          <span className="hidden sm:inline">{t('app.title')}</span>
          <span className="sm:hidden">{t('app.titleShort')}</span>
        </h1>
      </div>

      {/* Right-side controls */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
          {import.meta.env.PACKAGE_VERSION === 'dev'
            ? 'dev'
            : `v${import.meta.env.PACKAGE_VERSION}`}
        </span>
        <a
          href="https://github.com/samanhappy/mcphub"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="GitHub Repository"
        >
          <GitHubIcon className="h-5 w-5" />
        </a>
        <ThemeSwitch />
        <LanguageSwitch />
      </div>
    </header>
  );
};

export default Header;