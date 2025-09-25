import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  number: number;
  title: string;
  subtitle: string;
}

export const SectionHeader = ({ icon: Icon, number, title, subtitle }: SectionHeaderProps) => (
  <div className="flex items-center gap-4 p-4 bg-green-700 text-white rounded-t-xl">
    <Icon className="h-6 w-6" />
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-green-700 font-bold text-lg flex-shrink-0">
      {number}
    </div>
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-green-200 text-sm">{subtitle}</p>
    </div>
  </div>
);