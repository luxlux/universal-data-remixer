
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    ParsedRecord, 
    ExportProfile, 
    FileUploadSeparatorChoice,
    FieldDisplayMode, 
    FileEncoding, 
    HeaderDetectionChoice,
    Project,
    ProjectState,
    ConfirmationModalProps
} from './types.js';
import FileUpload from './components/FileUpload.js';
import RecordDisplayCard from './components/RecordDisplayCard.js';
import ActionButton from './components/ActionButton.js';
import RecordControls from './components/RecordControls.js';
import ExportConfigModal from './components/ExportConfigModal.js';
import ManageProfilesModal from './components/ManageProfilesModal.js';
import ConfirmationModal from './components/ConfirmationModal.js';
import FieldDisplayControls from './components/FieldDisplayControls.js';
import ProjectManagerModal from './components/ProjectManagerModal.js';
import { 
    DocumentArrowDownIcon, 
    TrashIcon, 
    SparklesIcon,
    FolderOpenIcon,
    CheckSquareIcon,
    SquareIcon,
    InformationCircleIcon,
    FolderIcon,
    ChevronUpDownIcon
} from './components/icons.js';

const LOCAL_STORAGE_PROJECTS_KEY = 'udeAppProjects_v3';
const LOCAL_STORAGE_ACTIVE_PROJECT_ID_KEY = 'udeAppActiveProjectId_v3';


const createNewProjectState = (): ProjectState => ({
  fileLoadSeparatorChoice: 'auto',
  fileLoadCustomSeparator: '',
  fileLoadEncoding: 'UTF-8',
  fileLoadHeaderChoice: 'auto',
  showEmptyFields: true,
  fieldDisplayMode: 'all',
  visibleFieldKeys: new Set(),
  customFieldOrder: null, 
  exportProfiles: [],
  activeExportProfileId: null,
});

const createNewProject = (name: string, existingState?: Partial<ProjectState>): Project => ({
  id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  name: name,
  state: { ...createNewProjectState(), ...existingState },
  lastModified: Date.now(),
});


const autoDetectHeader = (lines: string[], separator: string): boolean => {
    const dataLines = lines.filter(line => line.trim() !== '');
    if (dataLines.length < 2) return true; 

    const line0Fields = dataLines[0].split(separator).map(f => f.trim().replace(/^"|"$/g, ''));
    const line1Fields = dataLines[1].split(separator).map(f => f.trim().replace(/^"|"$/g, ''));

    if (line0Fields.length === 0) return false; 
    if (line0Fields.length !== line1Fields.length && line1Fields.length > 0) return true; 

    const isFieldNumeric = (field: string): boolean => field.trim() !== "" && !isNaN(Number(field.trim()));
    const line0AllAlphaOrEmpty = line0Fields.every(field => field.trim() === "" || isNaN(Number(field.trim())));
    const line1HasSomeNumeric = line1Fields.some(isFieldNumeric);
    const line1AllAlphaOrEmpty = line1Fields.every(field => field.trim() === "" || isNaN(Number(field.trim())));

    if (line0AllAlphaOrEmpty && line1HasSomeNumeric) return true;
    if (line0AllAlphaOrEmpty && line1AllAlphaOrEmpty) {
        const line0Set = new Set(line0Fields);
        const line1Set = new Set(line1Fields);
        if (line0Set.size !== line1Set.size) return true; 
        for (let i = 0; i < line0Fields.length; i++) {
            if (line0Fields[i] !== line1Fields[i]) return true;
        }
        return false; 
    }
    if (line0Fields.some(isFieldNumeric) && !line1AllAlphaOrEmpty) return false;
    
    return true;
};

const detectActualSeparator = (content: string): string => {
    const lines = content.trim().split(/\r?\n/).filter(line => line.trim() !== '').slice(0, 5);
    if (lines.length === 0) return '\t';

    const separators = [';', ',', '\t', '|'];
    let bestSeparator = '\t';
    let maxConsistencyScore = -1;

    for (const sep of separators) {
        let occurrences = 0;
        const columnCounts: number[] = [];
        let consistent = true;
        let firstLineColumnCount = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(sep);
            const currentColumnCount = parts.length;
            
            occurrences += (parts.length - 1); 
            columnCounts.push(currentColumnCount);

            if (i === 0) {
                firstLineColumnCount = currentColumnCount;
            } else {
                if (currentColumnCount !== firstLineColumnCount) {
                    consistent = false;
                }
            }
        }

        if (occurrences === 0 && columnCounts.every(c => c <=1)) continue;

        const averageColumnCount = columnCounts.reduce((sum, count) => sum + count, 0) / columnCounts.length;
        if (averageColumnCount < 1.5 && lines.length > 1 && columnCounts.length > 1 && columnCounts.some(c => c > 1)) {
        } else if (averageColumnCount <= 1.1 && lines.length > 1 && columnCounts.length > 1 && columnCounts.every(c => c===1) ) {
            continue;
        }

        let consistencyScore = 0;
        if (consistent && firstLineColumnCount > 1) {
            consistencyScore += 100; 
        } else if (firstLineColumnCount > 1) {
            const mean = columnCounts.reduce((acc, val) => acc + val, 0) / columnCounts.length;
            const stdDev = Math.sqrt(columnCounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / columnCounts.length);
            consistencyScore += Math.max(0, 50 - stdDev * 20);
        }
        
        consistencyScore += occurrences * 0.5; 

        if (consistencyScore > maxConsistencyScore && (firstLineColumnCount > 1 || lines.length === 1)) {
            maxConsistencyScore = consistencyScore;
            bestSeparator = sep;
        }
    }
    return bestSeparator;
};


const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [currentFileRecords, setCurrentFileRecords] = useState<ParsedRecord[]>([]);
  const [currentFileHeaders, setCurrentFileHeaders] = useState<string[]>([]);
  const [processedFileSeparator, setProcessedFileSeparator] = useState<string | 'json'>('\t');
  const [processedFileEncoding, setProcessedFileEncoding] = useState<FileEncoding>('UTF-8');
  const [processedFileHeaderChoice, setProcessedFileHeaderChoice] = useState<HeaderDetectionChoice>('auto');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExportConfigModalOpen, setIsExportConfigModalOpen] = useState<boolean>(false);
  const [profileToEditForModal, setProfileToEditForModal] = useState<ExportProfile | null>(null);
  const [isCreatingNewProfileForModal, setIsCreatingNewProfileForModal] = useState<boolean>(false);
  const [isManageProfilesModalOpen, setIsManageProfilesModalOpen] = useState<boolean>(false);
  const [isProjectManagerModalOpen, setIsProjectManagerModalOpen] = useState<boolean>(false);
  const [isReorderingFields, setIsReorderingFields] = useState<boolean>(false);

  const [confirmationModalProps, setConfirmationModalProps] = useState<Omit<ConfirmationModalProps, 'isOpen' | 'onClose'> & { action?: () => void, action2?: () => void }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedProjects = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    let loadedProjects: Project[] = [];
    if (storedProjects) {
      try {
        const parsed = JSON.parse(storedProjects);
        if (Array.isArray(parsed)) {
          loadedProjects = parsed.map((p: any) => ({
            id: p.id,
            name: p.name,
            lastModified: p.lastModified || Date.now(),
            state: {
              ...createNewProjectState(), 
              ...p.state, 
              visibleFieldKeys: new Set(Array.from(p.state?.visibleFieldKeys || [])),
              customFieldOrder: p.state?.customFieldOrder || null,
              exportProfiles: (p.state?.exportProfiles || []).map((ep: ExportProfile) => ({
                ...ep,
                comment: ep.comment || undefined, 
                fields: (ep.fields || []).map((field: any) => ({...field})) 
              }))
            }
          }));
        }
      } catch (e) { console.error("Failed to parse projects from localStorage", e); }
    }

    if (loadedProjects.length === 0) {
      const defaultProject = createNewProject("Standardprojekt");
      loadedProjects.push(defaultProject);
      setProjects(loadedProjects);
      setActiveProjectId(defaultProject.id);
    } else {
      setProjects(loadedProjects);
      const storedActiveId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROJECT_ID_KEY);
      const activeProjectExists = loadedProjects.some(p => p.id === storedActiveId);
      if (storedActiveId && activeProjectExists) {
        setActiveProjectId(storedActiveId);
      } else if (loadedProjects.length > 0) {
        const mostRecentProject = loadedProjects.sort((a,b) => b.lastModified - a.lastModified)[0];
        setActiveProjectId(mostRecentProject.id);
      }
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(
            projects.map(p => ({
                ...p,
                state: {
                    ...p.state,
                    visibleFieldKeys: Array.from(p.state.visibleFieldKeys) 
                }
            }))
        ));
    }
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROJECT_ID_KEY, activeProjectId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_PROJECT_ID_KEY);
    }
  }, [activeProjectId]);
  

  const getActiveProject = useCallback((): Project | undefined => {
    return projects.find(p => p.id === activeProjectId);
  }, [projects, activeProjectId]);

  const updateActiveProjectState = useCallback((updater: (prevState: ProjectState) => ProjectState) => {
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === activeProjectId ? { ...p, state: updater(p.state), lastModified: Date.now() } : p
      )
    );
  }, [activeProjectId]);
  
  const resetGlobalFileDataState = useCallback(() => {
    setCurrentFileName(null);
    setCurrentFileRecords([]);
    setCurrentFileHeaders([]);
    setCurrentIndex(0);
    setSelectedIndices(new Set());
    setProcessedFileSeparator('\t');
    setProcessedFileEncoding('UTF-8');
    setProcessedFileHeaderChoice('auto');
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const _finalizeFileLoadAndSetProjectState = (
    name: string, 
    newHeaderArray: string[], 
    parsedData: ParsedRecord[], 
    actualSeparatorUsed: string | 'json', 
    chosenEncoding: FileEncoding, 
    headerLoadChoice: HeaderDetectionChoice,
    newCustomOrderForProject: string[] | null
  ) => {
    setCurrentFileName(name);
    setCurrentFileHeaders(newHeaderArray);
    setCurrentFileRecords(parsedData);
    setCurrentIndex(0);
    setSelectedIndices(new Set());
    setProcessedFileSeparator(actualSeparatorUsed);
    setProcessedFileEncoding(chosenEncoding);
    setProcessedFileHeaderChoice(headerLoadChoice);
    setIsReorderingFields(false); 

    updateActiveProjectState(prevState => ({
        ...prevState,
        customFieldOrder: newCustomOrderForProject
    }));

    if (parsedData.length === 0 && newHeaderArray.length > 0 && newHeaderArray.some(h => h !== '')) {
        setError("Die Datei scheint nur eine Kopfzeile zu enthalten (oder es wurde keine Datenzeile gefunden, wenn 'Kein Header' gewählt wurde).");
    } else if (parsedData.length === 0) {
        setError("Keine Datensätze in der Datei gefunden.");
    }

    const activeProj = getActiveProject();
    if (activeProj) {
      if (activeProj.state.fieldDisplayMode === 'selectedOnly' && newHeaderArray.length > 0) {
        const newFileHasAnyVisibleFields = newHeaderArray.some(h => activeProj.state.visibleFieldKeys.has(h));
        if (!newFileHasAnyVisibleFields && activeProj.state.visibleFieldKeys.size > 0) {
          updateActiveProjectState(ps => ({...ps, fieldDisplayMode: 'all', showEmptyFields: true}));
        }
      }

      updateActiveProjectState(prevState => {
          let updatedExportProfiles = prevState.exportProfiles;
          let updatedActiveExportProfileId = prevState.activeExportProfileId;
          if (updatedExportProfiles.length === 0 && newHeaderArray.length > 0 && newHeaderArray.some(h => h.trim() !== '')) {
              const defaultProfile: ExportProfile = {
                  id: `profile_default_${Date.now()}`,
                  name: "Standard (Alle Spalten)",
                  fields: newHeaderArray.map(h => ({ id: `field_${h}_${Date.now()}`, csvFieldName: h, tsvHeaderName: h, isStatic: false, staticValue: null })),
                  csvSeparator: ';',
                  csvEncoding: 'UTF-8',
                  comment: "Automatisch generiertes Profil, das alle Spalten ausgibt.",
              };
              updatedExportProfiles = [defaultProfile];
              updatedActiveExportProfileId = defaultProfile.id;
          } else if (updatedExportProfiles.length > 0 && (!updatedActiveExportProfileId || !updatedExportProfiles.find(p => p.id === updatedActiveExportProfileId))) {
              updatedActiveExportProfileId = updatedExportProfiles[0].id;
          }
          return {...prevState, exportProfiles: updatedExportProfiles, activeExportProfileId: updatedActiveExportProfileId };
      });
    }
    setIsLoading(false);
  };


  const handleFileLoad = useCallback((content: string, name: string, chosenSeparator: string | 'auto', chosenEncoding: FileEncoding, headerChoice: HeaderDetectionChoice) => {
    setIsLoading(true);
    setError(null);
    
    const activeProj = getActiveProject();
    if (activeProj) {
        updateActiveProjectState(prevState => ({
            ...prevState,
            fileLoadSeparatorChoice: chosenSeparator === 'auto' || chosenSeparator === ';' || chosenSeparator === ',' || chosenSeparator === '\t' || chosenSeparator === '|' ? chosenSeparator : 'custom',
            fileLoadCustomSeparator: chosenSeparator !== 'auto' && chosenSeparator !== ';' && chosenSeparator !== ',' && chosenSeparator !== '\t' && chosenSeparator !== '|' ? chosenSeparator : prevState.fileLoadCustomSeparator,
            fileLoadEncoding: chosenEncoding,
            fileLoadHeaderChoice: headerChoice,
        }));
    }

    let parsedData: ParsedRecord[] = [];
    let newHeaderArray: string[] = [];
    let actualSeparatorUsed: string | 'json' = '\t';

    try {
      if (name.toLowerCase().endsWith('.json') || (chosenSeparator === 'auto' && (content.trim().startsWith('{') || content.trim().startsWith('[')) )) {
        actualSeparatorUsed = 'json';
        const jsonData = JSON.parse(content);

        if (Array.isArray(jsonData) && jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null) {
          newHeaderArray = Object.keys(jsonData[0]);
          parsedData = jsonData.map(item => {
            const record: ParsedRecord = {};
            for (const key of newHeaderArray) {
              record[key] = String(item[key] ?? '');
            }
            return record;
          });
        } else if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
          newHeaderArray = Object.keys(jsonData);
          const singleRecord: ParsedRecord = {};
           for (const key of newHeaderArray) {
              singleRecord[key] = String(jsonData[key] ?? '');
            }
          parsedData = [singleRecord];
        } else {
          throw new Error("JSON-Format nicht unterstützt. Benötigt Array von Objekten oder einzelnes Objekt.");
        }
      } else { 
        if (chosenSeparator === 'auto') {
          actualSeparatorUsed = detectActualSeparator(content);
        } else {
          actualSeparatorUsed = chosenSeparator;
        }
        
        const lines = content.trim().split(/\r?\n/);
        if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
          throw new Error("Die Datei ist leer oder enthält keine gültigen Daten.");
        }

        let firstLineIsData = false;
        if (headerChoice === 'noHeader') {
            firstLineIsData = true;
        } else if (headerChoice === 'auto') {
            firstLineIsData = !autoDetectHeader(lines, actualSeparatorUsed);
        }
        
        const dataStartIndex = firstLineIsData ? 0 : 1;

        if (firstLineIsData) {
            if (lines.length > 0 && lines[dataStartIndex]?.trim() !== '') { 
                const numColumns = lines[dataStartIndex].split(actualSeparatorUsed).length;
                newHeaderArray = Array.from({ length: numColumns }, (_, i) => `Feld ${i + 1}`);
            } else {
                 throw new Error("Datei enthält keine Daten zur Generierung von Feldnamen.");
            }
        } else { 
             if (lines.length > 0) {
                newHeaderArray = lines[0].split(actualSeparatorUsed).map(h => h.trim().replace(/^"|"$/g, ''));
             } else {
                 throw new Error("Datei ist leer und kann keinen Header haben.");
             }
        }
        
        for (let i = dataStartIndex; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          const values = lines[i].split(actualSeparatorUsed);
          const record: ParsedRecord = {};
          newHeaderArray.forEach((header, index) => {
            const key = header; 
            record[key] = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
          });
          parsedData.push(record);
        }
      }

      if (newHeaderArray.length === 0 || newHeaderArray.every(h => h.trim() === '')) {
        throw new Error("Keine gültigen Spaltenüberschriften gefunden oder generiert.");
      }
      
      const currentCustomFieldOrder = activeProj?.state.customFieldOrder;
      if (currentCustomFieldOrder) {
        const missingFromNewFile = currentCustomFieldOrder.filter(h => !newHeaderArray.includes(h));
        const isOrderInconsistent = missingFromNewFile.length > 0;

        if (isOrderInconsistent) {
          setConfirmationModalProps({
            title: "Inkonsistente Feldreihenfolge",
            message: (
              <div>
                <p className="mb-2">Die gespeicherte Feldreihenfolge für dieses Projekt passt nicht zu den Spalten der neuen Datei.</p>
                <p className="mb-1 text-sm">Fehlende Felder aus der gespeicherten Reihenfolge:</p>
                <ul className="list-disc list-inside text-xs text-gray-400 mb-2 max-h-20 overflow-y-auto">
                  {missingFromNewFile.slice(0, 5).map(f => <li key={f} title={f}>{f.length > 30 ? f.substring(0,27)+'...' : f}</li>)}
                  {missingFromNewFile.length > 5 && <li>... und {missingFromNewFile.length - 5} weitere</li>}
                </ul>
                <p>Wie möchten Sie fortfahren?</p>
              </div>
            ),
            confirmButtonText: "Anpassen & Laden",
            confirmButtonVariant: 'primary',
            onConfirm: () => { // Action for "Anpassen & Laden"
              // currentCustomFieldOrder is guaranteed to be non-null here because of the outer if (currentCustomFieldOrder)
              const adjustedFieldOrder = currentCustomFieldOrder!.filter(h => newHeaderArray.includes(h));
              const newFieldsFromNewFile = newHeaderArray.filter(h => !adjustedFieldOrder.includes(h));
              const finalAdjustedOrder = [...adjustedFieldOrder, ...newFieldsFromNewFile];
              _finalizeFileLoadAndSetProjectState(name, newHeaderArray, parsedData, actualSeparatorUsed, chosenEncoding, headerChoice, finalAdjustedOrder);
              setIsConfirmationModalOpen(false);
            },
            confirmButton2Text: "Zurücksetzen & Laden",
            confirmButton2Variant: 'secondary',
            onConfirm2: () => { // Action for "Zurücksetzen & Laden"
              _finalizeFileLoadAndSetProjectState(name, newHeaderArray, parsedData, actualSeparatorUsed, chosenEncoding, headerChoice, null);
              setIsConfirmationModalOpen(false);
            },
          });
          setIsConfirmationModalOpen(true);
          return; 
        }
      }
      _finalizeFileLoadAndSetProjectState(name, newHeaderArray, parsedData, actualSeparatorUsed, chosenEncoding, headerChoice, currentCustomFieldOrder ?? null);

    } catch (e: any) {
      console.error("Error parsing file:", e);
      const sepDisplay = actualSeparatorUsed === '\t' ? '\\t' : (actualSeparatorUsed === 'json' ? 'JSON' : actualSeparatorUsed);
      setError(`Fehler beim Parsen der Datei ${name} (Format/Trennzeichen: ${sepDisplay}, Kodierung: ${chosenEncoding}, Header: ${headerChoice}): ${e.message}. Stellen Sie sicher, dass das Format korrekt ist oder wählen Sie andere Optionen.`);
      resetGlobalFileDataState();
      setCurrentFileName(name); 
      setIsLoading(false);
    }
  }, [resetGlobalFileDataState, updateActiveProjectState, getActiveProject, _finalizeFileLoadAndSetProjectState]);


  const handleCreateNewProject = (name: string) => {
    const newProj = createNewProject(name);
    setProjects(prev => [...prev, newProj]);
    setActiveProjectId(newProj.id);
    resetGlobalFileDataState(); 
    setError(null);
    setIsReorderingFields(false);
  };

  const handleSelectProject = (projectId: string) => {
    if (projectId === activeProjectId) return;
    setActiveProjectId(projectId);
    setError(null); 
    setIsReorderingFields(false); 
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: newName, lastModified: Date.now() } : p));
  };

  const handleDuplicateProject = (projectId: string) => {
    const projectToDuplicate = projects.find(p => p.id === projectId);
    if (projectToDuplicate) {
      const duplicatedState = JSON.parse(JSON.stringify({
        ...projectToDuplicate.state,
        visibleFieldKeys: Array.from(projectToDuplicate.state.visibleFieldKeys),
        customFieldOrder: projectToDuplicate.state.customFieldOrder 
      }));
      
      const newProj = createNewProject(
        `${projectToDuplicate.name} (Kopie)`,
        { 
          ...duplicatedState,
          visibleFieldKeys: new Set(duplicatedState.visibleFieldKeys)
        }
      );
      setProjects(prev => [...prev, newProj]);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    setConfirmationModalProps({
        title: "Projekt löschen",
        message: <p>Möchten Sie das Projekt <strong className="text-[#FF9900]">{projectToDelete.name}</strong> und alle zugehörigen Einstellungen wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>,
        action: () => {
            const updatedProjects = projects.filter(p => p.id !== projectId);
            setProjects(updatedProjects);
            if (activeProjectId === projectId) {
                if (updatedProjects.length > 0) {
                const mostRecentProject = updatedProjects.sort((a,b) => b.lastModified - a.lastModified)[0];
                setActiveProjectId(mostRecentProject.id);
                } else {
                const defaultProject = createNewProject("Standardprojekt");
                setProjects([defaultProject]);
                setActiveProjectId(defaultProject.id);
                }
            }
        },
        onConfirm: () => {
          confirmationModalProps.action?.();
          setIsConfirmationModalOpen(false);
        }
    });
    setIsConfirmationModalOpen(true);
  };

  const handleExportAllProjects = () => {
    const exportableProjects = projects.map(p => ({
        ...p,
        state: {
            ...p.state,
            visibleFieldKeys: Array.from(p.state.visibleFieldKeys)
        }
    }));
    const json = JSON.stringify(exportableProjects, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'universal_data_remixer_projects.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleExportSingleProject = (projectId: string) => {
    const projectToExport = projects.find(p => p.id === projectId);
    if (!projectToExport) return;
    const exportableProject = {
        ...projectToExport,
        state: {
            ...projectToExport.state,
            visibleFieldKeys: Array.from(projectToExport.state.visibleFieldKeys)
        }
    };
    const json = JSON.stringify(exportableProject, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectToExport.name.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}_project.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProjects = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          let projectsToImport: Project[] = [];
          let isSingleProjectImport = false;

          const sanitizeProject = (p: any): Project => ({
            id: p.id || `project_imported_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
            name: p.name || "Importiertes Projekt",
            lastModified: p.lastModified || Date.now(),
            state: {
              ...createNewProjectState(),
              ...(p.state || {}),
              visibleFieldKeys: new Set(Array.from(p.state?.visibleFieldKeys || [])),
              customFieldOrder: p.state?.customFieldOrder || null, 
              exportProfiles: (p.state?.exportProfiles || []).map((ep: any) => ({
                ...ep,
                comment: ep.comment || undefined, 
                id: ep.id || `profile_imported_${Date.now()}`,
                fields: (ep.fields || []).map((f: any) => ({...f, id: f.id || `field_imported_${Date.now()}`}))
              }))
            }
          });

          if (Array.isArray(importedData)) {
            projectsToImport = importedData.map(sanitizeProject);
          } else if (typeof importedData === 'object' && importedData !== null && importedData.id && importedData.name && importedData.state) {
            projectsToImport = [sanitizeProject(importedData)];
            isSingleProjectImport = true;
          } else {
            throw new Error("Ungültiges Format. Datei muss ein einzelnes Projektobjekt oder ein Array von Projektobjekten enthalten.");
          }

          if (isSingleProjectImport) {
            const importedProject = projectsToImport[0];
            const existingProjectIndex = projects.findIndex(p => p.id === importedProject.id);
            if (existingProjectIndex > -1) {
                setConfirmationModalProps({
                    title: "Projekt ID Konflikt",
                    message: <p>Ein Projekt mit der ID <strong className="text-orange-400">{importedProject.id}</strong> (Name: {projects[existingProjectIndex].name}) existiert bereits. Möchten Sie es mit dem importierten Projekt <strong className="text-orange-400">{importedProject.name}</strong> überschreiben?</p>,
                    action: () => {
                        setProjects(prev => prev.map(p => p.id === importedProject.id ? importedProject : p));
                        if (activeProjectId === importedProject.id || !activeProjectId) setActiveProjectId(importedProject.id);
                        alert(`Projekt "${importedProject.name}" erfolgreich überschrieben.`);
                    },
                     onConfirm: () => {
                        confirmationModalProps.action?.();
                        setIsConfirmationModalOpen(false);
                     }
                });
                setIsConfirmationModalOpen(true);
            } else {
              setProjects(prev => [...prev, importedProject]);
              setActiveProjectId(importedProject.id);
              alert(`Projekt "${importedProject.name}" erfolgreich hinzugefügt.`);
            }
          } else { 
            setConfirmationModalProps({
                title: "Projekte importieren",
                message: "Wählen Sie eine Importmethode:",
                confirmButtonText: "Alle ersetzen",
                confirmButtonVariant: 'danger',
                action: () => { // Action for "Alle ersetzen"
                    setProjects(projectsToImport);
                    setActiveProjectId(projectsToImport.length > 0 ? projectsToImport[0].id : null);
                    alert("Alle Projekte erfolgreich durch Import ersetzt.");
                },
                confirmButton2Text: "Zusammenführen",
                confirmButton2Variant: 'secondary',
                action2: () => { // Action for "Zusammenführen"
                    const mergedProjects = [...projects];
                    projectsToImport.forEach(importedP => {
                        const existingIndex = mergedProjects.findIndex(p => p.id === importedP.id);
                        if (existingIndex > -1) {
                            mergedProjects[existingIndex] = importedP; // Überschreiben
                        } else {
                            mergedProjects.push(importedP); // Hinzufügen
                        }
                    });
                    setProjects(mergedProjects);
                    if (!activeProjectId && mergedProjects.length > 0) {
                        setActiveProjectId(mergedProjects[0].id);
                    }
                    alert("Projekte erfolgreich zusammengeführt.");
                },
                 onConfirm: () => {
                    confirmationModalProps.action?.();
                    setIsConfirmationModalOpen(false);
                 },
                 onConfirm2: () => {
                    confirmationModalProps.action2?.();
                    setIsConfirmationModalOpen(false);
                 }
            });
            setIsConfirmationModalOpen(true);
          }
        } catch (err: any) {
          console.error("Error importing projects:", err);
          alert(`Fehler beim Importieren der Projekte: ${err.message}`);
        }
      };
      reader.readAsText(file);
      if (event.target) event.target.value = '';
    }
  };

  const handleRecordChange = (headerKey: string, newValue: string) => {
    setCurrentFileRecords(prevRecords => {
      const newRecords = [...prevRecords];
      if (newRecords[currentIndex]) {
        const recordToUpdate = { ...newRecords[currentIndex] };
        recordToUpdate[headerKey] = newValue;
        newRecords[currentIndex] = recordToUpdate;
      }
      return newRecords;
    });
  };
  
  const handleNext = useCallback(() => setCurrentIndex(prev => Math.min(prev + 1, currentFileRecords.length - 1)), [currentFileRecords.length]);
  const handlePrevious = useCallback(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), []);

  const toggleCurrentRecordSelection = () => {
    if (currentFileRecords.length === 0) return;
    setSelectedIndices(prevSelected => {
      const newSelectedIndices = new Set(prevSelected);
      if (newSelectedIndices.has(currentIndex)) {
        newSelectedIndices.delete(currentIndex);
      } else {
        newSelectedIndices.add(currentIndex);
      }
      return newSelectedIndices;
    });
  };
  
  const handleToggleSelectAll = () => {
    if (currentFileRecords.length === 0) return;
    const allCurrentlySelected = selectedIndices.size === currentFileRecords.length;
    if (allCurrentlySelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(currentFileRecords.map((_, index) => index)));
    }
  };

  const handleSaveExportProfile = (profile: ExportProfile) => {
    updateActiveProjectState(prevState => {
      let updatedProfiles;
      const existingIndex = prevState.exportProfiles.findIndex(p => p.id === profile.id);
      if (existingIndex > -1) {
        updatedProfiles = [...prevState.exportProfiles];
        updatedProfiles[existingIndex] = profile;
      } else {
        updatedProfiles = [...prevState.exportProfiles, profile];
      }
      return { 
        ...prevState, 
        exportProfiles: updatedProfiles,
        activeExportProfileId: profile.id 
      };
    });
    setIsExportConfigModalOpen(false);
    setProfileToEditForModal(null);
  };

  const handleOpenEditProfileModal = (profileId: string) => {
    const activeProj = getActiveProject();
    if (!activeProj) return;
    const profile = activeProj.state.exportProfiles.find(p => p.id === profileId);
    if (profile) {
      setProfileToEditForModal(profile);
      setIsCreatingNewProfileForModal(false);
      setIsExportConfigModalOpen(true);
    }
    setIsManageProfilesModalOpen(false); 
  };

  const confirmDeleteProfile = (profileId: string) => {
    const activeProj = getActiveProject();
    if (!activeProj) return;
    const profileToDelete = activeProj.state.exportProfiles.find(p => p.id === profileId);
    if (!profileToDelete) return;
    
    setConfirmationModalProps({
        title: "Profil löschen",
        message: <p>Möchten Sie das Profil <strong className="text-[#FF9900]">{profileToDelete.name}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>,
        action: () => {
            updateActiveProjectState(prevState => {
                const updatedProfiles = prevState.exportProfiles.filter(p => p.id !== profileId);
                let newActiveId = prevState.activeExportProfileId;
                if (newActiveId === profileId) {
                newActiveId = updatedProfiles.length > 0 ? updatedProfiles[0].id : null;
                }
                return { ...prevState, exportProfiles: updatedProfiles, activeExportProfileId: newActiveId };
            });
        },
        onConfirm: () => {
            confirmationModalProps.action?.();
            setIsConfirmationModalOpen(false);
        }
    });
    setIsConfirmationModalOpen(true);
  };

  const handleDuplicateProfile = (profileId: string) => {
    updateActiveProjectState(prevState => {
      const profileToDuplicate = prevState.exportProfiles.find(p => p.id === profileId);
      if (!profileToDuplicate) return prevState;
      const newProfile: ExportProfile = {
        ...profileToDuplicate,
        id: `profile_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
        name: `${profileToDuplicate.name} (Kopie)`,
        comment: profileToDuplicate.comment, 
        fields: profileToDuplicate.fields.map(f => ({...f, id: `field_${f.csvFieldName}_${Date.now()}_${Math.random().toString(36).substring(2,5)}`})),
      };
      return { ...prevState, exportProfiles: [...prevState.exportProfiles, newProfile] };
    });
  };

  const handleAddProfileFromManager = (name: string) => {
    updateActiveProjectState(prevState => {
      const newProfile: ExportProfile = {
          id: `profile_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
          name: name,
          fields: currentFileHeaders.map(h => ({ id: `field_${h}_${Date.now()}_${Math.random().toString(36).substring(2,5)}`, csvFieldName: h, tsvHeaderName: h, isStatic: false, staticValue: null })),
          csvSeparator: ';',
          csvEncoding: 'UTF-8', 
          comment: '', 
      };
      return { ...prevState, exportProfiles: [...prevState.exportProfiles, newProfile], activeExportProfileId: newProfile.id };
    });
  };
  
  const handleExportAllProfilesFromActiveProject = () => {
    const activeProj = getActiveProject();
    if (!activeProj || activeProj.state.exportProfiles.length === 0) {
        alert("Keine Profile im aktuellen Projekt zum Exportieren vorhanden.");
        return;
    }
    const json = JSON.stringify(activeProj.state.exportProfiles, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProj.name.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_')}_profiles.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportProfilesToActiveProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (Array.isArray(imported) && imported.every(p => p.id && p.name && Array.isArray(p.fields) && typeof p.csvSeparator === 'string' && (typeof p.csvEncoding === 'string' || p.csvEncoding === undefined) )) {
            const profilesWithEncodingAndComment = imported.map(p => ({
                ...p, 
                csvEncoding: p.csvEncoding || 'UTF-8',
                comment: p.comment || undefined
            }));
            
            setConfirmationModalProps({
                title: "Profile importieren",
                message: "Möchten Sie die vorhandenen Profile im aktuellen Projekt durch die importierten ersetzen? Bestehende Profile in diesem Projekt gehen verloren.",
                action: () => {
                    updateActiveProjectState(prevState => ({
                        ...prevState,
                        exportProfiles: profilesWithEncodingAndComment,
                        activeExportProfileId: profilesWithEncodingAndComment.length > 0 ? profilesWithEncodingAndComment[0].id : null,
                    }));
                    alert("Profile erfolgreich importiert.");
                },
                onConfirm: () => {
                    confirmationModalProps.action?.();
                    setIsConfirmationModalOpen(false);
                }
            });
            setIsConfirmationModalOpen(true);
          } else {
            alert("Ungültige Profildatei.");
          }
        } catch (err) {
          console.error("Error importing profiles:", err);
          alert("Fehler beim Importieren der Profile.");
        }
      };
      reader.readAsText(file); 
      if (event.target) event.target.value = ''; 
    }
  };
  
  const createDownload = (content: string, baseFileName: string, profileName: string, extension: string, mimeType: string, encoding: FileEncoding) => {
    let blob: Blob;
    const safeProfileName = profileName.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
    const downloadFileName = `${baseFileName}_${safeProfileName}.${extension}`;

    if (encoding === 'ISO-8859-1' && extension === 'csv') {
        const byteArray = new Uint8Array(content.length);
        for (let i = 0; i < content.length; i++) {
            const charCode = content.charCodeAt(i);
            byteArray[i] = charCode <= 0xFF ? charCode : 0x3F; 
        }
        blob = new Blob([byteArray], { type: `${mimeType};charset=ISO-8859-1` });
    } else if (encoding === 'UTF-8' && extension === 'csv') { 
        const utf8ContentWithBOM = `\uFEFF${content}`; 
        blob = new Blob([utf8ContentWithBOM], { type: `${mimeType};charset=UTF-8` });
    } else { 
        blob = new Blob([content], { type: `${mimeType};charset=${encoding}` });
    }
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownload = (format: 'csv' | 'json') => {
    const activeProj = getActiveProject();
    if (!activeProj) { setError("Kein aktives Projekt gefunden."); return; }
    if (selectedIndices.size === 0) { setError("Keine Datensätze zum Herunterladen ausgewählt."); return; }
    setError(null);

    const activeProf = activeProj.state.exportProfiles.find(p => p.id === activeProj.state.activeExportProfileId);
    if (!activeProf) { setError("Kein aktives Exportprofil ausgewählt oder Profil nicht gefunden."); return; }

    const selectedRecordsToExport = currentFileRecords.filter((_, index) => selectedIndices.has(index));
    const downloadFileNameBase = currentFileName ? currentFileName.substring(0, currentFileName.lastIndexOf('.')) || currentFileName : 'export';

    if (format === 'csv') {
      const csvHeaderRow = activeProf.fields.map(field => `"${field.csvFieldName.replace(/"/g, '""')}"`).join(activeProf.csvSeparator);
      const csvDataRows = selectedRecordsToExport.map(record => {
        return activeProf.fields.map(fieldConf => {
          let value = '';
          if (fieldConf.isStatic) {
            value = fieldConf.staticValue || '';
          } else if (fieldConf.tsvHeaderName && record.hasOwnProperty(fieldConf.tsvHeaderName)) {
            value = record[fieldConf.tsvHeaderName] || '';
          }
          return `"${value.replace(/"/g, '""')}"`;
        }).join(activeProf.csvSeparator);
      });
      const csvContent = [csvHeaderRow, ...csvDataRows].join('\n');
      createDownload(csvContent, downloadFileNameBase, activeProf.name, 'csv', 'text/csv', activeProf.csvEncoding);
    } else if (format === 'json') {
      const jsonData = selectedRecordsToExport.map(record => {
        const outputObject: Record<string, string> = {};
        activeProf.fields.forEach(fieldConf => {
          let value = '';
          if (fieldConf.isStatic) {
            value = fieldConf.staticValue || '';
          } else if (fieldConf.tsvHeaderName && record.hasOwnProperty(fieldConf.tsvHeaderName)) {
            value = record[fieldConf.tsvHeaderName] || '';
          }
          outputObject[fieldConf.csvFieldName] = value;
        });
        return outputObject;
      });
      const jsonContent = JSON.stringify(jsonData, null, 2);
      createDownload(jsonContent, downloadFileNameBase, activeProf.name, 'json', 'application/json', 'UTF-8'); 
    }
  };
  
  const handleClearDataAndResetComponent = () => { 
    resetGlobalFileDataState(); 
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (!currentFileName || currentFileRecords.length === 0) return; 
        
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) {
            return; 
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            handlePrevious();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            handleNext();
        } else if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault();
            toggleCurrentRecordSelection();
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
        document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentFileName, currentFileRecords, handlePrevious, handleNext, toggleCurrentRecordSelection]);

  const handleToggleReorderFields = () => {
    setIsReorderingFields(prev => !prev);
  };

  const handleResetFieldOrder = () => {
    updateActiveProjectState(ps => ({ ...ps, customFieldOrder: null }));
  };

  const handleFieldOrderChange = (newOrder: string[]) => {
    updateActiveProjectState(ps => ({ ...ps, customFieldOrder: newOrder }));
  };


  const activeProject = getActiveProject();
  if (!activeProject) {
    return (
        <div className="min-h-screen bg-[#131A22] text-gray-100 flex flex-col items-center justify-center p-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#FF9900] mb-4"></div>
            <p className="text-xl">Lade Anwendung oder initialisiere Projekt...</p>
        </div>
    );
  }
  
  const currentRecord = currentFileRecords[currentIndex];
  const isCurrentSelected = selectedIndices.has(currentIndex);
  const recordControlsProps = { 
    onPrevious: handlePrevious, 
    onNext: handleNext, 
    onToggleSelection: toggleCurrentRecordSelection, 
    isPreviousDisabled: currentIndex === 0, 
    isNextDisabled: currentIndex >= currentFileRecords.length - 1 || currentFileRecords.length === 0, 
    isCurrentSelected: isCurrentSelected, 
    currentIndex: currentIndex, 
    totalRecords: currentFileRecords.length 
  };
  
  const activeProfileForDisplay = activeProject.state.exportProfiles.find(p => p.id === activeProject.state.activeExportProfileId);
  const allRecordsSelected = currentFileRecords.length > 0 && selectedIndices.size === currentFileRecords.length;
  
  const separatorDisplay = processedFileSeparator === '\t' ? '\\t' : processedFileSeparator;
  const encodingDisplay = processedFileSeparator === 'json' ? '(implizit UTF-8)' : processedFileEncoding;
  const headerChoiceDisplay = processedFileHeaderChoice === 'auto' ? 'Automatisch' : (processedFileHeaderChoice === 'firstLineIsHeader' ? 'Ja' : 'Nein');

  const handleToggleProjectShowEmptyFields = () => updateActiveProjectState(ps => ({...ps, showEmptyFields: !ps.showEmptyFields}));
  const handleSetProjectFieldDisplayMode = (mode: FieldDisplayMode) => {
      if (isReorderingFields && mode !== activeProject.state.fieldDisplayMode) return; 
      updateActiveProjectState(ps => ({
          ...ps, 
          fieldDisplayMode: mode,
          showEmptyFields: mode === 'all' ? true : ps.showEmptyFields 
      }));
  };
  const handleClearAllProjectVisibleFieldKeys = () => {
      setConfirmationModalProps({
          title: "Alle Feldauswahlen für dieses Projekt löschen",
          message: "Möchten Sie wirklich alle gespeicherten Sichtbarkeitseinstellungen für Felder in diesem Projekt löschen?",
          action: () => {
              updateActiveProjectState(ps => ({...ps, visibleFieldKeys: new Set()}));
          },
          onConfirm: () => {
              confirmationModalProps.action?.();
              setIsConfirmationModalOpen(false);
          }
      });
      setIsConfirmationModalOpen(true);
  };
   const handleToggleProjectFieldVisibility = (headerKey: string, makeVisible: boolean) => {
    updateActiveProjectState(ps => {
        const newSet = new Set(ps.visibleFieldKeys);
        if (makeVisible) newSet.add(headerKey);
        else newSet.delete(headerKey);
        return {...ps, visibleFieldKeys: newSet };
    });
  };

  const handleCloseConfirmationModal = () => {
    const title = confirmationModalProps.title;
    setIsConfirmationModalOpen(false);
    if (title === "Inkonsistente Feldreihenfolge") {
        setIsLoading(false); 
    }
    setConfirmationModalProps({ title: '', message: '', onConfirm: () => {}});
  }

  let headersForDisplay: string[] = currentFileHeaders;
  if (isReorderingFields) {
    headersForDisplay = activeProject.state.customFieldOrder 
      ? [...activeProject.state.customFieldOrder].filter(h => currentFileHeaders.includes(h))
          .concat(currentFileHeaders.filter(h => !activeProject.state.customFieldOrder?.includes(h)))
      : [...currentFileHeaders];
  } else if (activeProject.state.customFieldOrder) {
    headersForDisplay = [...activeProject.state.customFieldOrder].filter(h => currentFileHeaders.includes(h))
        .concat(currentFileHeaders.filter(h => !activeProject.state.customFieldOrder?.includes(h)));
  }


  return (
    <div className="min-h-screen bg-[#131A22] text-gray-100 flex flex-col items-center p-3 md:p-6 selection:bg-[#FF9900] selection:text-[#131A22]">
      <header className="w-full max-w-5xl mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-1">
            <div className="text-center sm:text-left order-2 sm:order-1">
                <h1 className="text-2xl md:text-3xl font-bold text-[#FF9900] flex items-center justify-center sm:justify-start">
                  <SparklesIcon className="w-6 h-6 md:w-7 md:h-7 mr-2 text-[#FFCC66]"/>Universal Data Remixer
                </h1>
                <p className="text-gray-400 text-xs md:text-sm">CSV Daten auswählen und individuell umstrukturieren</p>
            </div>
            <div className="flex items-center mb-2 sm:mb-0 order-1 sm:order-2 self-center sm:self-auto">
                 <ActionButton 
                    onClick={() => setIsProjectManagerModalOpen(true)} 
                    variant="secondary" 
                    title="Projekte verwalten"
                    className="mr-2 px-2.5 py-1.5 text-sm"
                >
                    <FolderIcon className="w-4 h-4 mr-1.5" /> Projekte
                </ActionButton>
                <div className="group relative inline-block mr-1">
                    <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-[#FF9900] cursor-help"/>
                    <div className="absolute top-full mt-2 right-0 w-60 bg-[#131A22] text-gray-300 text-xs rounded-md p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40 border border-[#4A596D]">
                        Projektverwaltung: Wechseln Sie zwischen verschiedenen Einstellungssätzen (Dateilade-Voreinstellungen, Exportprofile, Feldanzeige) für unterschiedliche Anwendungsfälle.
                    </div>
                </div>
                <div className="relative">
                    <select
                        id="activeProjectSelect"
                        value={activeProjectId || ""}
                        onChange={(e) => handleSelectProject(e.target.value)}
                        className="bg-[#232F3E] text-gray-200 pl-3 pr-8 py-1.5 rounded-md border border-[#4A596D] focus:ring-[#FF9900] focus:border-[#FF9900] text-sm appearance-none max-w-[150px] sm:max-w-[200px] truncate"
                        disabled={projects.length <= 1}
                        title={activeProject.name}
                    >
                        {projects.sort((a,b) => b.lastModified - a.lastModified).map(p => <option key={p.id} value={p.id} title={p.name}>{p.name}</option>)}
                    </select>
                    <ChevronUpDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
                </div>
            </div>
        </div>
      </header>

      <main className="w-full max-w-5xl bg-[#232F3E] shadow-2xl rounded-xl p-4 md:p-6">
        {!currentFileName && (
          <>
            <div className="flex items-center mb-3">
                <h2 className="text-xl font-semibold text-gray-300">Eingabe</h2>
                <div className="group relative ml-2">
                    <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-[#FF9900] cursor-help"/>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#131A22] text-gray-300 text-xs rounded-md p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-[#4A596D]">
                        Laden Sie Ihre Quelldatei hoch (z.B. TSV, CSV, JSON). Die Optionen für Trennzeichen, Kodierung und Header sind aus dem aktiven Projekt vorausgewählt, können aber hier geändert werden. Die Änderungen werden im Projekt gespeichert.
                    </div>
                </div>
            </div>
            <FileUpload 
                onFileLoad={handleFileLoad} 
                isLoading={isLoading} 
                className="mb-4"
                initialSeparatorChoice={activeProject.state.fileLoadSeparatorChoice}
                initialCustomSeparator={activeProject.state.fileLoadCustomSeparator}
                initialEncoding={activeProject.state.fileLoadEncoding}
                initialHeaderChoice={activeProject.state.fileLoadHeaderChoice}
                currentFileNameForDisplay={currentFileName} 
            />
          </>
        )}

        {error && (
          <div className="bg-red-700 border border-red-500 text-red-100 px-4 py-2.5 rounded-lg relative mb-4 text-sm" role="alert">
            <strong className="font-bold">Fehler: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-3 py-2 text-red-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300 rounded-md">X</button>
          </div>
        )}

        {currentFileName && !isLoading && (
          <>
            <div className="mb-4 pb-3 border-b border-[#3B4859]">
                <div className="flex items-center mb-1">
                    <h2 className="text-xl font-semibold text-gray-300">Eingabe</h2>
                     <div className="group relative ml-2">
                        <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-[#FF9900] cursor-help"/>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#131A22] text-gray-300 text-xs rounded-md p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-[#4A596D]">
                            Zeigt Informationen zur geladenen Datei an. Klicken Sie auf "Neue Datei" um aktuelle Daten zu löschen und eine neue Datei zu laden (Dateilade-Voreinstellungen des Projekts werden verwendet).
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div>
                        <p className="text-lg text-[#FF9900] truncate max-w-xs sm:max-w-md md:max-w-lg" title={currentFileName}>{currentFileName}</p>
                        {currentFileRecords.length > 0 && <p className="text-xs text-gray-400">{currentFileRecords.length} Datensätze ({currentFileHeaders.length} Spalten, Format/Trennzeichen: '{separatorDisplay}', Kodierung: {encodingDisplay}, Header: {headerChoiceDisplay}).</p>}
                        {currentFileRecords.length === 0 && !error && <p className="text-xs text-gray-400">Datei geladen, aber keine Datensätze gefunden oder Formatproblem. Kodierung: {encodingDisplay}, Header: {headerChoiceDisplay}</p>}
                    </div>
                    <ActionButton onClick={handleClearDataAndResetComponent} variant="danger" title="Neue Datei laden / Aktuelle Daten entfernen">
                        <TrashIcon className="w-4 h-4"/> <span className="hidden sm:inline">Neue Datei</span>
                    </ActionButton>
                </div>
            </div>
            
            {currentFileRecords.length > 0 ? (
              <>
                <div className="flex items-center mb-3">
                    <h2 className="text-xl font-semibold text-gray-300">Auswahl</h2>
                     <div className="group relative ml-2">
                        <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-[#FF9900] cursor-help"/>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#131A22] text-gray-300 text-xs rounded-md p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-[#4A596D]">
                            Hier können Sie Datensätze durchblättern, auswählen und die angezeigten Felder anpassen (projektspezifische Einstellungen). Werte in den Feldern sind editierbar. Tastatur: Pfeiltasten zum Blättern, Leertaste zum Auswählen.
                        </div>
                    </div>
                </div>

                <RecordControls 
                    {...recordControlsProps} 
                    onToggleSelectAll={handleToggleSelectAll}
                    isAllSelected={allRecordsSelected}
                />
                <div className="mb-4">
                  <RecordDisplayCard 
                    record={currentRecord} 
                    headers={headersForDisplay}
                    showEmptyFields={activeProject.state.showEmptyFields} 
                    onRecordChange={handleRecordChange}
                    fieldDisplayMode={activeProject.state.fieldDisplayMode}
                    visibleFieldKeys={activeProject.state.visibleFieldKeys}
                    onToggleFieldVisibility={handleToggleProjectFieldVisibility}
                    isReorderingActive={isReorderingFields}
                    currentFullHeaders={currentFileHeaders} 
                    customFieldOrder={activeProject.state.customFieldOrder}
                    onFieldOrderChange={handleFieldOrderChange}
                  />
                </div>
                <RecordControls {...recordControlsProps} />
                <FieldDisplayControls
                    showEmptyFields={activeProject.state.showEmptyFields}
                    onToggleShowEmptyFields={handleToggleProjectShowEmptyFields}
                    fieldDisplayMode={activeProject.state.fieldDisplayMode}
                    onSetFieldDisplayMode={handleSetProjectFieldDisplayMode}
                    onClearAllVisibleFieldKeys={handleClearAllProjectVisibleFieldKeys}
                    totalRecords={currentFileRecords.length}
                    isReorderingFields={isReorderingFields}
                    onToggleReorderFields={handleToggleReorderFields}
                    onResetFieldOrder={handleResetFieldOrder}
                />


                <div className="flex items-center mt-6 mb-3 pt-4 border-t border-[#3B4859]">
                    <h2 className="text-xl font-semibold text-gray-300">Ausgabe</h2>
                     <div className="group relative ml-2">
                        <InformationCircleIcon className="w-4 h-4 text-gray-400 hover:text-[#FF9900] cursor-help"/>
                         <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#131A22] text-gray-300 text-xs rounded-md p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-[#4A596D]">
                            Verwalten Sie Exportprofile (Struktur, Trennzeichen, Kodierung der Ausgabedatei) für das aktuelle Projekt. Wählen Sie ein Profil und laden Sie die ausgewählten Datensätze als CSV oder JSON herunter. Profile können importiert/exportiert werden.
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                   <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full md:w-auto">
                        <ActionButton
                            onClick={() => setIsManageProfilesModalOpen(true)}
                            variant="secondary" 
                            title="Exportprofile verwalten"
                            className="w-full sm:w-auto"
                        >
                            <FolderOpenIcon className="w-4 h-4 mr-1.5"/> Profile verwalten
                        </ActionButton>
                        <select 
                            id="activeProfileSelectDisplay" 
                            value={activeProject.state.activeExportProfileId || ""} 
                            onChange={(e) => updateActiveProjectState(ps => ({...ps, activeExportProfileId: e.target.value}))}
                            className="bg-[#3B4859] text-gray-200 p-2 rounded-md border border-[#4A596D] focus:ring-[#FF9900] focus:border-[#FF9900] text-sm w-full sm:w-auto sm:min-w-[200px]"
                            disabled={activeProject.state.exportProfiles.length === 0}
                        >
                            <option value="" disabled>{activeProject.state.exportProfiles.length === 0 ? 'Keine Profile vorhanden' : '-- Exportprofil wählen --'}</option>
                            {activeProject.state.exportProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                     <p className="text-gray-400 text-sm text-center md:text-right self-center md:mr-3">
                        {selectedIndices.size} Datens{selectedIndices.size === 1 ? 'satz' : 'ätze'} ausgewählt.
                      </p>
                    <ActionButton 
                        onClick={() => handleDownload('csv')}
                        disabled={selectedIndices.size === 0 || !activeProject.state.activeExportProfileId}
                        title={!activeProject.state.activeExportProfileId ? "Bitte Exportprofil wählen" : (selectedIndices.size === 0 ? "Datensätze zum Download auswählen" : `CSV Download mit Profil: ${activeProfileForDisplay?.name || ''}`)}
                        variant="primary"
                        className="w-full sm:w-auto"
                    >
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1.5"/>
                        Download CSV ({activeProfileForDisplay?.csvSeparator ? (activeProfileForDisplay.csvSeparator === '\t' ? '\\t' : activeProfileForDisplay.csvSeparator) : ';'})
                    </ActionButton>
                     <ActionButton 
                        onClick={() => handleDownload('json')}
                        disabled={selectedIndices.size === 0 || !activeProject.state.activeExportProfileId}
                        title={!activeProject.state.activeExportProfileId ? "Bitte Exportprofil wählen" : (selectedIndices.size === 0 ? "Datensätze zum Download auswählen" : `JSON Download mit Profil: ${activeProfileForDisplay?.name || ''}`)}
                        variant="primary"
                        className="w-full sm:w-auto"
                    >
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1.5"/>
                        Download (JSON)
                    </ActionButton>
                  </div>
                </div>
              </>
            ) : (
              !error && currentFileName && <p className="text-center text-gray-400 py-8">Keine Datensätze zum Anzeigen in Datei "{currentFileName}". Verwendetes Format/Trennzeichen: '{separatorDisplay}', Kodierung: {encodingDisplay}, Header: {headerChoiceDisplay}.</p>
            )}
          </>
        )}
         {isLoading && currentFileName && ( 
            <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF9900] mb-4"></div>
                <p className="text-gray-300 text-lg">Verarbeite {currentFileName}...</p>
            </div>
        )}
         {isLoading && !currentFileName && ( 
            <div className="flex flex-col items-center justify-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF9900] mb-4"></div>
                <p className="text-gray-300 text-lg">Wird geladen...</p>
            </div>
        )}
      </main>
      
      {isExportConfigModalOpen && activeProject && (
        <ExportConfigModal
          isOpen={isExportConfigModalOpen}
          onClose={() => { setIsExportConfigModalOpen(false); setProfileToEditForModal(null); }}
          onSave={handleSaveExportProfile}
          profileToEdit={profileToEditForModal}
          availableHeaders={currentFileHeaders} 
          firstRecord={currentFileRecords.length > 0 ? currentFileRecords[0] : null} 
          isCreatingNew={isCreatingNewProfileForModal}
        />
      )}

      {isManageProfilesModalOpen && activeProject && (
        <ManageProfilesModal
            isOpen={isManageProfilesModalOpen}
            onClose={() => setIsManageProfilesModalOpen(false)}
            profiles={activeProject.state.exportProfiles}
            onAddProfile={handleAddProfileFromManager}
            onSelectProfile={handleOpenEditProfileModal}
            onDeleteProfile={confirmDeleteProfile} 
            onDuplicateProfile={handleDuplicateProfile}
            onExportAllProfiles={handleExportAllProfilesFromActiveProject}
            onImportProfiles={handleImportProfilesToActiveProject}
            activeProfileId={activeProject.state.activeExportProfileId}
        />
      )}
       {isProjectManagerModalOpen && (
        <ProjectManagerModal
          isOpen={isProjectManagerModalOpen}
          onClose={() => setIsProjectManagerModalOpen(false)}
          projects={projects}
          activeProjectId={activeProjectId}
          onAddProject={handleCreateNewProject}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onDuplicateProject={handleDuplicateProject}
          onRenameProject={handleRenameProject}
          onExportAllProjects={handleExportAllProjects}
          onExportSingleProject={handleExportSingleProject}
          onImportProjects={handleImportProjects}
        />
      )}
      
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => { 
            confirmationModalProps.onConfirm();
        }}
        title={confirmationModalProps.title}
        message={confirmationModalProps.message}
        confirmButtonText={confirmationModalProps.confirmButtonText}
        cancelButtonText={confirmationModalProps.cancelButtonText}
        confirmButtonVariant={confirmationModalProps.confirmButtonVariant}
        confirmButton2Text={confirmationModalProps.confirmButton2Text}
        onConfirm2={() => { 
           confirmationModalProps.onConfirm2?.();
        }}
        confirmButton2Variant={confirmationModalProps.confirmButton2Variant}
      />

      <footer className="w-full max-w-5xl mt-8 text-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} Universal Data Remixer.</p>
      </footer>
    </div>
  );
};

export default App;
