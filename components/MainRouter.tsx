
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import CertificateFinder from '../pages/public/CertificateFinder';
import Login from '../pages/admin/Login';
import AdminLayout from '../pages/admin/AdminLayout';
import { Loader2, Award } from 'lucide-react';

const MainRouter: React.FC = () => {
    const { state } = useAppContext();
    
    // Helper function to get the current route from the hash, without the '#'
    const getRoute = () => window.location.hash.substring(1) || '/';

    const [route, setRoute] = useState(getRoute());

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(getRoute());
        };

        window.addEventListener('hashchange', handleHashChange, false);

        return () => {
            window.removeEventListener('hashchange', handleHashChange, false);
        };
    }, []);

    // Show a clean loading state while fetching initial data (theme, session, etc.)
    if (state.isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="flex flex-col items-center animate-pulse">
                    <div className="bg-brand-600 p-4 rounded-full mb-4 shadow-lg">
                        <Award className="h-10 w-10 text-white" />
                    </div>
                    <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600 w-1/2 animate-[loading_1.5s_infinite_linear]"></div>
                    </div>
                    <p className="mt-4 text-sm text-gray-500 font-medium">A carregar o seu portal...</p>
                </div>
                <style>{`
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                    }
                `}</style>
            </div>
        );
    }

    if (state.isAuthenticated) {
        return <AdminLayout />;
    }

    switch (route) {
        case '/admin':
            return <Login />;
        case '/':
        default:
            return <CertificateFinder />;
    }
};

export default MainRouter;
