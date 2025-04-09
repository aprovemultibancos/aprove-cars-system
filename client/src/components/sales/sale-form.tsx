import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insertSaleSchema, Sale, Vehicle, Customer, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

// Extended schema with validation
const extendedSaleSchema = insertSaleSchema.extend({
  vehicleId: z.coerce.number().positive("Veículo é obrigatório"),
  customerId: z.coerce.number().positive().optional(),
  customerName: z.string().optional(),
  sellerId: z.coerce.number().positive("Vendedor é obrigatório"),
  saleDate: z.date(),
  salePrice: z.coerce.number().positive("Preço de venda é obrigatório"),
  paymentMethod: z.string().min(1, "Método de pagamento é obrigatório"),
  commission: z.coerce.number().min(0, "Comissão inválida"),
  asaasPaymentId: z.string().optional(),
  notes: z.string().optional(),
});

type SaleFormValues = z.infer<typeof extendedSaleSchema>;

interface SaleFormProps {
  editSale?: Sale;
}

export function SaleForm({ editSale }: SaleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles/available"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: sellers } = useQuery<User[]>({
    queryKey: ["/api/users/sales"],
  });

  // Se tiver apenas um vendedor, pré-selecionar ele
  const defaultSellerId = sellers && sellers.length === 1 
    ? sellers[0].id.toString() 
    : undefined;

  const defaultValues: Partial<SaleFormValues> = editSale
    ? {
        vehicleId: editSale.vehicleId,
        customerId: editSale.customerId || undefined,
        sellerId: editSale.sellerId,
        saleDate: new Date(editSale.saleDate),
        salePrice: Number(editSale.salePrice),
        paymentMethod: editSale.paymentMethod,
        commission: Number(editSale.commission),
        asaasPaymentId: editSale.asaasPaymentId || "",
        notes: editSale.notes || "",
      }
    : {
        saleDate: new Date(),
        salePrice: 0,
        commission: 0,
        paymentMethod: "dinheiro",
        notes: "",
        sellerId: defaultSellerId ? Number(defaultSellerId) : undefined,
      };

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(extendedSaleSchema),
    defaultValues,
  });

  // Atualizar o valor do sellerId quando sellers estiver disponível
  useEffect(() => {
    if (sellers && sellers.length === 1 && !editSale && !form.getValues().sellerId) {
      form.setValue("sellerId", sellers[0].id);
    }
  }, [sellers, form, editSale]);

  const mutation = useMutation({
    mutationFn: async (data: SaleFormValues) => {
      // Formatar os dados para o envio
      const saleData = {
        ...data,
        vehicleId: data.vehicleId ? parseInt(data.vehicleId.toString()) : undefined,
        customerId: data.customerId ? parseInt(data.customerId.toString()) : undefined,
        sellerId: data.sellerId ? parseInt(data.sellerId.toString()) : undefined,
        saleDate: data.saleDate ? format(data.saleDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        salePrice: data.salePrice.toString(),
        commission: data.commission ? data.commission.toString() : "0",
      };

      console.log("Enviando dados da venda:", saleData);
      
      const endpoint = editSale ? `/api/sales/${editSale.id}` : "/api/sales";
      const method = editSale ? "PATCH" : "POST";
      
      try {
        const response = await apiRequest(method, endpoint, saleData);
        return await response.json();
      } catch (error) {
        console.error("Erro ao salvar venda:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: editSale ? "Venda atualizada" : "Venda cadastrada",
        description: editSale
          ? "A venda foi atualizada com sucesso"
          : "A venda foi cadastrada com sucesso",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      navigate("/sales");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a venda",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: SaleFormValues) {
    // Validar que pelo menos um dos campos de cliente foi preenchido
    if (!data.customerId && !data.customerName) {
      toast({
        title: "Erro no formulário",
        description: "É necessário fornecer um cliente (selecionar um registrado ou digitar o nome)",
        variant: "destructive",
      });
      return;
    }
    
    // Enviar os dados para o backend
    mutation.mutate(data);
  }

  // When a vehicle is selected, set its price as the sale price
  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles?.find((v) => v.id === parseInt(vehicleId));
    if (vehicle) {
      form.setValue("salePrice", Number(vehicle.sellingPrice));
      
      // Calculate a default commission (e.g., 5% of sale price)
      const defaultCommission = Number(vehicle.sellingPrice) * 0.05;
      form.setValue("commission", defaultCommission);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veículo</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleVehicleChange(value);
                  }}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles && vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cliente registrado ou não registrado */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente Registrado</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value ? parseInt(value) : undefined);
                      // Se um cliente for selecionado, limpar o campo de nome manual
                      if (value) {
                        form.setValue("customerName", "");
                      }
                    }}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente registrado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Selecione um cliente já registrado no sistema
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente (entrada manual)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite o nome do cliente" 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        // Se o usuário começar a digitar, limpar a seleção de cliente
                        if (e.target.value && form.getValues().customerId) {
                          form.setValue("customerId", undefined);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Use este campo caso o cliente não esteja registrado no sistema
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="sellerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendedor</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sellers && sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id.toString()}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="saleDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data da Venda</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Venda (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o método de pagamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="financiamento">Financiamento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="commission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comissão (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="asaasPaymentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID de Pagamento Asaas</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  Opcional. Insira se utilizar o serviço Asaas para pagamento.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/sales")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : (editSale ? "Atualizar" : "Registrar Venda")}
          </Button>
        </div>
      </form>
    </Form>
  );
}