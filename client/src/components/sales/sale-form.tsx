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

// Extended schema with validation
const extendedSaleSchema = insertSaleSchema.extend({
  vehicleId: z.coerce.number().positive("Veículo é obrigatório"),
  customerId: z.coerce.number().positive("Cliente é obrigatório"),
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

  const defaultValues: Partial<SaleFormValues> = editSale
    ? {
        vehicleId: editSale.vehicleId,
        customerId: editSale.customerId,
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
        paymentMethod: "",
        notes: "",
      };

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(extendedSaleSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: async (data: SaleFormValues) => {
      const endpoint = editSale ? `/api/sales/${editSale.id}` : "/api/sales";
      const method = editSale ? "PATCH" : "POST";
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: editSale ? "Venda atualizada" : "Venda cadastrada",
        description: editSale
          ? "A venda foi atualizada com sucesso"
          : "A venda foi cadastrada com sucesso",
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
                    {vehicles?.map((vehicle) => (
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

          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
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
                <FormMessage />
              </FormItem>
            )}
          />

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
                    {sellers?.map((seller) => (
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
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="financing">Financiamento</SelectItem>
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
