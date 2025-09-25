"use client";

import { ShooterConfig } from "@/components/disparador/ShooterConfig";
import { Card, CardContent } from "@/components/ui/card";

const Disparo = () => {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <ShooterConfig />
        </CardContent>
      </Card>
    </div>
  );
};

export default Disparo;