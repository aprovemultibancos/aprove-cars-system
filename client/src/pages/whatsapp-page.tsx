import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  List,
  Send,
  Settings,
  Plus,
  Smartphone,
  Loader2
} from "lucide-react";
import PageTitle from "@/components/layout/page-title";
import { useAuth } from "@/hooks/use-auth";
import WhatsappConnectionsList from "@/components/whatsapp/whatsapp-connections-list";
import WhatsappContactsList from "@/components/whatsapp/whatsapp-contacts-list";
import WhatsappGroupsList from "@/components/whatsapp/whatsapp-groups-list";
import WhatsappTemplatesList from "@/components/whatsapp/whatsapp-templates-list";
import WhatsappCampaignsList from "@/components/whatsapp/whatsapp-campaigns-list";
import WhatsappConnectionForm from "@/components/whatsapp/whatsapp-connection-form";
import WhatsappContactForm from "@/components/whatsapp/whatsapp-contact-form";
import WhatsappGroupForm from "@/components/whatsapp/whatsapp-group-form";
import WhatsappTemplateForm from "@/components/whatsapp/whatsapp-template-form";
import WhatsappCampaignForm from "@/components/whatsapp/whatsapp-campaign-form";

export default function WhatsappPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("connections");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Carregar dados das conexões WhatsApp
  const {
    data: connections,
    isLoading: isLoadingConnections,
    error: connectionsError,
    refetch: refetchConnections
  } = useQuery({
    queryKey: ["/api/whatsapp/connections"],
    enabled: !!user
  });

  // Carregar dados dos contatos
  const {
    data: contacts,
    isLoading: isLoadingContacts,
    error: contactsError,
    refetch: refetchContacts
  } = useQuery({
    queryKey: ["/api/whatsapp/contacts"],
    enabled: !!user && activeTab === "contacts"
  });

  // Carregar dados dos grupos
  const {
    data: groups,
    isLoading: isLoadingGroups,
    error: groupsError,
    refetch: refetchGroups
  } = useQuery({
    queryKey: ["/api/whatsapp/groups"],
    enabled: !!user && activeTab === "groups"
  });

  // Carregar dados dos templates
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
    refetch: refetchTemplates
  } = useQuery({
    queryKey: ["/api/whatsapp/templates"],
    enabled: !!user && activeTab === "templates"
  });

  // Carregar dados das campanhas
  const {
    data: campaigns,
    isLoading: isLoadingCampaigns,
    error: campaignsError,
    refetch: refetchCampaigns
  } = useQuery({
    queryKey: ["/api/whatsapp/campaigns"],
    enabled: !!user && activeTab === "campaigns"
  });

  // Função para adicionar novo item
  const handleAddNew = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  // Função para editar item
  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowForm(true);
  };

  // Função para salvar item
  const handleSave = () => {
    setShowForm(false);
    setEditingItem(null);
    
    // Atualizar a lista correta com base na aba ativa
    switch (activeTab) {
      case "connections":
        refetchConnections();
        break;
      case "contacts":
        refetchContacts();
        break;
      case "groups":
        refetchGroups();
        break;
      case "templates":
        refetchTemplates();
        break;
      case "campaigns":
        refetchCampaigns();
        break;
    }
  };

  // Função para cancelar o formulário
  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  // Função para renderizar o botão de adicionar
  const renderAddButton = () => {
    if (showForm) return null;
    
    return (
      <Button onClick={handleAddNew} className="mb-4">
        <Plus className="mr-2 h-4 w-4" /> Adicionar {getTabTitle()}
      </Button>
    );
  };

  // Função para obter o título do tab atual no singular
  const getTabTitle = () => {
    switch (activeTab) {
      case "connections":
        return "Conexão";
      case "contacts":
        return "Contato";
      case "groups":
        return "Grupo";
      case "templates":
        return "Template";
      case "campaigns":
        return "Campanha";
      default:
        return "";
    }
  };

  // Função para renderizar o conteúdo ativo
  const renderContent = () => {
    if (showForm) {
      switch (activeTab) {
        case "connections":
          return (
            <WhatsappConnectionForm
              editingConnection={editingItem}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          );
        case "contacts":
          return (
            <WhatsappContactForm
              editingContact={editingItem}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          );
        case "groups":
          return (
            <WhatsappGroupForm
              editingGroup={editingItem}
              contacts={contacts || []}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          );
        case "templates":
          return (
            <WhatsappTemplateForm
              editingTemplate={editingItem}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          );
        case "campaigns":
          return (
            <WhatsappCampaignForm
              editingCampaign={editingItem}
              templates={templates || []}
              connections={connections || []}
              groups={groups || []}
              contacts={contacts || []}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          );
        default:
          return null;
      }
    }

    switch (activeTab) {
      case "connections":
        return (
          <WhatsappConnectionsList
            connections={connections || []}
            isLoading={isLoadingConnections}
            error={connectionsError}
            onEdit={handleEdit}
            onRefresh={refetchConnections}
          />
        );
      case "contacts":
        return (
          <WhatsappContactsList
            contacts={contacts || []}
            isLoading={isLoadingContacts}
            error={contactsError}
            onEdit={handleEdit}
            onRefresh={refetchContacts}
          />
        );
      case "groups":
        return (
          <WhatsappGroupsList
            groups={groups || []}
            isLoading={isLoadingGroups}
            error={groupsError}
            onEdit={handleEdit}
            onRefresh={refetchGroups}
          />
        );
      case "templates":
        return (
          <WhatsappTemplatesList
            templates={templates || []}
            isLoading={isLoadingTemplates}
            error={templatesError}
            onEdit={handleEdit}
            onRefresh={refetchTemplates}
          />
        );
      case "campaigns":
        return (
          <WhatsappCampaignsList
            campaigns={campaigns || []}
            isLoading={isLoadingCampaigns}
            error={campaignsError}
            onEdit={handleEdit}
            onRefresh={refetchCampaigns}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );
    }
  };

  // Se ainda estiver carregando dados do usuário
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageTitle
        title="WhatsApp Marketing"
        subtitle="Envie mensagens, gerencie contatos e crie campanhas"
        icon={<MessageSquare className="h-6 w-6" />}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setShowForm(false);
          setEditingItem(null);
        }}
        className="w-full mt-6"
      >
        <TabsList className="grid grid-cols-5 w-full max-w-3xl mb-8">
          <TabsTrigger value="connections">
            <Smartphone className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Conexões</span>
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Contatos</span>
          </TabsTrigger>
          <TabsTrigger value="groups">
            <List className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Grupos</span>
          </TabsTrigger>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Send className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <div className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>
                  {activeTab === "connections" && "Conexões WhatsApp"}
                  {activeTab === "contacts" && "Contatos"}
                  {activeTab === "groups" && "Grupos"}
                  {activeTab === "templates" && "Templates de Mensagens"}
                  {activeTab === "campaigns" && "Campanhas de Marketing"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "connections" && "Gerencie suas conexões com o WhatsApp"}
                  {activeTab === "contacts" && "Gerencie sua lista de contatos para envio de mensagens"}
                  {activeTab === "groups" && "Organize seus contatos em grupos para facilitar o envio"}
                  {activeTab === "templates" && "Crie templates para mensagens recorrentes"}
                  {activeTab === "campaigns" && "Crie e gerencie campanhas de marketing"}
                </CardDescription>
              </div>
              {renderAddButton()}
            </div>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}