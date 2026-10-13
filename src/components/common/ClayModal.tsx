import React from 'react';
import { X } from 'lucide-react';

interface ClayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const ClayModal: React.FC<ClayModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="clay-modal-overlay" onClick={onClose}>
      <div
        className="clay-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="clay-modal-header">
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#143823', fontWeight: 800 }}>{title}</h2>
          <button
            onClick={onClose}
            className="clay-btn clay-btn-secondary clay-btn-sm clay-btn-icon"
            style={{ width: 36, height: 36 }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="clay-modal-scroll-body">{children}</div>
      </div>
    </div>
  );
};
