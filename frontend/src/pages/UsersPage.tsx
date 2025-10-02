import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '@/types';
import { useUserData } from '@/hooks/useUserData';
import { useAuth } from '@/contexts/AuthContext';
import AddUserForm from '@/components/AddUserForm';
import EditUserForm from '@/components/EditUserForm';
import UserCard from '@/components/UserCard';

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const currentUser = auth.user;
  const {
    users,
    loading: usersLoading,
    error: userError,
    setError: setUserError,
    deleteUser,
    triggerRefresh
  } = useUserData();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Check if current user is admin
  if (!currentUser?.isAdmin) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-red-600">{t('users.adminRequired')}</p>
      </div>
    );
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user);
  };

  const handleEditComplete = () => {
    setEditingUser(null);
    triggerRefresh(); // Refresh the users list after editing
  };

  const handleDeleteUser = async (username: string) => {
    const result = await deleteUser(username);
    if (!result?.success) {
      setUserError(result?.message || t('users.deleteError'));
    }
  };

  const handleAddUser = () => {
    setShowAddForm(true);
  };

  const handleAddComplete = () => {
    setShowAddForm(false);
    triggerRefresh(); // Refresh the users list after adding
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.users.title')}</h1>
        <div className="flex space-x-4">
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center btn-primary transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('users.add')}
          </button>
        </div>
      </div>

      {userError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 error-box rounded-lg">
          <p>{userError}</p>
        </div>
      )}

      {usersLoading ? (
        <div className="bg-white shadow rounded-lg p-6 loading-container">
          <div className="flex flex-col items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">{t('app.loading')}</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 empty-state">
          <p className="text-gray-600">{t('users.noUsers')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {users.map((user) => (
            <UserCard
              key={user.username}
              user={user}
              currentUser={currentUser}
              onEdit={handleEditClick}
              onDelete={handleDeleteUser}
            />
          ))}
        </div>
      )}

      {showAddForm && (
        <AddUserForm onAdd={handleAddComplete} onCancel={handleAddComplete} />
      )}

      {editingUser && (
        <EditUserForm
          user={editingUser}
          onEdit={handleEditComplete}
          onCancel={() => setEditingUser(null)}
        />
      )}
    </div>
  );
};

export default UsersPage;
