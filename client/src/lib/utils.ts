import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(amount);
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return "";
  
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatPhone(phone?: string): string {
  if (!phone) return "";
  
  // Remove any non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format Brazilian phone number (XX) XXXXX-XXXX
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

export function formatCPF(cpf?: string): string {
  if (!cpf) return "";
  
  // Remove any non-numeric characters
  const cleaned = cpf.replace(/\D/g, '');
  
  // Format CPF XXX.XXX.XXX-XX
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  
  return cpf;
}

export function formatCNPJ(cnpj?: string): string {
  if (!cnpj) return "";
  
  // Remove any non-numeric characters
  const cleaned = cnpj.replace(/\D/g, '');
  
  // Format CNPJ XX.XXX.XXX/XXXX-XX
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  
  return cnpj;
}

export function isValidCPF(cpf?: string): boolean {
  if (!cpf) return false;
  
  // Remove any non-numeric characters
  const cleaned = cpf.replace(/\D/g, '');
  
  // CPF must have 11 digits
  if (cleaned.length !== 11) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate CPF algorithm
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
}

export function isValidCNPJ(cnpj?: string): boolean {
  if (!cnpj) return false;
  
  // Remove any non-numeric characters
  const cleaned = cnpj.replace(/\D/g, '');
  
  // CNPJ must have 14 digits
  if (cleaned.length !== 14) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate CNPJ algorithm
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

export function getInitials(name?: string): string {
  if (!name) return "U";
  
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}
