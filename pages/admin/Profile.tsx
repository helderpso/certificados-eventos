
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Save, User, Mail, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

const Profile: React.FC = () => {
    const { state, dispatch } = useAppContext();
    
    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Feedback state
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (state.currentUser) {
            setName(state.currentUser.name);
            setEmail(state.currentUser.email);
        }
    }, [state.currentUser]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');

        // Basic Validation
        if (!name || !email) {
            setErrorMessage('O nome e o email são obrigatórios.');
            return;
        }

        // Check password match if changing
        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                setErrorMessage('A nova password e a confirmação não coincidem.');
                return;
            }
            if (newPassword.length < 6) {
                setErrorMessage('A nova password deve ter pelo menos 6 caracteres.');
                return;
            }
            // In a real app, verify current password with backend. 
            // Here we check against state for demonstration.
            if (currentPassword !== state.currentUser.password) {
                setErrorMessage('A password atual está incorreta.');
                return;
            }
        }

        // Save
        const updatedUser = {
            name,
            email,
            password: newPassword ? newPassword : state.currentUser.password
        };

        dispatch({ type: 'UPDATE_PROFILE', payload: updatedUser });
        
        setSuccessMessage('Perfil atualizado com sucesso!');
        
        // Reset password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Meu Perfil</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <div className="h-20 w-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                            <User size={40} />
                        </div>
                        <div className="ml-6">
                            <h3 className="text-xl font-bold text-gray-900">{state.currentUser.name}</h3>
                            <p className="text-gray-500">Administrador do Sistema</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center animate-fadeIn">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center animate-fadeIn">
                            <AlertTriangle className="h-5 w-5 mr-2" />
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Personal Information */}
                        <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Informações Pessoais</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
                                            placeholder="O seu nome"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço de Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-colors"
                                            placeholder="admin@exemplo.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b">Segurança e Password</h4>
                            <p className="text-sm text-gray-500 mb-4">Preencha apenas se desejar alterar a sua password atual.</p>
                            
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password Atual</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                            placeholder="Introduza a password atual para confirmar"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nova Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                            placeholder="Nova password"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                            placeholder="Repita a nova password"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
                            >
                                <Save className="h-5 w-5 mr-2" />
                                Guardar Alterações
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
