import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';

export const ProtectedRoute = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsAuthenticated(!!session);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (isAuthenticated === null) {
        // Loading state
        return <div className="flex items-center justify-center h-screen">Carregando...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
};
