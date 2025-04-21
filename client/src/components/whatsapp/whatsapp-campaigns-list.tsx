import { useState } from "react";
import { WhatsappCampaign } from "@shared/schema";
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
  Play,
  Square,
  Pause,
  BarChart2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface WhatsappCampaignsListProps {
  campaigns: WhatsappCampaign[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (campaign: WhatsappCampaign) => void;
  onRefresh: () => void;
}

export default function WhatsappCampaignsList({
  campaigns,
  isLoading,
  error,
  onEdit,
  onRefresh,
}: WhatsappCampaignsListProps) {
  const { toast } = useToast();
  const [campaignToDelete, setCampaignToDelete] = useState<number | null>(null);
  const [campaignToStart, setCampaignToStart] = useState<number | null>(null);
  const [campaignToStop, setCampaignToStop] = useState<number | null>(null);

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whatsapp/campaigns/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Campanha excluída",
        description: "A campanha foi excluída com sucesso.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para iniciar campanha
  const startCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/whatsapp/campaigns/${id}/start`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Campanha iniciada",
        description: `Campanha iniciada com sucesso para ${data.totalContacts} contatos.`,
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para parar campanha
  const stopCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/whatsapp/campaigns/${id}/stop`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Campanha interrompida",
        description: "A campanha foi interrompida com sucesso.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao interromper campanha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmDelete = (id: number) => {
    setCampaignToDelete(id);
  };

  const handleDelete = () => {
    if (campaignToDelete) {
      deleteMutation.mutate(campaignToDelete);
      setCampaignToDelete(null);
    }
  };

  const confirmStartCampaign = (id: number) => {
    setCampaignToStart(id);
  };

  const handleStartCampaign = () => {
    if (campaignToStart) {
      startCampaignMutation.mutate(campaignToStart);
      setCampaignToStart(null);
    }
  };

  const confirmStopCampaign = (id: number) => {
    setCampaignToStop(id);
  };

  const handleStopCampaign = () => {
    if (campaignToStop) {
      stopCampaignMutation.mutate(campaignToStop);
      setCampaignToStop(null);
    }
  };

  // Função para renderizar o status da campanha
  const renderStatus = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Rascunho</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Agendada</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500">Em Andamento</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Concluída</Badge>;
      case "canceled":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">Desconhecida</Badge>;
    }
  };

  // Formatar data agendada
  const formatScheduledDate = (date: string | null) => {
    if (!date) return "Não agendada";
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
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
        <p className="text-red-600">Erro ao carregar campanhas: {error.message}</p>
        <Button variant="outline" onClick={onRefresh} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-600">Nenhuma campanha encontrada</p>
        <p className="text-gray-500 text-sm">Clique no botão "Adicionar Campanha" para criar uma nova campanha de WhatsApp.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Destinatários</TableHead>
            <TableHead>Agendamento</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.name}</TableCell>
              <TableCell>{renderStatus(campaign.status)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                  {campaign.totalContacts} contatos
                </Badge>
              </TableCell>
              <TableCell>
                {campaign.scheduledFor && campaign.status !== "completed" ? (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    {formatScheduledDate(campaign.scheduledFor)}
                  </div>
                ) : campaign.status === "completed" ? (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    Concluída em {formatScheduledDate(campaign.completedAt || "")}
                  </div>
                ) : (
                  <span className="text-gray-500">Não agendada</span>
                )}
              </TableCell>
              <TableCell>
                {campaign.status === "in_progress" || campaign.status === "completed" ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progresso</span>
                      <span>
                        {Math.floor((campaign.sentMessages / campaign.totalContacts) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ 
                          width: `${Math.floor((campaign.sentMessages / campaign.totalContacts) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Enviadas: {campaign.sentMessages}</span>
                      <span>Entregues: {campaign.deliveredMessages}</span>
                      <span>Lidas: {campaign.readMessages}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </TableCell>
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
                    {campaign.status === "draft" && (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(campaign)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmStartCampaign(campaign.id)}>
                          <Play className="mr-2 h-4 w-4 text-green-600" />
                          <span>Iniciar</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    {campaign.status === "in_progress" && (
                      <DropdownMenuItem onClick={() => confirmStopCampaign(campaign.id)}>
                        <Square className="mr-2 h-4 w-4 text-yellow-600" />
                        <span>Interromper</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      <BarChart2 className="mr-2 h-4 w-4" />
                      <span>Relatório</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => confirmDelete(campaign.id)}
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
      <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.
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

      {/* Confirmação de iniciar campanha */}
      <AlertDialog open={!!campaignToStart} onOpenChange={() => setCampaignToStart(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja iniciar esta campanha? As mensagens começarão a ser enviadas imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartCampaign} className="bg-green-600 hover:bg-green-700">
              Iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de parar campanha */}
      <AlertDialog open={!!campaignToStop} onOpenChange={() => setCampaignToStop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interromper campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja interromper esta campanha? As mensagens pendentes não serão enviadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopCampaign} className="bg-yellow-600 hover:bg-yellow-700">
              Interromper
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}