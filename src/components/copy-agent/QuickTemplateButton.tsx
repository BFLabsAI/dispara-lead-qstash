"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickTemplateButtonProps {
  name: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
}

export const QuickTemplateButton = ({ name, icon: Icon, onClick, className }: QuickTemplateButtonProps) => {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "flex flex-col h-auto py-3 px-2 items-center justify-center text-center text-xs font-medium transition-colors",
        "hover:bg-primary/10 hover:text-primary border-border hover:border-primary/50",
        className
      )}
    >
      <Icon className="h-5 w-5 mb-1 text-primary" />
      <span>{name}</span>
    </Button>
  );
};