import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const loginSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "financial", "sales"], {
    errorMap: () => ({ message: "Selecione um tipo de usuário válido" }),
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  
  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "sales",
    },
  });
  
  function onLoginSubmit(data: LoginFormValues) {
    loginMutation.mutate(data);
  }
  
  function onRegisterSubmit(data: RegisterFormValues) {
    registerMutation.mutate(data);
  }
  
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Left Panel: Form */}
      <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="ml-2 text-2xl font-semibold text-gray-900">Aprove</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Bem-vindo ao Sistema Unificado
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Entre com sua conta para acessar o sistema
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Entrar</CardTitle>
              <CardDescription>
                Entre com seu nome de usuário e senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Usuário</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-gray-500">
                Novos usuários devem ser cadastrados por um administrador no sistema.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Right Panel: Hero */}
      <div className="hidden md:flex md:w-1/2 bg-primary p-12 flex-col justify-center">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-6 text-black">Sistema Unificado Aprove</h1>
          <p className="text-xl mb-8 text-black">
            Uma plataforma completa para gerenciamento de veículos, vendas e financiamentos.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start bg-white/90 p-4 rounded-lg shadow-md">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-black">Aprove Cars</h3>
                <p className="mt-1 text-black">
                  Gerencie seu inventário de veículos, controle vendas e acompanhe o desempenho.
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-white/90 p-4 rounded-lg shadow-md">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-black">Aprove Financiamentos</h3>
                <p className="mt-1 text-black">
                  Acompanhe propostas de financiamento, comissões e resultados financeiros.
                </p>
              </div>
            </div>
            
            <div className="flex items-start bg-white/90 p-4 rounded-lg shadow-md">
              <div className="flex-shrink-0 mt-1">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-black">Relatórios Detalhados</h3>
                <p className="mt-1 text-black">
                  Análises e insights para tomada de decisões estratégicas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
