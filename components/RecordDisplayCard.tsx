
import React, { useState } from 'react';
import { RecordDisplayCardProps } from '../types.js';
import { CheckSquareIcon, SquareIcon, ChevronUpDownIcon } from './icons.js';

const RecordDisplayCard: React.FC<RecordDisplayCardProps> = ({
  record,
  headers: sortedAndFilteredHeaders, // These are already sorted and filtered by App.tsx
  showEmptyFields,
  onRecordChange,
  fieldDisplayMode,
  visibleFieldKeys,
  onToggleFieldVisibility,
  isReorderingActive,
  currentFullHeaders, // All original headers from file, needed for reordering logic
  customFieldOrder,   // Current custom order for reordering logic
  onFieldOrderChange, // Callback to update custom order
}) => {
  const [draggedHeaderKey, setDraggedHeaderKey] = useState<string | null>(null);
  const [dragOverHeaderKey, setDragOverHeaderKey] = useState<string | null>(null);


  if (!record) {
    return <div className="text-gray-400 py-4">Kein Datensatz zum Anzeigen.</div>;
  }

  const handleInputChange = (headerKey: string, value: string) => {
    onRecordChange(headerKey, value);
  };

  let itemsToDisplay: { header: string; originalIndex: number; headerKey: string; value: string; isVisibleViaConfig: boolean }[] = [];

  const headersToUse = isReorderingActive 
    ? (customFieldOrder 
        ? [...customFieldOrder].filter(h => currentFullHeaders.includes(h))
            .concat(currentFullHeaders.filter(h => !customFieldOrder?.includes(h))) 
        : [...currentFullHeaders]
      )
    : sortedAndFilteredHeaders;


  headersToUse.forEach((headerKey, index) => {
    const originalIndex = currentFullHeaders.indexOf(headerKey); // Find original index if needed, though headerKey is the identifier
    const value = record[headerKey] || '';
    const isVisibleViaConfig = visibleFieldKeys.has(headerKey);

    if (isReorderingActive) {
        itemsToDisplay.push({ header: headerKey, originalIndex , headerKey, value, isVisibleViaConfig });
    } else {
        // Normal filtering logic
        if (fieldDisplayMode === 'all') {
          if (showEmptyFields || value.trim() !== '') {
            itemsToDisplay.push({ header: headerKey, originalIndex, headerKey, value, isVisibleViaConfig });
          }
        } else if (fieldDisplayMode === 'selectedOnly') {
          if (isVisibleViaConfig) {
            if (showEmptyFields || value.trim() !== '') {
              itemsToDisplay.push({ header: headerKey, originalIndex, headerKey, value, isVisibleViaConfig });
            }
          }
        } else if (fieldDisplayMode === 'configureVisible') {
          itemsToDisplay.push({ header: headerKey, originalIndex, headerKey, value, isVisibleViaConfig });
        }
    }
  });


  if (currentFullHeaders.length > 0 && itemsToDisplay.length === 0 && !isReorderingActive) {
    if (fieldDisplayMode === 'selectedOnly' && !visibleFieldKeys.size) {
         return (
            <div className="bg-[#232F3E] shadow-lg rounded-lg p-4 md:p-5 w-full">
                <div className="text-gray-400 py-4 text-center">
                Keine Felder für die Anzeige ausgewählt. Wechseln Sie zu "Felder auswählen" oder "Alle Felder anzeigen".
                </div>
            </div>
         );
    }
     if (fieldDisplayMode === 'selectedOnly' && visibleFieldKeys.size > 0 && !showEmptyFields) {
         return (
            <div className="bg-[#232F3E] shadow-lg rounded-lg p-4 md:p-5 w-full">
                <div className="text-gray-400 py-4 text-center">
                  Alle ausgewählten Felder sind leer. Klicken Sie auf 'Leere einblenden' oder ändern Sie die Feldauswahl.
                </div>
            </div>
         );
    }
    return (
      <div className="bg-[#232F3E] shadow-lg rounded-lg p-4 md:p-5 w-full">
        <div className="text-gray-400 py-4 text-center">
          {showEmptyFields || fieldDisplayMode === 'configureVisible' 
            ? "Keine Felder mit Inhalt oder für die Auswahl vorhanden." 
            : "Alle relevanten Felder sind leer. Klicken Sie auf 'Leere einblenden' oder ändern Sie den Anzeigemodus."}
        </div>
      </div>
    );
  }
  
  if (currentFullHeaders.length === 0) {
      return (
        <div className="bg-[#232F3E] shadow-lg rounded-lg p-4 md:p-5 w-full">
            <div className="text-gray-400 py-4">Keine Kopfzeilen in der Datei definiert oder die Datei ist leer.</div>
        </div>
      );
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, headerKey: string) => {
    if (!isReorderingActive) return;
    e.dataTransfer.setData('text/plain', headerKey);
    setDraggedHeaderKey(headerKey);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, headerKey: string) => {
    if (!isReorderingActive || headerKey === draggedHeaderKey) return;
    e.preventDefault();
    setDragOverHeaderKey(headerKey);
  };
  
  const handleDragLeave = () => {
    if (!isReorderingActive) return;
    setDragOverHeaderKey(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetHeaderKey: string) => {
    if (!isReorderingActive) return;
    e.preventDefault();
    const sourceHeaderKey = e.dataTransfer.getData('text/plain');
    setDraggedHeaderKey(null);
    setDragOverHeaderKey(null);

    if (sourceHeaderKey && sourceHeaderKey !== targetHeaderKey) {
      const baseOrder = customFieldOrder ? [...customFieldOrder] : [...currentFullHeaders];
      // Ensure all currentFullHeaders are present in baseOrder, append missing ones
      currentFullHeaders.forEach(h => {
        if (!baseOrder.includes(h)) {
          baseOrder.push(h);
        }
      });
      
      const sourceIndex = baseOrder.indexOf(sourceHeaderKey);
      const targetIndex = baseOrder.indexOf(targetHeaderKey);

      if (sourceIndex > -1 && targetIndex > -1) {
        const newOrderedHeaders = [...baseOrder];
        const [draggedItem] = newOrderedHeaders.splice(sourceIndex, 1);
        newOrderedHeaders.splice(targetIndex, 0, draggedItem);
        onFieldOrderChange(newOrderedHeaders);
      }
    }
  };
  
  const handleDragEnd = () => {
    if (!isReorderingActive) return;
    setDraggedHeaderKey(null);
    setDragOverHeaderKey(null);
  };


  const itemsPerColumn = Math.ceil(itemsToDisplay.length / 3);
  const firstColumnItems = itemsToDisplay.slice(0, itemsPerColumn);
  const secondColumnItems = itemsToDisplay.slice(itemsPerColumn, 2 * itemsPerColumn);
  const thirdColumnItems = itemsToDisplay.slice(2 * itemsPerColumn);

  const renderItem = (item: { header: string; headerKey: string; value: string; isVisibleViaConfig: boolean }, isFirstInColumn: boolean) => {
    const displayHeader = item.header || `Feld ${item.headerKey}`;
    const truncatedHeader = displayHeader.length > 25 ? displayHeader.substring(0, 25) + '...' : displayHeader;

    return (
        <div 
            key={item.headerKey} 
            id={`field-item-${item.headerKey}`}
            draggable={isReorderingActive}
            onDragStart={isReorderingActive ? (e) => handleDragStart(e, item.headerKey) : undefined}
            onDragOver={isReorderingActive ? (e) => handleDragOver(e, item.headerKey) : undefined}
            onDragLeave={isReorderingActive ? handleDragLeave : undefined}
            onDrop={isReorderingActive ? (e) => handleDrop(e, item.headerKey) : undefined}
            onDragEnd={isReorderingActive ? handleDragEnd : undefined}
            className={`flex items-baseline border-b border-[#3B4859] py-1 
                       ${isFirstInColumn ? 'lg:pt-0' : ''} last:border-b-0 last:pb-0
                       ${isReorderingActive ? 'cursor-grab active:cursor-grabbing hover:bg-[#2A3B4D]' : ''}
                       ${draggedHeaderKey === item.headerKey ? 'opacity-50 shadow-xl scale-105' : ''}
                       ${dragOverHeaderKey === item.headerKey ? 'ring-2 ring-[#FF9900] ring-offset-1 ring-offset-[#232F3E]' : ''}
                      `}
        >
        {isReorderingActive && <ChevronUpDownIcon className="w-4 h-4 text-gray-500 mr-1.5 shrink-0" />}
        {fieldDisplayMode === 'configureVisible' && !isReorderingActive && (
             <button
                onClick={() => onToggleFieldVisibility(item.headerKey, !item.isVisibleViaConfig)}
                title={item.isVisibleViaConfig ? "Feld ausblenden" : "Feld anzeigen"}
                className="mr-2 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#FF9900]"
            >
                {item.isVisibleViaConfig ? <CheckSquareIcon className="w-4 h-4 text-[#FF9900]" /> : <SquareIcon className="w-4 h-4 text-gray-500" />}
            </button>
        )}
        <span 
            className="text-xs font-medium text-[#FF9900] w-2/5 md:w-1/3 shrink-0 pr-1" 
            title={displayHeader}
        >
            {truncatedHeader}
        </span>
        <input
            type="text"
            value={item.value}
            onChange={(e) => handleInputChange(item.headerKey, e.target.value)}
            aria-label={`Wert für ${displayHeader}`}
            className="flex-grow bg-[#3B4859] text-gray-200 p-1 rounded border border-[#4A596D] focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900] transition-colors text-xs w-full"
            disabled={isReorderingActive} // Disable input while reordering
        />
        </div>
    );
  }

  return (
    <div className="bg-[#232F3E] shadow-lg rounded-lg p-3 md:p-4 w-full">
      {itemsToDisplay.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">
          <div className="space-y-0.5">
            {firstColumnItems.map((item, idx) => renderItem(item, idx === 0))}
          </div>
          <div className="space-y-0.5">
            {secondColumnItems.map((item, idx) => renderItem(item, idx === 0))}
          </div>
          <div className="space-y-0.5">
            {thirdColumnItems.map((item, idx) => renderItem(item, idx === 0))}
          </div>
        </div>
      ) : (
         <div className="text-gray-400 py-4 text-center">
            Keine Felder zum Anzeigen.
         </div>
      )}
    </div>
  );
};

export default RecordDisplayCard;