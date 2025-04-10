import { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user } = useAuth();
  
  const userInitials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() 
    : 'U';
  
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <Button 
        variant="ghost" 
        size="icon"
        className="md:hidden px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Abrir menu</span>
      </Button>
      
      {/* Em dispositivos móveis, mostra logo no centro */}
      <div className="md:hidden flex items-center justify-center flex-1">
        <div className="flex items-center">
          <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span className="ml-2 text-lg font-semibold text-gray-900">Aprove</span>
        </div>
      </div>
      
      {/* Em desktop, mostra a barra de busca */}
      <div className="hidden md:flex flex-1 px-4 justify-between">
        <div className="flex-1 flex">
          <form className="w-full flex md:ml-0" action="#" method="GET">
            <label htmlFor="search-field" className="sr-only">Buscar</label>
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <Search className="h-5 w-5" />
              </div>
              <Input
                id="search-field"
                className="block w-full h-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Buscar"
                type="search"
              />
            </div>
          </form>
        </div>
      </div>
      
      <div className="px-2 md:px-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <span className="sr-only">Notificações</span>
          <Bell className="h-6 w-6" />
        </Button>

        <div className="ml-3 relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" alt="User" />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
