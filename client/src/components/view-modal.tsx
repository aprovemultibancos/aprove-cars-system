import { useState } from "react";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ViewModalProps {
  title: string;
  item: any;
  renderContent: (item: any) => React.ReactNode;
}

export function ViewModal({ title, item, renderContent }: ViewModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Visualizar detalhes"
      >
        <Eye className="h-4 w-4 text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Detalhes completos do item selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">{renderContent(item)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}