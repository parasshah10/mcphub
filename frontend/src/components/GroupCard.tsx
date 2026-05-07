import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, Server, IGroupServerConfig } from '@/types';
import {
  Edit,
  Trash,
  Copy,
  Check,
  Link,
  FileCode,
  DropdownIcon,
  Wrench,
  MessageSquare,
  FileText,
} from '@/components/icons/LucideIcons';
import DeleteDialog from '@/components/ui/DeleteDialog';
import { useToast } from '@/contexts/ToastContext';
import { useSettingsData } from '@/hooks/useSettingsData';

interface GroupCardProps {
  group: Group;
  servers: Server[];
  onEdit: (group: Group) => void;
  onDelete: (groupId: string) => void;
  onViewEndpoints: (group: Group) => void;
}

const GroupCard = ({ group, servers, onEdit, onDelete, onViewEndpoints }: GroupCardProps) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { installConfig, nameSeparator } = useSettingsData();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCopyDropdown, setShowCopyDropdown] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCopyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEdit = () => {
    onEdit(group);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleViewEndpoints = () => {
    onViewEndpoints(group);
  };

  const handleConfirmDelete = () => {
    onDelete(group.id);
    setShowDeleteDialog(false);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setShowCopyDropdown(false);
        showToast(t('common.copySuccess'), 'success');
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // Fallback for HTTP or unsupported clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Avoid scrolling to bottom
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setShowCopyDropdown(false);
        showToast(t('common.copySuccess'), 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        showToast(t('common.copyFailed') || 'Copy failed', 'error');
        console.error('Copy to clipboard failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCopyId = () => {
    copyToClipboard(group.id);
  };

  const handleCopyUrl = () => {
    copyToClipboard(`${installConfig.baseUrl}/mcp/${group.id}`);
  };

  const handleCopyJson = () => {
    const jsonConfig = {
      mcpServers: {
        mcphub: {
          url: `${installConfig.baseUrl}/mcp/${group.id}`,
          headers: {
            Authorization: 'Bearer <your-access-token>',
          },
        },
      },
    };
    copyToClipboard(JSON.stringify(jsonConfig, null, 2));
  };

  // Helper function to normalize group servers to get server names
  const getServerNames = (servers: string[] | IGroupServerConfig[]): string[] => {
    return servers.map((server) => (typeof server === 'string' ? server : server.name));
  };

  // Helper function to get server configuration
  const getServerConfig = (serverName: string): IGroupServerConfig | undefined => {
    const server = group.servers.find((s) =>
      typeof s === 'string' ? s === serverName : s.name === serverName,
    );
    if (typeof server === 'string') {
      return { name: server, tools: 'all', prompts: 'all', resources: 'all' };
    }
    return server;
  };

  // Get servers that belong to this group
  const serverNames = getServerNames(group.servers);
  const groupServers = servers.filter((server) => serverNames.includes(server.name));

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 sm:p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-gray-800">{group.name}</h2>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-1">{group.id}</span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowCopyDropdown(!showCopyDropdown)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex items-center"
                  title={t('common.copy')}
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  <DropdownIcon size={12} className="ml-1" />
                </button>

                {showCopyDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[140px]">
                    <button
                      onClick={handleCopyId}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Copy size={12} className="mr-2" />
                      {t('common.copyId')}
                    </button>
                    <button
                      onClick={handleCopyUrl}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <Link size={12} className="mr-2" />
                      {t('common.copyUrl')}
                    </button>
                    <button
                      onClick={handleCopyJson}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                    >
                      <FileCode size={12} className="mr-2" />
                      {t('common.copyJson')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {group.description && <p className="text-gray-600 text-sm mt-1">{group.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1 rounded-full text-sm btn-secondary">
            {t('groups.serverCount', { count: group.servers.length })}
          </div>
          <button
            onClick={handleViewEndpoints}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={t('endpoints.view') || 'View Endpoints'}
          >
            <Link size={18} />
          </button>
          <button
            onClick={handleEdit}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={t('groups.edit')}
          >
            <Edit size={18} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title={t('groups.delete')}
          >
            <Trash size={18} />
          </button>
        </div>
      </div>

      <div className="">
        {groupServers.length === 0 ? (
          <p className="text-gray-500 italic">{t('groups.noServers')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groupServers.map((server) => {
              const serverConfig = getServerConfig(server.name);
              const hasToolRestrictions =
                serverConfig && serverConfig.tools !== 'all' && Array.isArray(serverConfig.tools);
              const hasPromptRestrictions =
                serverConfig && serverConfig.prompts !== 'all' && Array.isArray(serverConfig.prompts);
              const hasResourceRestrictions =
                serverConfig && serverConfig.resources !== 'all' && Array.isArray(serverConfig.resources);

              const enabledServerTools = (server.tools || []).filter((tool) => tool.enabled !== false);
              const enabledServerPrompts = (server.prompts || []).filter(
                (prompt) => prompt.enabled !== false,
              );
              const enabledServerResources = (server.resources || []).filter(
                (resource) => resource.enabled !== false,
              );
              const normalizeToolName = (toolName: string): string => {
                const prefix = `${server.name}${nameSeparator}`;
                return toolName.startsWith(prefix) ? toolName.slice(prefix.length) : toolName;
              };
              const normalizePromptName = (promptName: string): string => {
                const prefix = `${server.name}${nameSeparator}`;
                return promptName.startsWith(prefix) ? promptName.slice(prefix.length) : promptName;
              };
              const enabledToolNames = enabledServerTools.map((tool) => normalizeToolName(tool.name));
              const enabledPromptNames = enabledServerPrompts.map((prompt) =>
                normalizePromptName(prompt.name),
              );
              const enabledResourceUris = enabledServerResources.map((resource) => resource.uri);
              const enabledToolNameSet = new Set(enabledToolNames);
              const enabledPromptNameSet = new Set(enabledPromptNames);
              const enabledResourceUriSet = new Set(enabledResourceUris);

              const toolCount =
                hasToolRestrictions && Array.isArray(serverConfig?.tools)
                  ? serverConfig.tools.filter((toolName) => enabledToolNameSet.has(toolName)).length
                  : enabledToolNames.length;
              const promptCount =
                hasPromptRestrictions && Array.isArray(serverConfig?.prompts)
                  ? serverConfig.prompts.filter((promptName) => enabledPromptNameSet.has(promptName))
                      .length
                  : enabledPromptNames.length;
              const resourceCount =
                hasResourceRestrictions && Array.isArray(serverConfig?.resources)
                  ? serverConfig.resources.filter((resourceUri) => enabledResourceUriSet.has(resourceUri))
                      .length
                  : enabledResourceUris.length;

              const isExpanded = expandedServer === server.name;

              const getCapabilityList = (
                capability: 'tools' | 'prompts' | 'resources',
              ): string[] => {
                if (capability === 'tools') {
                  if (hasToolRestrictions && Array.isArray(serverConfig?.tools)) {
                    return serverConfig.tools.filter((toolName) => enabledToolNameSet.has(toolName));
                  }
                  return enabledToolNames;
                }

                if (capability === 'prompts') {
                  if (hasPromptRestrictions && Array.isArray(serverConfig?.prompts)) {
                    return serverConfig.prompts.filter((promptName) => enabledPromptNameSet.has(promptName));
                  }
                  return enabledPromptNames;
                }

                if (hasResourceRestrictions && Array.isArray(serverConfig?.resources)) {
                  return serverConfig.resources.filter((resourceUri) => enabledResourceUriSet.has(resourceUri));
                }
                return enabledResourceUris;
              };

              const handleServerClick = () => {
                setExpandedServer(isExpanded ? null : server.name);
              };

              return (
                <div key={server.name} className="relative w-full sm:w-auto">
                  <div
                    className="flex items-center justify-between sm:justify-start space-x-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full"
                    onClick={handleServerClick}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="font-medium text-gray-700 dark:text-gray-300 text-sm truncate">{server.name}</span>
                      <span
                        className={`flex-shrink-0 inline-block h-2 w-2 rounded-full ${
                          server.status === 'connected'
                            ? 'bg-green-500'
                            : server.status === 'connecting'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      ></span>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {toolCount > 0 && (
                        <span className="text-[10px] sm:text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1">
                          <Wrench size={10} />
                          {toolCount}
                        </span>
                      )}
                      {promptCount > 0 && (
                        <span className="text-[10px] sm:text-xs text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1">
                          <MessageSquare size={10} />
                          {promptCount}
                        </span>
                      )}
                      {resourceCount > 0 && (
                        <span className="text-[10px] sm:text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-0.5 sm:gap-1">
                          <FileText size={10} />
                          {resourceCount}
                        </span>
                      )}
                      <div className="text-gray-400 ml-1">
                        {isExpanded ? <DropdownIcon size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-3 z-20 min-w-[200px] sm:min-w-[300px] max-w-[calc(100vw-2rem)] sm:max-w-[400px]">
                      <div className="space-y-3">
                        {toolCount > 0 && (
                          <div>
                            <div className="text-gray-600 text-xs mb-2">
                              {hasToolRestrictions ? t('groups.selectedTools') : t('groups.allTools')}:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {getCapabilityList('tools').map((toolName, index) => (
                                <span
                                  key={`tool-${index}`}
                                  className="inline-block bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
                                >
                                  {toolName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {promptCount > 0 && (
                          <div>
                            <div className="text-gray-600 text-xs mb-2">
                              {hasPromptRestrictions ? t('groups.selectedPrompts') : t('groups.allPrompts')}:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {getCapabilityList('prompts').map((promptName, index) => (
                                <span
                                  key={`prompt-${index}`}
                                  className="inline-block bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-1 rounded text-xs"
                                >
                                  {promptName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {resourceCount > 0 && (
                          <div>
                            <div className="text-gray-600 text-xs mb-2">
                              {hasResourceRestrictions ? t('groups.selectedResources') : t('groups.allResources')}:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {getCapabilityList('resources').map((resourceUri, index) => (
                                <span
                                  key={`resource-${index}`}
                                  className="inline-block bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 rounded text-xs break-all"
                                >
                                  {resourceUri}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        serverName={group.name}
        isGroup={true}
      />
    </div>
  );
};

export default GroupCard;
