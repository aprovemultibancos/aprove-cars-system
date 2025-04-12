import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Car,
  CreditCard,
  DollarSign,
  Home,
  FileText,
  Users,
  CircleDollarSign,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface SidebarLinkProps {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  currentPath: string;
}

function SidebarLink({ href, icon: Icon, children, currentPath }: SidebarLinkProps) {
  const isActive = currentPath === href;
  
  return (
    <Link href={href}>
      <div 
        className={cn(
          "flex items-center px-3 py-2 text-gray-700 hover:bg-green-100 hover:text-green-800 rounded-md transition-all",
          isActive && "bg-primary text-black hover:bg-primary-600 hover:text-black font-bold"
        )}
      >
        <Icon className="mr-3 h-5 w-5" />
        {children}
      </div>
    </Link>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() 
    : 'U';
  
  return (
    <div className="flex flex-shrink-0 h-full">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow border-r border-gray-200 pt-5 pb-4 bg-white overflow-y-auto h-full">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="ml-2 text-xl font-semibold text-gray-900">Aprove</span>
            </div>
          </div>
          
          <div className="mt-6 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              <SidebarLink href="/" icon={Home} currentPath={location}>
                Dashboard
              </SidebarLink>
              
              <div className="mt-6">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aprove Cars
                </h3>
                <div className="mt-2 space-y-1">
                  <SidebarLink href="/vehicles" icon={Car} currentPath={location}>
                    Inventário
                  </SidebarLink>
                  <SidebarLink href="/sales" icon={DollarSign} currentPath={location}>
                    Vendas
                  </SidebarLink>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Aprove Financiamentos
                </h3>
                <div className="mt-2 space-y-1">
                  <SidebarLink href="/finances" icon={CreditCard} currentPath={location}>
                    Financiamentos
                  </SidebarLink>
                  <SidebarLink href="/expenses" icon={CircleDollarSign} currentPath={location}>
                    Despesas
                  </SidebarLink>
                  <SidebarLink href="/personnel" icon={Users} currentPath={location}>
                    Pessoal
                  </SidebarLink>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Relatórios
                </h3>
                <div className="mt-2 space-y-1">
                  <SidebarLink href="/reports" icon={FileText} currentPath={location}>
                    Relatórios
                  </SidebarLink>
                </div>
              </div>
              
              {user?.role === "admin" && (
                <div className="mt-6">
                  <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administração
                  </h3>
                  <div className="mt-2 space-y-1">
                    <SidebarLink href="/users" icon={Users} currentPath={location}>
                      Usuários
                    </SidebarLink>
                  </div>
                </div>
              )}
            </nav>
          </div>
          
          <div className="px-3 pt-2 pb-2">
            <Separator className="mb-3" />
            <div className="flex items-center px-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src="" alt="User" />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name || "Usuário"}</p>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs font-medium text-primary hover:text-primary-800"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
