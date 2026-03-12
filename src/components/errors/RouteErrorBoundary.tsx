import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AppErrorBoundary } from "./AppErrorBoundary";

type RouteErrorBoundaryProps = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export const RouteErrorBoundary = ({
  children,
  title,
  description,
}: RouteErrorBoundaryProps) => {
  const location = useLocation();

  return (
    <AppErrorBoundary
      resetKey={location.pathname}
      title={title}
      description={description}
    >
      {children}
    </AppErrorBoundary>
  );
};
