
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Category, Template } from '../../types';
import { Plus, Edit, Trash2, X, Eye, CheckCircle } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';
import RichTextEditor from '../../components/RichTextEditor';

const Templates: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
    const [categoryName, setCategoryName] = useState('');

    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
    const [templateToPreview, setTemplateToPreview] = useState<Template | null>(null);
    
    const [templateName, setTemplateName] = useState('');
    const [templateCategory, setTemplateCategory] = useState('');
    const [templateImage, setTemplateImage] = useState<string>('');
    // Default HTML content for new templates
    const [templateText, setTemplateText] = useState('<div style="text-align: center;"><font size="5">Certificamos que</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">participou com distinção no evento {{EVENT_NAME}} realizado em {{DATE}}.</font></div>');

    const [successMessage, setSuccessMessage] = useState('');

    const AVAILABLE_VARIABLES = ['{{PARTICIPANT_NAME}}', '{{EVENT_NAME}}', '{{DATE}}'];

    // Category Handlers
    const openCategoryModal = (category: Category | null) => {
        setCurrentCategory(category);
        setCategoryName(category?.name || '');
        setIsCategoryModalOpen(true);
    };

    const closeCategoryModal = () => {
        setIsCategoryModalOpen(false);
        setCurrentCategory(null);
        setCategoryName('');
    };

    const handleCategorySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentCategory) {
            dispatch({ type: 'UPDATE_CATEGORY', payload: { ...currentCategory, name: categoryName } });
        } else {
            dispatch({ type: 'ADD_CATEGORY', payload: { id: `cat${Date.now()}`, name: categoryName } });
        }
        closeCategoryModal();
    };

    const deleteCategory = (id: string) => {
        if (window.confirm('Tem a certeza que quer apagar esta categoria?')) {
            dispatch({ type: 'DELETE_CATEGORY', payload: id });
        }
    }

    // Template Handlers
    const openTemplateModal = (template: Template | null) => {
        setCurrentTemplate(template);
        setTemplateName(template?.name || '');
        setTemplateCategory(template?.categoryId || '');
        setTemplateImage(template?.backgroundImage || '');
        if (template?.text) {
             setTemplateText(template.text);
        } else {
             // Default if empty
             setTemplateText('<div style="text-align: center;"><font size="5">Certificamos que</font></div><div style="text-align: center;"><font size="7"><b>{{PARTICIPANT_NAME}}</b></font></div><div style="text-align: center;"><font size="4">participou no evento.</font></div>');
        }
        setIsTemplateModalOpen(true);
    }
    
    const closeTemplateModal = () => {
        setIsTemplateModalOpen(false);
        setCurrentTemplate(null);
    }
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTemplateImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleTemplateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!templateCategory || !templateImage) {
            alert("Por favor, selecione uma categoria e uma imagem de fundo.");
            return;
        }

        const payload: Template = {
            id: currentTemplate?.id || `tpl${Date.now()}`,
            name: templateName,
            categoryId: templateCategory,
            backgroundImage: templateImage,
            text: templateText,
        };

        if (currentTemplate) {
            dispatch({ type: 'UPDATE_TEMPLATE', payload });
        } else {
            dispatch({ type: 'ADD_TEMPLATE', payload });
        }
        closeTemplateModal();
        setSuccessMessage('Modelo guardado com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
    }

    const deleteTemplate = (id: string) => {
        if (window.confirm('Tem a certeza que quer apagar este modelo?')) {
            dispatch({ type: 'DELETE_TEMPLATE', payload: id });
        }
    }

    const openPreview = (template: Template) => {
        setTemplateToPreview(template);
        setIsPreviewModalOpen(true);
    }

    return (
        <div>
            {/* Categories Section */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Categorias</h2>
                <button onClick={() => openCategoryModal(null)} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg shadow hover:bg-brand-700 transition">
                    <Plus className="h-5 w-5 mr-2" /> Nova Categoria
                </button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <ul className="divide-y divide-gray-200">
                    {state.categories.map(cat => (
                        <li key={cat.id} className="p-4 flex justify-between items-center">
                            <span>{cat.name}</span>
                            <div className="space-x-2">
                                <button onClick={() => openCategoryModal(cat)} className="p-2 text-gray-500 hover:text-brand-600"><Edit size={18} /></button>
                                <button onClick={() => deleteCategory(cat.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={18} /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Templates Section */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Modelos de Certificado</h2>
                <button onClick={() => openTemplateModal(null)} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg shadow hover:bg-brand-700 transition">
                    <Plus className="h-5 w-5 mr-2" /> Novo Modelo
                </button>
            </div>

            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center shadow-sm animate-fadeIn">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    {successMessage}
                </div>
            )}

             <div className="bg-white rounded-lg shadow overflow-hidden">
                <ul className="divide-y divide-gray-200">
                    {state.templates.map(tpl => (
                        <li key={tpl.id} className="p-4 flex justify-between items-center">
                           <div>
                                <p className="font-semibold">{tpl.name}</p>
                                <p className="text-sm text-gray-500">{state.categories.find(c=>c.id === tpl.categoryId)?.name}</p>
                           </div>
                            <div className="space-x-2">
                                <button onClick={() => openPreview(tpl)} className="p-2 text-gray-500 hover:text-indigo-600"><Eye size={18} /></button>
                                <button onClick={() => openTemplateModal(tpl)} className="p-2 text-gray-500 hover:text-brand-600"><Edit size={18} /></button>
                                <button onClick={() => deleteTemplate(tpl.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={18} /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Category Modal */}
            {isCategoryModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center p-4 border-b">
                           <h3 className="text-xl font-semibold">{currentCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                           <button onClick={closeCategoryModal}><X className="h-6 w-6 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome da Categoria</label>
                                <input type="text" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
                            </div>
                            <div className="flex justify-end pt-4">
                                <button type="button" onClick={closeCategoryModal} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
                                <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}
            
            {/* Template Modal */}
            {isTemplateModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
                        <div className="flex justify-between items-center p-4 border-b">
                           <h3 className="text-xl font-semibold">{currentTemplate ? 'Editar Modelo' : 'Novo Modelo'}</h3>
                           <button onClick={closeTemplateModal}><X className="h-6 w-6 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleTemplateSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nome do Modelo</label>
                                    <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Categoria</label>
                                    <select value={templateCategory} onChange={(e) => setTemplateCategory(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border">
                                        <option value="">Selecione uma categoria</option>
                                        {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Editor de Conteúdo do Certificado</label>
                                <RichTextEditor 
                                    value={templateText} 
                                    onChange={setTemplateText} 
                                    variables={AVAILABLE_VARIABLES}
                                />
                                <p className="text-xs text-gray-500 mt-1">Utilize as opções de formatação para estilizar o texto. Insira variáveis dinâmicas onde o nome ou evento devem aparecer.</p>
                            </div>

                             <div>
                                <label className="block text-sm font-medium mb-1">Imagem de Fundo</label>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"/>
                                {templateImage && (
                                    <div className="mt-4 border rounded-md p-2 bg-gray-50 text-center">
                                        <p className="text-xs text-gray-500 mb-2">Pré-visualização do Fundo</p>
                                        <img src={templateImage} alt="Preview" className="max-h-40 mx-auto shadow-sm" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end pt-4 border-t">
                                <button type="button" onClick={closeTemplateModal} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
                                <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                 </div>
            )}
             {isPreviewModalOpen && templateToPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setIsPreviewModalOpen(false)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl" onClick={e => e.stopPropagation()}>
                         <div className="flex justify-between items-center p-4 border-b">
                           <h3 className="text-xl font-semibold">Pré-visualização do Certificado</h3>
                           <button onClick={() => setIsPreviewModalOpen(false)}><X className="h-6 w-6 text-gray-500" /></button>
                        </div>
                        <div className="p-6 overflow-auto max-h-[80vh] flex justify-center bg-gray-100">
                             <div className="scale-75 origin-top">
                                <CertificatePreview certificate={{
                                    event: {id: 'preview', name: 'Web Summit 2024', date: new Date().toISOString()},
                                    participant: {id: 'preview', name: 'Ana Souza', email: 'exemplo@email.com', eventId: 'preview', categoryId: templateToPreview.categoryId},
                                    template: templateToPreview
                                }} />
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Templates;
