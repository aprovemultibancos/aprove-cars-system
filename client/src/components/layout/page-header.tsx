import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <div className="flex space-x-2">
        {children}
      </div>
    </div>
  );
}

interface PageHeaderActionProps {
  children: ReactNode;
}

PageHeader.Action = function PageHeaderAction({ children }: PageHeaderActionProps) {
  return <div>{children}</div>;
};
