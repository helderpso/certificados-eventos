
import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Loader2, Search, Award, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { Certificate } from '../../types';
import CertificatePreview from '../../components/CertificatePreview';

const CertificateFinder: React.FC = () => {
    const { state } = useAppContext();
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [foundCertificates, setFoundCertificates] = useState<Certificate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    
    const previewRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateEmail(email)) {
            setError('Por favor, insira um endereço de e-mail válido.');
            return;
        }

        setError(null);
        setIsLoading(true);
        setSearched(true);
        
        setTimeout(() => {
            const participantCerts = state.participants
                .filter(p => p.email.toLowerCase() === email.toLowerCase())
                .map(participant => {
                    const event = state.events.find(e => e.id === participant.eventId);
                    const template = state.templates.find(t => t.categoryId === participant.categoryId);
                    if (event && template) {
                        return { participant, event, template };
                    }
                    return null;
                })
                .filter((c): c is Certificate => c !== null);

            setFoundCertificates(participantCerts);
            setIsLoading(false);
        }, 1000);
    };

    const handleDownload = async (cert: Certificate) => {
        const key = `${cert.participant.id}-${cert.event.id}`;
        const certificateElement = previewRefs.current[key];
        if (!certificateElement) return;

        setIsDownloading(key);

        // A4 dimensions in pixels at 300 DPI for high quality
        const a4w = 2480;
        const a4h = 3508;
        
        const canvas = await html2canvas(certificateElement, {
            scale: a4w / certificateElement.offsetWidth,
            useCORS: true,
            width: certificateElement.offsetWidth,
            height: certificateElement.offsetHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`Certificado_${cert.event.name.replace(/ /g, '_')}_${cert.participant.name.replace(/ /g, '_')}.pdf`);
        
        setIsDownloading(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-4xl mx-auto">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-8 md:p-12 text-center transition-all duration-300 hover:shadow-2xl">
                    <div className="bg-brand-100 p-4 rounded-full w-fit mx-auto mb-6">
                        <Award className="h-10 w-10 text-brand-600" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-4">Portal de Certificados</h1>
                    <p className="text-gray-600 mt-2">Insira o seu e-mail para encontrar e descarregar os seus certificados de participação.</p>
                    
                    <form onSubmit={handleSearch} className="mt-8 max-w-lg mx-auto" noValidate>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    placeholder="O seu endereço de e-mail"
                                    required
                                    className={`w-full px-5 py-3 text-base text-gray-700 placeholder-gray-400 bg-gray-100 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition ${
                                        error 
                                        ? 'border-red-300 focus:ring-red-500' 
                                        : 'border-gray-200 focus:ring-brand-500'
                                    }`}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex items-center justify-center w-full sm:w-auto px-6 py-3 text-base font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-brand-500 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5 mr-2" />}
                                    {isLoading ? 'A procurar...' : 'Procurar'}
                                </button>
                            </div>
                            {error && (
                                <div className="flex items-center text-red-500 text-sm mt-1 animate-fadeIn">
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </form>
                     <button
                        onClick={() => window.location.hash = '/admin'}
                        className="text-sm text-gray-500 hover:text-brand-600 mt-4 inline-block bg-transparent border-none p-0 cursor-pointer underline"
                    >
                        Acesso de Administrador
                    </button>
                </div>

                {searched && !isLoading && (
                    <div className="mt-10">
                        {foundCertificates.length > 0 ? (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-semibold text-gray-700 text-center mb-6">Certificados Encontrados</h2>
                                {foundCertificates.map((cert) => {
                                    const key = `${cert.participant.id}-${cert.event.id}`;
                                    return (
                                    <div key={key} className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row items-center justify-between transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl border-l-4 border-brand-500">
                                        <div className="flex items-center mb-4 md:mb-0">
                                            <div className="p-3 bg-brand-50 rounded-full mr-4">
                                                <Award className="h-6 w-6 text-brand-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg text-gray-800">{cert.event.name}</p>
                                                <p className="text-sm text-gray-500">{new Date(cert.event.date).toLocaleDateString()} - {state.categories.find(c => c.id === cert.participant.categoryId)?.name}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(cert)}
                                            disabled={isDownloading === key}
                                            className="w-full md:w-auto flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 transition-colors"
                                        >
                                            {isDownloading === key ? (
                                                <>
                                                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                                    A gerar PDF...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Descarregar PDF
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )})}
                            </div>
                        ) : (
                            <div className="text-center bg-white rounded-lg shadow-md p-8">
                                <p className="text-gray-600">Nenhum certificado encontrado para este e-mail.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden previews for PDF generation */}
            <div className="absolute -left-[9999px] top-0">
                {foundCertificates.map(cert => {
                     const key = `${cert.participant.id}-${cert.event.id}`;
                    return <div key={key} ref={el => { previewRefs.current[key] = el; }}><CertificatePreview certificate={cert} /></div>
                })}
            </div>
        </div>
    );
};

export default CertificateFinder;
