export type ParsedRecord = Record<string, string>;

export type CommonSeparator = ',' | ';' | '\t' | '|';
export type FileUploadSeparatorChoice = CommonSeparator | 'auto' | 'custom';

export type FileEncoding = 'UTF-8' | 'ISO-8859-1' | 'ISO-8859-2' | 'Windows-1250' | 'x-mac-ce';
export type HeaderDetectionChoice = 'auto' | 'firstLineIsHeader' | 'noHeader';

export interface FileUploadProps {
  onFileLoad: (content: string, fileName:string, chosenSeparator: string | 'auto', chosenEncoding: FileEncoding, headerChoice: HeaderDetectionChoice) => void;
  isLoading: boolean;
  className?: string;
  // Props to reflect active project's preferences for file loading
  initialSeparatorChoice: FileUploadSeparatorChoice;
  initialCustomSeparator: string;
  initialEncoding: FileEncoding;
  initialHeaderChoice: HeaderDetectionChoice;
  currentFileNameForDisplay: string | null; // To show the name of the globally loaded file
}

export type FieldDisplayMode = 'all' | 'selectedOnly' | 'configureVisible';

export interface RecordDisplayCardProps {
  record: ParsedRecord;
  headers: string[]; // Sorted and filtered headers to display
  showEmptyFields: boolean; 
  onRecordChange: (headerKey: string, newValue: string) => void;
  fieldDisplayMode: FieldDisplayMode; 
  visibleFieldKeys: Set<string>; 
  onToggleFieldVisibility: (headerKey: string, makeVisible: boolean) => void; 
  
  // For reordering
  isReorderingActive: boolean;
  currentFullHeaders: string[]; // All original headers from the file, unsorted, unfiltered
  customFieldOrder: string[] | null; // The current custom order from project state
  onFieldOrderChange: (newOrder: string[]) => void; // Handler to update project state with new order
}

export interface ActionButtonProps {
  onClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';
}

export interface IconProps {
  className?: string;
}

export interface RecordControlsProps {
  onPrevious: () => void;
  onNext: () => void;
  onToggleSelection: () => void;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  isCurrentSelected: boolean;
  currentIndex: number;
  totalRecords: number;
  onToggleSelectAll?: () => void;      
  isAllSelected?: boolean;            
}

export interface FieldDisplayControlsProps {
    showEmptyFields: boolean; 
    onToggleShowEmptyFields: () => void; 
    fieldDisplayMode: FieldDisplayMode; 
    onSetFieldDisplayMode: (mode: FieldDisplayMode) => void; 
    onClearAllVisibleFieldKeys: () => void; 
    totalRecords: number; 
    // For reordering
    isReorderingFields: boolean;
    onToggleReorderFields: () => void;
    onResetFieldOrder: () => void;
}


export interface ExportProfileField {
  id: string; 
  csvFieldName: string;
  tsvHeaderName: string | null;
  staticValue: string | null;
  isStatic: boolean;
}

export interface ExportProfile {
  id: string;
  name: string;
  fields: ExportProfileField[];
  csvSeparator: string;
  csvEncoding: FileEncoding;
  comment?: string; 
}

export interface ExportConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: ExportProfile) => void;
  profileToEdit: ExportProfile | null;
  availableHeaders: string[]; 
  firstRecord: ParsedRecord | null; 
  isCreatingNew: boolean;
}

export interface ManageProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ExportProfile[]; 
  onAddProfile: (name: string) => void; 
  onSelectProfile: (profileId: string) => void; 
  onDeleteProfile: (profileId: string) => void; 
  onDuplicateProfile: (profileId: string) => void; 
  onExportAllProfiles: () => void;
  onImportProfiles: (event: React.ChangeEvent<HTMLInputElement>) => void; 
  activeProfileId: string | null; 
}

export interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmButtonText?: string;
    cancelButtonText?: string;
    // Optional second confirm button
    confirmButton2Text?: string;
    onConfirm2?: () => void;
    confirmButtonVariant?: ActionButtonProps['variant'];
    confirmButton2Variant?: ActionButtonProps['variant'];
}

// Project-related types
export interface ProjectState {
  // File loading preferences for this project
  fileLoadSeparatorChoice: FileUploadSeparatorChoice;
  fileLoadCustomSeparator: string;
  fileLoadEncoding: FileEncoding;
  fileLoadHeaderChoice: HeaderDetectionChoice;

  // Display settings for this project
  showEmptyFields: boolean;
  fieldDisplayMode: FieldDisplayMode;
  visibleFieldKeys: Set<string>; 
  customFieldOrder: string[] | null; // New: User-defined order of header keys

  // Export profiles for this project
  exportProfiles: ExportProfile[];
  activeExportProfileId: string | null;
}

export interface Project {
  id: string;
  name: string;
  state: ProjectState;
  lastModified: number;
}

export interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onAddProject: (name: string) => void;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onExportAllProjects: () => void;
  onExportSingleProject: (projectId: string) => void; 
  onImportProjects: (event: React.ChangeEvent<HTMLInputElement>) => void; 
}