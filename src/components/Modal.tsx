import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-zinc-900/30 border-t border-zinc-900 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'primary' }) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-zinc-400 text-sm leading-relaxed">{message}</p>
    </Modal>
  );
};
