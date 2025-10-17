import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MarketServer, CloudServer, ServerConfig } from '@/types';
import { useMarketData } from '@/hooks/useMarketData';
import { useCloudData } from '@/hooks/useCloudData';
import { useToast } from '@/contexts/ToastContext';
import { apiPost } from '@/utils/fetchInterceptor';
import MarketServerCard from '@/components/MarketServerCard';
import MarketServerDetail from '@/components/MarketServerDetail';
import CloudServerCard from '@/components/CloudServerCard';
import CloudServerDetail from '@/components/CloudServerDetail';
import MCPRouterApiKeyError from '@/components/MCPRouterApiKeyError';
import Pagination from '@/components/ui/Pagination';

const MarketPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { serverName } = useParams<{ serverName?: string }>();
  const { showToast } = useToast();

  // Get tab from URL search params, default to cloud market
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'cloud';

  // Local market data
  const {
    servers: localServers,
    allServers: allLocalServers,
    categories: localCategories,
    loading: localLoading,
    error: localError,
    setError: setLocalError,
    searchServers: searchLocalServers,
    filterByCategory: filterLocalByCategory,
    filterByTag: filterLocalByTag,
    selectedCategory: selectedLocalCategory,
    selectedTag: selectedLocalTag,
    installServer: installLocalServer,
    fetchServerByName: fetchLocalServerByName,
    isServerInstalled,
    // Pagination
    currentPage: localCurrentPage,
    totalPages: localTotalPages,
    changePage: changeLocalPage,
    serversPerPage: localServersPerPage,
    changeServersPerPage: changeLocalServersPerPage
  } = useMarketData();

  // Cloud market data  
  const {
    servers: cloudServers,
    allServers: allCloudServers,
    loading: cloudLoading,
    error: cloudError,
    setError: setCloudError,
    fetchServerTools,
    callServerTool,
    // Pagination
    currentPage: cloudCurrentPage,
    totalPages: cloudTotalPages,
    changePage: changeCloudPage,
    serversPerPage: cloudServersPerPage,
    changeServersPerPage: changeCloudServersPerPage
  } = useCloudData();

  const [selectedServer, setSelectedServer] = useState<MarketServer | null>(null);
  const [selectedCloudServer, setSelectedCloudServer] = useState<CloudServer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installedCloudServers, setInstalledCloudServers] = useState<Set<string>>(new Set());

  // Load server details if a server name is in the URL
  useEffect(() => {
    const loadServerDetails = async () => {
      if (serverName) {
        // Determine if it's a cloud or local server based on the current tab
        if (currentTab === 'cloud') {
          // Try to find the server in cloud servers
          const server = cloudServers.find(s => s.name === serverName);
          if (server) {
            setSelectedCloudServer(server);
          } else {
            // If server not found, navigate back to market page
            navigate('/market?tab=cloud');
          }
        } else {
          // Local market
          const server = await fetchLocalServerByName(serverName);
          if (server) {
            setSelectedServer(server);
          } else {
            // If server not found, navigate back to market page
            navigate('/market?tab=local');
          }
        }
      } else {
        setSelectedServer(null);
        setSelectedCloudServer(null);
      }
    };

    loadServerDetails();
  }, [serverName, currentTab, cloudServers, fetchLocalServerByName, navigate]);

  // Tab switching handler
  const switchTab = (tab: 'local' | 'cloud') => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    setSearchParams(newSearchParams);
    // Clear any selected server when switching tabs
    if (serverName) {
      navigate('/market?' + newSearchParams.toString());
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentTab === 'local') {
      searchLocalServers(searchQuery);
    }
    // Cloud search is not implemented in the original cloud page
  };

  const handleCategoryClick = (category: string) => {
    if (currentTab === 'local') {
      filterLocalByCategory(category);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    if (currentTab === 'local') {
      filterLocalByCategory('');
      filterLocalByTag('');
    }
  };

  const handleServerClick = (server: MarketServer | CloudServer) => {
    if (currentTab === 'cloud') {
      navigate(`/market/${server.name}?tab=cloud`);
    } else {
      navigate(`/market/${server.name}?tab=local`);
    }
  };

  const handleBackToList = () => {
    navigate(`/market?tab=${currentTab}`);
  };

  const handleLocalInstall = async (server: MarketServer, config: ServerConfig) => {
    try {
      setInstalling(true);
      const success = await installLocalServer(server, config);
      if (success) {
        showToast(t('market.installSuccess', { serverName: server.display_name }), 'success');
      }
    } finally {
      setInstalling(false);
    }
  };

  // Handle cloud server installation
  const handleCloudInstall = async (server: CloudServer, config: ServerConfig) => {
    try {
      setInstalling(true);

      const payload = {
        name: server.name,
        config: config
      };

      const result = await apiPost('/servers', payload);

      if (!result.success) {
        const errorMessage = result?.message || t('server.addError');
        showToast(errorMessage, 'error');
        return;
      }

      // Update installed servers set
      setInstalledCloudServers(prev => new Set(prev).add(server.name));
      showToast(t('cloud.installSuccess', { name: server.title || server.name }), 'success');

    } catch (error) {
      console.error('Error installing cloud server:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(t('cloud.installError', { error: errorMessage }), 'error');
    } finally {
      setInstalling(false);
    }
  };

  const handleCallTool = async (serverName: string, toolName: string, args: Record<string, any>) => {
    try {
      const result = await callServerTool(serverName, toolName, args);
      showToast(t('cloud.toolCallSuccess', { toolName }), 'success');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't show toast for API key errors, let the component handle it
      if (!isMCPRouterApiKeyError(errorMessage)) {
        showToast(t('cloud.toolCallError', { toolName, error: errorMessage }), 'error');
      }
      throw error;
    }
  };

  // Helper function to check if error is MCPRouter API key not configured
  const isMCPRouterApiKeyError = (errorMessage: string) => {
    return errorMessage === 'MCPROUTER_API_KEY_NOT_CONFIGURED' ||
      errorMessage.toLowerCase().includes('mcprouter api key not configured');
  };

  const handlePageChange = (page: number) => {
    if (currentTab === 'local') {
      changeLocalPage(page);
    } else {
      changeCloudPage(page);
    }
    // Scroll to top of page when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChangeItemsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (currentTab === 'local') {
      changeLocalServersPerPage(newValue);
    } else {
      changeCloudServersPerPage(newValue);
    }
  };

  // Render detailed view if a server is selected
  if (selectedServer) {
    return (
      <MarketServerDetail
        server={selectedServer}
        onBack={handleBackToList}
        onInstall={handleLocalInstall}
        installing={installing}
        isInstalled={isServerInstalled(selectedServer.name)}
      />
    );
  }

  // Render cloud server detail if selected
  if (selectedCloudServer) {
    return (
      <CloudServerDetail
        serverName={selectedCloudServer.name}
        onBack={handleBackToList}
        onCallTool={handleCallTool}
        fetchServerTools={fetchServerTools}
        onInstall={handleCloudInstall}
        installing={installing}
        isInstalled={installedCloudServers.has(selectedCloudServer.name)}
      />
    );
  }

  // Get current data based on active tab
  const isLocalTab = currentTab === 'local';
  const servers = isLocalTab ? localServers : cloudServers;
  const allServers = isLocalTab ? allLocalServers : allCloudServers;
  const categories = isLocalTab ? localCategories : [];
  const loading = isLocalTab ? localLoading : cloudLoading;
  const error = isLocalTab ? localError : cloudError;
  const setError = isLocalTab ? setLocalError : setCloudError;
  const selectedCategory = isLocalTab ? selectedLocalCategory : '';
  const selectedTag = isLocalTab ? selectedLocalTag : '';
  const currentPage = isLocalTab ? localCurrentPage : cloudCurrentPage;
  const totalPages = isLocalTab ? localTotalPages : cloudTotalPages;
  const serversPerPage = isLocalTab ? localServersPerPage : cloudServersPerPage;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Navigation - mobile friendly */}
      <div className="mb-4 sm:mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-2 sm:space-x-3 overflow-x-auto">
            <button
              onClick={() => switchTab('cloud')}
              className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-sm sm:text-lg whitespace-nowrap hover:cursor-pointer transition-colors duration-200 ${
                !isLocalTab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span>{t('cloud.title')}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1 hidden sm:inline">
                (
                <a
                  href="https://mcprouter.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  MCPRouter
                </a>
                )
              </span>
            </button>
            <button
              onClick={() => switchTab('local')}
              className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-sm sm:text-lg whitespace-nowrap hover:cursor-pointer transition-colors duration-200 ${
                isLocalTab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <span>{t('market.title')}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1 hidden sm:inline">
                (
                <a
                  href="https://mcpm.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  MCPM
                </a>
                )
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Error display - responsive */}
      {error && (
        <>
          {!isLocalTab && isMCPRouterApiKeyError(error) ? (
            <MCPRouterApiKeyError />
          ) : (
            <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-3 sm:p-4 mb-4 sm:mb-6 error-box rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs sm:text-sm flex-1 break-words">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="flex-shrink-0 text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors duration-200 p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Search bar for local market only - responsive */}
      {isLocalTab && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-6 mb-4 sm:mb-6 page-card">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="flex-grow">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('market.searchPlaceholder')}
                className="shadow appearance-none border border-gray-200 dark:border-gray-700 rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 leading-tight focus:outline-none focus:shadow-outline form-input text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 flex items-center justify-center text-sm btn-primary transition-all duration-200"
              >
                {t('market.search')}
              </button>
              {(searchQuery || selectedCategory || selectedTag) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex-1 sm:flex-none border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded hover:bg-gray-50 dark:hover:bg-gray-700 btn-secondary transition-all duration-200 text-sm"
                >
                  {t('market.clearFilters')}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Main content area - responsive layout */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left sidebar for filters (local market only) - collapsible on mobile */}
        {isLocalTab && (
          <div className="lg:w-48 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 lg:sticky lg:top-4 page-card">
              {categories.length > 0 ? (
                <div className="mb-4 sm:mb-6">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      {t('market.categories')}
                    </h3>
                    {selectedCategory && (
                      <span 
                        className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline transition-colors duration-200" 
                        onClick={() => filterLocalByCategory('')}
                      >
                        {t('market.clearCategoryFilter')}
                      </span>
                    )}
                  </div>
                  <div className="flex lg:flex-col flex-wrap lg:flex-nowrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategoryClick(category)}
                        className={`px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm text-left transition-all duration-200 whitespace-nowrap lg:whitespace-normal ${
                          selectedCategory === category
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 font-medium btn-primary'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 btn-secondary'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              ) : loading ? (
                <div className="mb-4 sm:mb-6">
                  <div className="mb-2 sm:mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      {t('market.categories')}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2 items-center py-4 loading-container">
                    <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('app.loading')}</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 sm:mb-6">
                  <div className="mb-2 sm:mb-3">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      {t('market.categories')}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 py-2">
                    {t('market.noCategories')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-grow min-w-0">
          {loading ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sm:p-8 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 sm:h-10 sm:w-10 text-blue-500 mb-3 sm:mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">{t('app.loading')}</p>
              </div>
            </div>
          ) : servers.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 sm:p-8">
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base text-center">
                {isLocalTab ? t('market.noServers') : t('cloud.noServers')}
              </p>
            </div>
          ) : (
            <>
              {/* Server grid - responsive columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {servers.map((server, index) => (
                  isLocalTab ? (
                    <MarketServerCard
                      key={index}
                      server={server as MarketServer}
                      onClick={handleServerClick}
                    />
                  ) : (
                    <CloudServerCard
                      key={index}
                      server={server as CloudServer}
                      onClick={handleServerClick}
                    />
                  )
                ))}
              </div>

              {/* Pagination controls - responsive */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-6">
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                  {isLocalTab ? (
                    t('market.showing', {
                      from: (currentPage - 1) * serversPerPage + 1,
                      to: Math.min(currentPage * serversPerPage, allServers.length),
                      total: allServers.length
                    })
                  ) : (
                    t('cloud.showing', {
                      from: (currentPage - 1) * serversPerPage + 1,
                      to: Math.min(currentPage * serversPerPage, allServers.length),
                      total: allServers.length
                    })
                  )}
                </div>
                
                <div className="order-1 sm:order-2">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
                
                <div className="flex items-center space-x-2 order-3">
                  <label htmlFor="perPage" className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {isLocalTab ? t('market.perPage') : t('cloud.perPage')}:
                  </label>
                  <select
                    id="perPage"
                    value={serversPerPage}
                    onChange={handleChangeItemsPerPage}
                    className="border dark:border-gray-600 rounded p-1 text-xs sm:text-sm btn-secondary outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="6">6</option>
                    <option value="9">9</option>
                    <option value="12">12</option>
                    <option value="24">24</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
