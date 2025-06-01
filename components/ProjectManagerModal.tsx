
import React, { useState, useRef, useEffect } from 'react';
import { ProjectManagerModalProps, Project } from '../types.js';
import ActionButton from './ActionButton.js';
import { PlusCircleIcon, TrashIcon, PencilSquareIcon, ArrowDownOnSquareIcon, ArrowUpOnSquareIcon, DocumentDuplicateIcon, SaveIcon, XCircleIcon } from './icons.js';

const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onAddProject,
  onSelectProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onExportAllProjects,
  onExportSingleProject, // New prop
  onImportProjects,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
        setEditingProjectId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      onAddProject(newProjectName.trim());
      setNewProjectName('');
    } else {
      alert("Bitte geben Sie einen Namen für das neue Projekt ein.");
    }
  };

  const handleStartEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  };

  const handleSaveEdit = () => {
    if (editingProjectId && editingProjectName.trim()) {
      onRenameProject(editingProjectId, editingProjectName.trim());
      setEditingProjectId(null);
    } else {
        alert("Projektname darf nicht leer sein.");
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
  };

  const triggerImportFile = () => {
    importFileInputRef.current?.click();
  };
  
  const labelBaseClass = "block text-xs font-medium text-gray-300 mb-0.5";
  const inputBaseClass = "w-full bg-[#3B4859] text-gray-200 p-1.5 rounded-md border border-[#4A596D] focus:ring-[#FF9900] focus:border-[#FF9900] text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-2 sm:p-4 z-[60]" aria-modal="true" role="dialog" onClick={onClose}>
      <div 
        className="bg-[#131A22] p-4 sm:p-6 rounded-lg shadow-2xl w-full max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col border border-[#3B4859]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-[#FF9900] mb-4">Projekte verwalten</h2>

        <div className="mb-4 p-3 bg-[#232F3E] rounded-md border border-[#3B4859]">
          <label htmlFor="newProjectNameModal" className={labelBaseClass}>Neues Projekt erstellen:</label>
          <div className="flex items-center space-x-2 mt-1">
            <input
              type="text"
              id="newProjectNameModal"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className={inputBaseClass}
              placeholder="Name des neuen Projekts"
            />
            <ActionButton onClick={handleAddProject} variant="secondary" title="Neues Projekt hinzufügen" className="px-3 py-1.5">
              <PlusCircleIcon className="w-4 h-4"/>
            </ActionButton>
          </div>
        </div>
        
        <p className={`${labelBaseClass} mb-1`}>Vorhandene Projekte:</p>
        <div className="overflow-y-auto flex-grow space-y-1.5 mb-4 pr-1 bg-[#232F3E] p-2 rounded-md border border-[#3B4859]">
          {projects.length === 0 && (
            <p className="text-center text-gray-400 py-3 text-sm">Keine Projekte vorhanden.</p>
          )}
          {projects.sort((a,b) => b.lastModified - a.lastModified).map(project => (
            <div 
              key={project.id} 
              className={`flex items-center justify-between p-2 rounded-md 
                          ${project.id === activeProjectId ? 'bg-[#FF9900] text-[#131A22]' : 'bg-[#3B4859] text-gray-200 hover:bg-[#4A596D]'}`}
            >
              {editingProjectId === project.id ? (
                <input
                  type="text"
                  value={editingProjectName}
                  onChange={(e) => setEditingProjectName(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                  className={`${inputBaseClass} mr-2 flex-grow ${project.id === activeProjectId ? 'bg-white/20 text-black placeholder-gray-700' : ''}`}
                  autoFocus
                />
              ) : (
                <span 
                    className={`font-medium text-sm truncate mr-2 cursor-pointer ${project.id === activeProjectId ? 'text-[#131A22]' : 'text-gray-200'}`}
                    onClick={() => onSelectProject(project.id)}
                    title={`Projekt "${project.name}" auswählen (Zuletzt geändert: ${new Date(project.lastModified).toLocaleString()})`}
                >
                    {project.name}
                </span>
              )}
              <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
                {editingProjectId === project.id ? (
                    <>
                    <ActionButton onClick={handleSaveEdit} variant="ghost" title="Speichern" className={`p-1 ${project.id === activeProjectId ? 'text-green-800 hover:text-green-900' : 'text-green-400 hover:text-green-300'}`}>
                        <SaveIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                    </ActionButton>
                    <ActionButton onClick={handleCancelEdit} variant="ghost" title="Abbrechen" className={`p-1 ${project.id === activeProjectId ? 'text-red-800 hover:text-red-900' : 'text-red-400 hover:text-red-300'}`}>
                        <XCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                    </ActionButton>
                    </>
                ) : (
                    <>
                    <ActionButton 
                      onClick={() => onExportSingleProject(project.id)}
                      variant="ghost" 
                      title="Dieses Projekt exportieren" 
                      className={`p-1 ${project.id === activeProjectId ? 'text-[#131A22] hover:bg-black hover:bg-opacity-20' : 'text-gray-300 hover:text-white'}`}
                    >
                      <ArrowDownOnSquareIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                    </ActionButton>
                    <ActionButton 
                      onClick={() => onDuplicateProject(project.id)}
                      variant="ghost" 
                      title="Projekt duplizieren" 
                      className={`p-1 ${project.id === activeProjectId ? 'text-[#131A22] hover:bg-black hover:bg-opacity-20' : 'text-gray-300 hover:text-white'}`}
                    >
                      <DocumentDuplicateIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                    </ActionButton>
                    <ActionButton 
                      onClick={() => handleStartEdit(project)} 
                      variant="ghost" 
                      title="Projekt umbenennen" 
                      className={`p-1 ${project.id === activeProjectId ? 'text-[#131A22] hover:bg-black hover:bg-opacity-20' : 'text-gray-300 hover:text-white'}`}
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                    </ActionButton>
                    <ActionButton 
                      onClick={() => onDeleteProject(project.id)}
                      variant="ghost" 
                      title="Projekt löschen" 
                      className={`p-1 ${project.id === activeProjectId ? 'text-red-800 hover:text-red-900 hover:bg-black hover:bg-opacity-25' : 'text-red-400 hover:text-red-100 hover:bg-red-700/75'}`}
                    >
                      <TrashIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4"/>
                    </ActionButton>
                    </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-4">
            <ActionButton onClick={triggerImportFile} variant="ghost" className="w-full sm:w-auto">
                <ArrowUpOnSquareIcon className="w-4 h-4 mr-1.5"/>Projekt(e) importieren (.json)
            </ActionButton>
            <input type="file" ref={importFileInputRef} onChange={onImportProjects} accept=".json" className="hidden" />
            <ActionButton onClick={onExportAllProjects} variant="ghost" disabled={projects.length === 0} className="w-full sm:w-auto">
                <ArrowDownOnSquareIcon className="w-4 h-4 mr-1.5"/>Alle Projekte exportieren
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

export default ProjectManagerModal;