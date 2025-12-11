
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Calendar, Award, User, LogOut, Menu, X, UserCircle, Settings as SettingsIcon } from 'lucide-react';
import Events from './Events';
import Templates from './Templates';
import Profile from './Profile';
import Settings from './Settings';

type AdminPage = 'events' | 'templates' | 'profile' | 'settings';

const AdminLayout: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [currentPage, setCurrentPage] = useState<AdminPage>('events');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        dispatch({ type: 'LOGOUT' });
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'events':
                return <Events />;
            case 'templates':
                return <Templates />;
            case 'profile':
                return <Profile />;
            case 'settings':
                return <Settings />;
            default:
                return <Events />;
        }
    };

    const NavLink: React.FC<{
        icon: React.ElementType;
        label: string;
        page: AdminPage;
    }> = ({ icon: Icon, label, page }) => (
        <button
            onClick={() => {
                setCurrentPage(page);
                setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                currentPage === page
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
        >
            <Icon className="mr-3 h-5 w-5" />
            <span>{label}</span>
        </button>
    );

    const sidebarContent = (
         <div className="flex flex-col h-full">
            <div className="px-4 py-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Award className="text-brand-500" />
                    CertifyPro
                </h1>
                <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
            </div>
            
            <div className="px-4 pb-6 mb-2 border-b border-gray-700">
                <div className="flex items-center">
                    <div className="bg-brand-500 rounded-full p-2 mr-3">
                        <UserCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{state.currentUser.name}</p>
                        <p className="text-xs text-gray-400 truncate">{state.currentUser.email}</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-2 space-y-1">
                <NavLink icon={Calendar} label="Eventos" page="events" />
                <NavLink icon={Award} label="Modelos de Certificados" page="templates" />
                <NavLink icon={User} label="O Meu Perfil" page="profile" />
                <div className="pt-4 mt-4 border-t border-gray-700">
                    <NavLink icon={SettingsIcon} label="Definições & Temas" page="settings" />
                </div>
            </nav>
            <div className="px-2 py-4">
                 <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span>Sair</span>
                </button>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen bg-gray-100">
             {/* Mobile Sidebar */}
            <div className={`fixed inset-0 z-40 flex md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}>
                <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsSidebarOpen(false)}></div>
                <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800 text-white">
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                        <button onClick={() => setIsSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                            <X className="h-6 w-6 text-white" />
                        </button>
                    </div>
                   {sidebarContent}
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:flex-shrink-0">
                <div className="flex flex-col w-64 bg-gray-800 text-white">
                    {sidebarContent}
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between items-center p-4 bg-white border-b border-gray-200 md:hidden">
                    <h1 className="text-xl font-bold">Admin</h1>
                    <button onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </button>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
