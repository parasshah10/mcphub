import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Server } from '@/types';
import { ChevronDown, ChevronRight, AlertCircle, Copy, Check, Link } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';
import ToolCard from '@/components/ui/ToolCard';
import PromptCard from '@/components/ui/PromptCard';
import DeleteDialog from '@/components/ui/DeleteDialog';
import EndpointsModal from '@/components/EndpointsModal';
import { useToast } from '@/contexts/ToastContext';
import { useSettingsData } from '@/hooks/useSettingsData';

interface ServerCardProps {
  server: Server;
  onRemove: (serverName: string) => void;
  onEdit: (server: Server) => void;
  onClone: (server: Server) => void;
  onToggle?: (server: Server, enabled: boolean) => Promise<boolean>;
  onRefresh?: () => void;
}

const ServerCard = ({ server, onRemove, onEdit, onClone, onToggle, onRefresh }: ServerCardProps) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [showErrorPopover, setShowErrorPopover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEndpointsModal, setShowEndpointsModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const errorPopoverRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (errorPopoverRef.current && !errorPopoverRef.current.contains(event.target as Node)) {
        setShowErrorPopover(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { exportMCPSettings } = useSettingsData();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
    setShowActionsMenu(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(server);
    setShowActionsMenu(false);
  };

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClone(server);
    setShowActionsMenu(false);
  };

  const handleShowEndpoints = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowEndpointsModal(true);
    setShowActionsMenu(false);
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isToggling || !onToggle) return;

    setIsToggling(true);
    try {
      await onToggle(server, !(server.enabled !== false));
    } finally {
      setIsToggling(false);
    }
  };

  const handleErrorIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowErrorPopover(!showErrorPopover);
  };

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!server.error) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(server.error).then(() => {
        setCopied(true);
        showToast(t('common.copySuccess') || 'Copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // Fallback for HTTP or unsupported clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = server.error;
      // Avoid scrolling to bottom
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        showToast(t('common.copySuccess') || 'Copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        showToast(t('common.copyFailed') || 'Copy failed', 'error');
        console.error('Copy to clipboard failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyServerConfig = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await exportMCPSettings(server.name);
      const configJson = JSON.stringify(result.data, null, 2);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(configJson);
        showToast(t('common.copySuccess') || 'Copied to clipboard', 'success');
      } else {
        // Fallback for HTTP or unsupported clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = configJson;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          showToast(t('common.copySuccess') || 'Copied to clipboard', 'success');
        } catch (err) {
          showToast(t('common.copyFailed') || 'Copy failed', 'error');
          console.error('Copy to clipboard failed:', err);
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Error copying server configuration:', error);
      showToast(t('common.copyFailed') || 'Copy failed', 'error');
    }
  };

  const handleConfirmDelete = () => {
    onRemove(server.name);
    setShowDeleteDialog(false);
  };

  const handleToolToggle = async (toolName: string, enabled: boolean) => {
    try {
      const { toggleTool } = await import('@/services/toolService');
      const result = await toggleTool(server.name, toolName, enabled);
      if (result.success) {
        showToast(
          t(enabled ? 'tool.enableSuccess' : 'tool.disableSuccess', { name: toolName }),
          'success',
        );
        // Trigger refresh to update the tool's state in the UI
        if (onRefresh) {
          onRefresh();
        }
      } else {
        showToast(result.error || t('tool.toggleFailed'), 'error');
      }
    } catch (error) {
      console.error('Error toggling tool:', error);
      showToast(t('tool.toggleFailed'), 'error');
    }
  };

  const handlePromptToggle = async (promptName: string, enabled: boolean) => {
    try {
      const { togglePrompt } = await import('@/services/promptService');
      const result = await togglePrompt(server.name, promptName, enabled);
      if (result.success) {
        showToast(
          t(enabled ? 'tool.enableSuccess' : 'tool.disableSuccess', { name: promptName }),
          'success',
        );
        // Trigger refresh to update the prompt's state in the UI
        if (onRefresh) {
          onRefresh();
        }
      } else {
        showToast(result.error || t('tool.toggleFailed'), 'error');
      }
    } catch (error) {
      console.error('Error toggling prompt:', error);
      showToast(t('tool.toggleFailed'), 'error');
    }
  };

  const handleOAuthAuthorization = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open the OAuth authorization URL in a new window
    if (server.oauth?.authorizationUrl) {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        server.oauth.authorizationUrl,
        'OAuth Authorization',
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      showToast(t('status.oauthWindowOpened'), 'info');
    }
  };

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-6 mb-4 sm:mb-6 page-card transition-all duration-200 ${
          server.enabled === false ? 'opacity-60' : ''
        }`}
      >
        {/* Card header - responsive layout */}
        <div className="space-y-3">
          {/* Top row: Name and status */}
          <div
            className="flex justify-between items-start cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
              <h2
                className={`text-base sm:text-xl font-semibold break-words ${
                  server.enabled === false
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {server.name}
              </h2>
              <StatusBadge status={server.status} onAuthClick={handleOAuthAuthorization} />
              {server.error && (
                <div className="relative flex-shrink-0">
                  <div
                    className="cursor-pointer"
                    onClick={handleErrorIconClick}
                    aria-label={t('server.viewErrorDetails')}
                  >
                    <AlertCircle className="text-red-500 hover:text-red-600" size={16} />
                  </div>

                  {showErrorPopover && (
                    <div
                      ref={errorPopoverRef}
                      className="fixed sm:absolute z-50 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-0 
                        left-4 right-4 sm:left-auto sm:right-auto
                        sm:w-96 sm:-translate-x-1/2 sm:left-1/2
                        max-h-[60vh] sm:max-h-80 overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 py-2 px-3 sm:px-4 border-b border-gray-200 dark:border-gray-700 z-20 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                            {t('server.errorDetails')}
                          </h4>
                          <button
                            onClick={copyToClipboard}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors btn-secondary"
                            title={t('common.copy')}
                          >
                            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowErrorPopover(false);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-3 sm:p-4 pt-2">
                        <pre className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 break-words whitespace-pre-wrap">
                          {server.error}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 btn-secondary flex-shrink-0 ml-2">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* Second row: Tool and prompt counts */}
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <div className="flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full btn-primary">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {server.tools?.length || 0} {t('server.tools')}
              </span>
            </div>

            <div className="flex items-center px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full btn-primary">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <span>
                {server.prompts?.length || 0} {t('server.prompts')}
              </span>
            </div>
          </div>

          {/* Third row: Action buttons - responsive with dropdown on mobile */}
          <div className="flex flex-wrap gap-2">
            {/* Desktop actions */}
            <div className="hidden sm:flex flex-wrap gap-2 flex-1">
              <button
                onClick={handleCopyServerConfig}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm btn-secondary"
              >
                {t('server.copy')}
              </button>
              <button
                onClick={handleClone}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 btn-secondary"
                title={t('server.clone') || 'Clone'}
              >
                <Copy size={14} />
              </button>
              <button
                onClick={handleShowEndpoints}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 btn-secondary"
                title="API Endpoints"
              >
                <Link size={14} />
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-800/40 text-sm btn-primary"
              >
                {t('server.edit')}
              </button>
              <button
                onClick={handleToggle}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isToggling
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    : server.enabled !== false
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800/40 btn-secondary'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 btn-primary'
                }`}
                disabled={isToggling}
              >
                {isToggling
                  ? t('common.processing')
                  : server.enabled !== false
                    ? t('server.disable')
                    : t('server.enable')}
              </button>
              <button
                onClick={handleRemove}
                className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800/40 text-sm btn-danger"
              >
                {t('server.delete')}
              </button>
            </div>

            {/* Mobile actions - dropdown menu */}
            <div className="sm:hidden flex gap-2 flex-1">
              <button
                onClick={handleToggle}
                className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                  isToggling
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    : server.enabled !== false
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 btn-secondary'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 btn-primary'
                }`}
                disabled={isToggling}
              >
                {isToggling
                  ? t('common.processing')
                  : server.enabled !== false
                    ? t('server.disable')
                    : t('server.enable')}
              </button>

              <div className="relative" ref={actionsMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActionsMenu(!showActionsMenu);
                  }}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm btn-secondary"
                >
                  •••
                </button>

                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 z-10">
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      {t('server.edit')}
                    </button>
                    <button
                      onClick={handleCopyServerConfig}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      {t('server.copy')}
                    </button>
                    <button
                      onClick={handleClone}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Copy size={14} className="mr-2" />
                      {t('server.clone')}
                    </button>
                    <button
                      onClick={handleShowEndpoints}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Link size={14} className="mr-2" />
                      Endpoints
                    </button>
                    <button
                      onClick={handleRemove}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      {t('server.delete')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded content - tools and prompts */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {server.tools && server.tools.length > 0 && (
              <div>
                <h6
                  className={`font-medium mb-3 text-sm sm:text-base ${
                    server.enabled === false
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {t('server.tools')}
                </h6>
                <div className="space-y-3 sm:space-y-4">
                  {server.tools.map((tool, index) => (
                    <ToolCard key={index} server={server.name} tool={tool} onToggle={handleToolToggle} />
                  ))}
                </div>
              </div>
            )}

            {server.prompts && server.prompts.length > 0 && (
              <div>
                <h6
                  className={`font-medium mb-3 text-sm sm:text-base ${
                    server.enabled === false
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {t('server.prompts')}
                </h6>
                <div className="space-y-3 sm:space-y-4">
                  {server.prompts.map((prompt, index) => (
                    <PromptCard
                      key={index}
                      server={server.name}
                      prompt={prompt}
                      onToggle={handlePromptToggle}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        serverName={server.name}
      />

      <EndpointsModal
        isOpen={showEndpointsModal}
        onClose={() => setShowEndpointsModal(false)}
        type="server"
        name={server.name}
      />
    </>
  );
};

export default ServerCard;
