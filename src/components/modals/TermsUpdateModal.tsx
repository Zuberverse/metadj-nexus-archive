'use client';

import { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Modal, ModalContent, Button, ErrorDisplay } from '@/components/ui';
import { logger } from '@/lib/logger';

interface TermsUpdateModalProps {
  /** Callback when terms are successfully accepted */
  onAccepted: () => void;
}

export function TermsUpdateModal({ onAccepted }: TermsUpdateModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptTerms = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data?.message || 'Failed to accept terms. Please try again.';
        setError(errorMessage);
        logger.error('[TermsUpdateModal] Failed to accept terms', {
          status: response.status,
          message: errorMessage,
        });
        return;
      }

      const data = await response.json();
      logger.info('[TermsUpdateModal] Terms accepted successfully', {
        termsVersion: data.termsVersion,
      });

      // Call the callback after successful acceptance
      onAccepted();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError('Failed to accept terms. Please check your connection and try again.');
      logger.error('[TermsUpdateModal] Error accepting terms', {
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {}}
      title="Terms Updated"
      size="md"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      overlayClassName="bg-black/80 backdrop-blur-xl"
      className="radiant-panel w-full border border-white/12 bg-(--bg-modal) shadow-[0_35px_80px_rgba(3,5,20,0.75)] rounded-[20px] sm:rounded-[24px]"
      aria-labelledby="terms-update-title"
    >
      <ModalContent className="px-6 py-8 sm:px-8 sm:py-8 space-y-6">
        {/* Header */}
        <div className="space-y-3 text-center">
          <h2
            id="terms-update-title"
            className="text-2xl sm:text-3xl font-heading font-bold text-heading-solid"
          >
            Terms Updated
          </h2>
          <p className="text-base sm:text-lg text-white/80 leading-relaxed">
            Our Terms &amp; Conditions have been updated to reflect changes in our service, 
            including information about MetaDJai and how your data is used.
          </p>
        </div>

        {/* Link to full terms */}
        <div className="flex items-center justify-center">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors group"
          >
            View full terms &amp; conditions
            <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Error display */}
        {error && (
          <ErrorDisplay
            variant="inline"
            title="Unable to Accept Terms"
            message={error}
            icon={<AlertCircle className="h-6 w-6 text-(--metadj-red)" strokeWidth={1.5} />}
          />
        )}

        {/* Accept button */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleAcceptTerms}
            isLoading={isLoading}
            disabled={isLoading}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            Accept Terms
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-xs text-white/50 text-center">
          You must accept the updated terms to continue using MetaDJ Nexus
        </p>
      </ModalContent>
    </Modal>
  );
}
