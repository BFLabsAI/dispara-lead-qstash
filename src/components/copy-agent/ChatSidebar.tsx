"use client";

import React, { useState, useEffect } from 'react';
import { useCopyAgentStore } from '@/store/copyAgentStore';
import { CompanySettingsModal } from './CompanySettingsModal';
import { ChatSidebarHeader } from './ChatSidebarHeader';
import { QuickTemplatesSection } from './QuickTemplatesSection';
import { ChatHistorySection } from './ChatHistorySection';

export const ChatSidebar = () => {
  const {
    chats,
    currentChatId,
    isChatLoading,
    loadChats,
    startNewChat,
    selectChat,
    deleteChat,
    renameChat,
    openCompanySettingsModal,
    isCompanySettingsModalOpen,
  } = useCopyAgentStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleNewChat = async (templateUsed?: string, initialMessageContent?: string) => {
    await startNewChat(templateUsed, initialMessageContent);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <ChatSidebarHeader
        onNewChat={() => handleNewChat()}
        onOpenCompanySettings={openCompanySettingsModal}
      />

      <QuickTemplatesSection onNewChat={handleNewChat} />

      <ChatHistorySection
        chats={chats}
        currentChatId={currentChatId}
        isChatLoading={isChatLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
      />

      <CompanySettingsModal isOpen={isCompanySettingsModalOpen} />
    </div>
  );
};