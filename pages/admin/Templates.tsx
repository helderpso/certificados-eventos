
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
            const catData = {
                id: currentCategory?.id || crypto.randomUUID(),
                name: categoryName
            };
            
            console.log("Supabase: A gravar categoria...", catData);
            const { error } = await supabase.from('categories').upsert(catData);
            if (error) throw error;

            if (currentCategory) {
                dispatch({ type: 'UPDATE_CATEGORY', payload: catData });
            } else {
                dispatch({ type: 'ADD_CATEGORY', payload: catData });
            }
            setIsCategoryModalOpen(false);
            console.log("Supabase: Categoria gravada com sucesso.");
        } catch (err: any) {
            console.error("Supabase: Erro ao gravar categoria.", err);
            alert("Erro ao guardar categoria: " + err.message + ". Verifique as políticas de RLS no Supabase.");
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
        try {
            const tplData = {
                id: currentTemplate?.id || crypto.randomUUID(),
                name: templateName,
                category_id: templateCategory,
                background_image: templateImage,
                text_content: templateText
            };

            const { error } = await supabase.from('templates').upsert(tplData);
            if (error) throw error;

            const localPayload: Template = {
                id: tplData.id,
                name: tplData.name,
                categoryId: tplData.category_id,
                backgroundImage: tplData.background_image,
                text: tplData.text_content
            };

            if (currentTemplate) {
                dispatch({ type: 'UPDATE_TEMPLATE', payload: localPayload });
            } else {
                dispatch({ type: 'ADD_TEMPLATE', payload: localPayload });
            }
            setIsTemplateModalOpen(false);
            setSuccessMessage("Modelo guardado!");
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
                        <div key={cat.id} className="p-4 flex justify-between items-center">
                            <span className="font-medium">{cat.name}</span>
                            <div className="flex gap-1">
                                <button onClick={() => { setCurrentCategory(cat); setCategoryName(cat.name); setIsCategoryModalOpen(true); }} className="p-2 text-gray-500 hover:text-brand-600"><Edit size={18}/></button>
                                <button onClick={() => setDeleteConfig({ isOpen: true, type: 'category', id: cat.id, title: 'Apagar Categoria', message: 'Isto pode afetar modelos associados.' })} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {state.categories.length === 0 && (
                        <div className="p-8 text-center text-gray-400 italic">Nenhuma categoria encontrada na base de dados.</div>
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
                    }} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md">
                        <Plus size={20}/> Novo Modelo
                    </button>
                </div>
                {successMessage && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2"><CheckCircle size={20}/>{successMessage}</div>}
                <div className="bg-white rounded-xl shadow overflow-hidden divide-y">
                    {state.templates.map(tpl => (
                        <div key={tpl.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold">{tpl.name}</p>
                                <p className="text-xs text-gray-500">{state.categories.find(c => c.id === tpl.categoryId)?.name}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setTemplateToPreview(tpl); setIsPreviewModalOpen(true); }} className="p-2 text-gray-500 hover:text-indigo-600"><Eye size={18}/></button>
                                <button onClick={() => {
                                    setCurrentTemplate(tpl);
                                    setTemplateName(tpl.name);
                                    setTemplateCategory(tpl.categoryId);
                                    setTemplateImage(tpl.backgroundImage);
                                    setTemplateText(tpl.text);
                                    setIsTemplateModalOpen(true);
                                }} className="p-2 text-gray-500 hover:text-brand-600"><Edit size={18}/></button>
                                <button onClick={() => setDeleteConfig({ isOpen: true, type: 'template', id: tpl.id, title: 'Apagar Modelo', message: 'Remover este modelo permanentemente?' })} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {state.templates.length === 0 && (
                        <div className="p-8 text-center text-gray-400 italic">Nenhum modelo configurado.</div>
                    )}
                </div>
            </section>

            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">{currentCategory ? 'Editar' : 'Nova'} Categoria</h3>
                        <form onSubmit={handleCategorySubmit} className="space-y-4">
                            <input type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Ex: Palestrante" required className="w-full border rounded-lg p-2.5" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="px-4 py-2 bg-brand-600 text-white rounded-lg min-w-[100px] flex justify-center">
                                    {isActionLoading ? <Loader2 className="animate-spin h-5 w-5"/> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold">{currentTemplate ? 'Editar' : 'Novo'} Modelo</h3>
                            <button onClick={() => setIsTemplateModalOpen(false)}><X/></button>
                        </div>
                        <form onSubmit={handleTemplateSubmit} className="flex-1 overflow-auto p-6 space-y-6">
                            {errorMessage && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg">{errorMessage}</div>}
                            <div className="grid md:grid-cols-2 gap-4">
                                <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nome do Modelo" required className="border p-2.5 rounded-lg" />
                                <select value={templateCategory} onChange={e => setTemplateCategory(e.target.value)} required className="border p-2.5 rounded-lg">
                                    <option value="">Categoria...</option>
                                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <RichTextEditor value={templateText} onChange={setTemplateText} variables={AVAILABLE_VARIABLES} />
                            <div>
                                <p className="text-sm font-medium mb-2">Imagem de Fundo (PNG/JPG)</p>
                                <input type="file" accept="image/*" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setTemplateImage(reader.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }} className="text-sm" />
                                {templateImage && <img src={templateImage} className="mt-2 h-32 border rounded"/>}
                            </div>
                            <div className="flex justify-end gap-2 border-t pt-4">
                                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-6 py-2 bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="px-6 py-2 bg-brand-600 text-white rounded-lg flex items-center gap-2">
                                    {isActionLoading && <Loader2 className="animate-spin h-5 w-5"/>} Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isPreviewModalOpen && templateToPreview && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={() => setIsPreviewModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-4 scale-50 md:scale-75 lg:scale-90" onClick={e => e.stopPropagation()}>
                        <CertificatePreview certificate={{
                            event: { id: crypto.randomUUID(), name: 'Evento Demo', date: new Date().toISOString() },
                            participant: { id: crypto.randomUUID(), name: 'Nome do Participante', email: 'a@a.pt', eventId: 'p', categoryId: templateToPreview.categoryId },
                            template: templateToPreview
                        }} />
                    </div>
                </div>
            )}

            {deleteConfig.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
                        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="font-bold">{deleteConfig.title}</h3>
                        <p className="text-sm text-gray-500 my-2">{deleteConfig.message}</p>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} className="flex-1 py-2 bg-gray-100 rounded-lg">Não</button>
                            <button onClick={confirmDeleteAction} disabled={isActionLoading} className="flex-1 py-2 bg-red-600 text-white rounded-lg">
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
