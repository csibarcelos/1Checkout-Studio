
import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { AuditLogEntry } from '../../types';
// import { apiClient } from '../../services/apiClient'; // Removido
import { useAuth } from '../../contexts/AuthContext';
import { TableCellsIcon } from '@heroicons/react/24/outline'; 

const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const actionTypeLabels: Record<string, string> = {
    PLATFORM_SETTINGS_UPDATE: "Atualização Config. Plataforma",
    USER_STATUS_CHANGE: "Mudança Status Usuário",
    USER_SUPERADMIN_CHANGE: "Mudança Permissão Super Admin",
    USER_DETAILS_UPDATE: "Atualização Detalhes Usuário",
};

const getActionTypeLabel = (actionType: string): string => {
    return actionTypeLabels[actionType] || actionType;
};

export const SuperAdminAuditLogPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const [selectedLogEntry, setSelectedLogEntry] = useState<AuditLogEntry | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    if (!accessToken) {
      setError("Autenticação de super admin necessária.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implementar chamada direta ao Supabase para buscar os logs de auditoria.
      // const logsData = await someSuperAdminAuditService.getAuditLogs(accessToken);
      const logsData: AuditLogEntry[] = []; // Placeholder
      setAuditLogs(logsData);
      if (logsData.length === 0) {
        setError("SuperAdmin AuditLogs: Integração de dados via Supabase pendente ou nenhum log encontrado.");
      }
    } catch (err: any) {
      setError(err.error?.message || 'Falha ao carregar logs de auditoria.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleOpenDetailsModal = (logEntry: AuditLogEntry) => {
    setSelectedLogEntry(logEntry);
    setIsDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setSelectedLogEntry(null);
    setIsDetailsModalOpen(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <TableCellsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-neutral-800">Log de Auditoria ({auditLogs.length})</h1>
      </div>

      {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}

      <Card className="p-0 sm:p-0">
        {auditLogs.length === 0 && !isLoading ? (
          <p className="p-6 text-center text-neutral-500">{error || "Nenhuma entrada de log de auditoria encontrada."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ator (Email)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tipo de Ação</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Alvo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Detalhes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-primary-light/10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{log.actorEmail}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{getActionTypeLabel(log.actionType)}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm text-neutral-700 max-w-md">{log.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {log.targetEntityType && log.targetEntityId ? `${log.targetEntityType}: ${log.targetEntityId.substring(0,15)}...` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.details && Object.keys(log.details).length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDetailsModal(log)}>
                          Ver Detalhes
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedLogEntry && selectedLogEntry.details && (
        <Modal 
          isOpen={isDetailsModalOpen} 
          onClose={handleCloseDetailsModal} 
          title={`Detalhes do Log: ${selectedLogEntry.id.substring(0,10)}...`}
          size="lg"
        >
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            <h4 className="font-semibold text-neutral-700">Detalhes da Ação:</h4>
            <pre className="bg-neutral-100 p-3 rounded-md text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(selectedLogEntry.details, null, 2)}
            </pre>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={handleCloseDetailsModal}>Fechar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
