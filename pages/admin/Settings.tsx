
import React, { useState } from 'react';
import { useAppContext, THEMES } from '../../context/AppContext';
import { Check, Monitor, Palette, Sliders, RefreshCw, Image as ImageIcon, Upload, Trash2, Type, FileText, Save, Loader2 } from 'lucide-react';
import type { ThemeId, ThemeConfig } from '../../types';
import { supabase } from '../../lib/supabase';

const Settings: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleThemeChange = (themeId: ThemeId) => {
        dispatch({ type: 'UPDATE_THEME', payload: themeId });
    };

    const handleCustomColorChange = (shade: '50' | '100' | '500' | '600' | '700', value: string) => {
        dispatch({
            type: 'UPDATE_CUSTOM_THEME',
            payload: { [shade]: value }
        });
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                dispatch({ type: 'UPDATE_LOGO', payload: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        dispatch({ type: 'UPDATE_LOGO', payload: '' });
    };

    const handlePortalTextUpdate = (field: 'title' | 'subtitle', value: string) => {
        dispatch({
            type: 'UPDATE_PORTAL_TEXT',
            payload: { [field]: value }
        });
    };

    const handleSaveToCloud = async () => {
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Sessão expirada. Por favor, faça login novamente.");

            // Criamos o objeto de dados dinamicamente
            const settingsData: any = {
                user_id: user.id,
                portal_title: state.portalTitle,
                portal_subtitle: state.portalSubtitle,
                current_theme: state.currentTheme,
                app_logo: state.appLogo,
                custom_colors: state.customTheme.colors
            };

            const { error } = await supabase
                .from('app_settings')
                .upsert(settingsData, { onConflict: 'user_id' });

            if (error) throw error;

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error("Erro detalhado:", err);
            const msg = err.message || "Erro desconhecido";
            alert(`Erro ao guardar: ${msg}. Certifique-se que executou o SQL de atualização no painel do Supabase para adicionar as colunas em falta.`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const allThemesDisplay = [
        ...(Object.values(THEMES) as ThemeConfig[]).filter(t => t.id !== 'custom'),
        state.customTheme 
    ];

    return (
        <div className="max-w-4xl mx-auto pb-20 relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <Palette className="h-8 w-8 text-brand-600" />
                    Definições e Aparência
                </h2>
                <button 
                    onClick={handleSaveToCloud}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold shadow-lg transition-all ${
                        saveSuccess 
                        ? 'bg-green-500 text-white' 
                        : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
                    } disabled:opacity-50`}
                >
                    {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : saveSuccess ? <Check className="h-5 w-5" /> : <Save className="h-5 w-5" />}
                    {isSaving ? 'A Guardar...' : saveSuccess ? 'Guardado!' : 'Guardar Alterações'}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                            <ImageIcon size={32} />
                        </div>
                        <div className="ml-6">
                            <h3 className="text-xl font-bold text-gray-900">Identidade Visual</h3>
                            <p className="text-gray-500">O logótipo configurado será visível para todos os utilizadores.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                         <div className="w-full md:w-auto flex-shrink-0">
                            <div className="h-32 w-full md:w-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden group hover:border-brand-400 transition-colors">
                                {state.appLogo ? (
                                    <>
                                        <img src={state.appLogo} alt="Logo" className="h-full w-full object-contain p-2" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={handleRemoveLogo} className="bg-white text-red-600 p-2 rounded-full shadow-lg hover:bg-red-50" title="Remover Logo">
                                                <Trash2 size={20} />
                                             </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                        <p className="text-xs text-gray-500">Sem logo definido</p>
                                    </div>
                                )}
                            </div>
                         </div>
                         <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Carregar Logótipo</label>
                            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                <Upload className="h-4 w-4 mr-2" />
                                Escolher Imagem
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </label>
                            <p className="mt-2 text-xs text-gray-400">Recomendado: PNG transparente ou SVG.</p>
                         </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                            <Type size={32} />
                        </div>
                        <div className="ml-6">
                            <h3 className="text-xl font-bold text-gray-900">Conteúdo do Portal Público</h3>
                            <p className="text-gray-500">Textos que os participantes verão ao procurar certificados.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título Principal</label>
                        <input
                            type="text"
                            value={state.portalTitle}
                            onChange={(e) => handlePortalTextUpdate('title', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm p-2.5 border focus:ring-brand-500 focus:border-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo / Descrição</label>
                        <textarea
                            rows={3}
                            value={state.portalSubtitle}
                            onChange={(e) => handlePortalTextUpdate('subtitle', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm p-2.5 border focus:ring-brand-500 focus:border-brand-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                            <Monitor size={32} />
                        </div>
                        <div className="ml-6">
                            <h3 className="text-xl font-bold text-gray-900">Esquema de Cores</h3>
                            <p className="text-gray-500">A cor selecionada será aplicada em todos os dispositivos.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                        {allThemesDisplay.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => handleThemeChange(theme.id)}
                                className={`relative group flex flex-col rounded-xl border-2 transition-all duration-200 overflow-hidden text-left ${
                                    state.currentTheme === theme.id
                                        ? 'border-brand-600 ring-2 ring-brand-600 ring-opacity-50 scale-105 shadow-lg'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div 
                                    className="h-20 w-full flex items-center justify-center"
                                    style={{ background: `linear-gradient(135deg, ${theme.colors[600]} 0%, ${theme.colors[700]} 100%)` }}
                                >
                                    {state.currentTheme === theme.id && <Check className="text-white h-6 w-6" />}
                                </div>
                                <div className="p-3 bg-white">
                                    <h4 className="font-bold text-gray-900 text-xs">{theme.name}</h4>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {state.currentTheme === 'custom' && (
                <div className="bg-white rounded-lg shadow overflow-hidden border border-brand-200 animate-fadeIn mb-10 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Ajuste Fino de Cores</h3>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {(['50', '100', '500', '600', '700'] as const).map((shade) => (
                            <div key={shade}>
                                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Shade {shade}</label>
                                <input 
                                    type="color" 
                                    value={state.customTheme.colors[shade]}
                                    onChange={(e) => handleCustomColorChange(shade, e.target.value)}
                                    className="w-full h-10 rounded cursor-pointer border-0 p-0"
                                />
                                <input 
                                    type="text" 
                                    value={state.customTheme.colors[shade]}
                                    onChange={(e) => handleCustomColorChange(shade, e.target.value)}
                                    className="w-full mt-1 text-[10px] text-center font-mono border-gray-200 rounded p-1"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="fixed bottom-6 right-6 z-40">
                <button 
                    onClick={handleSaveToCloud}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-4 bg-brand-600 text-white rounded-full font-bold shadow-2xl hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="animate-spin h-6 w-6" /> : saveSuccess ? <Check className="h-6 w-6" /> : <Save className="h-6 w-6" />}
                    {isSaving ? 'A Sincronizar...' : saveSuccess ? 'Definições Guardadas!' : 'Guardar e Sincronizar'}
                </button>
            </div>
        </div>
    );
};

export default Settings;
