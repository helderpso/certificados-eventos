
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Event, Participant, Certificate, Template, ImportRecord } from '../../types';
import { Plus, Edit, Users, X, Loader2, Trash2, History, FileSpreadsheet, CheckCircle2, FileDown, AlertTriangle, ChevronLeft, ChevronRight, Search, RefreshCcw, Eye, UserPlus } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';

const Events: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);
    const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isModalLoading, setIsModalLoading] = useState(false);
    
    const [deleteConfig, setDeleteConfig] = useState<{ isOpen: boolean; type: 'event' | 'participant' | 'import' | null; id: string | null; title: string; message: string; }>({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [participantModalTab, setParticipantModalTab] = useState<'list' | 'import' | 'history'>('list');
    const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;
    
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newVar1, setNewVar1] = useState('');
    const [newVar2, setNewVar2] = useState('');
    const [newVar3, setNewVar3] = useState('');

    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editVar1, setEditVar1] = useState('');
    const [editVar2, setEditVar2] = useState('');
    const [editVar3, setEditVar3] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [tempCert, setTempCert] = useState<Certificate | null>(null);
    const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
    const downloadRef = useRef<HTMLDivElement>(null);

    // Lista de eventos ordenada por data
    const sortedEvents = useMemo(() => [...state.events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [state.events]);

    // Filtro local de participantes
    const filteredParticipants = useMemo(() => {
        if (!selectedEventForParticipants) return [];
        
        const eventId = String(selectedEventForParticipants.id).toLowerCase();
        let p = state.participants.filter(x => String(x.eventId).toLowerCase() === eventId);
        
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            p = p.filter(x => 
                (x.name || '').toLowerCase().includes(term) || 
                (x.email || '').toLowerCase().includes(term)
            );
        }
        
        return p.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [state.participants, selectedEventForParticipants, searchTerm]);

    const paginatedParticipants = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredParticipants.slice(start, start + itemsPerPage);
    }, [filteredParticipants, currentPage]);

    const filteredHistory = useMemo(() => 
        selectedEventForParticipants 
        ? state.importHistory.filter(h => String(h.eventId) === String(selectedEventForParticipants.id)) 
        : [], [state.importHistory, selectedEventForParticipants]);

    const fetchEventParticipants = async (eventId: string) => {
        setIsModalLoading(true);
        try {
            const { data, error } = await supabase
                .from('participants')
                .select('*')
                .eq('event_id', eventId);

            if (error) throw error;

            if (data) {
                const mapped: Participant[] = data.map(p => ({
                    id: String(p.id),
                    name: p.name,
                    email: String(p.email || '').trim().toLowerCase(),
                    eventId: String(p.event_id),
                    categoryId: String(p.category_id),
                    importId: p.import_id ? String(p.import_id) : undefined,
                    customVar1: p.custom_var1 || '',
                    customVar2: p.custom_var2 || '',
                    customVar3: p.custom_var3 || ''
                }));
                dispatch({ type: 'ADD_PARTICIPANTS', payload: mapped });
            }
        } catch (err) {
            console.error("Erro ao sincronizar participantes:", err);
        } finally {
            setIsModalLoading(false);
        }
    };

    const openParticipantModal = async (event: Event) => {
        setSearchTerm(''); 
        setCurrentPage(1);
        setParticipantModalTab('list');
        setImportFeedback(null);
        setSelectedEventForParticipants(event);
        setIsParticipantModalOpen(true);
        await fetchEventParticipants(event.id);
    };

    const findTemplateForParticipant = (p: Participant) => {
        let template = state.templates.find(t => 
            String(t.categoryId) === String(p.categoryId) && 
            String(t.eventId) === String(p.eventId)
        );
        
        if (!template) {
            template = state.templates.find(t => 
                String(t.categoryId) === String(p.categoryId) && 
                (!t.eventId || t.eventId === '' || t.eventId === 'null')
            );
        }
        return template;
    };

    const handlePreview = (p: Participant) => {
        if (!selectedEventForParticipants) return;
        const template = findTemplateForParticipant(p);
        if (!template) {
            const catName = state.categories.find(c => String(c.id) === String(p.categoryId))?.name || 'esta categoria';
            return alert(`Nenhum modelo configurado para "${catName}".`);
        }
        setPreviewCert({ participant: p, event: selectedEventForParticipants, template });
        setIsPreviewModalOpen(true);
    };

    const handleDownload = async (p: Participant) => {
        if (!selectedEventForParticipants) return;
        const template = findTemplateForParticipant(p);

        if (!template) {
            const catName = state.categories.find(c => String(c.id) === String(p.categoryId))?.name || 'esta categoria';
            return alert(`Erro: Nenhum modelo configurado para "${catName}".`);
        }

        setIsDownloading(p.id);
        setTempCert({ participant: p, event: selectedEventForParticipants, template });

        setTimeout(async () => {
            try {
                if (!downloadRef.current) return;
                const imgElement = downloadRef.current.querySelector('img');
                if (imgElement) await imgElement.decode().catch(() => {});

                const canvas = await html2canvas(downloadRef.current, { 
                    scale: 3, 
                    useCORS: true, 
                    backgroundColor: '#ffffff',
                    logging: false,
                    imageTimeout: 0
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95); 
                const pdf = new jsPDF({ 
                    orientation: 'landscape', 
                    unit: 'px', 
                    format: [canvas.width, canvas.height]
                });

                pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
                pdf.save(`Certificado_${p.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
            } catch (err) { 
                console.error("Erro PDF:", err);
                alert("Erro ao gerar PDF."); 
            } finally { 
                setIsDownloading(null); 
                setTempCert(null); 
            }
        }, 1200);
    };

    const handleAddManualParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEventForParticipants || !newEmail || !newName || !newCategory) return;
        
        setIsActionLoading(true);
        try {
            const { data, error } = await supabase
                .from('participants')
                .insert([{
                    name: newName,
                    email: newEmail.trim().toLowerCase(),
                    event_id: selectedEventForParticipants.id,
                    category_id: newCategory,
                    custom_var1: newVar1,
                    custom_var2: newVar2,
                    custom_var3: newVar3
                }])
                .select()
                .single();

            if (error) throw error;

            dispatch({ 
                type: 'ADD_PARTICIPANTS', 
                payload: [{
                    id: String(data.id),
                    name: data.name,
                    email: data.email,
                    eventId: String(data.event_id),
                    categoryId: String(data.category_id),
                    customVar1: data.custom_var1,
                    customVar2: data.custom_var2,
                    customVar3: data.custom_var3
                }] 
            });

            setIsAddParticipantModalOpen(false);
            setNewName(''); setNewEmail(''); setNewCategory(''); setNewVar1(''); setNewVar2(''); setNewVar3('');
        } catch (err: any) {
            alert("Erro ao adicionar participante: " + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleImport = () => {
        if (!csvFile || !selectedCategory || !selectedEventForParticipants) return;
        setIsActionLoading(true);
        const cat = state.categories.find(c => String(c.id) === String(selectedCategory));
        
        Papa.parse(csvFile, {
            header: true, 
            skipEmptyLines: 'greedy',
            transformHeader: (header) => header.replace(/[\uFEFF\u200B\u00A0]/g, '').trim().toLowerCase(),
            complete: async (results) => {
                try {
                    const importId = crypto.randomUUID();
                    const now = new Date().toISOString();
                    
                    const batch = results.data.map((row: any) => {
                        const name = row.name || row.nome || row.participant_name || row.nome_completo || row.username;
                        const email = row.email || row['e-mail'] || row.email_address || row.correio_eletronico;
                        const custom1 = row.custom1 || row.custom_1 || row.variavel1 || row.variavel_1 || row.titulo || row.work;
                        const custom2 = row.custom2 || row.custom_2 || row.variavel2 || row.variavel_2 || row.autores || row.authors;
                        const custom3 = row.custom3 || row.custom_3 || row.variavel3 || row.variavel_3 || row.instituicao || row.institution;
                        
                        return { 
                            name: name?.trim(), 
                            email: email?.trim()?.toLowerCase(), 
                            event_id: selectedEventForParticipants.id, 
                            category_id: selectedCategory, 
                            import_id: importId,
                            custom_var1: custom1?.trim() || '',
                            custom_var2: custom2?.trim() || '',
                            custom_var3: custom3?.trim() || ''
                        };
                    }).filter(x => x.name && x.email);

                    if (!batch.length) throw new Error("Colunas 'name' e 'email' não encontradas ou ficheiro vazio.");

                    const { error: hErr } = await supabase.from('import_history').insert({ 
                        id: importId, file_name: csvFile.name, count: batch.length, event_id: selectedEventForParticipants.id, 
                        category_name: cat?.name || 'N/A', status: 'success', created_at: now 
                    });
                    if (hErr) throw hErr;

                    const { data: insertedData, error: pErr } = await supabase.from('participants').insert(batch).select();
                    if (pErr) throw pErr;

                    dispatch({ type: 'ADD_IMPORT_HISTORY', payload: { 
                        id: importId, date: now, fileName: csvFile.name, count: batch.length, 
                        eventId: selectedEventForParticipants.id, categoryName: cat?.name || 'N/A', status: 'success' 
                    } });
                    
                    dispatch({ type: 'ADD_PARTICIPANTS', payload: insertedData.map(p => ({ 
                        id: String(p.id), name: p.name, email: p.email, eventId: String(p.event_id), 
                        categoryId: String(p.category_id), importId: String(p.import_id),
                        customVar1: p.custom_var1, customVar2: p.custom_var2, customVar3: p.custom_var3
                    })) });

                    setImportFeedback({ type: 'success', message: `${batch.length} participantes importados com sucesso.` });
                    setParticipantModalTab('list');
                    setCsvFile(null);
                } catch (err: any) { setImportFeedback({ type: 'error', message: "Erro: " + err.message }); }
                finally { setIsActionLoading(false); }
            }
        });
    };

    const handleUpdateParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingParticipant) return;
        setIsActionLoading(true);
        try {
            const { data, error } = await supabase.from('participants').update({ 
                name: editName, category_id: editCategory, custom_var1: editVar1, custom_var2: editVar2, custom_var3: editVar3
            }).eq('id', editingParticipant.id).select().single();

            if (error) throw error;

            dispatch({ type: 'UPDATE_PARTICIPANT', payload: {
                id: String(data.id), name: data.name, email: data.email, eventId: String(data.event_id),
                categoryId: String(data.category_id), importId: String(data.import_id),
                customVar1: data.custom_var1, customVar2: data.custom_var2, customVar3: data.custom_var3
            } });
            setIsEditParticipantModalOpen(false);
        } catch (err: any) { alert("Erro ao atualizar: " + err.message); }
        finally { setIsActionLoading(false); }
    };

    const confirmDeleteAction = async () => {
        const { type, id } = deleteConfig;
        if (!id || !type) return;
        setIsActionLoading(true);
        try {
            if (type === 'event') {
                const { error } = await supabase.from('events').delete().eq('id', id);
                if (error) throw error;
                dispatch({ type: 'DELETE_EVENT', payload: id });
            } else if (type === 'participant') {
                const { error } = await supabase.from('participants').delete().eq('id', id);
                if (error) throw error;
                dispatch({ type: 'DELETE_PARTICIPANT', payload: id });
            } else if (type === 'import') {
                const { error: pErr } = await supabase.from('participants').delete().eq('import_id', id);
                if (pErr) throw pErr;
                const { error: hErr } = await supabase.from('import_history').delete().eq('id', id);
                if (hErr) throw hErr;
                dispatch({ type: 'DELETE_IMPORT', payload: id });
            }
            setDeleteConfig({ ...deleteConfig, isOpen: false });
        } catch (err: any) { alert("Erro ao apagar: " + err.message); }
        finally { setIsActionLoading(false); }
    };

    return (
        <div className="p-2 sm:p-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Gestão de Eventos</h2>
                <button onClick={() => { setCurrentEvent(null); setEventName(''); setEventDate(''); setIsEventModalOpen(true); }} className="bg-brand-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-brand-700 transition flex items-center gap-2 font-semibold">
                    <Plus size={20}/> Novo Evento
                </button>
            </div>

            <div className="grid gap-4">
                {sortedEvents.map(e => (
                    <div key={e.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 hover:shadow-md transition">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">{e.name}</h3>
                            <p className="text-sm text-gray-400 font-medium">{new Date(e.date).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openParticipantModal(e)} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition">
                                <Users size={18}/> Participantes
                            </button>
                            <button onClick={() => { setCurrentEvent(e); setEventName(e.name); setEventDate(e.date); setIsEventModalOpen(true); }} className="p-2 text-gray-400 hover:text-brand-600 transition"><Edit size={20}/></button>
                            <button onClick={() => setDeleteConfig({ isOpen: true, type: 'event', id: e.id, title: 'Apagar Evento', message: 'Isto removerá permanentemente o evento e todos os participantes.' })} className="p-2 text-gray-400 hover:text-red-600 transition"><Trash2 size={20}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {isParticipantModalOpen && selectedEventForParticipants && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-6">
                    <div className="bg-white rounded-3xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{selectedEventForParticipants.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Painel de Participantes</p>
                            </div>
                            <button onClick={() => setIsParticipantModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X/></button>
                        </div>
                        
                        <div className="flex border-b px-4 gap-4 bg-white">
                            {['list', 'import', 'history'].map(tab => (
                                <button key={tab} onClick={() => setParticipantModalTab(tab as any)} className={`py-4 px-2 text-sm font-bold border-b-2 transition-all ${participantModalTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    {tab === 'list' ? 'Listagem' : tab === 'import' ? 'Importar CSV' : 'Histórico'}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                            {isModalLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                    <Loader2 className="animate-spin text-brand-500" size={48} />
                                    <p className="font-black uppercase text-xs tracking-widest">A sincronizar com a Base de Dados...</p>
                                </div>
                            ) : (
                                <>
                                    {participantModalTab === 'list' && (
                                        <div className="space-y-4 animate-fadeIn">
                                            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
                                                <div className="relative flex-1 w-full">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Procurar participante por nome ou email..." 
                                                        value={searchTerm} 
                                                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition outline-none font-bold shadow-sm" 
                                                    />
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button onClick={() => setIsAddParticipantModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg hover:bg-brand-700 transition flex-1 sm:flex-none">
                                                        <UserPlus size={18}/> Novo Participante
                                                    </button>
                                                    <button onClick={() => fetchEventParticipants(selectedEventForParticipants.id)} className="p-3 text-brand-600 hover:bg-brand-50 rounded-xl transition border border-brand-100">
                                                        <RefreshCcw size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-xl">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50/80 border-b text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                                        <tr>
                                                            <th className="px-6 py-4">Nome</th>
                                                            <th className="px-6 py-4">Email</th>
                                                            <th className="px-6 py-4">Categoria</th>
                                                            <th className="px-6 py-4 text-right">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {paginatedParticipants.map(p => (
                                                            <tr key={p.id} className="hover:bg-brand-50/30 transition">
                                                                <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                                                <td className="px-6 py-4 text-gray-500 text-sm italic">{p.email}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className="px-2 py-1 bg-brand-50 text-brand-700 text-[9px] font-black rounded uppercase border border-brand-100">
                                                                        {state.categories.find(c => String(c.id).toLowerCase() === String(p.categoryId).toLowerCase())?.name || 'Participante'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right flex justify-end gap-1">
                                                                    <button onClick={() => handlePreview(p)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition" title="Pré-visualizar">
                                                                        <Eye size={18}/>
                                                                    </button>
                                                                    <button onClick={() => handleDownload(p)} disabled={isDownloading === p.id} className="p-2 text-brand-600 hover:bg-brand-100 rounded-lg transition" title="Descarregar Certificado">
                                                                        {isDownloading === p.id ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18}/>}
                                                                    </button>
                                                                    <button onClick={() => { 
                                                                        setEditingParticipant(p); setEditName(p.name); setEditCategory(String(p.categoryId)); 
                                                                        setEditVar1(p.customVar1 || ''); setEditVar2(p.customVar2 || ''); setEditVar3(p.customVar3 || '');
                                                                        setIsEditParticipantModalOpen(true); 
                                                                    }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"><Edit size={18}/></button>
                                                                    <button onClick={() => setDeleteConfig({ isOpen: true, type: 'participant', id: p.id, title: 'Remover', message: 'Deseja remover este participante?' })} className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"><Trash2 size={18}/></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {filteredParticipants.length === 0 && (
                                                            <tr><td colSpan={4} className="py-24 text-center text-gray-400 font-black uppercase tracking-widest text-xs">Nenhum participante encontrado.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            {filteredParticipants.length > itemsPerPage && (
                                                <div className="flex justify-between items-center px-4 py-2">
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Página {currentPage} de {Math.ceil(filteredParticipants.length/itemsPerPage)}</p>
                                                    <div className="flex gap-2">
                                                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c-1)} className="p-2 border bg-white rounded-lg disabled:opacity-20 transition shadow-sm hover:border-brand-300"><ChevronLeft size={20}/></button>
                                                        <button disabled={currentPage * itemsPerPage >= filteredParticipants.length} onClick={() => setCurrentPage(c => c+1)} className="p-2 border bg-white rounded-lg disabled:opacity-20 transition shadow-sm hover:border-brand-300"><ChevronRight size={20}/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {participantModalTab === 'import' && (
                                        <div className="max-w-xl mx-auto py-10 space-y-6 animate-fadeIn">
                                            {importFeedback && (
                                                <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-fadeIn ${importFeedback.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                    {importFeedback.type === 'success' ? <CheckCircle2/> : <AlertTriangle/>}
                                                    <p className="font-bold text-sm">{importFeedback.message}</p>
                                                </div>
                                            )}
                                            <div className="space-y-4">
                                                <label className="block">
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">1. Categoria do Lote</span>
                                                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-xl p-4 focus:border-brand-500 outline-none transition font-bold shadow-sm">
                                                        <option value="">Escolher Categoria...</option>
                                                        {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </label>
                                                <label className="block">
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">2. Selecionar Ficheiro (.csv)</span>
                                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-400 transition cursor-pointer relative bg-white group shadow-sm">
                                                        <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                        <FileSpreadsheet className="mx-auto text-gray-300 group-hover:text-brand-500 transition mb-2" size={40} />
                                                        <p className="text-sm font-bold text-gray-600">{csvFile ? csvFile.name : 'Clique ou arraste o seu ficheiro .csv'}</p>
                                                    </div>
                                                </label>
                                                <button onClick={handleImport} disabled={isActionLoading || !csvFile || !selectedCategory} className="w-full bg-brand-600 text-white p-4 rounded-2xl font-black shadow-xl hover:bg-brand-700 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                                                    {isActionLoading ? <Loader2 className="animate-spin" /> : 'Começar Importação'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {participantModalTab === 'history' && (
                                        <div className="space-y-3 animate-fadeIn">
                                            {filteredHistory.map(h => (
                                                <div key={h.id} className="bg-white border p-4 rounded-2xl flex justify-between items-center shadow-sm hover:border-brand-300 transition group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-brand-50 group-hover:text-brand-600 transition"><History size={20}/></div>
                                                        <div>
                                                            <p className="font-bold text-gray-800">{h.fileName}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(h.date).toLocaleString()} • {h.categoryName}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-right">
                                                        <div>
                                                            <p className="text-xl font-black text-gray-900">{h.count}</p>
                                                            <p className="text-[9px] text-gray-400 uppercase font-black">Participantes</p>
                                                        </div>
                                                        <button onClick={() => setDeleteConfig({ isOpen: true, type: 'import', id: h.id, title: 'Anular Importação', message: `Isto removerá os ${h.count} participantes importados neste lote.` })} className="p-2 text-gray-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {!filteredHistory.length && <div className="py-24 text-center text-gray-300 font-bold uppercase tracking-widest text-xs">Sem histórico disponível.</div>}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pré-visualização de Certificado */}
            {isPreviewModalOpen && previewCert && (
                <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] p-4 backdrop-blur-xl" onClick={() => setIsPreviewModalOpen(false)}>
                    <div className="bg-white rounded-[2rem] shadow-2xl p-4 origin-center transform scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.85] animate-scaleIn border-8 border-white/20" onClick={e => e.stopPropagation()}>
                        <CertificatePreview certificate={previewCert} />
                        <button onClick={() => setIsPreviewModalOpen(false)} className="absolute -top-16 -right-16 p-5 bg-white rounded-full shadow-2xl text-gray-900 hover:text-red-600 transition hover:rotate-90">
                            <X size={32}/>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Adicionar Participante Manualmente */}
            {isAddParticipantModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] animate-scaleIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black">Novo Participante</h3>
                            <button onClick={() => setIsAddParticipantModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X/></button>
                        </div>
                        <form onSubmit={handleAddManualParticipant} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome Completo</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Ex: Maria Silva" className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-500 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">E-mail</label>
                                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="Ex: maria@exemplo.com" className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-500 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Categoria</label>
                                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-500 font-bold outline-none">
                                    <option value="">Escolha uma categoria...</option>
                                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="pt-4 border-t space-y-4">
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Campos Dinâmicos (Opcional)</p>
                                <input type="text" value={newVar1} onChange={e => setNewVar1(e.target.value)} placeholder="Variável 1 (ex: Cargo)" className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium outline-none" />
                                <input type="text" value={newVar2} onChange={e => setNewVar2(e.target.value)} placeholder="Variável 2 (ex: Instituição)" className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium outline-none" />
                                <input type="text" value={newVar3} onChange={e => setNewVar3(e.target.value)} placeholder="Variável 3 (ex: Nota)" className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium outline-none" />
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setIsAddParticipantModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-black shadow-lg hover:bg-brand-700 transition">
                                    {isActionLoading ? <Loader2 className="animate-spin mx-auto"/> : 'Registar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditParticipantModalOpen && editingParticipant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] animate-scaleIn">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black">Editar Participante</h3>
                            <button onClick={() => setIsEditParticipantModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition"><X/></button>
                        </div>
                        <form onSubmit={handleUpdateParticipant} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome do Participante</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-500 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Categoria</label>
                                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-500 font-bold outline-none">
                                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-4 border-t space-y-4">
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Campos Dinâmicos</p>
                                <input type="text" value={editVar1} onChange={e => setEditVar1(e.target.value)} placeholder="Variável 1" className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium outline-none" />
                                <input type="text" value={editVar2} onChange={e => setEditVar2(e.target.value)} placeholder="Variável 2" className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium outline-none" />
                                <input type="text" value={editVar3} onChange={e => setEditVar3(e.target.value)} placeholder="Variável 3" className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium outline-none" />
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setIsEditParticipantModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-black shadow-lg hover:bg-brand-700 transition">
                                    {isActionLoading ? <Loader2 className="animate-spin mx-auto"/> : 'Atualizar Dados'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEventModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-scaleIn">
                        <h3 className="text-2xl font-black mb-6">{currentEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                        <form onSubmit={async (e) => { 
                            e.preventDefault(); 
                            setIsActionLoading(true); 
                            try { 
                                const ev = { ...(currentEvent?.id ? { id: currentEvent.id } : {}), name: eventName, date: eventDate }; 
                                const { data, error } = await supabase.from('events').upsert(ev).select().single(); 
                                if (error) throw error; 
                                currentEvent ? dispatch({ type: 'UPDATE_EVENT', payload: data }) : dispatch({ type: 'ADD_EVENT', payload: data }); 
                                setIsEventModalOpen(false); 
                            } catch(err: any){alert(err.message);} finally {setIsActionLoading(false);} 
                        }} className="space-y-4">
                            <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Título do Evento" required className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-500 font-bold outline-none" />
                            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-500 font-bold outline-none text-gray-600" />
                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setIsEventModalOpen(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-black shadow-lg hover:bg-brand-700 transition">Guardar Evento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfig.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl p-10 w-full max-w-sm text-center shadow-2xl animate-scaleIn">
                        <div className="bg-red-50 text-red-500 p-5 rounded-full w-fit mx-auto mb-6"><AlertTriangle size={48}/></div>
                        <h3 className="text-xl font-black text-gray-900">{deleteConfig.title}</h3>
                        <p className="text-sm text-gray-500 my-4 leading-relaxed font-medium">{deleteConfig.message}</p>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold hover:bg-gray-200 transition">Não</button>
                            <button onClick={confirmDeleteAction} disabled={isActionLoading} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg hover:bg-red-700 transition">Apagar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute opacity-0 pointer-events-none" style={{ top: '-10000px', left: '-10000px' }}>
                {tempCert && <div ref={downloadRef}><CertificatePreview certificate={tempCert} /></div>}
            </div>
        </div>
    );
};

export default Events;
