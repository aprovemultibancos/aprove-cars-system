import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Sales by Month chart
interface SalesData {
  month: string;
  sales: number;
}

interface SalesChartProps {
  data: SalesData[];
  isLoading?: boolean;
}

export function SalesChart({ data, isLoading = false }: SalesChartProps) {
  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Vendas por Mês</h3>
        <div className="h-60 bg-gray-100 animate-pulse rounded-md"></div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Vendas por Mês</h3>
      <div className="h-60 w-full">
        {data.length === 0 ? (
          <div className="h-full bg-gray-100 rounded-md relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center">
                  <BarChart className="h-10 w-10 text-gray-400" />
                </div>
                <p className="mt-2 text-sm text-gray-500">Sem dados de vendas disponíveis</p>
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`R$ ${value}`, "Vendas"]}
              />
              <Bar dataKey="sales" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

// Financing by Bank chart
interface FinancingData {
  bank: string;
  value: number;
}

interface FinancingChartProps {
  data: FinancingData[];
  isLoading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function FinancingChart({ data, isLoading = false }: FinancingChartProps) {
  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Financiamentos por Banco</h3>
        <div className="h-60 bg-gray-100 animate-pulse rounded-md"></div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Financiamentos por Banco</h3>
      <div className="h-60 w-full">
        {data.length === 0 ? (
          <div className="h-full bg-gray-100 rounded-md relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center">
                  <CreditCard className="h-10 w-10 text-gray-400" />
                </div>
                <p className="mt-2 text-sm text-gray-500">Sem dados de financiamento disponíveis</p>
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ bank, percent }) => `${bank} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="bank"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`R$ ${value}`, "Valor"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

import { CreditCard } from "lucide-react";
