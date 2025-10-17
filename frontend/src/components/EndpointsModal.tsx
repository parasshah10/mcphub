import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Copy, Check, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useSettingsData } from '@/hooks/useSettingsData'
import { getBasePath } from '@/utils/runtime'

interface EndpointsModalProps {
isOpen: boolean
onClose: () => void
type: 'global' | 'server' | 'group'
name?: string
title?: string
}

const EndpointsModal = ({ isOpen, onClose, type, name, title }: EndpointsModalProps) => {
const { t } = useTranslation()
const { showToast } = useToast()
const { installConfig, routingConfig } = useSettingsData()
const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

if (!isOpen) return null

const basePath = getBasePath()
// Auto-detect base URL from current browser location
const baseUrl = installConfig.baseUrl === 'http://localhost:3000'
? window.location.origin
: installConfig.baseUrl

// Build endpoint URLs
const endpoints = type === 'global'
? [
{
label: 'MCP Streamable HTTP',
url: `${baseUrl}${basePath}/mcp`,
description: 'Use with MCP clients supporting HTTP streaming'
},
{
label: 'SSE (Server-Sent Events)',
url: `${baseUrl}${basePath}/sse`,
description: 'Use with MCP clients supporting SSE transport'
},
{
label: 'OpenAPI Specification',
url: `${baseUrl}${basePath}/api/openapi.json`,
description: 'REST API documentation and schema'
}
]
: [
{
label: 'MCP Streamable HTTP',
url: `${baseUrl}${basePath}/mcp/${name}`,
description: 'Use with MCP clients supporting HTTP streaming'
},
{
label: 'SSE (Server-Sent Events)',
url: `${baseUrl}${basePath}/sse/${name}`,
description: 'Use with MCP clients supporting SSE transport'
},
{
label: 'OpenAPI Specification',
url: `${baseUrl}${basePath}/api/${name}/openapi.json`,
description: 'REST API documentation and schema'
}
]

const copyToClipboard = (url: string, index: number) => {
if (navigator.clipboard && window.isSecureContext) {
navigator.clipboard.writeText(url).then(() => {
setCopiedIndex(index)
showToast('URL copied to clipboard', 'success')
setTimeout(() => setCopiedIndex(null), 2000)
})
} else {
// Fallback for HTTP or unsupported clipboard API
const textArea = document.createElement('textarea')
textArea.value = url
textArea.style.position = 'fixed'
textArea.style.left = '-9999px'
document.body.appendChild(textArea)
textArea.focus()
textArea.select()
try {
document.execCommand('copy')
setCopiedIndex(index)
showToast('URL copied to clipboard', 'success')
setTimeout(() => setCopiedIndex(null), 2000)
} catch (err) {
showToast('Failed to copy URL', 'error')
console.error('Copy to clipboard failed:', err)
}
document.body.removeChild(textArea)
}
}

const modalTitle = title || (type === 'global' ? 'Global API Endpoints' : `API Endpoints${name ? `: ${name}` : ''}`)

return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 overflow-y-auto">
{/* Header */}
<div className="flex items-center justify-between mb-6">
<div className="flex items-center space-x-3">
<div className="p-2 bg-blue-100 rounded-lg">
<Link size={20} className="text-blue-600" />
</div>
<h3 className="text-lg font-semibold text-gray-900">{modalTitle}</h3>
</div>
<button
onClick={onClose}
className="text-gray-400 hover:text-gray-600 transition-colors"
>
<X size={20} />
</button>
</div>

{/* Endpoints List */}
<div className="space-y-5">
{endpoints.map((endpoint, index) => (
              <div key={index} className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                    {endpoint.label}
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {endpoint.description}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={endpoint.url}
                    readOnly
                    className="flex-1 font-mono text-xs sm:text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 sm:px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-x-auto"
                  />
                  <button
                    onClick={() => copyToClipboard(endpoint.url, index)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
                    title="Copy URL"
                  >
                    {copiedIndex === index ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
))}
</div>

{/* Footer */}
<div className="flex justify-end mt-6">
<button
onClick={onClose}
className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
>
Close
</button>
</div>
</div>
</div>
</div>
)
}

export default EndpointsModal