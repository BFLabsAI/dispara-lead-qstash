"use client";

import { CopyAgentLayout } from "@/components/copy-agent/CopyAgentLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCopyAgentStore } from "@/store/copyAgentStore";
import { useEffect } from "react";
import { CompanySettingsModal } from "@/components/copy-agent/CompanySettingsModal";

const CopyAgentPage = () => {
  const { loadChats, loadCompanySettings, companySettings, isCompanySettingsLoaded, openCompanySettingsModal, isCompanySettingsModalOpen } = useCopyAgentStore();

  useEffect(() => {
    loadChats();
    loadCompanySettings();
  }, [loadChats, loadCompanySettings]);

  // Removed auto-open modal on missing settings - user will click to configure if needed

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Copy Agent" subtitle="Seu assistente de IA para campanhas de WhatsApp" />
      <div className="flex-1 min-h-0"> {/* Ensure flex-1 takes remaining height */}
        <CopyAgentLayout />
      </div>
      <CompanySettingsModal isOpen={isCompanySettingsModalOpen} />
    </div>
  );
};

export default CopyAgentPage;