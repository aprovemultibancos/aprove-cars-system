import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  iconColor = "bg-primary-500"
}: StatCardProps) {
  return (
    <Card className={cn("p-3 md:p-4", className)}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={cn("flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-md text-white", iconColor)}>
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
        </div>
        <div className="ml-3 md:ml-5">
          <div className="text-xs md:text-sm font-medium text-gray-500 truncate-text">{title}</div>
          <div className="mt-1 text-lg md:text-xl font-semibold text-gray-900 mobile-text">{value}</div>
          {trend && (
            <div className={cn("text-xs md:text-sm flex items-center", 
              trend.positive ? "text-green-600" : "text-red-600")}>
              <svg 
                className={cn("self-center flex-shrink-0 h-3 w-3 md:h-4 md:w-4", 
                  trend.positive ? "text-green-500" : "text-red-500")} 
                fill="currentColor" 
                viewBox="0 0 20 20" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  fillRule="evenodd" 
                  d={trend.positive 
                    ? "M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" 
                    : "M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"} 
                  clipRule="evenodd"
                />
              </svg>
              <span className="ml-1 truncate-text">{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
