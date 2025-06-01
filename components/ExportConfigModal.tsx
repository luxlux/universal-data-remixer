
import React, { useState, useEffect, useCallback } from 'react';
import { ExportConfigModalProps, ExportProfileField, ExportProfile, CommonSeparator, FileEncoding } from '../types.js';
import ActionButton from './ActionButton.js';
import { TrashIcon, PlusCircleIcon, SaveIcon, ChevronUpDownIcon } from './icons.js';

type CsvSeparatorOption = CommonSeparator | 'custom';

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profileToEdit,
  availableHeaders,
  firstRecord,
  isCreatingNew,
}) => {
  const [profileName, setProfileName] = useState('');
  const [fields, setFields] = useState<ExportProfileField[]>([]);
  
  const [csvSeparatorOption, setCsvSeparatorOption] = useState<CsvSeparatorOption>(';');
  const [customCsvSeparator, setCustomCsvSeparator] = useState<string>('');
  const [csvEncoding, setCsvEncoding] = useState<FileEncoding>('UTF-8');
  const [comment, setComment] = useState(''); // Added for profile comment
  
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [fieldSourceFilters, setFieldSourceFilters] = useState<Record<string, string>>({});

  const commonSeparators: { value: CommonSeparator; label: string }[] = [
    { value: ';', label: 'Semikolon (;)' },
    { value: ',', label: 'Komma (,)' },
    { value: '\t', label: 'Tabulator (\\t)' },
    { value: '|', label: 'Pipe (|)' },
  ];

  const encodings: { value: FileEncoding; label: string }[] = [
    { value: 'UTF-8', label: 'UTF-8 (Standard)' },
    { value: 'ISO-8859-1', label: 'ISO-8859-1 (Latin 1)' },
    { value: 'ISO-8859-2', label: 'ISO-8859-2 (Zentraleurop.)' },
    { value: 'Windows-1250', label: 'Windows-1250 (Zentraleurop.)' },
    { value: 'x-mac-ce', label: 'Mac Roman CE (Zentraleurop.)' },
  ];

  useEffect(() => {
    if (isOpen) {
      if (profileToEdit) {
        setProfileName(profileToEdit.name);
        setFields(profileToEdit.fields.map(f => ({...f})));
        setCsvEncoding(profileToEdit.csvEncoding || 'UTF-8');
        setComment(profileToEdit.comment || ''); // Load comment
        
        const isCommonSep = commonSeparators.some(cs => cs.value === profileToEdit.csvSeparator);
        if (isCommonSep) {
          setCsvSeparatorOption(profileToEdit.csvSeparator as CommonSeparator);
          setCustomCsvSeparator('');
        } else {
          setCsvSeparatorOption('custom');
          setCustomCsvSeparator(profileToEdit.csvSeparator);
        }

      } else { 
        setProfileName('');
        setFields([]);
        setCsvSeparatorOption(';');
        setCustomCsvSeparator('');
        setCsvEncoding('UTF-8');
        setComment(''); // Reset comment
      }
      setFieldSourceFilters({});
    }
  }, [isOpen, profileToEdit]);

  if (!isOpen) return null;

  const generateNewFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const handleAddField = () => {
    const newFieldId = generateNewFieldId();
    setFields([
      ...fields,
      {
        id: newFieldId,
        csvFieldName: '',
        tsvHeaderName: null,
        staticValue: '',
        isStatic: false,
      },
    ]);
    setFieldSourceFilters(prev => ({ ...prev, [newFieldId]: '' }));
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
    setFieldSourceFilters(prev => {
        const newFilters = {...prev};
        delete newFilters[id];
        return newFilters;
    });
  };

  const handleRemoveAllFields = () => {
    if (window.confirm("Möchten Sie wirklich alle konfigurierten Felder aus diesem Profil entfernen?")) {
        setFields([]);
        setFieldSourceFilters({});
    }
  }

  const handleFieldChange = (id: string, fieldName: keyof ExportProfileField, value: any) => {
    setFields(
      fields.map(field =>
        field.id === id ? { ...field, [fieldName]: value, ...(fieldName === 'isStatic' && value === true && { tsvHeaderName: null} ), ...(fieldName === 'isStatic' && value === false && { staticValue: ''} ) } : field
      )
    );
  };
  
  const handleTsvHeaderChange = (id: string, tsvHeaderName: string | null) => {
    setFields(
      fields.map(field => {
        if (field.id === id) {
          return {
            ...field,
            tsvHeaderName: tsvHeaderName,
            csvFieldName: field.csvFieldName || tsvHeaderName || '', 
          };
        }
        return field;
      })
    );
  };

  const handleInternalSave = () => {
    if (!profileName.trim()) {
      alert("Bitte geben Sie einen Namen für das Exportprofil an.");
      return;
    }
    const finalCsvSeparator = csvSeparatorOption === 'custom' ? (customCsvSeparator || ';') : csvSeparatorOption;
    if (csvSeparatorOption === 'custom' && !customCsvSeparator.trim()){
        alert("Bitte geben Sie ein benutzerdefiniertes Trennzeichen an oder wählen Sie eine Standardoption.");
        return;
    }

    const isValid = fields.every(field => field.csvFieldName.trim() !== '' && (field.isStatic || field.tsvHeaderName));
    if (!isValid) {
      alert("Für jedes Feld muss ein Ausgabe-Feld angegeben werden. Nicht-statische Felder benötigen zudem ein Quellfeld.");
      return;
    }
    
    const newOrUpdatedProfile: ExportProfile = {
      id: profileToEdit?.id || `profile_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
      name: profileName.trim(),
      fields: fields,
      csvSeparator: finalCsvSeparator,
      csvEncoding: csvEncoding,
      comment: comment.trim() || undefined, // Save comment, undefined if empty
    };
    onSave(newOrUpdatedProfile);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.setData('fieldId', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('fieldId');
    setDragOverId(null); 
    setDraggedId(null); 

    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = fields.findIndex(f => f.id === sourceId);
    const targetIndex = fields.findIndex(f => f.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newFields = [...fields];
    const [draggedItem] = newFields.splice(sourceIndex, 1);
    newFields.splice(targetIndex, 0, draggedItem);
    setFields(newFields);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };
  
  const inputBaseClass = "w-full bg-[#3B4859] text-gray-200 p-1.5 rounded-md border border-[#4A596D] focus:ring-[#FF9900] focus:border-[#FF9900] text-xs";
  const labelBaseClass = "block text-xs font-medium text-gray-300 mb-0.5";
  const textareaBaseClass = `${inputBaseClass} min-h-[40px] resize-y`;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-2 sm:p-4 z-50" aria-modal="true" role="dialog" onClick={onClose}>
      <div 
        className="bg-[#131A22] p-4 sm:p-6 rounded-lg shadow-2xl w-full max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col border border-[#3B4859]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-[#FF9900] mb-4">
          {isCreatingNew ? 'Neues Exportprofil erstellen' : `Exportprofil bearbeiten: ${profileToEdit?.name || profileName}`}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div className="md:col-span-1">
                <label htmlFor="profileName" className={labelBaseClass}>Profilname</label>
                <input
                    type="text"
                    id="profileName"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className={inputBaseClass}
                    placeholder="z.B. Standard CSV Export"
                />
            </div>
            <div className="grid grid-cols-2 gap-2 md:col-span-1">
                 <div>
                    <label htmlFor="csvSeparatorOption" className={labelBaseClass}>Trennzeichen</label>
                    <select
                        id="csvSeparatorOption"
                        value={csvSeparatorOption}
                        onChange={(e) => setCsvSeparatorOption(e.target.value as CsvSeparatorOption)}
                        className={inputBaseClass}
                    >
                        {commonSeparators.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        <option value="custom">Benutzerdefiniert...</option>
                    </select>
                </div>
                {csvSeparatorOption === 'custom' && (
                    <div>
                        <label htmlFor="customCsvSeparator" className={labelBaseClass}>Eigenes Zeichen</label>
                        <input
                            type="text"
                            id="customCsvSeparator"
                            value={customCsvSeparator}
                            onChange={(e) => setCustomCsvSeparator(e.target.value)}
                            className={inputBaseClass}
                            placeholder="z.B. ##"
                        />
                    </div>
                )}
            </div>
             <div className="md:col-span-1">
                <label htmlFor="csvEncoding" className={labelBaseClass}>Kodierung</label>
                <select
                    id="csvEncoding"
                    value={csvEncoding}
                    onChange={(e) => setCsvEncoding(e.target.value as FileEncoding)}
                    className={inputBaseClass}
                >
                    {encodings.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>
        </div>
        <div className="mb-4">
            <label htmlFor="profileComment" className={labelBaseClass}>Kommentar (optional)</label>
            <textarea
                id="profileComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={textareaBaseClass}
                rows={2}
                placeholder="Zusätzliche Informationen oder Notizen zu diesem Profil..."
            />
        </div>


        <div className="flex justify-between items-center mb-2">
            <p className={`${labelBaseClass} text-base`}>Felder konfigurieren (Drag & Drop zum Sortieren):</p>
            {fields.length > 0 && (
                 <ActionButton 
                    onClick={handleRemoveAllFields} 
                    variant="danger" 
                    className="px-2 py-1 text-xs"
                    title="Alle konfigurierten Felder entfernen"
                >
                    <TrashIcon className="w-3 h-3 mr-1"/> Alle entfernen
                </ActionButton>
            )}
        </div>
       
        <div className="overflow-y-auto flex-grow pr-1 space-y-3 mb-4 bg-[#232F3E] p-2 rounded-md border border-[#3B4859]">
          {fields.map((field) => {
            const currentFieldFilter = fieldSourceFilters[field.id] || '';
            const filteredSourceHeaders = availableHeaders.filter(header => {
                const exampleValue = firstRecord && firstRecord[header] 
                    ? `(${firstRecord[header].substring(0, 15)}${firstRecord[header].length > 15 ? '...' : ''})` 
                    : '(leer)';
                const combinedText = `${header} ${exampleValue}`.toLowerCase();
                return combinedText.includes(currentFieldFilter.toLowerCase());
            });

            return (
            <div 
              key={field.id} 
              id={field.id}
              draggable
              onDragStart={(e) => handleDragStart(e, field.id)}
              onDragOver={(e) => handleDragOver(e, field.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, field.id)}
              onDragEnd={handleDragEnd}
              className={`p-2.5 bg-[#3B4859] rounded-md border border-[#4A596D] cursor-grab active:cursor-grabbing
                          ${draggedId === field.id ? 'opacity-50 shadow-xl scale-105' : ''} 
                          ${dragOverId === field.id ? 'ring-1 ring-[#FF9900] ring-offset-1 ring-offset-[#232F3E]' : ''}`}
            >
              <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
                 <div className="self-center text-gray-400 cursor-pointer" title="Feld verschieben">
                    <ChevronUpDownIcon className="w-4 h-4"/>
                 </div>
                <div className="flex-grow" style={{ minWidth: '120px', flexBasis: '150px' }}>
                  <label htmlFor={`csvFieldName-${field.id}`} className={labelBaseClass}>Ausgabe-Feld*</label>
                  <input
                    type="text" id={`csvFieldName-${field.id}`} value={field.csvFieldName}
                    onChange={(e) => handleFieldChange(field.id, 'csvFieldName', e.target.value)}
                    className={inputBaseClass} placeholder="Kunden ID"
                  />
                </div>

                {field.isStatic ? (
                  <div className="flex-grow" style={{ minWidth: '100px', flexBasis: '130px'  }}>
                    <label htmlFor={`staticValue-${field.id}`} className={labelBaseClass}>Fester Wert</label>
                    <input
                      type="text" id={`staticValue-${field.id}`} value={field.staticValue || ''}
                      onChange={(e) => handleFieldChange(field.id, 'staticValue', e.target.value)}
                      className={inputBaseClass} placeholder="Konstanter Wert"
                    />
                  </div>
                ) : (
                  <div className="flex-grow" style={{ minWidth: '150px', flexBasis: '200px' }}>
                    <div className="mb-0.5">
                         <label htmlFor={`tsvHeaderName-${field.id}`} className={labelBaseClass}>Quellfeld*</label>
                         <input
                            type="text"
                            id={`sourceFilter-${field.id}`}
                            value={currentFieldFilter}
                            onChange={(e) => setFieldSourceFilters(prev => ({...prev, [field.id]: e.target.value}))}
                            className={`${inputBaseClass} mb-0.5 text-xs py-1`}
                            placeholder="Suche nach Quellfeld..."
                         />
                    </div>
                    <select
                      id={`tsvHeaderName-${field.id}`} value={field.tsvHeaderName || ''}
                      onChange={(e) => handleTsvHeaderChange(field.id, e.target.value || null)}
                      className={inputBaseClass}
                    >
                      <option value="">-- Auswählen --</option>
                      {filteredSourceHeaders.map(header => {
                        const exampleValue = firstRecord && firstRecord[header] ? `(${firstRecord[header].substring(0,15)}${firstRecord[header].length > 15 ? '...' : ''})` : '(leer)';
                        return ( <option key={header} value={header}> {header} {exampleValue} </option> );
                      })}
                      {filteredSourceHeaders.length === 0 && currentFieldFilter && (
                          <option value="" disabled>Keine Felder für "{currentFieldFilter}"</option>
                      )}
                       {filteredSourceHeaders.length === 0 && !currentFieldFilter && availableHeaders.length > 0 && (
                          <option value="" disabled>Keine passenden Quellfelder</option>
                      )}
                       {availableHeaders.length === 0 && (
                          <option value="" disabled>Keine Quellfelder verfügbar</option>
                      )}
                    </select>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 self-end pb-0.5">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-gray-300 text-xs whitespace-nowrap select-none" title="Als statisches Feld definieren">
                    <input
                      type="checkbox" checked={field.isStatic}
                      onChange={(e) => handleFieldChange(field.id, 'isStatic', e.target.checked)}
                      className="form-checkbox h-3.5 w-3.5 text-[#FF9900] bg-[#4A596D] border-[#6b7280] rounded focus:ring-[#FF9900] focus:ring-offset-[#3B4859]"
                    />
                    <span>Statisch</span>
                  </label>
                  <ActionButton
                      onClick={() => handleRemoveField(field.id)}
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/50 border border-red-500 hover:border-red-400 px-1.5 py-1"
                      title="Dieses Feld entfernen"
                  >
                      <TrashIcon className="w-3.5 h-3.5"/>
                  </ActionButton>
                </div>
              </div>
            </div>
          )})}
          {fields.length === 0 && <p className="text-center text-gray-400 py-3 text-sm">Noch keine Felder hinzugefügt.</p>}
        </div>

        <ActionButton onClick={handleAddField} variant="secondary" className="mb-4 self-start">
          <PlusCircleIcon className="w-4 h-4 mr-1.5"/> Neues Exportfeld
        </ActionButton>

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-3 border-t border-[#3B4859]">
          <ActionButton onClick={onClose} variant="ghost">
            Abbrechen
          </ActionButton>
          <ActionButton onClick={handleInternalSave} variant="primary">
            <SaveIcon className="w-4 h-4 mr-1.5"/> Profil speichern
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default ExportConfigModal;