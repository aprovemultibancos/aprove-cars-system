import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { WhatsappCampaign, WhatsappTemplate, WhatsappGroup, WhatsappConnection, insertWhatsappCampaignSchema } from "@shared/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Clock, CalendarClock, Smartphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, File, Headphones, Video } from "lucide-react";

interface WhatsappCampaignFormProps {
  editingCampaign: WhatsappCampaign | null;
  onSave: () => void;
  onCancel: () => void;
}

// Estendendo o schema para validação
const formSchema = insertWhatsappCampaignSchema.extend({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
});

export default function WhatsappCampaignForm({
  editingCampaign,
  onSave,
  onCancel,
}: WhatsappCampaignFormProps) {
  const { toast } = useToast();
  const isEditing = !!editingCampaign;
  const [isScheduled, setIsScheduled] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("08:00");
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);

  // Carregar conexões
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ["/api/whatsapp/connections"],
    enabled: true
  });

  // Carregar templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/whatsapp/templates"],
    enabled: true
  });

  // Carregar grupos
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/whatsapp/groups"],
    enabled: true
  });

  // Definir o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      connectionId: undefined,
      templateId: undefined,
      scheduledFor: undefined,
      status: "draft",
    },
  });

  // Atualizar campos quando a campanha for editada
  useEffect(() => {
    if (editingCampaign) {
      // Atualizar os valores do formulário
      form.reset({
        name: editingCampaign.name,
        description: editingCampaign.description || "",
        connectionId: editingCampaign.connectionId,
        templateId: editingCampaign.templateId,
        scheduledFor: editingCampaign.scheduledFor,
        status: editingCampaign.status,
      });

      // Atualizar o agendamento
      if (editingCampaign.scheduledFor) {
        const scheduledDate = new Date(editingCampaign.scheduledFor);
        setIsScheduled(true);
        setDate(scheduledDate);
        setTime(format(scheduledDate, "HH:mm"));
      }

      // Carregar grupos da campanha
      if (editingCampaign.id) {
        fetch(`/api/whatsapp/campaigns/${editingCampaign.id}/groups`)
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data)) {
              setSelectedGroupIds(data.map((group: any) => group.id));
            }
          })
          .catch(err => {
            console.error("Erro ao carregar grupos da campanha", err);
          });
      }
    }
  }, [editingCampaign, form]);

  // Selecionar ou deselecionar um grupo
  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Obter os detalhes do template selecionado
  const selectedTemplateId = form.watch("templateId");
  const selectedTemplate = templates?.find((template: WhatsappTemplate) => template.id === selectedTemplateId);

  // Obter os detalhes do grupo selecionado
  const selectedGroups = groups?.filter((group: WhatsappGroup) => selectedGroupIds.includes(group.id)) || [];
  
  // Calcular total de contatos nos grupos selecionados
  const totalContacts = selectedGroups.reduce((sum: number, group: WhatsappGroup) => sum + (group.totalContacts || 0), 0);

  // Obter os detalhes da conexão selecionada
  const selectedConnectionId = form.watch("connectionId");
  const selectedConnection = connections?.find((connection: WhatsappConnection) => connection.id === selectedConnectionId);

  // Mutation para criar ou atualizar campanha
  const campaignMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Processar o agendamento
      let campaignData: any = { ...data };
      
      // Se estiver agendado, combinar data e hora
      if (isScheduled && date) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledDate = new Date(date);
        scheduledDate.setHours(hours, minutes);
        campaignData.scheduledFor = scheduledDate.toISOString();
      } else {
        campaignData.scheduledFor = null;
      }
      
      let campaignId: number;
      
      if (isEditing && editingCampaign) {
        // Atualizar campanha existente
        const res = await apiRequest(
          "PATCH", 
          `/api/whatsapp/campaigns/${editingCampaign.id}`,
          campaignData
        );
        const updatedCampaign = await res.json();
        campaignId = updatedCampaign.id;
      } else {
        // Criar nova campanha
        const res = await apiRequest(
          "POST", 
          "/api/whatsapp/campaigns",
          campaignData
        );
        const newCampaign = await res.json();
        campaignId = newCampaign.id;
      }
      
      // Atualizar grupos da campanha
      if (selectedGroupIds.length > 0) {
        await apiRequest(
          "POST",
          `/api/whatsapp/campaigns/${campaignId}/groups`,
          { groupIds: selectedGroupIds }
        );
      }
      
      return campaignId;
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Campanha atualizada" : "Campanha criada",
        description: isEditing 
          ? "A campanha foi atualizada com sucesso."
          : "A campanha foi criada com sucesso. Use o menu para iniciá-la.",
      });
      
      // Invalidar queries para atualizar a lista
      const queryClient = useQueryClient();
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/campaigns"] });
      
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao ${isEditing ? "atualizar" : "criar"} campanha: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedTemplateId) {
      toast({
        title: "Template não selecionado",
        description: "Selecione um template para a campanha.",
        variant: "destructive",
      });
      return;
    }

    if (selectedGroupIds.length === 0) {
      toast({
        title: "Grupos não selecionados",
        description: "Selecione pelo menos um grupo para a campanha.",
        variant: "destructive",
      });
      return;
    }

    if (isScheduled && !date) {
      toast({
        title: "Data não selecionada",
        description: "Selecione uma data para o agendamento da campanha.",
        variant: "destructive",
      });
      return;
    }

    campaignMutation.mutate(values);
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

  return (
    <Tabs defaultValue="basic">
      <TabsList className="mb-6">
        <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
        <TabsTrigger value="content">Conteúdo</TabsTrigger>
        <TabsTrigger value="groups">Grupos</TabsTrigger>
        <TabsTrigger value="preview">Prévia</TabsTrigger>
      </TabsList>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <TabsContent value="basic" className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Campanha</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Campanha de Aniversário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição da campanha..." 
                      {...field} 
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Uma breve descrição para identificação da campanha.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="connectionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conexão WhatsApp</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conexão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {connectionsLoading ? (
                        <SelectItem value="" disabled>Carregando...</SelectItem>
                      ) : connections && connections.length > 0 ? (
                        connections.map((connection: WhatsappConnection) => (
                          <SelectItem key={connection.id} value={connection.id.toString()}>
                            <div className="flex items-center">
                              <Smartphone className="mr-2 h-4 w-4 text-gray-500" />
                              {connection.name} ({connection.phoneNumber})
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>Nenhuma conexão disponível</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    A conexão que será utilizada para enviar as mensagens.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="is-scheduled" 
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
              />
              <Label htmlFor="is-scheduled">Agendar envio</Label>
            </div>
            
            {isScheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled-date">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="scheduled-date"
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-2"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        locale={ptBR}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label htmlFor="scheduled-time">Hora</Label>
                  <div className="flex items-center mt-2">
                    <Clock className="mr-2 h-4 w-4" />
                    <Input
                      id="scheduled-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedConnection && (
              <div className="rounded-md border p-4 mt-4">
                <h3 className="font-medium mb-2">Detalhes da Conexão</h3>
                <div className="text-sm space-y-2">
                  <p><span className="font-medium">Número:</span> {selectedConnection.phoneNumber}</p>
                  <p><span className="font-medium">Limite diário:</span> {selectedConnection.dailyLimit} mensagens</p>
                  <p><span className="font-medium">Status:</span> {selectedConnection.isConnected ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                      Desconectado
                    </Badge>
                  )}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template de Mensagem</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templatesLoading ? (
                        <SelectItem value="" disabled>Carregando...</SelectItem>
                      ) : templates && templates.length > 0 ? (
                        templates.map((template: WhatsappTemplate) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex items-center">
                              {template.hasMedia ? (
                                getMediaIcon(template.mediaType)
                              ) : (
                                <FileText className="mr-2 h-4 w-4 text-gray-500" />
                              )}
                              {template.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>Nenhum template disponível</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O template que será utilizado para esta campanha.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTemplate && (
              <div className="rounded-md border p-4 mt-4">
                <h3 className="font-medium mb-2">Prévia do Template</h3>
                
                {/* Renderizar mídia se existir */}
                {selectedTemplate.hasMedia && selectedTemplate.mediaUrl && (
                  <div className="flex justify-center mb-4">
                    {selectedTemplate.mediaType === "image" ? (
                      <img 
                        src={selectedTemplate.mediaUrl} 
                        alt="Imagem do template" 
                        className="max-w-full h-auto rounded-md" 
                      />
                    ) : selectedTemplate.mediaType === "document" ? (
                      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-md w-full">
                        <File className="h-12 w-12 text-amber-500" />
                        <span className="ml-2">Documento anexado</span>
                      </div>
                    ) : selectedTemplate.mediaType === "video" ? (
                      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-md w-full">
                        <Video className="h-12 w-12 text-red-500" />
                        <span className="ml-2">Vídeo anexado</span>
                      </div>
                    ) : selectedTemplate.mediaType === "audio" ? (
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
                    {selectedTemplate.content}
                  </div>
                </div>

                {/* Explicação de variáveis */}
                {selectedTemplate.content.includes("{{") && (
                  <div className="text-sm text-gray-500 mt-2">
                    <p className="font-medium mb-1">Variáveis disponíveis:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>{{nome}}</code> - Será substituído pelo nome do contato</li>
                      <li><code>{{telefone}}</code> - Será substituído pelo número do contato</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            <h3 className="text-base font-medium mb-4">Selecione os Grupos de Contatos</h3>
            
            {groupsLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : groups && groups.length > 0 ? (
              <ScrollArea className="h-[400px] border rounded-md p-4">
                <div className="space-y-4">
                  {groups.map((group: WhatsappGroup) => (
                    <div 
                      key={group.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedGroupIds.includes(group.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{group.name}</h4>
                          <p className="text-sm text-gray-500">{group.description || "Sem descrição"}</p>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                          {group.totalContacts || 0} contatos
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center p-8 border rounded-md bg-gray-50">
                <p className="text-gray-600 mb-2">Nenhum grupo disponível</p>
                <p className="text-gray-500 text-sm">Crie grupos antes de iniciar uma campanha.</p>
              </div>
            )}
            
            <div className="flex justify-between items-center p-4 border rounded-md bg-gray-50">
              <div>
                <p className="text-sm text-gray-600">Grupos selecionados: <span className="font-medium">{selectedGroupIds.length}</span></p>
                <p className="text-sm text-gray-600">Total de contatos: <span className="font-medium">{totalContacts}</span></p>
              </div>
              {selectedConnection && (
                <div className="text-sm">
                  <p className={`${totalContacts > selectedConnection.dailyLimit ? 'text-red-600' : 'text-green-600'}`}>
                    Limite diário da conexão: {selectedConnection.dailyLimit} mensagens
                  </p>
                  {totalContacts > selectedConnection.dailyLimit && (
                    <p className="text-xs text-red-600">
                      Atenção: O total de contatos excede o limite diário da conexão.
                      O envio será distribuído em vários dias.
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <div className="rounded-md border p-4">
              <h3 className="text-lg font-medium mb-4">Resumo da Campanha</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nome da Campanha</p>
                    <p>{form.getValues("name") || "Não definido"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <Badge variant="outline">Rascunho</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Conexão</p>
                    <p>{selectedConnection?.name || "Não selecionada"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Agendamento</p>
                    {isScheduled && date ? (
                      <div className="flex items-center">
                        <CalendarClock className="mr-2 h-4 w-4 text-primary" />
                        <span>
                          {format(date, "dd/MM/yyyy", { locale: ptBR })} às {time}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">Não agendada</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Template</p>
                  {selectedTemplate ? (
                    <div className="p-3 rounded-md bg-gray-50">
                      <p className="font-medium">{selectedTemplate.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{selectedTemplate.content.substring(0, 100)}...</p>
                    </div>
                  ) : (
                    <p className="text-red-500">Nenhum template selecionado</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Grupos Selecionados ({selectedGroupIds.length})</p>
                  {selectedGroupIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedGroups.map((group: WhatsappGroup) => (
                        <Badge key={group.id} variant="outline" className="px-3 py-1">
                          {group.name} ({group.totalContacts || 0})
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-red-500">Nenhum grupo selecionado</p>
                  )}
                </div>
                
                <div className="p-4 rounded-md bg-primary/10 border border-primary/20">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Smartphone className="mr-2 h-4 w-4" />
                    Resumo do Envio
                  </h4>
                  <div className="space-y-1">
                    <p>Total de contatos: <span className="font-medium">{totalContacts}</span></p>
                    {selectedConnection && (
                      <>
                        <p>Limite diário da conexão: <span className="font-medium">{selectedConnection.dailyLimit}</span></p>
                        {totalContacts > selectedConnection.dailyLimit ? (
                          <>
                            <p className="text-amber-600">
                              Dias estimados para envio: <span className="font-medium">{Math.ceil(totalContacts / selectedConnection.dailyLimit)}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              O sistema distribuirá o envio respeitando o limite diário da conexão.
                            </p>
                          </>
                        ) : (
                          <p className="text-green-600">
                            Todas as mensagens serão enviadas no mesmo dia.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <div className="flex justify-end gap-2 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={campaignMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={campaignMutation.isPending}
            >
              {campaignMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Atualizar Campanha" : "Criar Campanha"}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}