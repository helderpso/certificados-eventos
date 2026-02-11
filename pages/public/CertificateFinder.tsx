
import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Loader2, Search, Award, AlertCircle, Lock, RefreshCw, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import type { Certificate, Participant } from '../../types';
import CertificatePreview from '../../components/CertificatePreview';

const CertificateFinder: React.FC = () => {
    const { state, refreshData } = useAppContext();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [foundCertificates, setFoundCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    
    const previewRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Função auxiliar para normalizar IDs para comparação
    const norm = (id: any) => String(id || '').trim().toLowerCase();

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
            setError('Por favor, introduza um e-mail válido.');
            return;
        }
        
        setError(null);
        setIsLoading(true);
        setSearched(true);
        
        try {
            // 1. Forçamos a atualização de Eventos, Categorias e Modelos para garantir consistência
            const freshState = await refreshData();
            
            // 2. BUSCA DIRETA NO SUPABASE PELO EMAIL
            // Isto ignora qualquer limite local e vai buscar TODOS os registos deste email
            const { data: dbParticipants, error: dbError } = await supabase
                .from('participants')
                .select('*')
                .eq('email', trimmedEmail);

            if (dbError) throw dbError;

            if (!dbParticipants || dbParticipants.length === 0) {
                setFoundCertificates([]);
                return;
            }

            // 3. Mapeamos os resultados da BD com os Eventos e Modelos locais
            const certs = dbParticipants.map(p => {
                const participant: Participant = {
                    id: norm(p.id),
                    name: p.name,
                    email: norm(p.email),
                    eventId: norm(p.event_id),
                    categoryId: norm(p.category_id),
                    importId: norm(p.import_id),
                    customVar1: p.custom_var1 || '',
                    customVar2: p.custom_var2 || '',
                    customVar3: p.custom_var3 || ''
                };

                const event = freshState.events.find(e => norm(e.id) === participant.eventId);
                
                // Procura Modelo: Específico do Evento -> Global
                let template = freshState.templates.find(t => 
                    norm(t.categoryId) === participant.categoryId && 
                    norm(t.eventId) === participant.eventId
                );
                
                if (!template) {
                    template = freshState.templates.find(t => 
                        norm(t.categoryId) === participant.categoryId && 
                        (!t.eventId || t.eventId === '' || t.eventId === 'null')
                    );
                }

                if (event && template) {
                    return { participant, event, template };
                }
                return null;
            }).filter((c): c is Certificate => c !== null);
                
            setFoundCertificates(certs);
        } catch (err: any) {
            console.error("Erro na busca:", err);
            setError("Erro ao aceder à base de dados: " + (err.message || "Tente novamente"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (cert: Certificate) => {
        const key = `${cert.participant.id}-${cert.event.id}`;
        const element = previewRefs.current[key];
        if (!element) return;

        setIsDownloading(key);
        
        setTimeout(async () => {
            try {
                const imgElement = element.querySelector('img');
                if (imgElement) await imgElement.decode().catch(() => {});

                const canvas = await html2canvas(element, {
                    scale: 3, 
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    imageTimeout: 0,
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });

                pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
                pdf.save(`Certificado_${cert.participant.name.replace(/\s/g, '_')}.pdf`);
            } catch (err) {
                console.error(err);
                alert("Erro ao gerar o PDF. Tente novamente.");
            } finally {
                setIsDownloading(null);
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex flex-col items-center justify-between p-4 font-sans">
            <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center py-12">
                <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-8 md:p-14 text-center border border-white">
                    {state.appLogo && <img src={state.appLogo} alt="Logo" className="h-16 mx-auto mb-8 object-contain" />}
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">{state.portalTitle}</h1>
                    <p className="text-gray-500 mt-6 max-w-lg mx-auto leading-relaxed text-lg">{state.portalSubtitle}</p>
                    
                    <form onSubmit={handleSearch} className="mt-12 flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                            <input 
                                type="email" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                placeholder="exemplo@email.com" 
                                required 
                                className="w-full pl-12 pr-6 py-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-brand-500 focus:ring-8 focus:ring-brand-500/5 transition-all shadow-sm bg-white font-bold text-gray-800" 
                            />
                        </div>
                        <button type="submit" disabled={isLoading} className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[160px] text-lg">
                            {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Procurar'}
                        </button>
                    </form>
                    {error && <div className="mt-6 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold inline-flex items-center gap-2 animate-bounce"><AlertCircle size={14}/>{error}</div>}
                </div>

                {searched && !isLoading && (
                    <div className="mt-12 space-y-5 animate-fadeIn max-w-3xl mx-auto w-full">
                        <div className="flex justify-between items-end px-4">
                            <div>
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Resultados da Pesquisa</h2>
                                <p className="text-xl font-black text-gray-900 mt-1">{foundCertificates.length} Certificado(s) pronto(s)</p>
                            </div>
                            <button 
                                onClick={() => handleSearch()} 
                                className="text-[10px] font-black text-brand-600 hover:bg-brand-50 px-4 py-2 rounded-full border border-brand-100 transition-all uppercase tracking-wider flex items-center gap-2 shadow-sm"
                            >
                                <RefreshCw size={12} /> Sincronizar
                            </button>
                        </div>
                        
                        <div className="grid gap-4">
                            {foundCertificates.map((cert) => {
                                // O segredo para exibir múltiplos é usar o participant.id único como parte da chave
                                const key = `${cert.participant.id}-${cert.event.id}`;
                                const category = state.categories.find(c => norm(c.id) === cert.participant.categoryId);
                                
                                return (
                                    <div key={key} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl hover:shadow-2xl flex flex-col sm:flex-row justify-between items-center gap-6 border border-gray-100 hover:border-brand-200 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-2 h-full bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="text-center sm:text-left flex-1 min-w-0">
                                            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
                                                <span className="px-3 py-1 bg-brand-50 text-brand-700 text-[10px] font-black rounded-full uppercase tracking-widest border border-brand-100">
                                                    {category?.name || 'Participante'}
                                                </span>
                                            </div>
                                            <h3 className="font-black text-2xl text-gray-900 leading-tight truncate">{cert.event.name}</h3>
                                            
                                            {cert.participant.customVar1 && (
                                                <div className="mt-3 flex items-start gap-2 text-gray-500">
                                                    <ChevronRight size={16} className="mt-1 flex-shrink-0 text-brand-300" />
                                                    <p className="text-sm font-medium leading-relaxed italic line-clamp-2">
                                                        {cert.participant.customVar1}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => handleDownload(cert)} 
                                            disabled={isDownloading === key} 
                                            className="w-full sm:w-auto bg-gray-900 text-white px-8 py-5 rounded-[1.25rem] flex items-center justify-center gap-3 font-black hover:bg-brand-600 transition-all shadow-xl hover:shadow-brand-500/30 active:scale-95 disabled:opacity-50 group/btn"
                                        >
                                            {isDownloading === key ? (
                                                <><Loader2 size={22} className="animate-spin" /><span>A Gerar...</span></>
                                            ) : (
                                                <><Download size={22} className="group-hover/btn:-translate-y-1 transition-transform" /><span>Download</span></>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {foundCertificates.length === 0 && (
                            <div className="bg-white/50 backdrop-blur-sm p-16 rounded-[2.5rem] text-center shadow-inner border-2 border-dashed border-gray-200">
                                <Award size={64} className="mx-auto text-gray-200 mb-6" />
                                <p className="text-gray-600 text-xl font-black">Certificados não encontrados</p>
                                <p className="text-sm text-gray-400 mt-3 leading-relaxed max-w-sm mx-auto font-medium">
                                    Verifique se o e-mail está correto ou se a organização já disponibilizou o seu modelo de certificado.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Renderização invisível para PDF */}
            <div className="absolute" style={{ top: '-20000px', left: '-20000px', pointerEvents: 'none', width: '1123px' }}>
                {foundCertificates.map(cert => {
                     const key = `${cert.participant.id}-${cert.event.id}`;
                    return <div key={key} ref={el => { previewRefs.current[key] = el; }}><CertificatePreview certificate={cert} /></div>
                })}
            </div>

            <footer className="py-10 w-full text-center">
                <button onClick={() => window.location.hash = '/admin'} className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-brand-600 flex items-center justify-center gap-3 mx-auto transition-all bg-white/50 px-6 py-3 rounded-full border border-gray-100 hover:border-brand-200 shadow-sm">
                    <Lock size={14}/> Área Reservada
                </button>
            </footer>
        </div>
    );
};

export default CertificateFinder;
