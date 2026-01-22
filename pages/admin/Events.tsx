
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Event, Participant, Certificate, Template } from '../../types';
import { Plus, Edit, Users, X, Upload, Download, FileText, User, Loader2, Award, AlertTriangle, ArrowUpDown, Search, ChevronLeft, ChevronRight, Trash2, History, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';

const Events: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    // Unified Delete Confirmation State
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

    const [participantModalTab, setParticipantModalTab] = useState<'list' | 'import' | 'templates' | 'history'>('list');
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
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
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

    const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
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
                id: currentEvent?.id || `evt${Date.now()}`,
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
                ({ error } = await supabase.from('import_history').delete().eq('id', id));
                // Note: supabase RLS or CASCADE should handle participants, but for safety:
                await supabase.from('participants').delete().eq('importId', id);
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
            complete: async (results) => {
                try {
                    const importId = `imp${Date.now()}`;
                    const newParticipants = results.data
                        .map((row: any) => ({
                            id: `par${Date.now()}${Math.random()}`,
                            name: row.name?.toString().trim(),
                            email: row.email?.toString().trim(),
                            eventId: selectedEventForParticipants.id,
                            categoryId: selectedCategory,
                            importId: importId 
                        }))
                        .filter((p: any) => p.name && p.email);

                    if (newParticipants.length === 0) throw new Error("Nenhum dado válido no CSV.");

                    // Save to Supabase
                    const { error: pError } = await supabase.from('participants').insert(newParticipants);
                    if (pError) throw pError;

                    const importRecord = {
                        id: importId,
                        date: new Date().toISOString(),
                        fileName: csvFile.name,
                        count: newParticipants.length,
                        eventId: selectedEventForParticipants.id,
                        categoryName: categoryName,
                        status: 'success'
                    };

                    const { error: hError } = await supabase.from('import_history').insert(importRecord);
                    if (hError) throw hError;

                    dispatch({ type: 'ADD_PARTICIPANTS', payload: newParticipants });
                    dispatch({ type: 'ADD_IMPORT_HISTORY', payload: importRecord });

                    setImportFeedback({ type: 'success', message: 'Importação concluída com sucesso!' });
                    setParticipantModalTab('history');
                } catch (err: any) {
                    setImportFeedback({ type: 'error', message: err.message });
                } finally {
                    setIsActionLoading(false);
                }
            }
        });
    };

    const handleDownloadCertificate = (participant: Participant, template: Template) => {
        if (!selectedEventForParticipants) return;
        setTempCertForDownload({ participant, event: selectedEventForParticipants, template });
        setDownloadingId(participant.id);
        setTimeout(async () => {
            const element = downloadPreviewRef.current;
            if (!element) return;
            try {
                const canvas = await html2canvas(element, { scale: 2, useCORS: true });
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(`Certificado_${participant.name}.pdf`);
            } finally {
                setDownloadingId(null);
                setTempCertForDownload(null);
            }
        }, 500);
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
                    <button onClick={() => openEventModal(null)} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg shadow hover:bg-brand-700">
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
                                    <button onClick={() => { setSelectedEventForParticipants(event); setIsParticipantModalOpen(true); }} className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-green-600 border rounded-lg">
                                        <Users className="h-4 w-4 mr-2" /> Gerir
                                    </button>
                                    <button onClick={() => openEventModal(event)} className="p-2 text-gray-500 hover:text-brand-600"><Edit size={20}/></button>
                                    <button onClick={() => setDeleteConfig({ isOpen: true, type: 'event', id: event.id, title: 'Apagar Evento', message: 'Apagar este evento e todos os participantes?' })} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={20}/></button>
                                </div>
                             </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Event Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">{currentEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                        <form onSubmit={handleEventSubmit} className="space-y-4">
                            <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Nome" required className="w-full border rounded-lg p-2" />
                            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full border rounded-lg p-2" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={closeEventModal} className="px-4 py-2 bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="px-4 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-50">
                                    {isActionLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteConfig.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
                        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold">{deleteConfig.title}</h3>
                        <p className="text-gray-500 my-2">{deleteConfig.message}</p>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} className="flex-1 py-2 bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={confirmDeleteAction} disabled={isActionLoading} className="flex-1 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50">
                                {isActionLoading ? <Loader2 className="animate-spin h-5 w-5 mx-auto" /> : 'Apagar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Participant Modal (Simplified for logic) */}
            {isParticipantModalOpen && selectedEventForParticipants && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-5xl h-[85vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold">{selectedEventForParticipants.name}</h3>
                            <button onClick={() => setIsParticipantModalOpen(false)}><X/></button>
                        </div>
                        <div className="flex border-b text-sm font-medium">
                            <button onClick={() => setParticipantModalTab('list')} className={`px-6 py-3 border-b-2 ${participantModalTab === 'list' ? 'border-brand-600' : 'border-transparent'}`}>Lista</button>
                            <button onClick={() => setParticipantModalTab('import')} className={`px-6 py-3 border-b-2 ${participantModalTab === 'import' ? 'border-brand-600' : 'border-transparent'}`}>Importar</button>
                            <button onClick={() => setParticipantModalTab('history')} className={`px-6 py-3 border-b-2 ${participantModalTab === 'history' ? 'border-brand-600' : 'border-transparent'}`}>Histórico</button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            {participantModalTab === 'list' && (
                                <div className="space-y-4">
                                    {paginatedParticipants.map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg">
                                            <span>{p.name} ({p.email})</span>
                                            <button onClick={() => setDeleteConfig({ isOpen: true, type: 'participant', id: p.id, title: 'Remover', message: 'Apagar participante?' })} className="text-red-500"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {participantModalTab === 'import' && (
                                <div className="max-w-md mx-auto space-y-4">
                                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full border p-2 rounded">
                                        <option value="">Categoria...</option>
                                        {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <input type="file" onChange={e => setCsvFile(e.target.files?.[0] || null)} className="w-full" />
                                    <button onClick={handleParticipantUpload} disabled={isActionLoading} className="w-full bg-brand-600 text-white p-3 rounded-lg">
                                        {isActionLoading ? <Loader2 className="animate-spin mx-auto"/> : 'Importar'}
                                    </button>
                                </div>
                            )}
                            {participantModalTab === 'history' && (
                                <div className="space-y-2">
                                    {filteredImportHistory.map(h => (
                                        <div key={h.id} className="flex justify-between p-3 border rounded">
                                            <span>{h.fileName} ({h.count} part.)</span>
                                            <button onClick={() => setDeleteConfig({ isOpen: true, type: 'import', id: h.id, title: 'Apagar Importação', message: 'Isto removerá os participantes associados.' })} className="text-red-500"><Trash2/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute -left-[9999px]">
                {tempCertForDownload && <div ref={downloadPreviewRef}><CertificatePreview certificate={tempCertForDownload} /></div>}
            </div>
        </div>
    );
};

export default Events;
