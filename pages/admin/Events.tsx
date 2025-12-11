
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../../context/AppContext';
import type { Event, Participant, Certificate, Template } from '../../types';
import { Plus, Edit, Users, X, Upload, Download, FileText, User, Loader2, Award, AlertTriangle, ArrowUpDown, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import CertificatePreview from '../../components/CertificatePreview';

const Events: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
    const [participantModalTab, setParticipantModalTab] = useState<'list' | 'import' | 'templates'>('list');
    
    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'date'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');

    const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [csvFile, setCsvFile] = useState<File | null>(null);

    // Participant List State (Pagination & Search)
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Download specific state
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [tempCertForDownload, setTempCertForDownload] = useState<Certificate | null>(null);
    const downloadPreviewRef = useRef<HTMLDivElement>(null);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Derived sorted events
    const sortedEvents = useMemo(() => {
        return [...state.events].sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            } else {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
        });
    }, [state.events, sortConfig]);

    // Derived participants for the active modal
    const filteredParticipants = useMemo(() => {
        if (!selectedEventForParticipants) return [];
        
        let participants = state.participants.filter(p => p.eventId === selectedEventForParticipants.id);

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            participants = participants.filter(p => 
                p.name.toLowerCase().includes(lowerTerm) || 
                p.email.toLowerCase().includes(lowerTerm)
            );
        }
        
        // Default sort by name for the participant list
        return participants.sort((a, b) => a.name.localeCompare(b.name));
    }, [state.participants, selectedEventForParticipants, searchTerm]);

    const paginatedParticipants = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredParticipants.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredParticipants, currentPage]);

    const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);

    const openEventModal = (event: Event | null) => {
        setCurrentEvent(event);
        setEventName(event?.name || '');
        setEventDate(event?.date || '');
        setIsEventModalOpen(true);
    };

    const closeEventModal = () => {
        setIsEventModalOpen(false);
        setCurrentEvent(null);
        setEventName('');
        setEventDate('');
    };

    const handleEventSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentEvent) {
            dispatch({ type: 'UPDATE_EVENT', payload: { ...currentEvent, name: eventName, date: eventDate } });
        } else {
            dispatch({ type: 'ADD_EVENT', payload: { id: `evt${Date.now()}`, name: eventName, date: eventDate } });
        }
        closeEventModal();
    };

    const handleDeleteEvent = (eventId: string) => {
        if (window.confirm('Tem a certeza que quer apagar este evento?')) {
            dispatch({ type: 'DELETE_EVENT', payload: eventId });
        }
    };
    
    const openParticipantModal = (event: Event) => {
        setSelectedEventForParticipants(event);
        setParticipantModalTab('list'); // Default to list view
        setSearchTerm('');
        setCurrentPage(1);
        setIsParticipantModalOpen(true);
    }
    
    const closeParticipantModal = () => {
        setSelectedEventForParticipants(null);
        setIsParticipantModalOpen(false);
        setCsvFile(null);
        setSelectedCategory('');
        setSearchTerm('');
    }
    
    const handleParticipantUpload = () => {
        if (!csvFile || !selectedCategory || !selectedEventForParticipants) {
             alert('Por favor selecione um ficheiro CSV e uma categoria.');
             return;
        }

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Validation Logic
                const headers = results.meta.fields;
                if (!headers) {
                    alert('Erro: Não foi possível ler os cabeçalhos do ficheiro CSV.');
                    return;
                }

                const requiredColumns = ['name', 'email'];
                const missingColumns = requiredColumns.filter(col => !headers.includes(col));

                if (missingColumns.length > 0) {
                    alert(`Erro de Validação: O ficheiro CSV deve conter as colunas: ${missingColumns.join(', ')}.\n\nColunas encontradas: ${headers.join(', ')}`);
                    return;
                }

                const newParticipants: Participant[] = results.data
                .map((row: any) => ({
                    id: `par${Date.now()}${Math.random()}`,
                    name: row.name,
                    email: row.email,
                    eventId: selectedEventForParticipants.id,
                    categoryId: selectedCategory,
                }))
                .filter(p => p.name && p.email);
                
                if (newParticipants.length === 0) {
                    alert('Aviso: Nenhum participante válido encontrado. Verifique se os dados estão preenchidos corretamente.');
                    return;
                }

                dispatch({ type: 'ADD_PARTICIPANTS', payload: newParticipants });
                alert(`${newParticipants.length} participantes adicionados com sucesso!`);
                setParticipantModalTab('list'); // Switch to list view to show results
                setCsvFile(null);
                setSearchTerm(''); // Clear search to show new items
            },
            error: (error: any) => {
                alert(`Erro ao processar o ficheiro CSV: ${error.message}`);
            }
        });
    };

    const handleDownloadCertificate = (participant: Participant, template: Template) => {
        if (!selectedEventForParticipants) return;

        const cert: Certificate = {
            participant,
            event: selectedEventForParticipants,
            template
        };

        setTempCertForDownload(cert);
        setDownloadingId(participant.id);

        // Give React a moment to render the hidden certificate
        setTimeout(async () => {
            const element = downloadPreviewRef.current;
            if (!element) return;

            try {
                // A4 dimensions in pixels at 300 DPI (approx)
                const a4w = 2480;
                // const a4h = 3508;
                
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
                pdf.save(`Certificado_${selectedEventForParticipants.name.replace(/ /g, '_')}_${participant.name.replace(/ /g, '_')}.pdf`);
            } catch (error) {
                console.error("Error generating PDF", error);
                alert("Ocorreu um erro ao gerar o PDF.");
            } finally {
                setDownloadingId(null);
                setTempCertForDownload(null);
            }
        }, 500);
    };

    const handleAssignTemplate = (categoryId: string, templateId: string) => {
        // 1. Find the template currently assigned to this category (if any) and unassign it
        const currentTemplate = state.templates.find(t => t.categoryId === categoryId);
        if (currentTemplate) {
            dispatch({ 
                type: 'UPDATE_TEMPLATE', 
                payload: { ...currentTemplate, categoryId: '' } 
            });
        }

        // 2. Assign the category to the new template
        if (templateId) {
            const newTemplate = state.templates.find(t => t.id === templateId);
            if (newTemplate) {
                dispatch({ 
                    type: 'UPDATE_TEMPLATE', 
                    payload: { ...newTemplate, categoryId: categoryId } 
                });
            }
        }
    };

    const downloadCsvTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,name,email\nJohn Doe,john.doe@example.com\nJane Smith,jane.smith@example.com";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "participantes_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-gray-800">Gerir Eventos</h2>
                
                <div className="flex flex-wrap gap-3">
                    {/* Sort Dropdown */}
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                             <ArrowUpDown className="h-4 w-4" />
                        </div>
                        <select
                            value={`${sortConfig.key}-${sortConfig.direction}`}
                            onChange={(e) => {
                                const [key, direction] = e.target.value.split('-');
                                setSortConfig({ key: key as 'name' | 'date', direction: direction as 'asc' | 'desc' });
                            }}
                            className="block w-full rounded-lg border-gray-300 bg-white py-2 pl-10 pr-8 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 border cursor-pointer hover:bg-gray-50 transition"
                        >
                            <option value="date-desc">Data: Mais Recente</option>
                            <option value="date-asc">Data: Mais Antiga</option>
                            <option value="name-asc">Nome: A-Z</option>
                            <option value="name-desc">Nome: Z-A</option>
                        </select>
                    </div>

                    <button onClick={() => openEventModal(null)} className="flex items-center bg-brand-600 text-white px-4 py-2 rounded-lg shadow hover:bg-brand-700 transition whitespace-nowrap">
                        <Plus className="h-5 w-5 mr-2" /> Novo Evento
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <ul className="divide-y divide-gray-200">
                    {sortedEvents.map(event => (
                        <li key={event.id} className="p-4 sm:p-6 hover:bg-gray-50 transition">
                             <div className="flex items-center justify-between flex-wrap">
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">{event.name}</p>
                                    <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                                    <button onClick={() => openParticipantModal(event)} className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition border border-gray-200">
                                        <Users className="h-4 w-4 mr-2" />
                                        Gerir Participantes
                                    </button>
                                    <button onClick={() => openEventModal(event)} className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-100 rounded-full transition">
                                        <Edit className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                             </div>
                        </li>
                    ))}
                </ul>
            </div>
            
            {/* Event Modal */}
            {isEventModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-xl font-semibold">{currentEvent ? 'Editar Evento' : 'Novo Evento'}</h3>
                            <button onClick={closeEventModal}><X className="h-6 w-6 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleEventSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nome do Evento</label>
                                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Data do Evento</label>
                                <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500" />
                            </div>
                            <div className="flex justify-end pt-4">
                                <button type="button" onClick={closeEventModal} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg mr-2 hover:bg-gray-300">Cancelar</button>
                                <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Participant & Certificate Modal */}
            {isParticipantModalOpen && selectedEventForParticipants && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl flex flex-col h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b">
                            <div>
                                <h3 className="text-xl font-semibold">{selectedEventForParticipants.name}</h3>
                                <p className="text-sm text-gray-500">Gestão de Participantes e Certificados</p>
                            </div>
                            <button onClick={closeParticipantModal}><X className="h-6 w-6 text-gray-500" /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${participantModalTab === 'list' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setParticipantModalTab('list')}
                            >
                                <Users className="inline-block h-4 w-4 mr-1 mb-1" />
                                Participantes
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${participantModalTab === 'templates' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setParticipantModalTab('templates')}
                            >
                                <Award className="inline-block h-4 w-4 mr-1 mb-1" />
                                Certificados
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 ${participantModalTab === 'import' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setParticipantModalTab('import')}
                            >
                                <Upload className="inline-block h-4 w-4 mr-1 mb-1" />
                                Importar CSV
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {participantModalTab === 'list' && (
                                <div className="flex flex-col h-full">
                                    {/* Search Bar */}
                                    <div className="mb-4 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Pesquisar por nome ou email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
                                        />
                                    </div>

                                    {filteredParticipants.length > 0 ? (
                                        <>
                                            <div className="overflow-x-auto flex-1 border rounded-lg">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Nome</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Email</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Categoria</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Modelo</th>
                                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Ações</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {paginatedParticipants.map(p => {
                                                            const category = state.categories.find(c => c.id === p.categoryId);
                                                            const template = state.templates.find(t => t.categoryId === p.categoryId);
                                                            const isDownloading = downloadingId === p.id;

                                                            return (
                                                                <tr key={p.id} className="hover:bg-gray-50">
                                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                                                        <User className="h-4 w-4 mr-2 text-gray-400" />
                                                                        {p.name}
                                                                    </td>
                                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{p.email}</td>
                                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-brand-100 text-brand-800">
                                                                            {category?.name || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                        {template ? (
                                                                             <div className="flex items-center">
                                                                                <FileText className="h-4 w-4 mr-1 text-green-500" />
                                                                                <span className="truncate max-w-[150px]" title={template.name}>{template.name}</span>
                                                                             </div>
                                                                        ) : (
                                                                            <span className="text-red-400 text-xs italic">Sem modelo</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                        <button
                                                                            onClick={() => template && handleDownloadCertificate(p, template)}
                                                                            disabled={!template || isDownloading}
                                                                            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${
                                                                                !template 
                                                                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                                                                : 'text-white bg-brand-600 hover:bg-brand-700'
                                                                            }`}
                                                                            title={!template ? "Associe um modelo a esta categoria na aba Certificados" : "Descarregar Certificado"}
                                                                        >
                                                                            {isDownloading ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                <>
                                                                                    <Download className="h-4 w-4 mr-1" />
                                                                                    PDF
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination Controls */}
                                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4">
                                                <div className="flex flex-1 justify-between sm:hidden">
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                        disabled={currentPage === 1}
                                                        className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                                    >
                                                        Anterior
                                                    </button>
                                                    <button
                                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                        disabled={currentPage === totalPages}
                                                        className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                                    >
                                                        Próximo
                                                    </button>
                                                </div>
                                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-sm text-gray-700">
                                                            A mostrar <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredParticipants.length)}</span> de <span className="font-medium">{filteredParticipants.length}</span> resultados
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                                            <button
                                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                                disabled={currentPage === 1}
                                                                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                                                            >
                                                                <span className="sr-only">Previous</span>
                                                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                                            </button>
                                                            
                                                            {/* Simple Page Indicator */}
                                                            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                                                Página {currentPage} de {totalPages}
                                                            </span>

                                                            <button
                                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                                disabled={currentPage === totalPages}
                                                                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:bg-gray-100"
                                                            >
                                                                <span className="sr-only">Next</span>
                                                                <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                                            </button>
                                                        </nav>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-10 flex-1 flex flex-col justify-center">
                                            <Users className="mx-auto h-12 w-12 text-gray-300" />
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                                                {searchTerm ? 'Nenhum participante encontrado' : 'Sem participantes'}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {searchTerm ? 'Tente ajustar os termos da sua pesquisa.' : 'Ainda não existem participantes associados a este evento.'}
                                            </p>
                                            {!searchTerm && (
                                                <div className="mt-6">
                                                    <button onClick={() => setParticipantModalTab('import')} className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700">
                                                        <Upload className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                                        Importar Agora
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {participantModalTab === 'templates' && (
                                <div className="space-y-6">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-yellow-700">
                                                    Associe um modelo de certificado a cada categoria. 
                                                    <br/>
                                                    <span className="font-semibold">Nota:</span> As alterações aplicam-se a todos os eventos que utilizam esta categoria.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo Associado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {state.categories.map(category => {
                                                    const activeTemplate = state.templates.find(t => t.categoryId === category.id);
                                                    
                                                    return (
                                                        <tr key={category.id}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {category.name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <select
                                                                    value={activeTemplate?.id || ''}
                                                                    onChange={(e) => handleAssignTemplate(category.id, e.target.value)}
                                                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-md"
                                                                >
                                                                    <option value="">-- Selecione um Modelo --</option>
                                                                    {state.templates.map(tpl => (
                                                                        <option key={tpl.id} value={tpl.id}>
                                                                            {tpl.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="text-right">
                                        <button onClick={() => setParticipantModalTab('list')} className="text-brand-600 hover:text-brand-800 text-sm font-medium">
                                            Voltar à lista de participantes &rarr;
                                        </button>
                                    </div>
                                </div>
                            )}

                            {participantModalTab === 'import' && (
                                <div className="space-y-6 max-w-lg mx-auto">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Passo 1: Descarregar o modelo CSV</label>
                                        <button onClick={downloadCsvTemplate} className="w-full flex items-center justify-center bg-gray-600 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-700 transition text-sm">
                                            <Download className="h-4 w-4 mr-2" /> Descarregar Modelo
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Passo 2: Selecionar a Categoria do Participante</label>
                                        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500">
                                            <option value="">Selecione uma categoria</option>
                                            {state.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Todos os participantes neste CSV serão importados com esta categoria.</p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Passo 3: Carregar ficheiro CSV</label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition">
                                            <div className="space-y-1 text-center">
                                                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                                                        <span>Carregue um ficheiro</span>
                                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={e => setCsvFile(e.target.files ? e.target.files[0] : null)} />
                                                    </label>
                                                </div>
                                                <p className="text-xs text-gray-500">{csvFile ? csvFile.name : 'CSV com colunas: name, email'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end pt-4">
                                        <button onClick={handleParticipantUpload} disabled={!csvFile || !selectedCategory} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed font-medium shadow-sm flex justify-center items-center">
                                            <Upload className="h-5 w-5 mr-2" />
                                            Processar Importação
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Preview for PDF Generation */}
            <div className="absolute -left-[9999px] top-0">
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
