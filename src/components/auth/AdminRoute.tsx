import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '@/services/supabaseClient';
import { useAdminStore } from '@/store/adminStore';

export const AdminRoute = () => {
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const location = useLocation();
    const resetAdminContext = useAdminStore((state) => state.resetAdminContext);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            if (!user) {
                resetAdminContext();
                setIsAdmin(false);
                return;
            }

            const { data: profile } = await supabase
                .from('users_dispara_lead_saas_02')
                .select('is_super_admin')
                .eq('id', user.id)
                .single();

            if (!profile?.is_super_admin) {
                resetAdminContext();
            }

            setIsAdmin(!!profile?.is_super_admin);
        };

        checkAdmin();
    }, []);

    if (isAdmin === null) {
        return <div className="flex items-center justify-center h-screen">Verificando permissões...</div>;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }

    return <Outlet />;
};
