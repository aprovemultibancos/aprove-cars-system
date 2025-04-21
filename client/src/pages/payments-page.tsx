import { useState, useEffect } from "react";
import { useAsaas } from "@/hooks/use-asaas";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Banknote, 
  QrCode, 
  ArrowRight, 
  RefreshCcw, 
  Eye, 
  XCircle, 
  Plus,
  Calendar,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ApiConfigForm } from "@/components/settings/api-config-form";
import { AsaasCustomersList } from "@/components/customers/asaas-customers-list";

export default function PaymentsPage() {
  const { id, action } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pagamentos (Asaas)</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="payments">Cobranças</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="create">Nova Cobrança</TabsTrigger>
          <TabsTrigger value="settings">Configuração</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <BalanceOverview />
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-4">
          <PaymentsList />
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-4">
          <AsaasCustomersList />
        </TabsContent>
        
        <TabsContent value="create" className="space-y-4">
          <PaymentForm />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <ApiConfigForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BalanceOverview() {
  const { balanceQuery, formatCurrency } = useAsaas();
  const { isLoading, error, data } = balanceQuery;
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  useEffect(() => {
    if (data) {
      // Se o saldo for exatamente 1550.75, é provavelmente o valor de demonstração
      setIsDemoMode(data.balance === 1550.75);
    }
  }, [data]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Saldo em Conta</CardTitle>
          <CardDescription>Saldo disponível na sua conta Asaas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <Skeleton className="h-20 w-full rounded-lg" />
          )}
          
          {error && (
            <div className="text-red-500">
              Erro ao carregar saldo: {error.message}
            </div>
          )}
          
          {data && (
            <>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(data.balance)}
              </div>
              
              {isDemoMode && (
                <Alert className="mt-4 border-amber-300 bg-amber-50 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Modo de demonstração</AlertTitle>
                  <AlertDescription className="text-xs">
                    O valor exibido é simulado. Para utilizar dados reais, configure uma chave de API válida.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>Informações de Taxas</CardTitle>
          <CardDescription>Taxas aplicadas em cada método de pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center p-2 rounded-lg border">
              <CreditCard className="h-8 w-8 text-blue-500 mr-4" />
              <div>
                <div className="font-medium">Cartão de Crédito</div>
                <div className="text-sm text-gray-500">Taxa adicional de 1,50% sobre o valor da cobrança</div>
              </div>
            </div>
            
            <div className="flex items-center p-2 rounded-lg border">
              <Banknote className="h-8 w-8 text-green-500 mr-4" />
              <div>
                <div className="font-medium">Boleto</div>
                <div className="text-sm text-gray-500">Taxa fixa de R$ 1,99 por boleto pago</div>
              </div>
            </div>
            
            <div className="flex items-center p-2 rounded-lg border">
              <QrCode className="h-8 w-8 text-purple-500 mr-4" />
              <div>
                <div className="font-medium">PIX</div>
                <div className="text-sm text-gray-500">Taxa de 0,99% sobre o valor da cobrança</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsList() {
  const { usePaymentsQuery, translatePaymentStatus, translatePaymentMethod, formatCurrency, cancelPaymentMutation } = useAsaas();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | undefined>("ALL");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const limit = 10;
  
  const { data, isLoading, error } = usePaymentsQuery(page * limit, limit, statusFilter === "ALL" ? undefined : statusFilter);
  const { toast } = useToast();
  
  useEffect(() => {
    if (data && data.data.length > 0) {
      // Verificar se algum dos pagamentos tem ID começando com "demo"
      const hasDemo = data.data.some(payment => payment.id.startsWith('demo'));
      setIsDemoMode(hasDemo);
    }
  }, [data]);
  
  const handleCancel = (paymentId: string) => {
    if (window.confirm("Tem certeza que deseja cancelar esta cobrança?")) {
      cancelPaymentMutation.mutate(paymentId);
    }
  };
  
  const nextPage = () => {
    if (data && (page + 1) * limit < data.totalCount) {
      setPage(page + 1);
    }
  };
  
  const prevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };
  
  const openAsaasLink = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Link não disponível",
        description: "Esta cobrança não possui um link para visualização",
        variant: "destructive"
      });
    }
  };
  
  // Mapear status para cores
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'RECEIVED': 'bg-green-100 text-green-800',
      'CONFIRMED': 'bg-green-100 text-green-800',
      'OVERDUE': 'bg-red-100 text-red-800',
      'REFUNDED': 'bg-purple-100 text-purple-800',
      'CANCELED': 'bg-gray-100 text-gray-800'
    };
    
    return colors[status] || 'bg-gray-100 text-gray-500';
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Cobranças</CardTitle>
            <CardDescription>Lista de cobranças geradas através do Asaas</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Select value={statusFilter || ""} onValueChange={(val) => setStatusFilter(val || undefined)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="RECEIVED">Recebidos</SelectItem>
                <SelectItem value="CONFIRMED">Confirmados</SelectItem>
                <SelectItem value="OVERDUE">Vencidos</SelectItem>
                <SelectItem value="REFUNDED">Reembolsados</SelectItem>
                <SelectItem value="CANCELED">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => {
              setPage(0);
              setStatusFilter("ALL");
            }}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <div className="text-red-500 mb-2">Erro ao carregar cobranças</div>
            <div className="text-sm text-gray-500">{String(error)}</div>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            {isDemoMode && (
              <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Modo de demonstração</AlertTitle>
                <AlertDescription className="text-xs">
                  Os pagamentos exibidos são exemplos simulados. Para utilizar dados reais, configure uma chave de API Asaas válida.
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.dateCreated), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {payment.description}
                    </TableCell>
                    <TableCell>
                      {translatePaymentMethod(payment.billingType)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(payment.value)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(payment.status)}>
                        {translatePaymentStatus(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-x-2">
                        {payment.status === 'PENDING' && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleCancel(payment.id)}
                            disabled={cancelPaymentMutation.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {(payment.billingType === 'BOLETO' && payment.bankSlipUrl) || 
                         (payment.billingType === 'PIX' && payment.pixQrCodeImage) || 
                         payment.invoiceUrl ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => openAsaasLink(
                              payment.billingType === 'BOLETO' 
                                ? payment.bankSlipUrl 
                                : payment.billingType === 'PIX' 
                                  ? payment.pixQrCodeImage || payment.invoiceUrl
                                  : payment.invoiceUrl
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Mostrando {page * limit + 1} a {Math.min((page + 1) * limit, data.totalCount)} de {data.totalCount} cobranças
              </div>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={prevPage} 
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={nextPage} 
                  disabled={(page + 1) * limit >= data.totalCount}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-20 text-center">
            <div className="text-gray-500 mb-2">Nenhuma cobrança encontrada</div>
            <div className="text-sm text-gray-400">
              Utilize a aba "Nova Cobrança" para criar cobranças
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PaymentFormData {
  customerName: string;
  customerCpfCnpj: string;
  customerEmail: string;
  customerPhone: string;
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: string;
  dueDate: string;
  description: string;
  externalReference?: string;
  creditCardData?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  addressInfo?: {
    postalCode: string;
    address: string;
    addressNumber: string;
    complement?: string;
    province?: string;
  };
}

function PaymentForm() {
  const { createPaymentMutation, calculateFeeAmount, formatCurrency } = useAsaas();
  const [isDemoMode, setIsDemoMode] = useState(true); // Começamos assumindo modo de demonstração
  const [formData, setFormData] = useState<PaymentFormData>({
    customerName: '',
    customerCpfCnpj: '',
    customerEmail: '',
    customerPhone: '',
    billingType: 'BOLETO',
    value: '',
    dueDate: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    description: ''
  });
  
  const [showCreditCardForm, setShowCreditCardForm] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'billingType') {
      setShowCreditCardForm(value === 'CREDIT_CARD');
      setShowAddressForm(value === 'CREDIT_CARD' || value === 'BOLETO');
    }
  };
  
  const handleCreditCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      creditCardData: {
        ...prev.creditCardData || {
          holderName: '',
          number: '',
          expiryMonth: '',
          expiryYear: '',
          ccv: ''
        },
        [name]: value
      }
    }));
  };
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      addressInfo: {
        ...prev.addressInfo || {
          postalCode: '',
          address: '',
          addressNumber: '',
        },
        [name]: value
      }
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      value: parseFloat(formData.value.replace(',', '.'))
    };
    
    createPaymentMutation.mutate(payload);
  };
  
  // Calcular taxa
  const displayFeeInfo = () => {
    const value = parseFloat(formData.value.replace(',', '.'));
    if (!isNaN(value) && value > 0) {
      const fee = calculateFeeAmount(value, formData.billingType);
      const total = value + fee;
      
      return (
        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
          <div className="text-sm font-medium mb-2">Informações de cobrança:</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm">Valor original:</div>
            <div className="text-sm font-medium">{formatCurrency(value)}</div>
            
            <div className="text-sm">Taxa {formData.billingType === 'BOLETO' ? 'fixa' : 'adicional'}:</div>
            <div className="text-sm font-medium">{formatCurrency(fee)}</div>
            
            <div className="text-sm font-medium">Valor com taxa:</div>
            <div className="text-sm font-bold">{formatCurrency(total)}</div>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Cobrança</CardTitle>
        <CardDescription>Criar uma nova cobrança para um cliente</CardDescription>
      </CardHeader>
      <CardContent>
        {isDemoMode && (
          <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Modo de demonstração</AlertTitle>
            <AlertDescription className="text-xs">
              O sistema está operando em modo de demonstração. As cobranças criadas serão simuladas e não processadas pelo Asaas.
              Para utilizar a API real, configure uma chave de API válida.
            </AlertDescription>
          </Alert>
        )}
      
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações do Cliente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nome do Cliente *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerCpfCnpj">CPF/CNPJ *</Label>
                <Input
                  id="customerCpfCnpj"
                  name="customerCpfCnpj"
                  value={formData.customerCpfCnpj}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefone</Label>
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Detalhes da Cobrança</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billingType">Método de Pagamento *</Label>
                <Select 
                  value={formData.billingType} 
                  onValueChange={(value) => handleSelectChange('billingType', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="value">Valor (R$) *</Label>
                <Input
                  id="value"
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  required
                  placeholder="0,00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Vencimento *</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    required
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 w-10 p-0"
                    onClick={() => {
                      const today = new Date();
                      setFormData(prev => ({
                        ...prev,
                        dueDate: format(today, 'yyyy-MM-dd')
                      }));
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="externalReference">Referência Externa</Label>
                <Input
                  id="externalReference"
                  name="externalReference"
                  value={formData.externalReference}
                  onChange={handleInputChange}
                  placeholder="Ex: ID da venda (opcional)"
                />
              </div>
            </div>
            
            {displayFeeInfo()}
          </div>
          
          {showCreditCardForm && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Dados do Cartão de Crédito</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="holderName">Nome no Cartão *</Label>
                  <Input
                    id="holderName"
                    name="holderName"
                    value={formData.creditCardData?.holderName || ''}
                    onChange={handleCreditCardChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="number">Número do Cartão *</Label>
                  <Input
                    id="number"
                    name="number"
                    value={formData.creditCardData?.number || ''}
                    onChange={handleCreditCardChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiryMonth">Mês de Expiração *</Label>
                  <Input
                    id="expiryMonth"
                    name="expiryMonth"
                    value={formData.creditCardData?.expiryMonth || ''}
                    onChange={handleCreditCardChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                    placeholder="MM"
                    maxLength={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expiryYear">Ano de Expiração *</Label>
                  <Input
                    id="expiryYear"
                    name="expiryYear"
                    value={formData.creditCardData?.expiryYear || ''}
                    onChange={handleCreditCardChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                    placeholder="AAAA"
                    maxLength={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ccv">Código de Segurança (CVV) *</Label>
                  <Input
                    id="ccv"
                    name="ccv"
                    value={formData.creditCardData?.ccv || ''}
                    onChange={handleCreditCardChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}
          
          {showAddressForm && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Endereço</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">CEP {formData.billingType === 'CREDIT_CARD' && '*'}</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.addressInfo?.postalCode || ''}
                    onChange={handleAddressChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço {formData.billingType === 'CREDIT_CARD' && '*'}</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.addressInfo?.address || ''}
                    onChange={handleAddressChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="addressNumber">Número {formData.billingType === 'CREDIT_CARD' && '*'}</Label>
                  <Input
                    id="addressNumber"
                    name="addressNumber"
                    value={formData.addressInfo?.addressNumber || ''}
                    onChange={handleAddressChange}
                    required={formData.billingType === 'CREDIT_CARD'}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    name="complement"
                    value={formData.addressInfo?.complement || ''}
                    onChange={handleAddressChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="province">Bairro</Label>
                  <Input
                    id="province"
                    name="province"
                    value={formData.addressInfo?.province || ''}
                    onChange={handleAddressChange}
                  />
                </div>
              </div>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={createPaymentMutation.isPending}
          >
            {createPaymentMutation.isPending ? (
              <>
                <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar Cobrança
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}