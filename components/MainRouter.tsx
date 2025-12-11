
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import CertificateFinder from '../pages/public/CertificateFinder';
import Login from '../pages/admin/Login';
import AdminLayout from '../pages/admin/AdminLayout';

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
