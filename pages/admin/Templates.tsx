
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Category, Template } from '../../types';
import { Plus, Edit, Trash2, X, Eye, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';
import RichTextEditor from '../../components/RichTextEditor';

const Templates: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [categoryName, setCategoryName] = useState('');

    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
    const [templateToPreview, setTemplateToPreview] = useState<Template | null>(null);
    
    const [templateName, setTemplateName] = useState('');
    const [templateCategory, setTemplateCategory] = useState('');
    const [templateImage, setTemplateImage] = useState<string>('');
    const [templateText, setTemplateText] = useState('<div style="text-align: center;"><font size="5">Certificamos que</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">participou no evento.</font></div>');

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [deleteConfig, setDeleteConfig] = useState<{
        isOpen: boolean;
        type: 'category' | 'template' | null;
        id: string | null;
        title: string;
        message: string;
    }>({
        isOpen: false,
        type: null,
        id: null,
        title: '',
        message: ''
    });

    const AVAILABLE_VARIABLES = ['{{PARTICIPANT_NAME}}', '{{EVENT_NAME}}', '{{DATE}}'];

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const payload = {
                ...(currentCategory?.id ? { id: currentCategory.id } : {}),
                name: categoryName
            };
            
            const { data, error } = await supabase
                .from('categories')
                .upsert(payload)
                .select()
                .single();

            if (error) throw error;

            const normalized: Category = { id: String(data.id), name: data.name };

            if (currentCategory) {
                dispatch({ type: 'UPDATE_CATEGORY', payload: normalized });
            } else {
                dispatch({ type: 'ADD_CATEGORY', payload: normalized });
            }
            setIsCategoryModalOpen(false);
            setCategoryName('');
        } catch (err: any) {
            console.error("Erro Categoria:", err);
            alert("Erro ao guardar categoria: " + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleTemplateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!templateCategory || !templateImage) {
            setErrorMessage("Selecione categoria e imagem.");
            return;
        }

        setIsActionLoading(true);
        setErrorMessage('');
        try {
            const payload = {
                ...(currentTemplate?.id ? { id: currentTemplate.id } : {}),
                name: templateName,
                category_id: templateCategory,
                background_image: templateImage,
                text_content: templateText
            };

            const { data, error } = await supabase
                .from('templates')
                .upsert(payload)
                .select()
                .single();

            if (error) throw error;

            const localPayload: Template = {
                id: String(data.id),
                name: data.name,
                categoryId: String(data.category_id),
                backgroundImage: data.background_image,
                text: data.text_content
            };

            if (currentTemplate) {
                dispatch({ type: 'UPDATE_TEMPLATE', payload: localPayload });
            } else {
                dispatch({ type: 'ADD_TEMPLATE', payload: localPayload });
            }
            setIsTemplateModalOpen(false);
            setSuccessMessage("Modelo guardado com sucesso!");
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const confirmDeleteAction = async () => {
        const { type, id } = deleteConfig;
        if (!id || !type) return;
        setIsActionLoading(true);
        try {
            const table = type === 'category' ? 'categories' : 'templates';
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;

            if (type === 'category') dispatch({ type: 'DELETE_CATEGORY', payload: id });
            else dispatch({ type: 'DELETE_TEMPLATE', payload: id });
        } catch (err: any) {
            alert("Erro ao apagar: " + err.message);
        } finally {
            setIsActionLoading(false);
            setDeleteConfig({ ...deleteConfig, isOpen: false });
        }
    };

    return (
        <div className="space-y-10">
            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Categorias</h2>
                    <button onClick={() => { setCurrentCategory(null); setCategoryName(''); setIsCategoryModalOpen(true); }} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md">
                        <Plus size={20}/> Nova Categoria
                    </button>
                </div>
                <div className="bg-white rounded-xl shadow overflow-hidden divide-y">
                    {state.categories.map(cat => (
                        <div key={cat.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                            <span className="font-medium text-gray-800">{cat.name}</span>
                            <div className="flex gap-1">
                                <button onClick={() => { setCurrentCategory(cat); setCategoryName(cat.name); setIsCategoryModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-600 transition" title="Editar"><Edit size={18}/></button>
                                <button onClick={() => setDeleteConfig({ isOpen: true, type: 'category', id: cat.id, title: 'Apagar Categoria', message: 'Deseja remover esta categoria? Modelos associados poderão ficar órfãos.' })} className="p-2 text-gray-400 hover:text-red-600 transition" title="Apagar"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {state.categories.length === 0 && (
                        <div className="p-12 text-center text-gray-400 italic bg-gray-50/50">Nenhuma categoria cadastrada.</div>
                    )}
                </div>
            </section>

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Modelos</h2>
                    <button onClick={() => { 
                        setCurrentTemplate(null); 
                        setTemplateName(''); 
                        setTemplateCategory(''); 
                        setTemplateImage('');
                        setTemplateText('<div style="text-align: center;"><font size="5">Certificamos que</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">participou no evento.</font></div>');
                        setIsTemplateModalOpen(true); 
                    }} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition">
                        <Plus size={20}/> Novo Modelo
                    </button>
                </div>
                {successMessage && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2 animate-fadeIn"><CheckCircle size={20}/>{successMessage}</div>}
                <div className="bg-white rounded-xl shadow overflow-hidden divide-y">
                    {state.templates.map(tpl => (
                        <div key={tpl.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                            <div>
                                <p className="font-bold text-gray-900">{tpl.name}</p>
                                <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest mt-0.5">
                                    {state.categories.find(c => String(c.id) === String(tpl.categoryId))?.name || 'Categoria não encontrada'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setTemplateToPreview(tpl); setIsPreviewModalOpen(true); }} className="p-2 text-gray-400 hover:text-indigo-600 transition" title="Visualizar"><Eye size={18}/></button>
                                <button onClick={() => {
                                    setCurrentTemplate(tpl);
                                    setTemplateName(tpl.name);
                                    setTemplateCategory(String(tpl.categoryId));
                                    setTemplateImage(tpl.backgroundImage);
                                    setTemplateText(tpl.text);
                                    setIsTemplateModalOpen(true);
                                }} className="p-2 text-gray-400 hover:text-brand-600 transition" title="Editar"><Edit size={18}/></button>
                                <button onClick={() => setDeleteConfig({ isOpen: true, type: 'template', id: tpl.id, title: 'Apagar Modelo', message: 'Deseja remover este modelo permanentemente?' })} className="p-2 text-gray-400 hover:text-red-600 transition" title="Apagar"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {state.templates.length === 0 && (
                        <div className="p-12 text-center text-gray-400 italic bg-gray-50/50">Nenhum modelo configurado.</div>
                    )}
                </div>
            </section>

            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-scaleIn">
                        <h3 className="text-2xl font-black mb-6 text-gray-900">{currentCategory ? 'Editar' : 'Nova'} Categoria</h3>
                        <form onSubmit={handleCategorySubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome da Categoria</label>
                                <input type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Ex: Orador, Participante..." required className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 transition outline-none font-medium" />
                            </div>
                            <div className="flex justify-end gap-2 pt-6">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-black shadow-lg hover:bg-brand-700 transition flex justify-center items-center">
                                    {isActionLoading ? <Loader2 className="animate-spin h-5 w-5"/> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
                    <div className="bg-white rounded-3xl w-full max-w-5xl h-full flex flex-col overflow-hidden shadow-2xl animate-scaleIn">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{currentTemplate ? 'Editar' : 'Novo'} Modelo de Certificado</h3>
                                <p className="text-xs text-gray-500 font-medium">Configure a aparência e o conteúdo dinâmico.</p>
                            </div>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X/></button>
                        </div>
                        <form onSubmit={handleTemplateSubmit} className="flex-1 overflow-auto p-8 space-y-8">
                            {errorMessage && <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold animate-fadeIn">{errorMessage}</div>}
                            
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificação do Modelo</label>
                                    <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ex: Modelo Geral 2024" required className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 transition outline-none font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria Vinculada</label>
                                    <select value={templateCategory} onChange={e => setTemplateCategory(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 transition outline-none bg-white font-medium">
                                        <option value="">Selecione uma categoria...</option>
                                        {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Editor de Conteúdo</label>
                                <RichTextEditor value={templateText} onChange={setTemplateText} variables={AVAILABLE_VARIABLES} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Layout de Fundo (PNG/JPG HD)</label>
                                <div className="flex flex-col sm:flex-row gap-4 items-start">
                                    <label className="flex-1 w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-brand-500 hover:bg-brand-50/50 transition cursor-pointer bg-gray-50 group">
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setTemplateImage(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                        <Plus className="mx-auto text-gray-300 group-hover:text-brand-500 transition mb-2" />
                                        <p className="text-sm font-bold text-gray-500">{templateImage ? 'Alterar Imagem de Fundo' : 'Escolher Imagem de Fundo'}</p>
                                    </label>
                                    {templateImage && (
                                        <div className="w-full sm:w-60 aspect-[1.41] border rounded-xl overflow-hidden shadow-lg relative group bg-white">
                                            <img src={templateImage} className="h-full w-full object-contain" />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="text-white" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-8 border-t">
                                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-8 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-black flex items-center gap-2 shadow-xl hover:bg-brand-700 transition active:scale-95">
                                    {isActionLoading && <Loader2 className="animate-spin h-5 w-5"/>} Guardar Definições do Modelo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isPreviewModalOpen && templateToPreview && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 backdrop-blur-md" onClick={() => setIsPreviewModalOpen(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl p-4 origin-center transform scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.85] animate-scaleIn" onClick={e => e.stopPropagation()}>
                        <CertificatePreview certificate={{
                            event: { id: 'preview', name: 'Evento de Demonstração', date: new Date().toISOString() },
                            participant: { id: 'preview', name: 'Nome Exemplo do Participante', email: 'exemplo@portal.com', eventId: 'p', categoryId: templateToPreview.categoryId },
                            template: templateToPreview
                        }} />
                        <button onClick={() => setIsPreviewModalOpen(false)} className="absolute -top-16 -right-16 p-4 bg-white rounded-full shadow-2xl text-gray-900 hover:text-red-600 transition hover:rotate-90">
                            <X size={32}/>
                        </button>
                    </div>
                </div>
            )}

            {deleteConfig.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-scaleIn">
                        <div className="bg-red-50 text-red-500 p-5 rounded-full w-fit mx-auto mb-6">
                            <AlertTriangle size={44} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900">{deleteConfig.title}</h3>
                        <p className="text-sm text-gray-500 my-4 leading-relaxed font-medium">{deleteConfig.message}</p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">Não, Cancelar</button>
                            <button onClick={confirmDeleteAction} disabled={isActionLoading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black shadow-lg hover:bg-red-700 transition">
                                {isActionLoading ? <Loader2 className="animate-spin mx-auto h-5 w-5"/> : 'Sim, Apagar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Templates;
