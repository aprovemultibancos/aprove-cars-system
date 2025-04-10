import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ViewModalProps<T> {
  title: string;
  item: T;
  renderContent: (item: T) => React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ViewModal<T>({
  title,
  item,
  renderContent,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ViewModalProps<T>) {
  const [internalOpen, setInternalOpen] = React.useState(true);

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const onOpenChange = isControlled ? externalOnOpenChange : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-0">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange?.(false)}
            className="rounded-full h-8 w-8"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </DialogHeader>
        <div className="mt-4">{renderContent(item)}</div>
      </DialogContent>
    </Dialog>
  );
}