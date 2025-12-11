
import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Login: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate against the current user in state
        if (email === state.currentUser.email && password === state.currentUser.password) {
            dispatch({ type: 'LOGIN' });
        } else {
            setError('Credenciais inválidas. Tente novamente.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="bg-brand-100 p-3 rounded-full w-fit mx-auto mb-4">
                             <Lock className="h-8 w-8 text-brand-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mt-2">Acesso Reservado</h1>
                        <p className="text-gray-500 mt-2">Faça login para gerir os eventos e certificados.</p>
                    </div>
                    
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-600 rounded-lg text-sm flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 block w-full px-4 py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 block w-full px-4 py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition"
                        >
                            Entrar
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </button>
                    </form>
                     <button
                        onClick={() => window.location.hash = '/'}
                        className="text-sm text-gray-500 hover:text-brand-600 mt-4 block text-center w-full bg-transparent border-none p-0 cursor-pointer underline"
                    >
                        Voltar ao site público
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
