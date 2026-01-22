
import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Plus, Undo, Redo } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    variables: string[];
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, variables }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [fontSize, setFontSize] = useState('3'); // Default 3 (normal)

    // Sincroniza o valor inicial e atualizações externas (ex: carregar modelo)
    // Mas ignora se o conteúdo atual já for igual ao valor para evitar saltos de cursor
    useEffect(() => {
        if (contentRef.current && contentRef.current.innerHTML !== value) {
            contentRef.current.innerHTML = value;
        }
    }, [value]); 

    const handleInput = () => {
        if (contentRef.current) {
            const html = contentRef.current.innerHTML;
            onChange(html);
        }
    };

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (contentRef.current) {
            contentRef.current.focus();
            onChange(contentRef.current.innerHTML);
        }
    };

    const insertVariable = (variable: string) => {
        if (contentRef.current) {
            contentRef.current.focus();
            // Tenta inserir no local do cursor
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                const textNode = document.createTextNode(variable);
                range.insertNode(textNode);
                
                // Move o cursor para depois da variável
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // Fallback se não houver seleção
                document.execCommand('insertText', false, variable);
            }
            
            onChange(contentRef.current.innerHTML);
        }
        setIsMenuOpen(false);
    };

    const handleFontSize = (size: string) => {
        setFontSize(size);
        execCommand('fontSize', size);
    }

    return (
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
                
                {/* Formatting */}
                <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                    <button type="button" onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Negrito">
                        <Bold size={18} />
                    </button>
                    <button type="button" onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Itálico">
                        <Italic size={18} />
                    </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                    <button type="button" onClick={() => execCommand('justifyLeft')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Esquerda">
                        <AlignLeft size={18} />
                    </button>
                    <button type="button" onClick={() => execCommand('justifyCenter')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Centro">
                        <AlignCenter size={18} />
                    </button>
                    <button type="button" onClick={() => execCommand('justifyRight')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Direita">
                        <AlignRight size={18} />
                    </button>
                </div>

                {/* Font Size */}
                <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                    <Type size={18} className="text-gray-400 ml-1" />
                    <select 
                        className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                        value={fontSize}
                        onChange={(e) => handleFontSize(e.target.value)}
                    >
                        <option value="1">Pequeno</option>
                        <option value="3">Normal</option>
                        <option value="5">Grande</option>
                        <option value="7">Enorme</option>
                    </select>
                </div>

                {/* History */}
                 <div className="flex items-center space-x-1 border-r border-gray-300 pr-2 mr-1">
                    <button type="button" onClick={() => execCommand('undo')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Desfazer">
                        <Undo size={16} />
                    </button>
                    <button type="button" onClick={() => execCommand('redo')} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Refazer">
                        <Redo size={16} />
                    </button>
                </div>

                {/* Variable Inserter */}
                <div className="relative ml-auto">
                    <button 
                        type="button"
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium transition-colors"
                    >
                        <Plus size={16} />
                        Inserir Variável
                    </button>
                    
                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20 py-1 max-h-60 overflow-y-auto">
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    Variáveis Disponíveis
                                </div>
                                {variables.map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => insertVariable(v)}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Editable Area */}
            <div 
                ref={contentRef}
                contentEditable
                suppressContentEditableWarning={true}
                onInput={handleInput}
                className="min-h-[200px] p-4 focus:outline-none prose prose-sm max-w-none text-gray-800"
                style={{ fontFamily: 'Arial, sans-serif' }}
            />
             <div className="bg-gray-50 px-3 py-1 text-xs text-gray-400 border-t flex justify-between">
                <span>Editor Visual</span>
                <span>Use Ctrl+Z para desfazer</span>
            </div>
        </div>
    );
};

export default RichTextEditor;
