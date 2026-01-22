
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Event, Participant, Certificate, Template, ImportRecord } from '../../types';
import { Plus, Edit, Users, X, Loader2, Trash2, History, FileSpreadsheet, CheckCircle2, FileDown, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';

const Events: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    const [deleteConfig, setDeleteConfig] = useState<{ isOpen: boolean; type: 'event' | 'participant' | 'import' | null; id: string | null; title: string; message: string; }>({ isOpen: false, type: null, id: null, title: '', message: '' });
    const [participantModalTab, setParticipantModalTab] = useState<'list' | 'import' | 'history'>('list');
    const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [tempCert, setTempCert] = useState<Certificate | null>(null);
    const downloadRef = useRef<HTMLDivElement>(null);

    const sortedEvents = useMemo(() => [...state.events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [state.events]);
    const filteredParticipants = useMemo(() => {
        if (!selectedEventForParticipants) return [];
        let p = state.participants.filter(x => x.eventId === selectedEventForParticipants.id);
        if (searchTerm) p = p.filter(x => x.name.toLowerCase().includes(searchTerm.toLowerCase()) || x.email.toLowerCase().includes(searchTerm.toLowerCase()));
        return p.sort((a, b) => a.name.localeCompare(b.name));
    }, [state.participants, selectedEventForParticipants, searchTerm]);

    const paginatedParticipants = useMemo(() => filteredParticipants.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredParticipants, currentPage]);
    const filteredHistory = useMemo(() => selectedEventForParticipants ? state.importHistory.filter(h => h.eventId === selectedEventForParticipants.id) : [], [state.importHistory, selectedEventForParticipants]);

    const handleDownload = async (p: Participant) => {
        if (!selectedEventForParticipants) return;
        const template = state.templates.find(t => t.categoryId === p.categoryId);
        if (!template) return alert("Nenhum modelo para esta categoria.");

        setIsDownloading(p.id);
        setTempCert({ participant: p, event: selectedEventForParticipants, template });

        setTimeout(async () => {
            try {
                if (!downloadRef.current) return;
                
                const imgElement = downloadRef.current.querySelector('img');
                if (imgElement) {
                    await imgElement.decode().catch(() => {});
                }

                // EQUILÍBRIO QUALIDADE/PESO: Scale 3.5 (~4000px de largura)
                const canvas = await html2canvas(downloadRef.current, { 
                    scale: 3.5, 
                    useCORS: true, 
                    backgroundColor: '#ffffff',
                    logging: false,
                    imageTimeout: 0
                });

                // JPEG 0.95 é indistinguível de PNG mas 10x mais leve
                const imgData = canvas.toDataURL('image/jpeg', 0.95); 
                
                const pdf = new jsPDF({ 
                    orientation: 'landscape', 
                    unit: 'px', 
                    format: [canvas.width, canvas.height],
                    compress: true // Ativar compressão de stream para reduzir peso do PDF
                });

                pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
                pdf.save(`Certificado_${p.name.replace(/\s/g, '_')}.pdf`);
            } catch (err) { 
                console.error("Erro PDF:", err);
                alert("Erro ao gerar PDF otimizado."); 
            }
            finally { setIsDownloading(null); setTempCert(null); }
        }, 1500);
    };

    const handleImport = () => {
        if (!csvFile || !selectedCategory || !selectedEventForParticipants) return;
        setIsActionLoading(true);
        const cat = state.categories.find(c => c.id === selectedCategory);
        
        Papa.parse(csvFile, {
            header: true, 
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const importId = crypto.randomUUID();
                    const now = new Date().toISOString();
                    const batch = results.data.map((row: any) => {
                        const name = row.name || row.Nome || row.NOME || row.participant_name || row.nome_completo;
                        const email = row.email || row['e-mail'] || row.Email || row['E-MAIL'] || row.Email_Address;
                        
                        return { 
                            id: crypto.randomUUID(), 
                            name: name?.trim(), 
                            email: email?.trim(), 
                            event_id: selectedEventForParticipants.id, 
                            category_id: selectedCategory, 
                            import_id: importId 
                        };
                    }).filter(x => x.name && x.email);

                    if (!batch.length) throw new Error("O ficheiro CSV não contém colunas reconhecidas (use 'name' e 'email').");

                    const { error: hErr } = await supabase.from('import_history').insert({ 
                        id: importId, 
                        file_name: csvFile.name, 
                        count: batch.length, 
                        event_id: selectedEventForParticipants.id, 
                        category_name: cat?.name || 'N/A', 
                        status: 'success', 
                        created_at: now 
                    });
                    if (hErr) throw hErr;

                    const { error: pErr } = await supabase.from('participants').insert(batch);
                    if (pErr) throw pErr;

                    dispatch({ 
                        type: 'ADD_IMPORT_HISTORY', 
                        payload: { 
                            id: importId, 
                            date: now, 
                            fileName: csvFile.name, 
                            count: batch.length, 
                            eventId: selectedEventForParticipants.id, 
                            categoryName: cat?.name || 'N/A', 
                            status: 'success' 
                        } 
                    });
                    
                    dispatch({ 
                        type: 'ADD_PARTICIPANTS', 
                        payload: batch.map(b => ({ 
                            id: b.id, 
                            name: b.name, 
                            email: b.email, 
                            eventId: b.event_id, 
                            categoryId: b.category_id, 
                            importId: b.import_id 
                        })) 
                    });

                    setImportFeedback({ type: 'success', message: `Sucesso: ${batch.length} participantes importados.` });
                    setParticipantModalTab('list');
                    setCsvFile(null);
                } catch (err: any) { 
                    setImportFeedback({ type: 'error', message: "Falha na importação: " + err.message }); 
                }
                finally { setIsActionLoading(false); }
            }
        });
    };

    const handleUpdateParticipant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingParticipant) return;
        setIsActionLoading(true);
        try {
            const updated: Participant = { ...editingParticipant, name: editName, categoryId: editCategory };
            const { error } = await supabase.from('participants').update({ name: editName, category_id: editCategory }).eq('id', editingParticipant.id);
            if (error) throw error;
            dispatch({ type: 'UPDATE_PARTICIPANT', payload: updated });
            setIsEditParticipantModalOpen(false);
        } catch (err: any) {
            alert("Erro ao atualizar participante: " + err.message);
        } finally {
            setIsActionLoading(false);
        }
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
        } catch (err: any) {
            alert("Erro ao apagar: " + err.message);
        } finally {
            setIsActionLoading(false);
        }
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
                            <button onClick={() => { setSelectedEventForParticipants(e); setIsParticipantModalOpen(true); setParticipantModalTab('list'); }} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition">
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
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Participantes e Certificados</p>
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

                        <div className="flex-1 overflow-auto p-6">
                            {participantModalTab === 'list' && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                                            <input type="text" placeholder="Procurar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-brand-500 transition" />
                                        </div>
                                    </div>
                                    <div className="border rounded-2xl overflow-hidden bg-white">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 border-b text-[10px] uppercase font-black text-gray-400 tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">Nome</th>
                                                    <th className="px-6 py-4">Email</th>
                                                    <th className="px-6 py-4">Categoria</th>
                                                    <th className="px-6 py-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {paginatedParticipants.map(p => (
                                                    <tr key={p.id} className="hover:bg-gray-50/50 transition">
                                                        <td className="px-6 py-4 font-bold text-gray-800">{p.name}</td>
                                                        <td className="px-6 py-4 text-gray-500 text-sm">{p.email}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 bg-brand-50 text-brand-700 text-[9px] font-black rounded uppercase border border-brand-100">
                                                                {state.categories.find(c => c.id === p.categoryId)?.name || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right flex justify-end gap-1">
                                                            <button onClick={() => handleDownload(p)} disabled={isDownloading === p.id} className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg" title="Baixar PDF Otimizado">
                                                                {isDownloading === p.id ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18}/>}
                                                            </button>
                                                            <button onClick={() => { setEditingParticipant(p); setEditName(p.name); setEditCategory(p.categoryId); setIsEditParticipantModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={18}/></button>
                                                            <button onClick={() => setDeleteConfig({ isOpen: true, type: 'participant', id: p.id, title: 'Remover', message: 'Deseja remover este participante?' })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!filteredParticipants.length && <tr><td colSpan={4} className="py-20 text-center text-gray-400">Nenhum participante encontrado.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredParticipants.length > itemsPerPage && (
                                        <div className="flex justify-between items-center px-2">
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Página {currentPage} de {Math.ceil(filteredParticipants.length/itemsPerPage)}</p>
                                            <div className="flex gap-2">
                                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c-1)} className="p-2 border rounded-lg disabled:opacity-20"><ChevronLeft size={20}/></button>
                                                <button disabled={currentPage * itemsPerPage >= filteredParticipants.length} onClick={() => setCurrentPage(c => c+1)} className="p-2 border rounded-lg disabled:opacity-20"><ChevronRight size={20}/></button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {participantModalTab === 'import' && (
                                <div className="max-w-xl mx-auto py-10 space-y-6">
                                    {importFeedback && (
                                        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${importFeedback.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                            {importFeedback.type === 'success' ? <CheckCircle2/> : <AlertTriangle/>}
                                            <p className="font-bold text-sm">{importFeedback.message}</p>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <label className="block">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">1. Categoria do Lote</span>
                                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-xl p-3 focus:border-brand-500 outline-none transition">
                                                <option value="">Escolher Categoria...</option>
                                                {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </label>
                                        <label className="block">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">2. Ficheiro CSV</span>
                                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-400 transition cursor-pointer relative bg-white">
                                                <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                <FileSpreadsheet className="mx-auto text-gray-300 mb-2" size={40} />
                                                <p className="text-sm font-bold text-gray-600">{csvFile ? csvFile.name : 'Clique ou arraste o seu ficheiro .csv'}</p>
                                                <p className="text-[10px] text-gray-400 mt-2 italic">O sistema deteta automaticamente colunas 'name', 'email' ou variações em PT.</p>
                                            </div>
                                        </label>
                                        <button onClick={handleImport} disabled={isActionLoading || !csvFile || !selectedCategory} className="w-full bg-brand-600 text-white p-4 rounded-2xl font-black shadow-xl hover:bg-brand-700 transition flex items-center justify-center gap-2">
                                            {isActionLoading ? <Loader2 className="animate-spin" /> : 'Processar Ficheiro'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {participantModalTab === 'history' && (
                                <div className="space-y-3">
                                    {filteredHistory.map(h => (
                                        <div key={h.id} className="bg-white border p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-50 text-blue-600 p-3 rounded-xl"><History size={20}/></div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{h.fileName}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(h.date).toLocaleString()} • {h.categoryName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-gray-900">{h.count}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase font-black">Registos</p>
                                                </div>
                                                <button onClick={() => setDeleteConfig({ isOpen: true, type: 'import', id: h.id, title: 'Anular Importação', message: `Remover permanentemente os ${h.count} participantes deste lote?` })} className="p-2 text-gray-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {!filteredHistory.length && <div className="py-20 text-center text-gray-300 font-bold">Sem histórico para este evento.</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isEditParticipantModalOpen && editingParticipant && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-2xl font-black mb-6">Editar Participante</h3>
                        <form onSubmit={handleUpdateParticipant} className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Nome Completo</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Categoria</label>
                                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500 font-medium">
                                    {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setIsEditParticipantModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition">Cancelar</button>
                                <button type="submit" disabled={isActionLoading} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-black shadow-lg hover:bg-brand-700 transition">
                                    {isActionLoading ? <Loader2 className="animate-spin mx-auto"/> : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEventModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl">
                        <h3 className="text-2xl font-black mb-6">{currentEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                        <form onSubmit={async (e) => { e.preventDefault(); setIsActionLoading(true); try { const ev = { id: currentEvent?.id || crypto.randomUUID(), name: eventName, date: eventDate }; const { error } = await supabase.from('events').upsert(ev); if (error) throw error; currentEvent ? dispatch({ type: 'UPDATE_EVENT', payload: ev }) : dispatch({ type: 'ADD_EVENT', payload: ev }); setIsEventModalOpen(false); } catch(err: any){alert(err.message);} finally {setIsActionLoading(false);} }} className="space-y-4">
                            <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Nome do Evento" required className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500" />
                            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-500" />
                            <div className="flex gap-2 pt-6">
                                <button type="button" onClick={() => setIsEventModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-black shadow-lg">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfig.isOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
                        <div className="bg-red-50 text-red-500 p-4 rounded-full w-fit mx-auto mb-6"><AlertTriangle size={40}/></div>
                        <h3 className="text-xl font-black text-gray-900">{deleteConfig.title}</h3>
                        <p className="text-sm text-gray-500 my-4 leading-relaxed">{deleteConfig.message}</p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setDeleteConfig({ ...deleteConfig, isOpen: false })} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Não</button>
                            <button onClick={confirmDeleteAction} disabled={isActionLoading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black shadow-lg">Sim, Apagar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Container invisível para captura HD */}
            <div className="absolute opacity-0 pointer-events-none" style={{ top: '-10000px', left: '-10000px' }}>
                {tempCert && <div ref={downloadRef}><CertificatePreview certificate={tempCert} /></div>}
            </div>
        </div>
    );
};

export default Events;
