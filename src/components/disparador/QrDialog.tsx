"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDisparadorStore } from "../../store/disparadorStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const QrDialog = () => {
  const { qrCode, qrInstance, fetchQrCode } = useDisparadorStore();
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (qrCode) setOpen(true);
  }, [qrCode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (open && countdown > 0) {
      interval = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    if (countdown === 0) {
      setOpen(false);
    }
    return () => clearInterval(interval);
  }, [open, countdown]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Instância: {qrInstance}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <p>Leia o QR Code com o seu WhatsApp.</p>
          {qrCode ? (
            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin" />
          )}
          <p className="text-yellow-600">Novo código em {countdown}s</p>
          <Button onClick={() => fetchQrCode(qrInstance!)}>Gerar Novo QR Code</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};