
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Event, Participant, Certificate, Template, ImportRecord } from '../../types';
import { Plus, Edit, Users, X, Upload, Download, FileText, User, Loader2, Award, AlertTriangle, ArrowUpDown, Search, ChevronLeft, ChevronRight, Trash2, History, FileSpreadsheet, CheckCircle2, FileDown } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';

const Events: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    const [deleteConfig, setDeleteConfig] = useState<{
        isOpen: boolean;
        type: 'event' | 'participant' | 'import' | null;
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

    const [participantModalTab, setParticipantModalTab] = useState<'list' | 'import' | 'history'>('list');
    const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'date'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // States for individual PDF download
    const [isDownloadingParticipant, setIsDownloadingParticipant] = useState<string | null>(null);
    const [tempCertForDownload, setTempCertForDownload] = useState<Certificate | null>(null);
    const downloadPreviewRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const sortedEvents = useMemo(() => {
        return [...state.events].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            } else {
                return sortConfig.direction === 'asc' 
                    ? new Date(a.date).getTime() - new Date(b.date).getTime() 
                    : new Date(b.date).getTime() - new Date(a.date).getTime();
            }
        });
    }, [state.events, sortConfig]);

    const filteredParticipants = useMemo(() => {
        if (!selectedEventForParticipants) return [];
        let participants = state.participants.filter(p => p.eventId === selectedEventForParticipants.id);
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            participants = participants.filter(p => p.name.toLowerCase().includes(lowerTerm) || p.email.toLowerCase().includes(lowerTerm));
        }
        return participants.sort((a, b) => a.name.localeCompare(b.name));
    }, [state.participants, selectedEventForParticipants, searchTerm]);

    const filteredImportHistory = useMemo(() => {
        if (!selectedEventForParticipants) return [];
        return state.importHistory.filter(h => h.eventId === selectedEventForParticipants.id);
    }, [state.importHistory, selectedEventForParticipants]);

    const paginatedParticipants = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredParticipants.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredParticipants, currentPage]);

    const openEventModal = (event: Event | null) => {
        setCurrentEvent(event);
        setEventName(event?.name || '');
        setEventDate(event?.date || '');
        setIsEventModalOpen(true);
    };

    const closeEventModal = () => {
        setIsEventModalOpen(false);
        setCurrentEvent(null);
    };

    const handleEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);
        try {
            const eventData = {
                id: currentEvent?.id || crypto.randomUUID(),
                name: eventName,
                date: eventDate
            };

            const { error } = await supabase.from('events').upsert(eventData);
            if (error) throw error;

            if (currentEvent) {
                dispatch({ type: 'UPDATE_EVENT', payload: eventData });
            } else {
                dispatch({ type: 'ADD_EVENT', payload: eventData });
            }
            closeEventModal();
        } catch (err: any) {
            alert("Erro ao guardar evento: " + err.message);
        } finally {
            setIsActionLoading(false);
        }
    };

    const confirmDeleteAction = async () => {
        const { type, id } = deleteConfig;
        if (!id || !type) return;
        setIsActionLoading(true);

        try {
            let error;
            if (type === 'event') {
                ({ error } = await supabase.from('events').delete().eq('id', id));
                if (!error) dispatch({ type: 'DELETE_EVENT', payload: id });
            } else if (type === 'participant') {
                ({ error } = await supabase.from('participants').delete().eq('id', id));
                if (!error) dispatch({ type: 'DELETE_PARTICIPANT', payload: id });
            } else if (type === 'import') {
                await supabase.from('participants').delete().eq('import_id', id);
                ({ error } = await supabase.from('import_history').delete().eq('id', id));
                if (!error) dispatch({ type: 'DELETE_IMPORT', payload: id });
            }
            if (error) throw error;
        } catch (err: any) {
            alert("Erro ao apagar: " + err.message);
        } finally {
            setIsActionLoading(false);
            setDeleteConfig({ ...deleteConfig, isOpen: false, id: null, type: null });
        }
    };

    const downloadCsvTemplate = () => {
        const headers = ['name', 'email'];
        const sampleData = [
            ['Hélder Oliveira', 'helder.oliveira@exemplo.com'],
            ['João Silva', 'joao.silva@exemplo.com'],
            ['Maria Conceição', 'maria.conceicao@exemplo.com']
        ];
        
        const csvContent = Papa.unparse({
            fields: headers,
            data: sampleData
        });

        const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'modelo_importacao_certificados.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleParticipantUpload = () => {
        if (!csvFile || !selectedCategory || !selectedEventForParticipants) {
            setImportFeedback({ type: 'error', message: 'Preencha todos os campos.' });
            return;
        }

        setIsActionLoading(true);
        const categoryName = state.categories.find(c => c.id === selectedCategory)?.name || 'Desconhecida';

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            encoding: "UTF-8",
            complete: async (results) => {
                try {
                    const importId = crypto.randomUUID();
                    const now = new Date().toISOString();

                    const importRecordData = {
                        id: importId,
                        created_at: now, 
                        file_name: csvFile.name,
                        count: 0,
                        event_id: selectedEventForParticipants.id,
                        category_name: categoryName,
                        status: 'success'
                    };

                    const dbParticipants = results.data
                        .map((row: any) => ({
                            id: crypto.randomUUID(),
                            name: row.name?.toString().trim(),
                            email: row.email?.toString().trim(),
                            event_id: selectedEventForParticipants.id,
                            category_id: selectedCategory,
                            import_id: importId 
                        }))
                        .filter((p: any) => p.name && p.email);

                    if (dbParticipants.length === 0) throw new Error("Nenhum dado válido no CSV. Verifique as colunas 'name' e 'email'.");

                    importRecordData.count = dbParticipants.length;

                    const { error: hError } = await supabase.from('import_history').insert(importRecordData);
                    if (hError) throw hError;

                    const { error: pError } = await supabase.from('participants').insert(dbParticipants);
                    if (pError) {
                        await supabase.from('import_history').delete().eq('id', importId);
                        throw pError;
                    }

                    const localParticipants: Participant[] = dbParticipants.map(p => ({
                        id: p.id,
                        name: p.name,
                        email: p.email,
                        eventId: p.event_id,
                        categoryId: p.category_id,
                        importId: p.import_id
                    }));

                    const localImportHistory: ImportRecord = {
                        id: importRecordData.id,
                        date: importRecordData.created_at,
                        fileName: importRecordData.file_name,
                        count: importRecordData.count,
                        eventId: importRecordData.event_id,
                        categoryName: importRecordData.category_name,
                        status: 'success'
                    };

                    dispatch({ type: 'ADD_PARTICIPANTS', payload: localParticipants });
                    dispatch({ type: 'ADD_IMPORT_HISTORY', payload: localImportHistory });

                    setImportFeedback({ type: 'success', message: `Sucesso! ${dbParticipants.length} participantes importados.` });
                    setParticipantModalTab('history');
                    setCsvFile(null);
                    setSelectedCategory('');
                } catch (err: any) {
                    console.error("Erro na importação:", err);
                    setImportFeedback({ type: 'error', message: err.message || "Erro ao comunicar com a base de dados." });
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    const handleDownloadParticipant = async (p: Participant) => {
        if (!selectedEventForParticipants) return;
        
        const template = state.templates.find(t => t.categoryId === p.categoryId);
        if (!template) {
            alert("Não existe nenhum modelo de certificado configurado para a categoria deste participante.");
            return;
        }

        setIsDownloadingParticipant(p.id);
        
        const certificate: Certificate = {
            participant: p,
            event: selectedEventForParticipants,
            template: template
        };

        // Set certificate to render in the hidden div
        setTempCertForDownload(certificate);

        // Allow React a tick to render
        setTimeout(async () => {
            try {
                const element = downloadPreviewRef.current;
                if (!element) throw new Error("Falha ao preparar o certificado.");

                // High quality PDF dimensions (300 DPI)
                const a4w = 2480; 
                
                const canvas = await html2canvas(element, {
                    scale: a4w / element.offsetWidth,
                    useCORS: true,
                    width: element.offsetWidth,
                    height: element.offsetHeight,
                });

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [canvas.width, canvas.height]
                });

                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`Certificado_${selectedEventForParticipants.name.replace(/ /g, '_')}_${p.name.replace(/ /g, '_')}.pdf`);
            } catch (err) {
                console.error("Erro ao gerar PDF:", err);
                alert("Ocorreu um erro ao gerar o PDF.");
            } finally {
                setIsDownloadingParticipant(null);
                setTempCertForDownload(null);
            }
        }, 300);
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-gray-800">Gerir Eventos</h2>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={`${sortConfig.key}-${sortConfig.direction}`}
                        onChange={(e) => {
                            const [key, direction] = e.target.value.split('-');
                            setSortConfig({ key: key as 'name' | 'date', direction: direction as 'asc' | 'desc' });
                        }}
                        className="rounded-lg border-gray-300 text-sm shadow-sm border p-2"
                    >
                        <option value="date-desc">Mais Recente</option>
                        <option value="date-asc">Mais Antiga</option>
                        <option value="name-asc">Nome A-Z</option>
                    </select>
                    <button onClick={() => openEventModal(null)} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg shadow hover:bg-brand-700 transition-colors">
                        <Plus className="h-5 w-5 mr-2" /> Novo Evento
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <ul className="divide-y divide-gray-200">
                    {sortedEvents.map(event => (
                        <li key={event.id} className="p-6 hover:bg-gray-50 transition">
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">{event.name}</p>
                                    <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => { setSelectedEventForParticipants(event); setIsParticipantModalOpen(true); setParticipantModalTab('list'); }} className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-green-600 border rounded-lg transition-colors">
                                        <Users className="h-4 w-4 mr-2" /> Gerir
                                    </button>
                                    <button onClick={() => openEventModal(event)} className="p-2 text-gray-500 hover:text-brand-600 transition-colors"><Edit size={20}/></button>
                                    <button onClick={() => setDeleteConfig({ isOpen: true, type: 'event', id: event.id, title: 'Apagar Evento', message: 'Apagar este evento e todos os participantes?' })} className="p-2 text-gray-500 hover:text-red-600 transition-colors"><Trash2 size={20}/></button>
                                </div>
                             </div>
                        </li>
                    ))}
                    {sortedEvents.length === 0 && (
                        <li className="p-12 text-center text-gray-500">Nenhum evento encontrado. Crie o seu primeiro evento!</li>
                    )}
                </ul>
            </div>

            {isEventModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{currentEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                        <form onSubmit={handleEventSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento</label>
                                <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Ex: Conferência de Tecnologia" required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={closeEventModal} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="px-6 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50 hover:bg-brand-700 transition-colors min-w-[100px] flex justify-center">
                                    {isActionLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfig.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
                        <div className="bg-red-50 p-3 rounded-full w-fit mx-auto mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{deleteConfig.title}</h3>
                        <p className="text-gray-500 my-2 text-sm">{deleteConfig.message}</p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} className="flex-1 py-2.5 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancelar</button>
                            <button onClick={confirmDeleteAction} disabled={isActionLoading} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                                {isActionLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Apagar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isParticipantModalOpen && selectedEventForParticipants && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{selectedEventForParticipants.name}</h3>
                                <p className="text-xs text-gray-500">Gestão de Participantes e Importação</p>
                            </div>
                            <button onClick={() => setIsParticipantModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X/></button>
                        </div>
                        <div className="flex border-b text-sm font-semibold text-gray-600 bg-white">
                            <button onClick={() => setParticipantModalTab('list')} className={`px-8 py-4 border-b-2 transition-colors ${participantModalTab === 'list' ? 'border-brand-600 text-brand-600' : 'border-transparent hover:text-gray-900'}`}>Lista de Participantes</button>
                            <button onClick={() => setParticipantModalTab('import')} className={`px-8 py-4 border-b-2 transition-colors ${participantModalTab === 'import' ? 'border-brand-600 text-brand-600' : 'border-transparent hover:text-gray-900'}`}>Importar CSV</button>
                            <button onClick={() => setParticipantModalTab('history')} className={`px-8 py-4 border-b-2 transition-colors ${participantModalTab === 'history' ? 'border-brand-600 text-brand-600' : 'border-transparent hover:text-gray-900'}`}>Histórico</button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
                            {participantModalTab === 'list' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Procurar nome ou email..." 
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                        </div>
                                        <div className="text-sm text-gray-500">Total: {filteredParticipants.length} participantes</div>
                                    </div>
                                    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b">
                                                <tr>
                                                    <th className="px-4 py-3">Nome</th>
                                                    <th className="px-4 py-3">Email</th>
                                                    <th className="px-4 py-3">Categoria</th>
                                                    <th className="px-4 py-3 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {paginatedParticipants.map(p => (
                                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 font-medium">{p.name}</td>
                                                        <td className="px-4 py-3 text-gray-500">{p.email}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded text-[11px] font-bold uppercase">
                                                                {state.categories.find(c => c.id === p.categoryId)?.name || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <button 
                                                                    onClick={() => handleDownloadParticipant(p)} 
                                                                    disabled={isDownloadingParticipant === p.id}
                                                                    title="Exportar Certificado (PDF)"
                                                                    className={`p-1.5 rounded-md transition-colors ${isDownloadingParticipant === p.id ? 'bg-gray-100 text-gray-400' : 'text-brand-600 hover:bg-brand-50'}`}
                                                                >
                                                                    {isDownloadingParticipant === p.id ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18}/>}
                                                                </button>
                                                                <button onClick={() => setDeleteConfig({ isOpen: true, type: 'participant', id: p.id, title: 'Remover Participante', message: `Tem a certeza que deseja remover ${p.name}?` })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                                                    <Trash2 size={18}/>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {paginatedParticipants.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">Nenhum participante encontrado.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredParticipants.length > itemsPerPage && (
                                        <div className="flex justify-center gap-2 mt-4">
                                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50" disabled={currentPage === 1}><ChevronLeft size={16}/></button>
                                            <span className="flex items-center text-sm font-medium px-4">Página {currentPage}</span>
                                            <button onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg bg-white hover:bg-gray-100 disabled:opacity-50" disabled={paginatedParticipants.length < itemsPerPage}><ChevronRight size={16}/></button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {participantModalTab === 'import' && (
                                <div className="max-w-2xl mx-auto py-8">
                                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h4 className="font-bold text-gray-800">Importação em Lote</h4>
                                                <p className="text-sm text-gray-500">Carregue um ficheiro CSV com os nomes e emails.</p>
                                            </div>
                                            <button 
                                                onClick={downloadCsvTemplate}
                                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors border border-brand-200"
                                            >
                                                <FileSpreadsheet size={16} />
                                                Modelo CSV
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            {importFeedback && (
                                                <div className={`p-4 rounded-lg text-sm flex items-center gap-3 border animate-fadeIn ${importFeedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    {importFeedback.type === 'success' ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}
                                                    {importFeedback.message}
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">1. Selecione a Categoria</label>
                                                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                                                    <option value="">Escolha a categoria dos participantes...</option>
                                                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <p className="text-[10px] text-gray-400 mt-1 italic">Isto determina qual o modelo de certificado será utilizado para este lote.</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">2. Escolha o Ficheiro CSV</label>
                                                <div className="relative group">
                                                    <input 
                                                        type="file" 
                                                        accept=".csv" 
                                                        onChange={e => setCsvFile(e.target.files?.[0] || null)} 
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                                    />
                                                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center group-hover:border-brand-500 transition-colors bg-gray-50 group-hover:bg-brand-50">
                                                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2 group-hover:text-brand-500" />
                                                        <span className="text-sm font-medium text-gray-600 block group-hover:text-brand-700">
                                                            {csvFile ? csvFile.name : 'Clique para selecionar ou arraste o ficheiro'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">Suporta apenas ficheiros .csv (UTF-8)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={handleParticipantUpload} 
                                                disabled={isActionLoading || !csvFile || !selectedCategory} 
                                                className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isActionLoading ? <Loader2 className="animate-spin h-6 w-6"/> : <><Upload size={20}/> Iniciar Importação</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {participantModalTab === 'history' && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                                        <History className="text-blue-600 h-5 w-5 mt-0.5" />
                                        <div className="text-sm text-blue-800">
                                            <p className="font-bold">Histórico de Lotes</p>
                                            <p>Aqui pode ver e gerir as importações anteriores feitas para este evento.</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-3">
                                        {filteredImportHistory.map(h => (
                                            <div key={h.id} className="bg-white border rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-green-100 p-2 rounded-lg"><FileText className="text-green-700 h-6 w-6" /></div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{h.fileName}</p>
                                                        <p className="text-[11px] text-gray-500 flex items-center gap-2">
                                                            <span>{new Date(h.date).toLocaleString()}</span>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <span className="font-bold text-brand-600 uppercase">{h.categoryName}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-center">
                                                        <p className="text-lg font-bold text-gray-800">{h.count}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Participantes</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setDeleteConfig({ 
                                                            isOpen: true, 
                                                            type: 'import', 
                                                            id: h.id, 
                                                            title: 'Reverter Importação', 
                                                            message: `Atenção: isto apagará os ${h.count} participantes importados neste lote (${h.fileName}). Esta ação é irreversível.` 
                                                        })} 
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                        title="Apagar Lote"
                                                    >
                                                        <Trash2 size={20}/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredImportHistory.length === 0 && (
                                            <div className="py-20 text-center bg-white border border-dashed rounded-xl">
                                                <History className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                                                <p className="text-gray-400">Nenhuma importação realizada ainda para este evento.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden preview for individual PDF generation */}
            <div className="absolute -left-[9999px] invisible pointer-events-none">
                {tempCertForDownload && (
                    <div ref={downloadPreviewRef}>
                        <CertificatePreview certificate={tempCertForDownload} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Events;
