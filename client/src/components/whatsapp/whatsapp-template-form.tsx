import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { WhatsappTemplate, insertWhatsappTemplateSchema } from "@shared/schema";
import { useMutation, queryClient } from "@tanstack/react-query";
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
import { Loader2, File, Image, Video, Headphones } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";

interface WhatsappTemplateFormProps {
  editingTemplate: WhatsappTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}

// Estendendo o schema para validação
const formSchema = insertWhatsappTemplateSchema.extend({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  content: z.string().min(5, "Conteúdo deve ter no mínimo 5 caracteres"),
  mediaUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

export default function WhatsappTemplateForm({
  editingTemplate,
  onSave,
  onCancel,
}: WhatsappTemplateFormProps) {
  const { toast } = useToast();
  const isEditing = !!editingTemplate;
  const [hasMedia, setHasMedia] = useState(false);

  // Definir o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      content: "",
      hasMedia: false,
      mediaType: undefined,
      mediaUrl: "",
    },
  });

  // Carregar valores padrão ao editar
  useEffect(() => {
    if (editingTemplate) {
      form.reset({
        name: editingTemplate.name,
        content: editingTemplate.content,
        hasMedia: editingTemplate.hasMedia || false,
        mediaType: editingTemplate.mediaType,
        mediaUrl: editingTemplate.mediaUrl || "",
      });
      setHasMedia(editingTemplate.hasMedia || false);
    }
  }, [editingTemplate, form]);

  // Mutation para criar ou atualizar template
  const templateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // Verificar se tem mídia e ajustar os valores
      const templateData = {
        ...values,
        hasMedia: hasMedia,
        mediaType: hasMedia ? values.mediaType : undefined,
        mediaUrl: hasMedia ? values.mediaUrl : undefined,
      };
      
      if (isEditing && editingTemplate) {
        const res = await apiRequest(
          "PATCH", 
          `/api/whatsapp/templates/${editingTemplate.id}`,
          templateData
        );
        return await res.json();
      } else {
        const res = await apiRequest(
          "POST", 
          "/api/whatsapp/templates",
          templateData
        );
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Template atualizado" : "Template criado",
        description: isEditing 
          ? "O template foi atualizado com sucesso."
          : "O template foi criado com sucesso.",
      });
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/templates"] });
      
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao ${isEditing ? "atualizar" : "criar"} template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    templateMutation.mutate(values);
  };

  const handleMediaToggle = (checked: boolean) => {
    setHasMedia(checked);
    if (!checked) {
      form.setValue("mediaType", undefined);
      form.setValue("mediaUrl", "");
    }
  };

  // Obter uma prévia do template
  const getTemplatePreview = () => {
    const content = form.getValues("content");
    // Substituir variáveis por valores de exemplo
    return content
      .replace(/{{nome}}/g, "João Silva")
      .replace(/{{telefone}}/g, "5511999999999");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Template</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Boas-vindas" {...field} />
              </FormControl>
              <FormDescription>
                Um nome para identificar este template.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conteúdo da Mensagem</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Digite o conteúdo da mensagem..." 
                  {...field} 
                  rows={5}
                />
              </FormControl>
              <FormDescription>
                Você pode usar variáveis como {{nome}} e {{telefone}} que serão substituídas
                pelos dados do contato.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="has-media" 
            checked={hasMedia}
            onCheckedChange={handleMediaToggle}
          />
          <Label htmlFor="has-media">Incluir mídia (imagem, documento, etc)</Label>
        </div>
        
        {hasMedia && (
          <>
            <FormField
              control={form.control}
              name="mediaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Mídia</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de mídia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="image">
                        <div className="flex items-center">
                          <Image className="mr-2 h-4 w-4" />
                          <span>Imagem</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="document">
                        <div className="flex items-center">
                          <File className="mr-2 h-4 w-4" />
                          <span>Documento</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="video">
                        <div className="flex items-center">
                          <Video className="mr-2 h-4 w-4" />
                          <span>Vídeo</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="audio">
                        <div className="flex items-center">
                          <Headphones className="mr-2 h-4 w-4" />
                          <span>Áudio</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mediaUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Mídia</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: https://exemplo.com/imagem.jpg" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    URL da mídia que será enviada junto com a mensagem.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Preview */}
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Prévia da Mensagem</h3>
          <Card>
            <CardContent className="p-4">
              <div className="bg-green-50 rounded-lg p-3 whitespace-pre-wrap">
                {getTemplatePreview()}
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-gray-500 mt-1">
            Esta é uma prévia de como sua mensagem será enviada, com as variáveis substituídas.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={templateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={templateMutation.isPending}
          >
            {templateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}