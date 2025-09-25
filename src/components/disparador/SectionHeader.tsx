import React from 'react';

interface SectionHeaderProps {
  number: number;
  title: string;
  subtitle: string;
}

export const SectionHeader = ({ number, title, subtitle }: SectionHeaderProps) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
      {number}
    </div>
    <div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  </div>
);