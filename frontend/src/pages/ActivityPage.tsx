import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  ActivityStats,
  ActivityFilter,
  ActivityFilterOptions,
  ActivityStatus,
} from '@/types';
import {
  getActivities,
  getActivityById,
  getActivityStats,
  getActivityFilterOptions,
  deleteOldActivities,
} from '@/services/activityService';
import Pagination from '@/components/ui/Pagination';

// Pagination info type
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const STATUS_OPTIONS: ActivityStatus[] = ['success', 'error'];

const isValidStatus = (value: string): value is ActivityStatus =>
  STATUS_OPTIONS.includes(value as ActivityStatus);

const ActivityPage: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<ActivityFilterOptions | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'rendered' | 'json'>('rendered');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Filter state
  const [appliedFilters, setAppliedFilters] = useState<ActivityFilter>({});
  const [searchServer, setSearchServer] = useState('');
  const [searchTool, setSearchTool] = useState('');
  const [searchStatus, setSearchStatus] = useState<string>('');
  const [searchGroup, setSearchGroup] = useState('');
  const [searchKeyName, setSearchKeyName] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use appliedFilters directly for fetching
      const currentFilter = { ...appliedFilters };

      // Fetch activities, stats, and filter options in parallel
      const [activitiesRes, statsRes, optionsRes] = await Promise.all([
        getActivities(currentPage, itemsPerPage, currentFilter),
        getActivityStats(currentFilter),
        getActivityFilterOptions(),
      ]);

      if (activitiesRes?.success && Array.isArray(activitiesRes.data)) {
        setActivities(activitiesRes.data);
        if (activitiesRes.pagination) {
          setPagination(activitiesRes.pagination);
        }
      }

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }

      if (optionsRes?.success && optionsRes.data) {
        setFilterOptions(optionsRes.data);
      }
    } catch (err) {
      console.error('Error fetching activity data:', err);
      setError(t('activity.fetchError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, appliedFilters, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!pagination) {
      return;
    }

    const totalPages = Math.max(1, pagination.totalPages || 1);
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [pagination, currentPage]);

  // Handle view activity details
  const handleViewDetails = async (activity: Activity) => {
    try {
      const response = await getActivityById(activity.id);
      if (response?.success && response.data) {
        setSelectedActivity(response.data);
        setDetailTab('rendered');
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Error fetching activity details:', err);
    }
  };

  // Handle cleanup old activities
  const handleCleanup = async () => {
    if (!window.confirm(t('activity.confirmCleanup'))) {
      return;
    }

    try {
      const response = await deleteOldActivities(30);
      if (response?.success) {
        alert(t('activity.cleanupSuccess', { count: response.data?.deletedCount || 0 }));
        fetchData();
      }
    } catch (err) {
      console.error('Error cleaning up activities:', err);
      alert(t('activity.cleanupError'));
    }
  };

  // Handle search
  const handleSearch = () => {
    const filters: ActivityFilter = {};
    if (searchServer) filters.server = searchServer;
    if (searchTool) filters.tool = searchTool;
    if (searchStatus && isValidStatus(searchStatus)) {
      filters.status = searchStatus;
    }
    if (searchGroup) filters.group = searchGroup;
    if (searchKeyName) filters.keyName = searchKeyName;

    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchServer('');
    setSearchTool('');
    setSearchStatus('');
    setSearchGroup('');
    setSearchKeyName('');
    setAppliedFilters({});
    setCurrentPage(1);
  };

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Parse JSON safely
  const safeParseJSON = (str: string | undefined): any => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  // Render stats cards
  const renderStats = () => {
    if (!stats) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-4 py-3 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t('activity.totalCalls')}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.totalCalls}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t('activity.successCount')}
            </div>
            <div className="text-lg font-semibold text-green-600">{stats.successCount}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t('activity.errorCount')}
            </div>
            <div className="text-lg font-semibold text-red-600">{stats.errorCount}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t('activity.avgDuration')}
            </div>
            <div className="text-lg font-semibold text-blue-600">
              {formatDuration(stats.avgDuration)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render filters
  const renderFilters = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm px-4 py-3 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="sr-only" htmlFor="activity-server">
              {t('activity.server')}
            </label>
            <div className="relative">
              <input
                id="activity-server"
                type="text"
                value={searchServer}
                onChange={(e) => setSearchServer(e.target.value)}
                placeholder={t('activity.searchServer')}
                className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-9"
                list="server-options"
              />
              {searchServer && (
                <button
                  onClick={() => setSearchServer('')}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={t('common.clear')}
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
            {filterOptions?.servers && (
              <datalist id="server-options">
                {filterOptions.servers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="sr-only" htmlFor="activity-tool">
              {t('activity.tool')}
            </label>
            <div className="relative">
              <input
                id="activity-tool"
                type="text"
                value={searchTool}
                onChange={(e) => setSearchTool(e.target.value)}
                placeholder={t('activity.searchTool')}
                className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-9"
                list="tool-options"
              />
              {searchTool && (
                <button
                  onClick={() => setSearchTool('')}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={t('common.clear')}
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
            {filterOptions?.tools && (
              <datalist id="tool-options">
                {filterOptions.tools.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            )}
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="sr-only" htmlFor="activity-status">
              {t('activity.status')}
            </label>
            <div className="relative">
              <input
                id="activity-status"
                type="text"
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value.toLowerCase())}
                placeholder={t('activity.searchStatus')}
                className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-9"
                list="activity-status-options"
              />
              {searchStatus && (
                <button
                  onClick={() => setSearchStatus('')}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={t('common.clear')}
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
            <datalist id="activity-status-options">
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} />
              ))}
            </datalist>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="sr-only" htmlFor="activity-group">
              {t('activity.group')}
            </label>
            <div className="relative">
              <input
                id="activity-group"
                type="text"
                value={searchGroup}
                onChange={(e) => setSearchGroup(e.target.value)}
                placeholder={t('activity.searchGroup')}
                className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-9"
                list="group-options"
              />
              {searchGroup && (
                <button
                  onClick={() => setSearchGroup('')}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={t('common.clear')}
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
            {filterOptions?.groups && (
              <datalist id="group-options">
                {filterOptions.groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            )}
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="sr-only" htmlFor="activity-keyname">
              {t('activity.keyName')}
            </label>
            <div className="relative">
              <input
                id="activity-keyname"
                type="text"
                value={searchKeyName}
                onChange={(e) => setSearchKeyName(e.target.value)}
                placeholder={t('activity.searchKeyName')}
                className="w-full h-10 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white pr-9"
                list="keyname-options"
              />
              {searchKeyName && (
                <button
                  onClick={() => setSearchKeyName('')}
                  className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={t('common.clear')}
                  type="button"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
            {filterOptions?.keyNames && (
              <datalist id="keyname-options">
                {filterOptions.keyNames.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            )}
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={handleSearch}
              className="h-10 px-3 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center btn-primary transition-all duration-200 whitespace-nowrap"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              {t('common.search')}
            </button>
            <button
              onClick={handleClearFilters}
              className="h-10 px-3 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 flex items-center btn-secondary transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
              </svg>
              {t('common.clear')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render activity table
  const renderActivityTable = () => {
    if (activities.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
          {t('activity.noData')}
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activity.timestamp')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activity.server')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activity.tool')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activity.duration')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activity.status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activity.group')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('activity.key')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 whitespace-nowrap">
                    {formatTimestamp(activity.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                      {activity.server}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">
                    <span className="font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                      {activity.tool}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 whitespace-nowrap">
                    {formatDuration(activity.duration)}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        activity.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}
                    >
                      {activity.status === 'success'
                        ? t('activity.statusSuccess')
                        : t('activity.statusError')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {activity.group || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {activity.keyName || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleViewDetails(activity)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {t('common.view')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render detail modal
  const renderDetailModal = () => {
    if (!showDetailModal || !selectedActivity) return null;

    const inputData = safeParseJSON(selectedActivity.input);
    const outputData = safeParseJSON(selectedActivity.output);
    const isPurged = selectedActivity.input === null && selectedActivity.output === null;

    const isSummarizedSchema = (data: any) => {
      return data && typeof data === 'object' && (
        ('present' in data && 'type' in data) ||
        ('keyCount' in data && 'valueTypes' in data)
      );
    };

    const CopyButton: React.FC<{ text: string; fieldId: string; className?: string }> = ({ text, fieldId, className = '' }) => {
      const isCopied = copiedField === fieldId;
      return (
        <button
          onClick={() => handleCopy(text, fieldId)}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-all flex items-center justify-center shrink-0 ${className}`}
          title={t('activity.copy', 'Copy')}
        >
          {isCopied ? (
            <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
      );
    };

    const renderPropertiesTable = (data: any, prefix: string) => {
      if (!data || typeof data !== 'object') {
        return <p className="text-gray-600 dark:text-gray-300 font-mono text-sm break-all">{String(data)}</p>;
      }

      const entries = Object.entries(data);
      if (entries.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 italic text-sm">{t('activity.emptyObject', 'Empty Object')}</p>;
      }

      return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400 w-1/3">{t('activity.parameter', 'Parameter')}</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{t('activity.value', 'Value')}</th>
                <th className="px-4 py-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map(([key, val]) => {
                const valStr = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
                const isRedacted = valStr === '[REDACTED]';
                const isExcluded = valStr === '[IMAGE/BINARY DATA - EXCLUDED]';
                const isTruncated = valStr.includes('... [TRUNCATED]');
                
                return (
                  <tr key={key} className="hover:bg-gray-100/50 dark:hover:bg-gray-800/30 group">
                    <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-800 dark:text-gray-300 break-all">{key}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700 dark:text-gray-400 break-all whitespace-pre-wrap">
                      {isRedacted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 uppercase tracking-wider">
                          {t('activity.redacted', 'Redacted')}
                        </span>
                      ) : isExcluded ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          {t('activity.excluded', 'Excluded')}
                        </span>
                      ) : (
                        <>
                          {valStr}
                          {isTruncated && (
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 uppercase tracking-wider">
                              {t('activity.truncated', 'Truncated')}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {!isRedacted && !isExcluded && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={valStr} fieldId={`${prefix}-${key}`} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    };

    const renderOutputContent = (data: any) => {
      if (!data) return null;

      // Check if this matches standard MCP tool result format with text contents
      if (data.content && Array.isArray(data.content)) {
        return (
          <div className="space-y-3">
            {data.content.map((item: any, idx: number) => {
              if (item.type === 'text' && typeof item.text === 'string') {
                return (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex justify-between items-center px-4 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Text Content Block {idx + 1}
                      </span>
                      <CopyButton text={item.text} fieldId={`output-content-${idx}`} />
                    </div>
                    <pre className="p-4 text-xs font-mono overflow-x-auto max-h-96 whitespace-pre-wrap text-gray-800 dark:text-gray-300">
                      {item.text}
                    </pre>
                  </div>
                );
              }
              return (
                <div key={idx} className="p-3 border border-dashed border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900/30 text-xs font-mono text-gray-500">
                  [{String(item.type || 'unknown').toUpperCase()} DATA]
                </div>
              );
            })}
          </div>
        );
      }

      // Default fallback rendering
      return renderPropertiesTable(data, 'output');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('activity.details')}
            </h3>
            <button
              onClick={() => setShowDetailModal(false)}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto flex-grow max-h-[calc(90vh-120px)]">
            {/* Meta statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('activity.timestamp')}
                </label>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                  {formatTimestamp(selectedActivity.timestamp)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('activity.duration')}
                </label>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                  {formatDuration(selectedActivity.duration)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('activity.server')} / {t('activity.tool')}
                </label>
                <p className="text-sm font-medium text-gray-900 dark:text-white font-mono mt-0.5 break-all">
                  {selectedActivity.server} → {selectedActivity.tool}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t('activity.status')}
                </label>
                <div className="mt-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      selectedActivity.status === 'success'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                    }`}
                  >
                    {selectedActivity.status === 'success'
                      ? t('activity.statusSuccess')
                      : t('activity.statusError')}
                  </span>
                </div>
              </div>
            </div>

            {selectedActivity.errorMessage && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-red-600 dark:text-red-400 mb-1.5">
                  {t('activity.errorMessage')}
                </label>
                <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded p-3.5 text-xs font-mono text-red-800 dark:text-red-300 whitespace-pre-wrap">
                  {selectedActivity.errorMessage}
                </div>
              </div>
            )}

            {isPurged && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500 p-4 rounded mb-5">
                <div className="flex">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                      {t('activity.purgedTitle', 'Payload Purged')}
                    </h3>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      {t('activity.purgedMessage', 'The raw input and output payloads for this tool call have been automatically purged under the 30-day retention policy to reclaim storage space.')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isPurged && (
              <>
                {/* Tabs Selector */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5">
                  <button
                    className={`py-2.5 px-5 font-semibold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
                      detailTab === 'rendered'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    onClick={() => setDetailTab('rendered')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    {t('activity.renderedView', 'Rendered View')}
                  </button>
                  <button
                    className={`py-2.5 px-5 font-semibold text-sm border-b-2 transition-all flex items-center gap-1.5 ${
                      detailTab === 'json'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    onClick={() => setDetailTab('json')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {t('activity.rawJson', 'Raw JSON')}
                  </button>
                </div>

                {detailTab === 'rendered' ? (
                  <div className="space-y-6">
                    {/* Rendered View: Input */}
                    {inputData && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {t('activity.input')}
                            {isSummarizedSchema(inputData) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 tracking-wider">
                                {t('activity.summarizedShape', 'Summarized Shape')}
                              </span>
                            )}
                          </label>
                          {!isSummarizedSchema(inputData) && (
                            <CopyButton text={JSON.stringify(inputData, null, 2)} fieldId="input-all-rendered" />
                          )}
                        </div>
                        {renderPropertiesTable(inputData, 'input')}
                      </div>
                    )}

                    {/* Rendered View: Output */}
                    {outputData && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            {t('activity.output')}
                            {isSummarizedSchema(outputData) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 tracking-wider">
                                {t('activity.summarizedShape', 'Summarized Shape')}
                              </span>
                            )}
                          </label>
                          {!isSummarizedSchema(outputData) && (
                            <CopyButton text={JSON.stringify(outputData, null, 2)} fieldId="output-all-rendered" />
                          )}
                        </div>
                        {renderOutputContent(outputData)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Raw JSON View */}
                    {inputData && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {t('activity.input')} (JSON)
                          </label>
                          <CopyButton text={JSON.stringify(inputData, null, 2)} fieldId="input-raw-json" />
                        </div>
                        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-72 border border-gray-800">
                          {JSON.stringify(inputData, null, 2)}
                        </pre>
                      </div>
                    )}

                    {outputData && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {t('activity.output')} (JSON)
                          </label>
                          <CopyButton text={JSON.stringify(outputData, null, 2)} fieldId="output-raw-json" />
                        </div>
                        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-96 border border-gray-800">
                          {JSON.stringify(outputData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('activity.title')}</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleCleanup}
            className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center transition-all duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {t('activity.cleanup')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {isLoading && activities.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-blue-500 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-500 dark:text-gray-400">{t('app.loading')}</p>
          </div>
        </div>
      ) : (
        <>
          {renderStats()}
          {renderFilters()}
          {renderActivityTable()}

          {/* Pagination */}
          <div className="flex items-center mt-6">
            <div className="flex-[2] text-sm text-gray-500 dark:text-gray-400">
              {pagination &&
                t('common.showing', {
                  start: (pagination.page - 1) * pagination.limit + 1,
                  end: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })}
            </div>
            <div className="flex-[4] flex justify-center">
              {pagination && pagination.totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                  disabled={isLoading}
                />
              )}
            </div>
            <div className="flex-[2] flex items-center justify-end space-x-2">
              <label htmlFor="perPage" className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.itemsPerPage')}:
              </label>
              <select
                id="perPage"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                disabled={isLoading}
                className="border border-gray-300 dark:border-gray-600 rounded p-1 text-sm dark:bg-gray-700 dark:text-white outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </>
      )}

      {renderDetailModal()}
    </div>
  );
};

export default ActivityPage;
