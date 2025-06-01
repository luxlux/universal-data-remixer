
import React from 'react';
import { FieldDisplayControlsProps, FieldDisplayMode } from '../types.js';
import ActionButton from './ActionButton.js';
import { EyeIcon, EyeSlashIcon, TrashIcon, CogIcon, ChevronUpDownIcon } from './icons.js'; // Added ChevronUpDownIcon

const FieldDisplayControls: React.FC<FieldDisplayControlsProps> = ({
  showEmptyFields, 
  onToggleShowEmptyFields, 
  fieldDisplayMode, 
  onSetFieldDisplayMode, 
  onClearAllVisibleFieldKeys, 
  totalRecords,
  isReorderingFields, // New prop
  onToggleReorderFields, // New prop
  onResetFieldOrder, // New prop
}) => {
  if (totalRecords === 0) return null;

  const modes: { value: FieldDisplayMode, label: string, title: string }[] = [
    { value: 'all', label: 'Alle Felder', title: 'Alle Felder anzeigen (inkl. potenziell leere, falls aktiviert)' },
    { value: 'selectedOnly', label: 'Nur ausgewählte', title: 'Nur zuvor ausgewählte sichtbare Felder anzeigen' },
    { value: 'configureVisible', label: 'Felder auswählen', title: 'Sichtbarkeit einzelner Felder konfigurieren' },
  ];

  return (
    <div className="mb-3 p-3 bg-[#2A3B4D] rounded-md border border-[#3B4859]">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 items-end">
        
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-300 mb-1">Angezeigte Felder anpassen:</label>
          <div className="flex flex-wrap gap-2">
            {modes.map(mode => (
              <ActionButton
                key={mode.value}
                onClick={() => onSetFieldDisplayMode(mode.value)}
                variant={fieldDisplayMode === mode.value && !isReorderingFields ? 'primary' : 'ghost'}
                title={mode.title}
                className={`text-xs px-2.5 py-1.5 ${fieldDisplayMode === mode.value && !isReorderingFields ? 'ring-2 ring-offset-2 ring-offset-[#2A3B4D] ring-[#FF9900]' : ''}`}
                disabled={isReorderingFields && fieldDisplayMode !== mode.value} 
              >
                {mode.value === 'configureVisible' && <CogIcon className="w-3.5 h-3.5 mr-1"/>}
                {mode.label}
              </ActionButton>
            ))}
             <ActionButton
                onClick={onToggleReorderFields}
                variant={isReorderingFields ? 'primary' : 'ghost'}
                title={isReorderingFields ? "Sortiermodus beenden" : "Reihenfolge der Felder per Drag & Drop anpassen"}
                className={`text-xs px-2.5 py-1.5 ${isReorderingFields ? 'ring-2 ring-offset-2 ring-offset-[#2A3B4D] ring-[#FF9900]' : ''}`}
            >
                <ChevronUpDownIcon className="w-3.5 h-3.5 mr-1"/>
                Reihenfolge
            </ActionButton>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <ActionButton
                onClick={onToggleShowEmptyFields}
                variant="ghost"
                title={showEmptyFields ? "Leere Felder ausblenden" : "Leere Felder anzeigen"}
                className="text-xs w-full sm:w-auto px-2.5 py-1.5"
                disabled={isReorderingFields}
            >
                {showEmptyFields ? <EyeSlashIcon className="w-3.5 h-3.5 mr-1"/> : <EyeIcon className="w-3.5 h-3.5 mr-1"/>}
                {showEmptyFields ? 'Leere ausblenden' : 'Leere einblenden'}
            </ActionButton>
            
            {fieldDisplayMode === 'configureVisible' && !isReorderingFields && (
                <ActionButton
                    onClick={onClearAllVisibleFieldKeys}
                    variant="danger"
                    title="Alle Feldsichtbarkeits-Einstellungen für dieses Projekt zurücksetzen"
                    className="text-xs w-full sm:w-auto px-2.5 py-1.5"
                >
                    <TrashIcon className="w-3.5 h-3.5 mr-1"/> Alle Auswahlen löschen
                </ActionButton>
            )}
            {isReorderingFields && (
                <ActionButton
                    onClick={onResetFieldOrder}
                    variant="danger"
                    title="Benutzerdefinierte Feldreihenfolge zurücksetzen"
                    className="text-xs w-full sm:w-auto px-2.5 py-1.5"
                >
                    <TrashIcon className="w-3.5 h-3.5 mr-1"/> Reihenfolge zurücksetzen
                </ActionButton>
            )}
        </div>
      </div>
    </div>
  );
};

export default FieldDisplayControls;