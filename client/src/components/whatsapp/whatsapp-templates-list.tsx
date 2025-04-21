import { useState } from "react";
import { WhatsappTemplate } from "@shared/schema";
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
  Send,
  FileText,
  Image,
  File,
  Headphones,
  Video,
} from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WhatsappTemplatesListProps {
  templates: WhatsappTemplate[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (template: WhatsappTemplate) => void;
  onRefresh: () => void;
}

export default function WhatsappTemplatesList({
  templates,
  isLoading,
  error,
  onEdit,
  onRefresh,
}: WhatsappTemplatesListProps) {
  const { toast } = useToast();
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsappTemplate | null>(null);

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whatsapp/templates/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmDelete = (id: number) => {
    setTemplateToDelete(id);
  };

  const handleDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete);
      setTemplateToDelete(null);
    }
  };

  const handlePreview = (template: WhatsappTemplate) => {
    setPreviewTemplate(template);
  };

  const getMediaIcon = (mediaType?: string) => {
    if (!mediaType) return null;
    
    switch (mediaType) {
      case "image":
        return <Image className="mr-2 h-4 w-4 text-blue-500" />;
      case "document":
        return <File className="mr-2 h-4 w-4 text-amber-500" />;
      case "video":
        return <Video className="mr-2 h-4 w-4 text-red-500" />;
      case "audio":
        return <Headphones className="mr-2 h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
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
        <p className="text-red-600">Erro ao carregar templates: {error.message}</p>
        <Button variant="outline" onClick={onRefresh} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-600">Nenhum template encontrado</p>
        <p className="text-gray-500 text-sm">Clique no botão "Adicionar Template" para criar um novo template de mensagem.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Prévia</TableHead>
            <TableHead>Data de Criação</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">{template.name}</TableCell>
              <TableCell>
                {template.hasMedia ? (
                  <div className="flex items-center">
                    {getMediaIcon(template.mediaType)}
                    <span>
                      {template.mediaType === "image" ? "Imagem" : 
                       template.mediaType === "document" ? "Documento" :
                       template.mediaType === "video" ? "Vídeo" :
                       template.mediaType === "audio" ? "Áudio" : "Mídia"}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 text-gray-500" />
                    <span>Texto</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handlePreview(template)}
                >
                  Visualizar
                </Button>
              </TableCell>
              <TableCell>
                {template.createdAt
                  ? format(new Date(template.createdAt), "dd/MM/yyyy")
                  : "—"}
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
                    <DropdownMenuItem onClick={() => onEdit(template)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handlePreview(template)}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Visualizar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => confirmDelete(template.id)}
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
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
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

      {/* Preview do template */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prévia do Template</DialogTitle>
            <DialogDescription>
              {previewTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            {/* Renderizar mídia se existir */}
            {previewTemplate?.hasMedia && previewTemplate?.mediaUrl && (
              <div className="flex justify-center">
                {previewTemplate.mediaType === "image" ? (
                  <img 
                    src={previewTemplate.mediaUrl} 
                    alt="Imagem do template" 
                    className="max-w-full h-auto rounded-md" 
                  />
                ) : previewTemplate.mediaType === "document" ? (
                  <div className="flex items-center justify-center p-8 bg-gray-100 rounded-md w-full">
                    <File className="h-12 w-12 text-amber-500" />
                    <span className="ml-2">Documento anexado</span>
                  </div>
                ) : previewTemplate.mediaType === "video" ? (
                  <div className="flex items-center justify-center p-8 bg-gray-100 rounded-md w-full">
                    <Video className="h-12 w-12 text-red-500" />
                    <span className="ml-2">Vídeo anexado</span>
                  </div>
                ) : previewTemplate.mediaType === "audio" ? (
                  <div className="flex items-center justify-center p-8 bg-gray-100 rounded-md w-full">
                    <Headphones className="h-12 w-12 text-purple-500" />
                    <span className="ml-2">Áudio anexado</span>
                  </div>
                ) : null}
              </div>
            )}
            
            {/* Conteúdo */}
            <div className="bg-green-50 p-4 rounded-md shadow-sm border border-green-200">
              <div className="whitespace-pre-wrap">
                {previewTemplate?.content}
              </div>
            </div>

            {/* Explicação de variáveis */}
            {previewTemplate?.content.includes("{{") && (
              <div className="text-sm text-gray-500 mt-2">
                <p className="font-medium mb-1">Variáveis disponíveis:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code>{{nome}}</code> - Nome do contato</li>
                  <li><code>{{telefone}}</code> - Número de telefone</li>
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}