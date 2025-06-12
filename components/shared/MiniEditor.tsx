import React, { useRef, useEffect } from 'react';
import { BoldIcon, ItalicIcon, UnderlineIcon, ListOrderedIcon, ListUnorderedIcon } from '../../constants'; 

export interface MiniEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const MiniEditor: React.FC<MiniEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isEffectivelyEmpty = (html: string): boolean => !html || html.replace(/<br\s*\/?>/gi, "").replace(/<p>\s*<\/p>/gi, "").trim() === "";
  const effectivelyEmpty = isEffectivelyEmpty(value);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => editorRef.current && onChange(editorRef.current.innerHTML);
  const execCmd = (command: string, cmdValue?: string) => {
    document.execCommand(command, false, cmdValue);
    if (editorRef.current) { editorRef.current.focus(); onChange(editorRef.current.innerHTML); }
  };
  
  const editorToolbarClasses = "flex items-center space-x-1 p-2 bg-neutral-700 border border-neutral-600 rounded-t-md";
  const editorButtonClasses = "p-1.5 hover:bg-neutral-600 rounded text-neutral-300 hover:text-neutral-100";
  const editorContentClasses = `min-h-[120px] p-3 border border-t-0 border-neutral-600 rounded-b-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary overflow-y-auto text-neutral-100 bg-neutral-800`;

  return (
    <div>
      <div className={editorToolbarClasses}>
        <button type="button" onClick={() => execCmd('bold')} title="Negrito" className={editorButtonClasses}><BoldIcon className="h-5 w-5" /></button>
        <button type="button" onClick={() => execCmd('italic')} title="Itálico" className={editorButtonClasses}><ItalicIcon className="h-5 w-5" /></button>
        <button type="button" onClick={() => execCmd('underline')} title="Sublinhado" className={editorButtonClasses}><UnderlineIcon className="h-5 w-5" /></button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} title="Lista Ordenada" className={editorButtonClasses}><ListOrderedIcon className="h-5 w-5" /></button>
        <button type="button" onClick={() => execCmd('insertUnorderedList')} title="Lista Não Ordenada" className={editorButtonClasses}><ListUnorderedIcon className="h-5 w-5" /></button>
      </div>
      <div 
        ref={editorRef} 
        contentEditable={true} 
        onInput={handleInput} 
        className={`${editorContentClasses} ${effectivelyEmpty ? 'is-empty-placeholder' : ''}`} 
        data-placeholder={placeholder} 
        style={{ whiteSpace: 'pre-wrap' }} 
      />
    </div>
  );
};