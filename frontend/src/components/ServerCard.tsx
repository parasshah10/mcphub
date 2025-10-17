import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Server } from '@/types'
import { ChevronDown, ChevronRight, AlertCircle, Copy, Check, Link } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import ToolCard from '@/components/ui/ToolCard'
import PromptCard from '@/components/ui/PromptCard'
import DeleteDialog from '@/components/ui/DeleteDialog'
import EndpointsModal from '@/components/EndpointsModal'
import { useToast } from '@/contexts/ToastContext'

interface ServerCardProps {
  server: Server
  onRemove: (serverName: string) => void
  onEdit: (server: Server) => void
  onClone: (server: Server) => void
  onToggle?: (server: Server, enabled: boolean) => Promise<boolean>
  onRefresh?: () => void
}

const ServerCard = ({ server, onRemove, onEdit, onClone, onToggle, onRefresh }: ServerCardProps) => {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [showErrorPopover, setShowErrorPopover] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showEndpointsModal, setShowEndpointsModal] = useState(false)
  const errorPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (errorPopoverRef.current && !errorPopoverRef.current.contains(event.target as Node)) {
        setShowErrorPopover(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(server)
  }

  const handleClone = (e: React.MouseEvent) => {
  e.stopPropagation()
  onClone(server)
  }
  
  const handleShowEndpoints = (e: React.MouseEvent) => {
  e.stopPropagation()
  setShowEndpointsModal(true)
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isToggling || !onToggle) return

    setIsToggling(true)
    try {
      await onToggle(server, !(server.enabled !== false))
    } finally {
      setIsToggling(false)
    }
  }

  const handleErrorIconClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowErrorPopover(!showErrorPopover)
  }

  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!server.error) return

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(server.error).then(() => {
        setCopied(true)
        showToast(t('common.copySuccess') || 'Copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      // Fallback for HTTP or unsupported clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = server.error
      // Avoid scrolling to bottom
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        showToast(t('common.copySuccess') || 'Copied to clipboard', 'success')
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        showToast(t('common.copyFailed') || 'Copy failed', 'error')
        console.error('Copy to clipboard failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleConfirmDelete = () => {
    onRemove(server.name)
    setShowDeleteDialog(false)
  }

  const handleToolToggle = async (toolName: string, enabled: boolean) => {
    try {
      const { toggleTool } = await import('@/services/toolService')
      const result = await toggleTool(server.name, toolName, enabled)
      if (result.success) {
        showToast(
          t(enabled ? 'tool.enableSuccess' : 'tool.disableSuccess', { name: toolName }),
          'success'
        )
        // Trigger refresh to update the tool's state in the UI
        if (onRefresh) {
          onRefresh()
        }
      } else {
        showToast(result.error || t('tool.toggleFailed'), 'error')
      }
    } catch (error) {
      console.error('Error toggling tool:', error)
      showToast(t('tool.toggleFailed'), 'error')
    }
  }

  const handlePromptToggle = async (promptName: string, enabled: boolean) => {
    try {
      const { togglePrompt } = await import('@/services/promptService')
      const result = await togglePrompt(server.name, promptName, enabled)
      if (result.success) {
        showToast(
          t(enabled ? 'tool.enableSuccess' : 'tool.disableSuccess', { name: promptName }),
          'success'
        )
        // Trigger refresh to update the prompt's state in the UI
        if (onRefresh) {
          onRefresh()
        }
      } else {
        showToast(result.error || t('tool.toggleFailed'), 'error')
      }
    } catch (error) {
      console.error('Error toggling prompt:', error)
      showToast(t('tool.toggleFailed'), 'error')
    }
  }

  return (
    <>
      <div className={`bg-white shadow rounded-lg p-6 mb-6 page-card transition-all duration-200 ${server.enabled === false ? 'opacity-60' : ''}`}>
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3">
            <h2 className={`text-xl font-semibold ${server.enabled === false ? 'text-gray-600' : 'text-gray-900'}`}>{server.name}</h2>
            <StatusBadge status={server.status} />

            {/* Tool count display */}
            <div className="flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm btn-primary">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>{server.tools?.length || 0} {t('server.tools')}</span>
            </div>

            {/* Prompt count display */}
            <div className="flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-sm btn-primary">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <span>{server.prompts?.length || 0} {t('server.prompts')}</span>
            </div>

            {server.error && (
              <div className="relative">
                <div
                  className="cursor-pointer"
                  onClick={handleErrorIconClick}
                  aria-label={t('server.viewErrorDetails')}
                >
                  <AlertCircle className="text-red-500 hover:text-red-600" size={18} />
                </div>

                {showErrorPopover && (
                  <div
                    ref={errorPopoverRef}
                    className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-0 w-120"
                    style={{
                      left: '-231px',
                      top: '24px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      width: '480px',
                      transform: 'translateX(50%)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center sticky top-0 bg-white py-2 px-4 border-b border-gray-200 z-20 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-red-600">{t('server.errorDetails')}</h4>
                        <button
                          onClick={copyToClipboard}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors btn-secondary"
                          title={t('common.copy')}
                        >
                          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowErrorPopover(false)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-4 pt-2">
                      <pre className="text-sm text-gray-700 break-words whitespace-pre-wrap">{server.error}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <button
                onClick={handleToggle}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  isToggling
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : server.enabled !== false
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                disabled={isToggling}
              >
                {isToggling ? t('common.processing') : server.enabled !== false ? t('server.disable') : t('server.enable')}
              </button>
            </div>

            {/* Actions Dropdown */}
            <div className="relative inline-block text-left">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Simple toggle, for more complex state use a state variable
                  const menu = e.currentTarget.nextElementSibling as HTMLElement;
                  if (menu) menu.classList.toggle('hidden');
                }}
                className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                title="More actions"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden z-10">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <a href="#" onClick={handleEdit} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">{t('server.edit')}</a>
                  <a href="#" onClick={handleClone} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">{t('server.clone')}</a>
                  <a href="#" onClick={handleShowEndpoints} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">API Endpoints</a>
                  <a href="#" onClick={handleRemove} className="block px-4 py-2 text-sm text-red-700 hover:bg-red-50" role="menuitem">{t('server.delete')}</a>
                </div>
              </div>
            </div>

            <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="text-gray-400 hover:text-gray-600">
              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <>
            {server.tools && (
              <div className="mt-6">
                <h6 className={`font-medium ${server.enabled === false ? 'text-gray-600' : 'text-gray-900'} mb-4`}>{t('server.tools')}</h6>
                <div className="space-y-4">
                  {server.tools.map((tool, index) => (
                    <ToolCard key={index} server={server.name} tool={tool} onToggle={handleToolToggle} />
                  ))}
                </div>
              </div>
            )}

            {server.prompts && (
              <div className="mt-6">
                <h6 className={`font-medium ${server.enabled === false ? 'text-gray-600' : 'text-gray-900'} mb-4`}>{t('server.prompts')}</h6>
                <div className="space-y-4">
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
          </>
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
  )
}

export default ServerCard