
import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const Login: React.FC = () => {
    const { dispatch } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError('Credenciais inválidas ou erro na ligação ao Supabase.');
                console.error(authError);
            } else if (data.user) {
                dispatch({ 
                    type: 'LOGIN', 
                    payload: { 
                        name: data.user.user_metadata.full_name || 'Administrador', 
                        email: data.user.email!, 
                        password: '' 
                    } 
                });
            }
        } catch (err) {
            setError('Ocorreu um erro inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-2xl border border-white">
                    <div className="text-center mb-8">
                        <div className="bg-brand-100 p-3 rounded-full w-fit mx-auto mb-4">
                            <Lock className="h-8 w-8 text-brand-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mt-2">Cloud Auth</h1>
                        <p className="text-gray-500 mt-2">Protegido por Supabase Authentication.</p>
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
                                placeholder="seu@email.com"
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
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                                <>
                                    Entrar com Supabase
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </button>
                    </form>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => window.location.hash = '/'}
                            className="text-sm text-gray-500 hover:text-brand-600 block text-center w-full bg-transparent border-none p-0 cursor-pointer underline"
                        >
                            Voltar ao site público
                        </button>
                    </div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-6">
                    Nota: Precisa de configurar a URL e API Key do Supabase no ficheiro lib/supabase.ts
                </p>
            </div>
        </div>
    );
};

export default Login;
