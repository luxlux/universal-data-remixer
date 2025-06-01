
import React, { useState, useRef } from 'react';
import { ManageProfilesModalProps } from '../types.js';
import ActionButton from './ActionButton.js';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon, ArrowDownOnSquareIcon, ArrowUpOnSquareIcon, DocumentDuplicateIcon, InformationCircleIcon } from './icons.js';

const ManageProfilesModal: React.FC<ManageProfilesModalProps> = ({
  isOpen,
  onClose,
  profiles,
  onAddProfile,
  onSelectProfile, 
  onDeleteProfile, 
  onDuplicateProfile,
  onExportAllProfiles,
  onImportProfiles,
  activeProfileId
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddProfile = () => {
    if (newProfileName.trim()) {
      onAddProfile(newProfileName.trim());
      setNewProfileName('');
    } else {
      alert("Bitte geben Sie einen Namen für das neue Profil ein.");
    }
  };

  const triggerImportFile = () => {
    importFileInputRef.current?.click();
  };
  
  const labelBaseClass = "block text-xs font-medium text-gray-300 mb-0.5";
  const inputBaseClass = "w-full bg-[#3B4859] text-gray-200 p-1.5 rounded-md border border-[#4A596D] focus:ring-[#FF9900] focus:border-[#FF9900] text-sm";


  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-2 sm:p-4 z-50" aria-modal="true" role="dialog" onClick={onClose}>
      <div 
        className="bg-[#131A22] p-4 sm:p-6 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-[#3B4859]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-[#FF9900] mb-4">Exportprofile verwalten</h2>

        <div className="mb-4 p-3 bg-[#232F3E] rounded-md border border-[#3B4859]">
          <label htmlFor="newProfileName" className={labelBaseClass}>Neues Profil erstellen:</label>
          <div className="flex items-center space-x-2 mt-1">
            <input
              type="text"
              id="newProfileName"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              className={inputBaseClass}
              placeholder="Name des neuen Profils"
            />
            <ActionButton onClick={handleAddProfile} variant="secondary" title="Neues Profil hinzufügen" className="px-3 py-1.5">
              <PlusCircleIcon className="w-4 h-4"/>
            </ActionButton>
          </div>
        </div>
        
        <p className={`${labelBaseClass} mb-1`}>Vorhandene Profile:</p>
        <div className="overflow-y-auto flex-grow space-y-1.5 mb-4 pr-1 bg-[#232F3E] p-2 rounded-md border border-[#3B4859]">
          {profiles.length === 0 && (
            <p className="text-center text-gray-400 py-3 text-sm">Keine Profile vorhanden.</p>
          )}
          {profiles.map(profile => (
            <div 
              key={profile.id} 
              className={`flex items-center justify-between p-2 rounded-md 
                          ${profile.id === activeProfileId ? 'bg-[#FF9900] text-[#131A22]' : 'bg-[#3B4859] text-gray-200 hover:bg-[#4A596D]'}`}
            >
              <div className="flex items-center mr-2">
                <span className={`font-medium text-sm truncate ${profile.id === activeProfileId ? 'text-[#131A22]' : 'text-gray-200'}`}>{profile.name}</span>
                {profile.comment && (
                    <div className="group relative ml-1.5">
                        <InformationCircleIcon className={`w-3.5 h-3.5 cursor-help ${profile.id === activeProfileId ? 'text-gray-700' : 'text-gray-400 group-hover:text-[#FF9900]'}`} />
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 max-h-40 overflow-y-auto bg-[#131A22] text-gray-300 text-xs rounded-md p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40 border border-[#4A596D] whitespace-pre-wrap">
                            {profile.comment}
                        </div>
                    </div>
                )}
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <ActionButton 
                  onClick={() => onDuplicateProfile(profile.id)}
                  variant="ghost" 
                  title="Profil duplizieren" 
                  className={`p-1 ${profile.id === activeProfileId ? 'text-[#131A22] hover:bg-black hover:bg-opacity-20' : 'text-gray-300 hover:text-white'}`}
                >
                  <DocumentDuplicateIcon className="w-4 h-4"/>
                </ActionButton>
                <ActionButton 
                  onClick={() => onSelectProfile(profile.id)} 
                  variant="ghost" 
                  title="Profil bearbeiten" 
                  className={`p-1 ${profile.id === activeProfileId ? 'text-[#131A22] hover:bg-black hover:bg-opacity-20' : 'text-gray-300 hover:text-white'}`}
                >
                  <PencilSquareIcon className="w-4 h-4"/>
                </ActionButton>
                <ActionButton 
                  onClick={() => onDeleteProfile(profile.id)} 
                  variant="ghost" 
                  title="Profil löschen" 
                  className={`p-1 ${profile.id === activeProfileId ? 'text-red-800 hover:text-red-900 hover:bg-black hover:bg-opacity-25' : 'text-red-400 hover:text-red-100 hover:bg-red-700/75'}`}
                >
                  <TrashIcon className="w-4 h-4"/>
                </ActionButton>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
            <ActionButton onClick={triggerImportFile} variant="ghost" className="w-full sm:w-auto">
                <ArrowUpOnSquareIcon className="w-4 h-4 mr-1.5"/>Profile importieren (.json)
            </ActionButton>
            <input type="file" ref={importFileInputRef} onChange={onImportProfiles} accept=".json" className="hidden" />
            <ActionButton onClick={onExportAllProfiles} variant="ghost" disabled={profiles.length === 0} className="w-full sm:w-auto">
                <ArrowDownOnSquareIcon className="w-4 h-4 mr-1.5"/>Alle Profile exportieren
            </ActionButton>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#3B4859]">
          <ActionButton onClick={onClose} variant="primary">
            Schließen
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default ManageProfilesModal;