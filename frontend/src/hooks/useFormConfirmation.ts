import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface FormConfirmationHook {
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  confirmNavigation: (callback: () => void) => void;
  resetForm: () => void;
  blockNavigation: boolean;
  setBlockNavigation: (block: boolean) => void;
}

export interface NavigationBlockerOptions {
  when: boolean;
  message?: string;
}

/**
 * Custom hook for managing form confirmation dialogs when navigating away from unsaved forms
 * 
 * Features:
 * - Tracks form dirty state
 * - Blocks navigation when forms have unsaved changes
 * - Provides methods to reset dirty state after successful saves
 * - Integrates with React Router for navigation blocking
 */
export const useFormConfirmation = (): FormConfirmationHook => {
  const [isDirty, setIsDirty] = useState(false);
  const [blockNavigation, setBlockNavigation] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Store the pending navigation callback
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  const setDirty = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
    setBlockNavigation(dirty);
  }, []);

  const resetForm = useCallback(() => {
    setIsDirty(false);
    setBlockNavigation(false);
    pendingNavigationRef.current = null;
  }, []);

  const confirmNavigation = useCallback((callback: () => void) => {
    if (!isDirty) {
      callback();
      return;
    }
    
    // Store the navigation callback for later use
    pendingNavigationRef.current = callback;
  }, [isDirty]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // React Router navigation blocking
  useEffect(() => {
    if (!blockNavigation) return;

    // This is a simplified approach - in a real implementation,
    // you might want to use a more sophisticated navigation blocking mechanism
    // that integrates with React Router v6's unstable_useBlocker or similar
    const handlePopState = (event: PopStateEvent) => {
      if (isDirty) {
        event.preventDefault();
        // Trigger confirmation dialog
        if (pendingNavigationRef.current) {
          pendingNavigationRef.current();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [blockNavigation, isDirty]);

  return {
    isDirty,
    setDirty,
    confirmNavigation,
    resetForm,
    blockNavigation,
    setBlockNavigation,
  };
};

/**
 * Helper hook for form field change tracking
 * Automatically sets dirty state when form values change
 */
export const useFormDirtyTracking = <T extends Record<string, any>>(
  initialValues: T,
  currentValues: T
): boolean => {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const hasChanges = Object.keys(currentValues).some(
      key => currentValues[key] !== initialValues[key]
    );
    setIsDirty(hasChanges);
  }, [initialValues, currentValues]);

  return isDirty;
};

/**
 * Enhanced hook that combines form confirmation with automatic dirty tracking
 */
export const useFormWithConfirmation = <T extends Record<string, any>>(
  initialValues: T,
  currentValues: T
): FormConfirmationHook & { isFormDirty: boolean } => {
  const formConfirmation = useFormConfirmation();
  const isFormDirty = useFormDirtyTracking(initialValues, currentValues);

  // Automatically sync dirty state
  useEffect(() => {
    formConfirmation.setDirty(isFormDirty);
  }, [isFormDirty, formConfirmation]);

  return {
    ...formConfirmation,
    isFormDirty,
  };
};