import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import LanguageSwitch from '@/components/ui/LanguageSwitch';
import GitHubIcon from '@/components/icons/GitHubIcon';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useTranslation();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      <div className="flex justify-between items-center px-2 sm:px-3 py-2 sm:py-3">
        <div className="flex items-center min-w-0 flex-1">
          {/* Sidebar toggle button */}
          <button
            onClick={onToggleSidebar}
            className="p-1.5 sm:p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none flex-shrink-0"
            aria-label={t('app.toggleSidebar')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* App title - responsive text size */}
          <h1 className="ml-2 sm:ml-4 text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">
            {t('app.title')}
          </h1>
        </div>

        {/* Right side controls - responsive */}
        <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mr-1 sm:mr-2 hidden xs:inline">
            {import.meta.env.PACKAGE_VERSION === 'dev'
              ? import.meta.env.PACKAGE_VERSION
              : `v${import.meta.env.PACKAGE_VERSION}`}
          </span>

          <a
            href="https://github.com/samanhappy/mcphub"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 sm:p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="GitHub Repository"
          >
            <GitHubIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </a>
          <ThemeSwitch />
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
};

export default Header;