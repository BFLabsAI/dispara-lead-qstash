"use client";

import { InstanceManager } from "@/components/disparador/InstanceManager";
import { Card, CardContent } from "@/components/ui/card";

const Instancias = () => {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <InstanceManager />
        </CardContent>
      </Card>
    </div>
  );
};

export default Instancias;