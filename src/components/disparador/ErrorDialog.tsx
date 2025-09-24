"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const ErrorDialog = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Trigger from store or props
  const showError = (msg: string) => {
    setMessage(msg);
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <i className="bi bi-exclamation-triangle-fill"></i>Erro de Validação
          </DialogTitle>
        </DialogHeader>
        <p>{message}</p>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};