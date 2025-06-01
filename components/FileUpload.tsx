
import React, { useCallback, useState, useEffect } from 'react';
import { FileUploadProps, CommonSeparator, FileUploadSeparatorChoice, FileEncoding, HeaderDetectionChoice } from '../types.js';
import { DocumentPlusIcon } from './icons.js';

const FileUpload: React.FC<FileUploadProps> = ({ 
    onFileLoad, 
    isLoading, 
    className, 
    initialSeparatorChoice,
    initialCustomSeparator,
    initialEncoding,
    initialHeaderChoice,
    currentFileNameForDisplay 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileNameForDisplay, setFileNameForDisplay] = useState<string | null>(null); // Local for UI feedback during drag/drop or selection
  
  const [separatorOption, setSeparatorOption] = useState<FileUploadSeparatorChoice>(initialSeparatorChoice);
  const [customSeparator, setCustomSeparator] = useState<string>(initialCustomSeparator);
  const [fileEncoding, setFileEncoding] = useState<FileEncoding>(initialEncoding);
  const [headerChoice, setHeaderChoice] = useState<HeaderDetectionChoice>(initialHeaderChoice);

  // Update local state when initial props change (e.g., due to project switch)
  useEffect(() => {
    setSeparatorOption(initialSeparatorChoice);
    setCustomSeparator(initialCustomSeparator);
    setFileEncoding(initialEncoding);
    setHeaderChoice(initialHeaderChoice);
  }, [initialSeparatorChoice, initialCustomSeparator, initialEncoding, initialHeaderChoice]);
  
  // Update display name when the global file name changes (e.g., file cleared)
  useEffect(() => {
    setFileNameForDisplay(currentFileNameForDisplay);
  }, [currentFileNameForDisplay]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileNameForDisplay(file.name); 
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      let finalSeparator: string | 'auto';
      if (separatorOption === 'custom') {
        finalSeparator = customSeparator || '\t'; 
      } else {
        finalSeparator = separatorOption;
      }
      onFileLoad(content, file.name, finalSeparator, fileEncoding, headerChoice);
    };
    reader.readAsText(file, fileEncoding);
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      setFileNameForDisplay(file.name);
      readFile(file);
      event.dataTransfer.clearData();
    }
  }, [onFileLoad, separatorOption, customSeparator, fileEncoding, headerChoice]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const commonSeparators: { value: CommonSeparator; label: string }[] = [
    { value: ';', label: 'Semikolon (;)' },
    { value: ',', label: 'Komma (,)' },
    { value: '\t', label: 'Tabulator (\\t)' },
    { value: '|', label: 'Pipe (|)' },
  ];

  const encodings: { value: FileEncoding; label: string }[] = [
    { value: 'UTF-8', label: 'UTF-8 (Standard)' },
    { value: 'ISO-8859-1', label: 'ISO-8859-1 (Latin 1)' },
    { value: 'ISO-8859-2', label: 'ISO-8859-2 (Zentraleuropäisch)' },
    { value: 'Windows-1250', label: 'Windows-1250 (Zentraleuropäisch)' },
    { value: 'x-mac-ce', label: 'Mac Roman CE (Zentraleuropäisch)' },
  ];

  const headerOptions: { value: HeaderDetectionChoice; label: string }[] = [
    { value: 'auto', label: 'Automatisch erkennen' },
    { value: 'firstLineIsHeader', label: 'Erste Zeile ist Header' },
    { value: 'noHeader', label: 'Kein Header (generische Namen)' },
  ];

  const selectClassName = "w-full bg-[#3B4859] text-white p-2 rounded-md border border-[#4A596D] focus:ring-[#FF9900] focus:border-[#FF9900] text-sm";

  const reReadFileIfOptionsChanged = (newSepOpt: FileUploadSeparatorChoice = separatorOption, newCustSep: string = customSeparator, newEnc: FileEncoding = fileEncoding, newHeadChoice: HeaderDetectionChoice = headerChoice) => {
    // Only re-read if a file is already considered "loaded" globally (indicated by currentFileNameForDisplay)
    if (currentFileNameForDisplay) {
        const currentInputElement = document.getElementById('fileInput') as HTMLInputElement;
        const currentFile = currentInputElement?.files?.[0];
        // And if the file in the input matches the globally loaded file name
        if (currentFile && currentFileNameForDisplay === currentFile.name) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target?.result as string;
              let finalSeparator: string | 'auto';
              if (newSepOpt === 'custom') {
                finalSeparator = newCustSep || '\t'; 
              } else {
                finalSeparator = newSepOpt;
              }
              onFileLoad(content, currentFile.name, finalSeparator, newEnc, newHeadChoice);
            };
            reader.readAsText(currentFile, newEnc); // Use the new encoding for re-read
        }
    }
  };


  return (
    <div className={`${className || ''}`}>
        <div
          className={`border-2 border-dashed rounded-xl p-6 md:p-8 text-center cursor-pointer transition-colors duration-200 ease-in-out
                      ${isDragging ? 'border-[#FF9900] bg-[#2a3847]' : 'border-[#4A596D] hover:border-[#FF9900] bg-[#232F3E]'}
                      `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onClick={() => !isLoading && document.getElementById('fileInput')?.click()}
          role="button"
          tabIndex={isLoading ? -1 : 0}
          aria-label="Datei hochladen"
        >
          <input
            type="file"
            id="fileInput"
            className="hidden"
            accept=".txt,.tsv,.csv,.psv,.text,.json" 
            onChange={handleFileChange}
            disabled={isLoading}
          />
          {isLoading && fileNameForDisplay ? ( // Show loading state for a specific file being processed
            <div className="flex flex-col items-center justify-center py-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9900] mb-4"></div>
              <p className="text-gray-300">Datei {`"${fileNameForDisplay}"`} wird verarbeitet...</p>
            </div>
          ) : isLoading ? ( // Generic loading if no specific file name yet
            <div className="flex flex-col items-center justify-center py-4">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9900] mb-4"></div>
               <p className="text-gray-300">Wird geladen...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <DocumentPlusIcon className="w-12 h-12 md:w-16 md:h-16 mb-4 text-[#FF9900]" />
              <p className="text-base md:text-lg font-semibold text-gray-300">Datei hierher ziehen oder klicken</p>
              <p className="text-xs md:text-sm">Unterstützte Formate: .txt, .tsv, .csv, .json, ...</p>
              {fileNameForDisplay && <p className="text-xs text-gray-500 mt-2">Aktuell im System: {fileNameForDisplay}</p>}
            </div>
          )}
        </div>
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
                <label htmlFor="encoding-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Dateikodierung:
                </label>
                <select
                    id="encoding-select"
                    value={fileEncoding}
                    onChange={(e) => {
                        const newEnc = e.target.value as FileEncoding;
                        setFileEncoding(newEnc);
                        reReadFileIfOptionsChanged(separatorOption, customSeparator, newEnc, headerChoice);
                    }}
                    disabled={isLoading}
                    className={selectClassName}
                >
                    {encodings.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="separator-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Trennzeichen für Quelldatei:
                </label>
                <select
                    id="separator-select"
                    value={separatorOption}
                    onChange={(e) => {
                        const newSep = e.target.value as FileUploadSeparatorChoice;
                        setSeparatorOption(newSep);
                        if (newSep !== 'custom') reReadFileIfOptionsChanged(newSep, customSeparator, fileEncoding, headerChoice);
                        else if (customSeparator) reReadFileIfOptionsChanged(newSep, customSeparator, fileEncoding, headerChoice); // If custom is selected, re-read if customSep already has value
                    }}
                    disabled={isLoading}
                    className={selectClassName}
                >
                    <option value="auto">Automatisch erkennen</option>
                    {commonSeparators.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    <option value="custom">Benutzerdefiniert...</option>
                </select>
            </div>
            {separatorOption === 'custom' && (
                 <div>
                    <label htmlFor="custom-separator-input" className="block text-sm font-medium text-gray-300 mb-1">
                        Eigenes Trennzeichen:
                    </label>
                    <input
                        type="text"
                        id="custom-separator-input"
                        value={customSeparator}
                        onChange={(e) => setCustomSeparator(e.target.value)}
                        onBlur={() => reReadFileIfOptionsChanged(separatorOption, customSeparator, fileEncoding, headerChoice)}
                        disabled={isLoading}
                        className={selectClassName}
                        placeholder="z.B. ##"
                    />
                </div>
            )}
             <div>
                <label htmlFor="header-choice-select" className="block text-sm font-medium text-gray-300 mb-1">
                    Header-Zeile:
                </label>
                <select
                    id="header-choice-select"
                    value={headerChoice}
                    onChange={(e) => {
                        const newHeaderChoice = e.target.value as HeaderDetectionChoice;
                        setHeaderChoice(newHeaderChoice);
                        reReadFileIfOptionsChanged(separatorOption, customSeparator, fileEncoding, newHeaderChoice);
                    }}
                    disabled={isLoading}
                    className={selectClassName}
                >
                    {headerOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>
        </div>
    </div>
  );
};

export default FileUpload;