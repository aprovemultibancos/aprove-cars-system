import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <div className="flex space-x-2">
          {children}
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface PageHeaderActionProps {
  children: ReactNode;
}

PageHeader.Action = function PageHeaderAction({ children }: PageHeaderActionProps) {
  return <div>{children}</div>;
};
