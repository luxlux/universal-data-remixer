
import React from 'react';
import { ConfirmationModalProps } from '../types.js';
import ActionButton from './ActionButton.js';
import { CheckCircleIcon, XCircleIcon, TrashIcon } from './icons.js'; // Example icons

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = "Bestätigen",
  cancelButtonText = "Abbrechen",
  confirmButtonVariant, // Added
  confirmButton2Text,  // Added
  onConfirm2,          // Added
  confirmButton2Variant // Added
}) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-[100]"
        aria-modal="true" 
        role="dialog" 
        onClick={onClose}
    >
      <div 
        className="bg-[#1E293B] p-6 rounded-lg shadow-2xl w-full max-w-md border border-[#3B4859]"
        onClick={(e) => e.stopPropagation()} 
      >
        <h2 className="text-xl font-semibold text-[#FF9900] mb-4 flex items-center">
          {title.toLowerCase().includes("löschen") || title.toLowerCase().includes("delete") ? <TrashIcon className="w-5 h-5 mr-2 text-red-400"/> : null}
          {title}
        </h2>
        
        <div className="text-gray-300 mb-6 text-sm">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <ActionButton onClick={onClose} variant="ghost">
            <XCircleIcon className="w-4 h-4 mr-1.5"/> {cancelButtonText}
          </ActionButton>
          {onConfirm2 && confirmButton2Text && (
            <ActionButton
                onClick={onConfirm2}
                variant={confirmButton2Variant || 'secondary'}
            >
                 {/* You might want specific icons for onConfirm2 based on context */}
                {confirmButton2Text}
            </ActionButton>
          )}
          <ActionButton 
            onClick={onConfirm} 
            variant={confirmButtonVariant || (title.toLowerCase().includes("löschen") ? 'danger' : 'primary')}
          >
            <CheckCircleIcon className="w-4 h-4 mr-1.5"/> {confirmButtonText}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;