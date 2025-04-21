import React from "react";
import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({
  title,
  subtitle,
  icon,
  className,
}) => {
  return (
    <div className={cn("flex flex-col space-y-1.5", className)}>
      <div className="flex items-center">
        {icon && <div className="mr-2 text-primary">{icon}</div>}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
};

export default PageTitle;