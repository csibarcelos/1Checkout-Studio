
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Button, ToggleSwitch } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { User } from '../../types';
// import { apiClient } from '../../services/apiClient'; // Removido
import { useAuth } from '../../contexts/AuthContext';
import { UsersIcon, SUPER_ADMIN_EMAIL } from '../../constants.tsx'; 

export const SuperAdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken, user: loggedInSuperAdmin } = useAuth();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  
  // State for modal form
  const [modalUserName, setModalUserName] = useState('');
  const [modalIsActive, setModalIsActive] = useState(true);
  const [modalIsSuperAdmin, setModalIsSuperAdmin] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);


  const fetchUsers = useCallback(async () => {
    if (!accessToken) {
      setError("Autenticação de super admin necessária.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implementar chamada direta ao Supabase para buscar todos os usuários.
      // const usersData = await someSuperAdminUserService.getAllUsers(accessToken);
      const usersData: User[] = []; // Placeholder
      setUsers(usersData);
      if (usersData.length === 0) {
        setError("SuperAdmin Users: Integração de dados via Supabase pendente ou nenhum usuário encontrado.");
      }
    } catch (err: any) {
      setError(err.error?.message || 'Falha ao carregar usuários.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenUserDetails = (user: User) => {
    setSelectedUser(user);
    setModalUserName(user.name || '');
    setModalIsActive(user.isActive !== undefined ? user.isActive : true);
    setModalIsSuperAdmin(user.isSuperAdmin || false);
    setModalError(null);
    setIsUserDetailsModalOpen(true);
  };

  const handleCloseUserDetails = () => {
    setSelectedUser(null);
    setIsUserDetailsModalOpen(false);
    setModalError(null);
  };

  const handleSaveChanges = async () => {
    if (!selectedUser || !accessToken) {
        setModalError("Usuário selecionado ou token inválido.");
        return;
    }
    setModalError(null);
    setIsSavingUser(true);

    const updates: Partial<Pick<User, 'name' | 'isActive' | 'isSuperAdmin'>> = {};
    if (modalUserName !== (selectedUser.name || '')) updates.name = modalUserName;
    if (modalIsActive !== (selectedUser.isActive !== undefined ? selectedUser.isActive : true)) updates.isActive = modalIsActive;
    if (modalIsSuperAdmin !== (selectedUser.isSuperAdmin || false)) updates.isSuperAdmin = modalIsSuperAdmin;

    if (Object.keys(updates).length === 0) {
        setModalError("Nenhuma alteração detectada.");
        setIsSavingUser(false);
        return;
    }

    try {
        // TODO: Implementar chamada direta ao Supabase para atualizar o usuário.
        // await someSuperAdminUserService.updateUser(selectedUser.id, updates, accessToken);
        setModalError("SuperAdmin Users: Funcionalidade de salvar alterações pendente de integração com Supabase.");
        // fetchUsers(); // Refresh users list (quando funcional)
        // handleCloseUserDetails(); // (quando funcional)
    } catch (err: any) {
        setModalError(err.error?.message || "Falha ao salvar alterações.");
    } finally {
        setIsSavingUser(false);
    }
  };

  const isCurrentUserSelected = selectedUser?.id === loggedInSuperAdmin?.id;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <UsersIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Todos os Usuários ({users.length})</h1>
      </div>

      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

      <Card className="p-0 sm:p-0">
        {users.length === 0 && !isLoading ? (
          <p className="p-6 text-center text-neutral-500">{error || "Nenhum usuário encontrado."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status Ativo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Super Admin?</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-primary-light/10 cursor-pointer" onClick={() => handleOpenUserDetails(user)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{user.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {(user.isActive !== undefined ? user.isActive : true) ? 
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Sim</span> : 
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Não</span>
                        }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {user.isSuperAdmin ? 
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Sim</span> : 
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-neutral-100 text-neutral-800">Não</span>
                        }
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenUserDetails(user); }}>Editar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedUser && (
        <Modal isOpen={isUserDetailsModalOpen} onClose={handleCloseUserDetails} title={`Editar Usuário: ${selectedUser.name || selectedUser.email}`}>
          <div className="space-y-4">
            <div><span className="font-semibold">ID:</span> {selectedUser.id}</div>
            <div><span className="font-semibold">Email:</span> {selectedUser.email}</div>
            <Input 
                label="Nome" 
                value={modalUserName} 
                onChange={(e) => setModalUserName(e.target.value)} 
                disabled={isSavingUser || (isCurrentUserSelected && selectedUser.email === SUPER_ADMIN_EMAIL)}
            />
            <ToggleSwitch
                label="Conta Ativa"
                enabled={modalIsActive}
                onChange={setModalIsActive}
                disabled={isSavingUser || isCurrentUserSelected}
            />
            <ToggleSwitch
                label="Status de Super Admin"
                enabled={modalIsSuperAdmin}
                onChange={setModalIsSuperAdmin}
                disabled={isSavingUser || isCurrentUserSelected}
            />
            {modalError && <p className="text-sm text-red-500 p-2 bg-red-50 rounded">{modalError}</p>}
          </div>
           <div className="mt-6 flex justify-end space-x-3">
            <Button variant="ghost" onClick={handleCloseUserDetails} disabled={isSavingUser}>Cancelar</Button>
            <Button variant="primary" onClick={handleSaveChanges} isLoading={isSavingUser} disabled={isSavingUser}>Salvar Alterações</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
