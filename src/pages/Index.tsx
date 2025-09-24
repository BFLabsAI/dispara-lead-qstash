"use client";

import { Navigate } from "react-router-dom";
import Dashboard from "./Dashboard";

const Index = () => {
  return <Navigate to="/dashboard" replace />;
};

export default Index;