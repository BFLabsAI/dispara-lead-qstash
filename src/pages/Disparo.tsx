"use client";

import { ShooterConfig } from "@/components/disparador/ShooterConfig";
import { PageHeader } from "@/components/layout/PageHeader";

const Disparo = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Disparo em Massa" subtitle="Configure e envie suas campanhas" />
      <ShooterConfig />
    </div>
  );
};

export default Disparo;