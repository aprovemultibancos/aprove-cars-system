import { useState } from "react";
import { WhatsappConnection } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Link,
  X,
  Unlink,
  Smartphone,
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface WhatsappConnectionsListProps {
  connections: WhatsappConnection[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (connection: WhatsappConnection) => void;
  onRefresh: () => void;
}

export default function WhatsappConnectionsList({
  connections,
  isLoading,
  error,
  onEdit,
  onRefresh,
}: WhatsappConnectionsListProps) {
  const { toast } = useToast();
  const [connectionToDelete, setConnectionToDelete] = useState<number | null>(null);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whatsapp/connections/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Conexão excluída",
        description: "A conexão foi excluída com sucesso.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para conectar
  const connectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/whatsapp/connections/${id}/connect`);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.qrCode) {
        setQrCode(data.qrCode);
      } else {
        toast({
          title: "Conexão iniciada",
          description: "A conexão foi iniciada com sucesso.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connections"] });
        setConnectingId(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao conectar",
        description: error.message,
        variant: "destructive",
      });
      setConnectingId(null);
    },
  });

  // Mutation para desconectar
  const disconnectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/whatsapp/connections/${id}/disconnect`);
    },
    onSuccess: () => {
      toast({
        title: "Desconectado",
        description: "A conexão foi desconectada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connections"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verificar status
  const checkStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("GET", `/api/whatsapp/connections/${id}/status`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Status verificado",
        description: `Status da conexão: ${data.status === "connected" ? "Conectado" : "Desconectado"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connections"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao verificar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmDelete = (id: number) => {
    setConnectionToDelete(id);
  };

  const handleDelete = () => {
    if (connectionToDelete) {
      deleteMutation.mutate(connectionToDelete);
      setConnectionToDelete(null);
    }
  };

  const handleConnect = (id: number) => {
    setConnectingId(id);
    connectMutation.mutate(id);
  };

  const handleDisconnect = (id: number) => {
    disconnectMutation.mutate(id);
  };

  const handleCheckStatus = (id: number) => {
    checkStatusMutation.mutate(id);
  };

  const closeQrDialog = () => {
    setQrCode(null);
    setConnectingId(null);
    onRefresh();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <RefreshCw className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">Erro ao carregar conexões: {error.message}</p>
        <Button variant="outline" onClick={onRefresh} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-600">Nenhuma conexão encontrada</p>
        <p className="text-gray-500 text-sm">Clique no botão "Adicionar Conexão" para criar uma nova conexão WhatsApp.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Limite Diário</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((connection) => (
            <TableRow key={connection.id}>
              <TableCell className="font-medium">{connection.name}</TableCell>
              <TableCell>{connection.phoneNumber}</TableCell>
              <TableCell>
                {connection.status === "connected" ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Conectado
                  </Badge>
                ) : connection.status === "connecting" ? (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Conectando...
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                    Desconectado
                  </Badge>
                )}
              </TableCell>
              <TableCell>{connection.dailyLimit} mensagens/dia</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(connection)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    {connection.status === "connected" ? (
                      <DropdownMenuItem onClick={() => handleDisconnect(connection.id)}>
                        <Unlink className="mr-2 h-4 w-4" />
                        <span>Desconectar</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleConnect(connection.id)}>
                        <Link className="mr-2 h-4 w-4" />
                        <span>Conectar</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleCheckStatus(connection.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      <span>Verificar Status</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => confirmDelete(connection.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!connectionToDelete} onOpenChange={() => setConnectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conexão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para mostrar QR Code */}
      <Dialog open={!!qrCode} onOpenChange={closeQrDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o código QR abaixo com seu WhatsApp para conectar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-4">
            {qrCode && (
              <div className="bg-white p-4 rounded-md">
                <img 
                  src={`data:image/png;base64,${qrCode}`} 
                  alt="QR Code para conectar WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
            )}
            <p className="text-sm text-center mt-4 text-gray-600">
              Abra o WhatsApp no seu celular, vá em Configurações &gt; Dispositivos conectados &gt; Vincular um dispositivo
            </p>
          </div>

          <DialogFooter>
            <Button onClick={closeQrDialog}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}