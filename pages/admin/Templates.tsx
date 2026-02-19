
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Category, Template } from '../../types';
import { Plus, Edit, Trash2, X, Eye, CheckCircle, AlertTriangle, Loader2, Calendar } from 'lucide-react';
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
    const [templateEvent, setTemplateEvent] = useState(''); 
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

    // Ordenação alfabética de modelos
    const sortedTemplates = useMemo(() => {
        return [...state.templates].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [state.templates]);

    const AVAILABLE_VARIABLES = [
        '{{PARTICIPANT_NAME}}', 
        '{{EVENT_NAME}}', 
        '{{DATE}}',
        '{{CUSTOM_1}}',
        '{{CUSTOM_2}}',
        '{{CUSTOM_3}}'
    ];

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

            const normalized: Category = { id: String(data.id), name: String(data.name) };

            if (currentCategory) {
                dispatch({ type: 'UPDATE_CATEGORY', payload: normalized });
            } else {
                dispatch({ type: 'ADD_CATEGORY', payload: normalized });
            }
            setIsCategoryModalOpen(false);
            setCategoryName('');
            setSuccessMessage("Categoria salva!");
            setTimeout(() => setSuccessMessage(''), 2000);
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
            setErrorMessage("Selecione categoria e imagem de fundo.");
            return;
        }

        setIsActionLoading(true);
        setErrorMessage('');
        try {
            const payload = {
                ...(currentTemplate?.id ? { id: currentTemplate.id } : {}),
                name: templateName,
                category_id: templateCategory,
                event_id: templateEvent || null, 
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
                eventId: data.event_id ? String(data.event_id) : undefined,
                backgroundImage: data.background_image,
                text: data.text_content
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
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Categorias</h2>
                    <button onClick={() => { setCurrentCategory(null); setCategoryName(''); setIsCategoryModalOpen(true); }} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:bg-brand-700 transition font-bold">
                        <Plus size={20}/> Nova Categoria
                    </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {state.categories.length > 0 ? (
                        state.categories.map(cat => (
                            <div key={cat.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition group">
                                <span className="font-bold text-gray-800">{cat.name}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setCurrentCategory(cat); setCategoryName(cat.name); setIsCategoryModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-600 transition" title="Editar"><Edit size={18}/></button>
                                    <button onClick={() => setDeleteConfig({ isOpen: true, type: 'category', id: cat.id, title: 'Apagar Categoria', message: 'Deseja remover esta categoria? Modelos associados poderão ficar sem identificação.' })} className="p-2 text-gray-400 hover:text-red-600 transition" title="Apagar"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-16 text-center">
                            <AlertTriangle className="mx-auto text-gray-200 mb-2" size={32} />
                            <p className="text-gray-400 font-bold italic">Nenhuma categoria encontrada</p>
                        </div>
                    )}
                </div>
            </section>

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Modelos de Certificados</h2>
                    <button onClick={() => { 
                        setCurrentTemplate(null); 
                        setTemplateName(''); 
                        setTemplateCategory(''); 
                        setTemplateEvent('');
                        setTemplateImage('');
                        setTemplateText('<div style="text-align: center;"><font size="5">Certificamos que</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">participou no evento.</font></div>');
                        setIsTemplateModalOpen(true); 
                    }} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg hover:bg-brand-700 transition font-bold">
                        <Plus size={20}/> Novo Modelo
                    </button>
                </div>
                {successMessage && <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl flex items-center gap-2 animate-fadeIn font-bold shadow-sm"><CheckCircle size={20}/>{successMessage}</div>}
                <div className="grid gap-4">
                    {sortedTemplates.length > 0 ? (
                        sortedTemplates.map(tpl => {
                            const category = state.categories.find(c => String(c.id) === String(tpl.categoryId));
                            const event = state.events.find(e => String(e.id) === String(tpl.eventId));
                            return (
                                <div key={tpl.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                                    <div className="space-y-1">
                                        <p className="font-black text-gray-900 text-lg leading-tight">{tpl.name}</p>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${category ? 'bg-brand-50 text-brand-700 border-brand-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                {category ? category.name : 'CATEGORIA NÃO ENCONTRADA'}
                                            </span>
                                            {event ? (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                                                    <Calendar size={10}/> {event.name}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                                    Global (Todos os Eventos)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setTemplateToPreview(tpl); setIsPreviewModalOpen(true); }} className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition" title="Visualizar"><Eye size={20}/></button>
                                        <button onClick={() => {
                                            setCurrentTemplate(tpl);
                                            setTemplateName(tpl.name);
                                            setTemplateCategory(String(tpl.categoryId));
                                            setTemplateEvent(tpl.eventId ? String(tpl.eventId) : '');
                                            setTemplateImage(tpl.backgroundImage);
                                            setTemplateText(tpl.text);
                                            setIsTemplateModalOpen(true);
                                        }} className="p-2.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition" title="Editar"><Edit size={20}/></button>
                                        <button onClick={() => setDeleteConfig({ isOpen: true, type: 'template', id: tpl.id, title: 'Apagar Modelo', message: 'Deseja remover este modelo permanentemente?' })} className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition" title="Apagar"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-16 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                            <p className="text-gray-400 font-bold italic">Nenhum modelo configurado no sistema.</p>
                        </div>
                    )}
                </div>
            </section>

            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scaleIn">
                        <h3 className="text-2xl font-black mb-6 text-gray-900">{currentCategory ? 'Editar' : 'Nova'} Categoria</h3>
                        <form onSubmit={handleCategorySubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome da Categoria</label>
                                <input type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} placeholder="Ex: Orador, Participante..." required className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-brand-500 transition outline-none font-bold text-gray-800" />
                            </div>
                            <div className="flex justify-end gap-2 pt-6">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black shadow-lg hover:bg-brand-700 transition flex justify-center items-center gap-2">
                                    {isActionLoading ? <Loader2 className="animate-spin h-5 w-5"/> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTemplateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
                    <div className="bg-white rounded-[2rem] w-full max-w-5xl h-full flex flex-col overflow-hidden shadow-2xl animate-scaleIn">
                        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{currentTemplate ? 'Editar' : 'Novo'} Modelo de Certificado</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Design e Conteúdo Dinâmico</p>
                            </div>
                            <button onClick={() => setIsTemplateModalOpen(false)} className="p-3 hover:bg-gray-200 rounded-full transition shadow-sm bg-white"><X/></button>
                        </div>
                        <form onSubmit={handleTemplateSubmit} className="flex-1 overflow-auto p-8 space-y-10">
                            {errorMessage && <div className="p-5 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold animate-fadeIn">{errorMessage}</div>}
                            
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificação do Modelo</label>
                                    <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ex: Modelo Standard Azul" required className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-brand-500 transition outline-none font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria Vinculada</label>
                                    <select value={templateCategory} onChange={e => setTemplateCategory(e.target.value)} required className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-brand-500 transition outline-none bg-white font-bold text-gray-800">
                                        <option value="">Selecione uma categoria...</option>
                                        {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Evento Associado (Opcional)</label>
                                    <select value={templateEvent} onChange={e => setTemplateEvent(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-brand-500 transition outline-none bg-white font-bold text-gray-800">
                                        <option value="">Global (Disponível em todos os eventos)</option>
                                        {state.events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Conteúdo Estruturado (HTML/Variáveis)</label>
                                <RichTextEditor value={templateText} onChange={setTemplateText} variables={AVAILABLE_VARIABLES} />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Layout de Fundo (HD Image)</label>
                                <div className="flex flex-col sm:flex-row gap-6 items-start">
                                    <label className="flex-1 w-full border-4 border-dashed border-gray-100 rounded-3xl p-10 text-center hover:border-brand-400 hover:bg-brand-50/20 transition cursor-pointer bg-gray-50/50 group">
                                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => setTemplateImage(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        }} />
                                        <Plus className="mx-auto text-gray-200 group-hover:text-brand-500 transition mb-4" size={40} />
                                        <p className="text-sm font-black text-gray-500">{templateImage ? 'Alterar Imagem de Fundo' : 'Escolher Fundo (PNG/JPG)'}</p>
                                        <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Recomendado: 2000px+ de largura</p>
                                    </label>
                                    {templateImage && (
                                        <div className="w-full sm:w-80 aspect-[1.41] border-2 border-brand-100 rounded-2xl overflow-hidden shadow-2xl relative group bg-white">
                                            <img src={templateImage} className="h-full w-full object-contain" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="text-white" size={32} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-10 border-t border-gray-100">
                                <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-10 py-4 bg-gray-100 rounded-2xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="px-10 py-4 bg-brand-600 text-white rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-brand-700 transition active:scale-95">
                                    {isActionLoading ? <Loader2 className="animate-spin h-5 w-5"/> : <CheckCircle size={20}/>} Guardar Definições
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isPreviewModalOpen && templateToPreview && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4 backdrop-blur-xl" onClick={() => setIsPreviewModalOpen(false)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl p-4 origin-center transform scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.85] animate-scaleIn border-8 border-white/20" onClick={e => e.stopPropagation()}>
                        <CertificatePreview certificate={{
                            event: { id: 'preview', name: 'Evento de Demonstração', date: new Date().toISOString() },
                            participant: { id: 'preview', name: 'Nome Exemplo do Participante', email: 'exemplo@portal.com', eventId: 'p', categoryId: templateToPreview.categoryId },
                            template: templateToPreview
                        }} />
                        <button onClick={() => setIsPreviewModalOpen(false)} className="absolute -top-16 -right-16 p-5 bg-white rounded-full shadow-2xl text-gray-900 hover:text-red-600 transition hover:rotate-90">
                            <X size={32}/>
                        </button>
                    </div>
                </div>
            )}

            {deleteConfig.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-[2rem] p-10 w-full max-w-sm text-center shadow-2xl animate-scaleIn">
                        <div className="bg-red-50 text-red-500 p-6 rounded-full w-fit mx-auto mb-6">
                            <AlertTriangle size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{deleteConfig.title}</h3>
                        <p className="text-sm text-gray-500 my-4 leading-relaxed font-bold">{deleteConfig.message}</p>
                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                            <button onClick={confirmDeleteAction} disabled={isActionLoading} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 transition">
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
