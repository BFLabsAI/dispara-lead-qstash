"use client";

import React, { useState } from 'react';
import { ChatSession } from '@/store/copyAgentStore';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2, Edit, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatHistoryItemProps {
  chat: ChatSession;
  isSelected: boolean;
  onSelect: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, newName: string) => void;
}

export const ChatHistoryItem = ({ chat, isSelected, onSelect, onDelete, onRename }: ChatHistoryItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(chat.name);

  const handleRename = () => {
    if (newName.trim() && newName !== chat.name) {
      onRename(chat.id, newName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setNewName(chat.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors group",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted"
      )}
      onClick={() => !isEditing && onSelect(chat.id)}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MessageSquare className="h-4 w-4 flex-shrink-0" />
        {isEditing ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            autoFocus
            className="h-7 text-sm bg-background border-border focus:border-primary"
            onClick={(e) => e.stopPropagation()} // Prevent selecting chat when clicking input
          />
        ) : (
          <span className="text-sm font-medium truncate">{chat.name}</span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:bg-green-500/20" onClick={(e) => { e.stopPropagation(); handleRename(); }}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={(e) => { e.stopPropagation(); setNewName(chat.name); setIsEditing(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} title="Renomear">
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={(e) => e.stopPropagation()} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o chat "{chat.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(chat.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
};