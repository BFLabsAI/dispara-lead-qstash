"use client";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  extra?: React.ReactNode;
}

export const PageHeader = ({ title, subtitle, extra }: PageHeaderProps) => {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>
      </div>
      {extra && <div>{extra}</div>}
    </div>
  );
};