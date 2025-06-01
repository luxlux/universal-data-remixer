
import React from 'react';
import ActionButton from './ActionButton.js';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, XCircleIcon, CheckSquareIcon, SquareIcon } from './icons.js';
import { RecordControlsProps } from '../types.js';

const RecordControls: React.FC<RecordControlsProps> = ({
  onPrevious,
  onNext,
  onToggleSelection,
  isPreviousDisabled,
  isNextDisabled,
  isCurrentSelected,
  currentIndex,
  totalRecords,
  onToggleSelectAll, // New prop
  isAllSelected,     // New prop
}) => {
  if (totalRecords === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-between items-center space-y-3 sm:space-y-0 sm:space-x-2 mb-4">
      <div className="flex items-center space-x-2">
        <ActionButton onClick={onPrevious} disabled={isPreviousDisabled} title="Vorheriger Datensatz (Pfeil links)" variant="ghost">
          <ArrowLeftIcon /> <span className="hidden sm:inline">Zurück</span>
        </ActionButton>
        <span className="text-gray-300 font-medium whitespace-nowrap text-sm">
          Datensatz {currentIndex + 1} von {totalRecords}
        </span>
        <ActionButton onClick={onNext} disabled={isNextDisabled} title="Nächster Datensatz (Pfeil rechts)" variant="ghost">
          <span className="hidden sm:inline">Weiter</span> <ArrowRightIcon />
        </ActionButton>
      </div>
      
      <div className="flex items-center space-x-2">
        {onToggleSelectAll && (
             <ActionButton
                onClick={onToggleSelectAll}
                variant="ghost"
                title={isAllSelected ? "Auswahl aller Datensätze aufheben" : "Alle Datensätze auswählen"}
                disabled={totalRecords === 0}
                className="text-xs px-2 py-1"
            >
                {isAllSelected ? <CheckSquareIcon className="w-4 h-4 mr-1" /> : <SquareIcon className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline">{isAllSelected ? "Alle Abw." : "Alle Ausw."}</span>
                <span className="sm:hidden">{isAllSelected ? "Abw." : "Ausw."}</span>
            </ActionButton>
        )}
        <ActionButton 
          onClick={onToggleSelection} 
          variant={isCurrentSelected ? 'primary' : 'secondary'}
          title={isCurrentSelected ? "Auswahl aufheben (Leertaste)" : "Datensatz auswählen (Leertaste)"}
          className={`${isCurrentSelected ? "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500" : ""} px-2 py-1`}
        >
          {isCurrentSelected ? <CheckCircleIcon className="w-4 h-4 mr-1 sm:mr-2"/> : <XCircleIcon className="w-4 h-4 mr-1 sm:mr-2"/>}
          <span className="text-xs sm:text-sm">{isCurrentSelected ? 'Ausgewählt' : 'Auswählen'}</span>
        </ActionButton>
      </div>
    </div>
  );
};

export default RecordControls;