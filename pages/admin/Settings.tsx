
import React from 'react';
import { useAppContext, THEMES } from '../../context/AppContext';
import { Check, Monitor, Palette, Sliders, RefreshCw, Image as ImageIcon, Upload, Trash2, Type, FileText } from 'lucide-react';
import type { ThemeId } from '../../types';

const Settings: React.FC = () => {
    const { state, dispatch } = useAppContext();

    const handleThemeChange = (themeId: ThemeId) => {
        dispatch({ type: 'SET_THEME', payload: themeId });
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
    
    // Helper to allow looping through the static themes plus the dynamic custom one for the cards
    const allThemesDisplay = [
        ...Object.values(THEMES).filter(t => t.id !== 'custom'),
        state.customTheme // Use the state version of custom theme for the card display
    ];

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Palette className="h-8 w-8 text-brand-600" />
                Definições e Aparência
            </h2>

            {/* Visual Identity / Logo Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                            <ImageIcon size={32} />
                        </div>
                        <div className="ml-6">
                            <h3 className="text-xl font-bold text-gray-900">Identidade Visual</h3>
                            <p className="text-gray-500">Defina o logótipo que será apresentado na página de login e na pesquisa de certificados.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                         <div className="w-full md:w-auto flex-shrink-0">
                            <div className="h-32 w-full md:w-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden group hover:border-brand-400 transition-colors">
                                {state.appLogo ? (
                                    <>
                                        <img src={state.appLogo} alt="Logo da App" className="h-full w-full object-contain p-2" />
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
                            <div className="flex items-center gap-3">
                                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Escolher Ficheiro...
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                                <span className="text-xs text-gray-500">PNG, JPG, SVG (Max. 2MB)</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Este logótipo substituirá o ícone padrão nas páginas públicas. Recomendamos uma imagem com fundo transparente.
                            </p>
                         </div>
                    </div>
                </div>
            </div>

            {/* Public Portal Content Section */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                            <Type size={32} />
                        </div>
                        <div className="ml-6">
                            <h3 className="text-xl font-bold text-gray-900">Conteúdo do Portal Público</h3>
                            <p className="text-gray-500">Personalize os textos principais apresentados aos participantes.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <Type className="h-4 w-4" /> Título Principal
                        </label>
                        <input
                            type="text"
                            value={state.portalTitle}
                            onChange={(e) => handlePortalTextUpdate('title', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm p-2.5 border"
                            placeholder="Ex: Portal de Certificados"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Subtítulo / Descrição
                        </label>
                        <textarea
                            rows={3}
                            value={state.portalSubtitle}
                            onChange={(e) => handlePortalTextUpdate('subtitle', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 sm:text-sm p-2.5 border"
                            placeholder="Instruções para o utilizador encontrar o seu certificado..."
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
                            <h3 className="text-xl font-bold text-gray-900">Tema da Aplicação</h3>
                            <p className="text-gray-500">Personalize a aparência do portal público e do painel de administração.</p>
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
                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                                }`}
                            >
                                {/* Color Preview Header */}
                                <div 
                                    className="h-24 w-full flex items-center justify-center relative"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${theme.colors[600]} 0%, ${theme.colors[700]} 100%)` 
                                    }}
                                >
                                    {theme.id === 'custom' && (
                                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                            <Sliders className="text-white/30 h-12 w-12" />
                                        </div>
                                    )}
                                    {state.currentTheme === theme.id && (
                                        <div className="bg-white/20 backdrop-blur-md rounded-full p-2 animate-fadeIn z-10">
                                            <Check className="text-white h-6 w-6" />
                                        </div>
                                    )}
                                </div>
                                
                                {/* Info Footer */}
                                <div className="p-4 bg-white flex-1 w-full">
                                    <h4 className="font-bold text-gray-900 text-sm">{theme.name}</h4>
                                    <div className="flex mt-3 gap-1">
                                        <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.colors[50] }} title="Fundo (50)"></div>
                                        <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.colors[500] }} title="Primária (500)"></div>
                                        <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: theme.colors[700] }} title="Escura (700)"></div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Theme Editor - Only shows if 'custom' is active */}
            {state.currentTheme === 'custom' && (
                <div className="bg-white rounded-lg shadow overflow-hidden border border-brand-200 animate-fadeIn">
                    <div className="p-4 border-b border-gray-100 bg-brand-50 flex justify-between items-center">
                        <h3 className="font-semibold text-brand-900 flex items-center gap-2">
                            <Sliders className="h-5 w-5" />
                            Configuração de Cores Personalizadas
                        </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {(['50', '100', '500', '600', '700'] as const).map((shade) => (
                            <div key={shade} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Tom {shade} 
                                    {shade === '50' && <span className="text-xs text-gray-400 block font-normal">Fundo Claro</span>}
                                    {shade === '100' && <span className="text-xs text-gray-400 block font-normal">Fundo Elementos</span>}
                                    {shade === '500' && <span className="text-xs text-gray-400 block font-normal">Cor Principal</span>}
                                    {shade === '600' && <span className="text-xs text-gray-400 block font-normal">Hover / Ação</span>}
                                    {shade === '700' && <span className="text-xs text-gray-400 block font-normal">Texto Escuro</span>}
                                </label>
                                <div className="flex items-center space-x-2">
                                    <div className="h-10 w-10 rounded-lg border border-gray-200 overflow-hidden shadow-sm flex-shrink-0 relative">
                                        <input 
                                            type="color" 
                                            value={state.customTheme.colors[shade]}
                                            onChange={(e) => handleCustomColorChange(shade, e.target.value)}
                                            className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0"
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={state.customTheme.colors[shade]}
                                        onChange={(e) => handleCustomColorChange(shade, e.target.value)}
                                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 uppercase font-mono"
                                        maxLength={7}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-50 px-6 py-4">
                        <p className="text-sm text-gray-500 flex items-center">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            As alterações são aplicadas instantaneamente em toda a aplicação.
                        </p>
                    </div>
                </div>
            )}
            
            <div className="mt-8 p-4 bg-brand-50 rounded-lg border border-brand-100">
                <h4 className="font-semibold text-brand-700 mb-2">Pré-visualização de Elementos</h4>
                <div className="flex gap-4 flex-wrap items-center">
                    <button className="px-4 py-2 bg-brand-600 text-white rounded-lg shadow hover:bg-brand-700 transition">
                        Botão Primário
                    </button>
                    <button className="px-4 py-2 bg-white text-brand-600 border border-brand-600 rounded-lg hover:bg-brand-50 transition">
                        Botão Secundário
                    </button>
                    <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium flex items-center">
                        Badge
                    </span>
                    <div className="h-10 w-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shadow">
                        A
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
