import { useTranslation } from 'react-i18next'

interface DeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  serverName: string
  isGroup?: boolean
  isUser?: boolean
}

const DeleteDialog = ({ isOpen, onClose, onConfirm, serverName, isGroup = false, isUser = false }: DeleteDialogProps) => {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-30 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2 sm:mb-3">
            {isUser
              ? t('users.confirmDelete')
              : isGroup
                ? t('groups.confirmDelete')
                : t('server.confirmDelete')}
          </h3>
          <p className="text-gray-500 mb-6">
            {isUser
              ? t('users.deleteWarning', { username: serverName })
              : isGroup
                ? t('groups.deleteWarning', { name: serverName })
                : t('server.deleteWarning', { name: serverName })}
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 btn-secondary order-2 sm:order-1"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 btn-danger order-1 sm:order-2"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeleteDialog