import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertVehicleSchema, Vehicle } from "@shared/schema";
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
import { FileUpload } from "@/components/ui/file-upload";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Extended schema with validation
const extendedVehicleSchema = insertVehicleSchema.extend({
  make: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.coerce.number().min(1900, "Ano inválido").max(new Date().getFullYear() + 1, "Ano inválido"),
  km: z.coerce.number().min(0, "Quilometragem inválida"),
  purchaseCost: z.coerce.number().min(0, "Valor inválido"),
  sellingPrice: z.coerce.number().min(0, "Valor inválido"),
  expenses: z.coerce.number().min(0, "Valor inválido").optional(),
  description: z.string().optional(),
  status: z.enum(["available", "reserved", "sold"]),
  notes: z.string().optional(),
});

type VehicleFormValues = z.infer<typeof extendedVehicleSchema>;

interface VehicleFormProps {
  editVehicle?: Vehicle;
}

export function VehicleForm({ editVehicle }: VehicleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [crlvFile, setCrlvFile] = useState<File[]>([]);
  const [powerOfAttorneyFile, setPowerOfAttorneyFile] = useState<File[]>([]);
  const [vehicleImages, setVehicleImages] = useState<File[]>([]);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(extendedVehicleSchema),
    defaultValues: editVehicle
      ? {
          make: editVehicle.make,
          model: editVehicle.model,
          year: editVehicle.year,
          km: Number(editVehicle.km),
          purchaseCost: Number(editVehicle.purchaseCost),
          sellingPrice: Number(editVehicle.sellingPrice),
          expenses: Number(editVehicle.expenses || 0),
          description: editVehicle.description || "",
          status: editVehicle.status as "available" | "reserved" | "sold",
          notes: editVehicle.notes || "",
        }
      : {
          make: "",
          model: "",
          year: new Date().getFullYear(),
          km: 0,
          purchaseCost: 0,
          sellingPrice: 0,
          expenses: 0,
          description: "",
          status: "available",
          notes: "",
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: VehicleFormValues) => {
      // Garantir que todos os campos obrigatórios estejam presentes
      const vehicleData = {
        make: data.make,
        model: data.model,
        year: data.year,
        km: data.km.toString(),
        purchaseCost: data.purchaseCost.toString(),
        sellingPrice: data.sellingPrice.toString(),
        expenses: data.expenses?.toString() || "0",
        description: data.description || "",
        status: data.status,
        notes: data.notes || "",
        // Os caminhos dos arquivos serão preenchidos no servidor
        crlvDocPath: null,
        powerOfAttorneyPath: null,
        images: null
      };

      // Se estiver editando, usar o endpoint de atualização, senão usar o de criação
      const endpoint = editVehicle 
        ? `/api/vehicles/${editVehicle.id}` 
        : "/api/vehicles";
      
      const method = editVehicle ? "PATCH" : "POST";
      
      // Usar apiRequest para garantir tratamento de erros consistente
      const res = await apiRequest(method, endpoint, vehicleData);
      return res;
    },
    onSuccess: () => {
      toast({
        title: editVehicle ? "Veículo atualizado" : "Veículo cadastrado",
        description: editVehicle 
          ? "O veículo foi atualizado com sucesso" 
          : "O veículo foi cadastrado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      navigate("/vehicles");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o veículo",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: VehicleFormValues) {
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Ford" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Fusion" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="km"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quilometragem</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="purchaseCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custo de Compra (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="expenses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Despesas (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="sellingPrice"
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="reserved">Reservado</SelectItem>
                    <SelectItem value="sold">Vendido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detalhes do veículo..." 
                  className="min-h-32"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-6">
          <FileUpload
            id="crlv-upload"
            label="CRLV (Documento)"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={setCrlvFile}
            helpText="Formato PDF ou imagem"
          />
          
          <FileUpload
            id="power-of-attorney"
            label="Procuração"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={setPowerOfAttorneyFile}
            helpText="Formato PDF ou imagem"
          />
          
          <FileUpload
            id="vehicle-images"
            label="Fotos do Veículo"
            accept="image/*"
            multiple
            onChange={setVehicleImages}
            helpText="Até 10 imagens"
            maxFiles={10}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações adicionais..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/vehicles")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : (editVehicle ? "Atualizar" : "Cadastrar")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
