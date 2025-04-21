import { useState, useEffect } from "react";
import { useAsaas } from "@/hooks/use-asaas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search, RefreshCcw } from "lucide-react";

export function AsaasCustomersList() {
  const { useCustomersQuery } = useAsaas();
  const [page, setPage] = useState(0);
  const [searchName, setSearchName] = useState<string | undefined>(undefined);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 10;
  
  const { data, isLoading, error, refetch } = useCustomersQuery(page * limit, limit, searchName);
  
  useEffect(() => {
    if (data && data.data.length > 0) {
      // Verificar se algum dos clientes tem ID começando com "demo"
      const hasDemo = data.data.some(customer => customer.id.startsWith('demo'));
      setIsDemoMode(hasDemo);
    }
  }, [data]);
  
  const handleSearch = () => {
    setSearchName(searchQuery || undefined);
    setPage(0);
  };
  
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchName(undefined);
    setPage(0);
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
  
  // Formatar CPF/CNPJ com pontuação
  const formatCpfCnpj = (cpfCnpj: string) => {
    if (!cpfCnpj) return "-";
    
    // Remove caracteres não numéricos
    const numbers = cpfCnpj.replace(/\D/g, '');
    
    if (numbers.length === 11) {
      // CPF: 000.000.000-00
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (numbers.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    
    return cpfCnpj;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Clientes Asaas</CardTitle>
            <CardDescription>Lista de clientes cadastrados no Asaas</CardDescription>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[250px]"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSearch}
                className="absolute right-0 top-0 h-10 w-10"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              handleClearSearch();
              refetch();
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
            <div className="text-red-500 mb-2">Erro ao carregar clientes</div>
            <div className="text-sm text-gray-500">{String(error)}</div>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            {isDemoMode && (
              <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Modo de demonstração</AlertTitle>
                <AlertDescription className="text-xs">
                  Os clientes exibidos são exemplos simulados. Para utilizar dados reais, configure uma chave de API Asaas válida.
                </AlertDescription>
              </Alert>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Endereço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      {formatCpfCnpj(customer.cpfCnpj)}
                    </TableCell>
                    <TableCell>{customer.email || "-"}</TableCell>
                    <TableCell>{customer.phone || customer.mobilePhone || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {customer.address 
                        ? `${customer.address}, ${customer.addressNumber || "s/n"}${customer.province ? ` - ${customer.province}` : ""}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Mostrando {page * limit + 1} a {Math.min((page + 1) * limit, data.totalCount)} de {data.totalCount} clientes
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
            <div className="text-gray-500 mb-2">Nenhum cliente encontrado</div>
            <div className="text-sm text-gray-400">
              {searchName ? "Tente uma busca diferente" : "Nenhum cliente cadastrado no Asaas"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}