import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServerData } from '@/hooks/useServerData';
import { Server } from '@/types';
import EndpointsModal from '@/components/EndpointsModal';
import { Link } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { servers, error, setError, isLoading } = useServerData({ refreshOnMount: true });
  const [showGlobalEndpoints, setShowGlobalEndpoints] = useState(false);

  const serverStats = {
    total: servers.length,
    online: servers.filter((server: Server) => server.status === 'connected').length,
    offline: servers.filter((server: Server) => server.status === 'disconnected').length,
    connecting: servers.filter((server: Server) => server.status === 'connecting').length,
    oauthRequired: servers.filter((server: Server) => server.status === 'oauth_required').length,
  };

  const statusTranslations: Record<string, string> = {
    connected: 'status.online',
    disconnected: 'status.offline',
    connecting: 'status.connecting',
    oauth_required: 'status.oauthRequired',
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page title - responsive */}
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
        {t('pages.dashboard.title')}
      </h1>

      {/* Error message - responsive */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 sm:p-4 rounded shadow-sm error-box">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-red-800 dark:text-red-400 text-sm sm:text-lg font-medium">
                {t('app.error')}
              </h3>
              <p className="text-red-700 dark:text-red-300 text-xs sm:text-sm mt-1 break-words">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
              aria-label={t('app.closeButton')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading state - responsive */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sm:p-8 flex items-center justify-center loading-container">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 sm:h-10 sm:w-10 text-blue-500 mb-3 sm:mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">{t('app.loading')}</p>
          </div>
        </div>
      )}

      {/* Stats grid - responsive */}
      {!isLoading && (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          {/* Total servers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 icon-container status-icon-blue flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <h2 className="text-sm sm:text-xl font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {t('pages.dashboard.totalServers')}
                </h2>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {serverStats.total}
                </p>
              </div>
            </div>
          </div>

          {/* Online servers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 icon-container status-icon-green flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <h2 className="text-sm sm:text-xl font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {t('pages.dashboard.onlineServers')}
                </h2>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {serverStats.online}
                </p>
              </div>
            </div>
          </div>

          {/* Offline servers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 icon-container status-icon-red flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <h2 className="text-sm sm:text-xl font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {t('pages.dashboard.offlineServers')}
                </h2>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {serverStats.offline}
                </p>
              </div>
            </div>
          </div>

          {/* Connecting servers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 icon-container status-icon-yellow flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <h2 className="text-sm sm:text-xl font-semibold text-gray-700 dark:text-gray-300 truncate">
                  {t('pages.dashboard.connectingServers')}
                </h2>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {serverStats.connecting}
                </p>
              </div>
            </div>
          </div>
          
          {/* Global API Endpoints */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 dashboard-card col-span-1 xs:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 icon-container flex-shrink-0">
                <Link className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <h2 className="text-sm sm:text-xl font-semibold text-gray-700 dark:text-gray-300 truncate">
                  Global Endpoints
                </h2>
                <button
                  onClick={() => setShowGlobalEndpoints(true)}
                  className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-0.5 sm:mt-1 transition-colors"
                >
                  View URLs →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <EndpointsModal
        isOpen={showGlobalEndpoints}
        onClose={() => setShowGlobalEndpoints(false)}
        type="global"
        title="Global API Endpoints"
      />

      {/* Recent servers table - responsive with horizontal scroll on mobile */}
      {servers.length > 0 && !isLoading && (
        <div className="mt-6 sm:mt-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            {t('pages.dashboard.recentServers')}
          </h2>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden table-container">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-3 sm:py-5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {t('server.name')}
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 sm:py-5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {t('server.status')}
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 sm:py-5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {t('server.tools')}
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 sm:py-5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {t('server.prompts')}
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-3 sm:py-5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {t('server.enabled')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {servers.slice(0, 5).map((server, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        <span className="block max-w-[120px] sm:max-w-none truncate">
                          {server.name}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          server.status === 'connected'
                            ? 'status-badge-online'
                            : server.status === 'disconnected'
                            ? 'status-badge-offline'
                            : 'status-badge-connecting'
                        }`}>
                          {t(statusTranslations[server.status] || server.status)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {server.tools?.length || 0}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {server.prompts?.length || 0}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {server.enabled !== false ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
