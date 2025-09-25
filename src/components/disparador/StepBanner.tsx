"use client";

import { type ReactNode } from 'react';

interface StepBannerProps {
  step: number;
  icon: ReactNode;
  title: string;
  description: string;
}

export const StepBanner = ({ step, icon, title, description }: StepBannerProps) => {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground font-bold text-xl">
        {step}
      </div>
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};