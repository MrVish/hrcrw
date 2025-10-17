import { useEffect, useRef, useState, useCallback } from 'react';
import { announceToScreenReader } from '../utils/keyboard';

/**
 * Hook for managing ARIA live regions and announcements
 */
export const useAnnouncement = () => {
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    announceToScreenReader(message, priority);
  }, []);

  return { announce };
};

/**
 * Hook for managing focus and ARIA attributes
 */
export const useFocusManagement = () => {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const setFocus = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
      setFocusedId(elementId);
    }
  }, []);

  const clearFocus = useCallback(() => {
    setFocusedId(null);
  }, []);

  return {
    focusedId,
    setFocus,
    clearFocus,
  };
};

/**
 * Hook for managing loading states with accessibility
 */
export const useAccessibleLoading = (isLoading: boolean, loadingText = 'Loading') => {
  const { announce } = useAnnouncement();
  const previousLoadingState = useRef(isLoading);

  useEffect(() => {
    if (isLoading && !previousLoadingState.current) {
      announce(loadingText, 'polite');
    } else if (!isLoading && previousLoadingState.current) {
      announce('Loading complete', 'polite');
    }
    previousLoadingState.current = isLoading;
  }, [isLoading, loadingText, announce]);

  return {
    'aria-busy': isLoading,
    'aria-live': 'polite' as const,
  };
};

/**
 * Hook for managing form validation with accessibility
 */
export const useAccessibleForm = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { announce } = useAnnouncement();

  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
    announce(`Error in ${fieldName}: ${error}`, 'assertive');
  }, [announce]);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const getFieldProps = useCallback((fieldName: string) => {
    const hasError = fieldName in errors;
    const errorId = hasError ? `${fieldName}-error` : undefined;

    return {
      'aria-invalid': hasError,
      'aria-describedby': errorId,
    };
  }, [errors]);

  const getErrorProps = useCallback((fieldName: string) => {
    const hasError = fieldName in errors;
    
    return hasError ? {
      id: `${fieldName}-error`,
      role: 'alert' as const,
      'aria-live': 'assertive' as const,
    } : {};
  }, [errors]);

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    getFieldProps,
    getErrorProps,
  };
};

/**
 * Hook for managing modal accessibility
 */
export const useAccessibleModal = (isOpen: boolean) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Set focus to modal
      if (modalRef.current) {
        modalRef.current.focus();
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Add escape key listener
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          // This should be handled by the parent component
          event.preventDefault();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      
      // Restore focus to previous element
      if (previousActiveElement.current && 'focus' in previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  const modalProps = {
    ref: modalRef,
    role: 'dialog' as const,
    'aria-modal': true,
    tabIndex: -1,
  };

  return { modalRef, modalProps };
};

/**
 * Hook for managing table accessibility
 */
export const useAccessibleTable = () => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  const getColumnProps = useCallback((column: string) => {
    const isSorted = sortColumn === column;
    let ariaSortValue: 'ascending' | 'descending' | 'none' = 'none';
    
    if (isSorted) {
      ariaSortValue = sortDirection === 'asc' ? 'ascending' : 'descending';
    }

    return {
      'aria-sort': ariaSortValue,
      tabIndex: 0,
      role: 'columnheader' as const,
      onClick: () => handleSort(column),
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSort(column);
        }
      },
    };
  }, [sortColumn, sortDirection, handleSort]);

  return {
    sortColumn,
    sortDirection,
    handleSort,
    getColumnProps,
  };
};

/**
 * Hook for managing pagination accessibility
 */
export const useAccessiblePagination = (
  currentPage: number,
  totalPages: number,
  onPageChange: (page: number) => void
) => {
  const { announce } = useAnnouncement();

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
      announce(`Page ${page} of ${totalPages}`, 'polite');
    }
  }, [currentPage, totalPages, onPageChange, announce]);

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const goToPreviousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const getPageButtonProps = useCallback((page: number) => {
    const isCurrent = page === currentPage;
    
    return {
      'aria-current': isCurrent ? ('page' as const) : undefined,
      'aria-label': `Go to page ${page}`,
      onClick: () => goToPage(page),
    };
  }, [currentPage, goToPage]);

  const getPreviousButtonProps = useCallback(() => {
    const disabled = currentPage <= 1;
    
    return {
      'aria-label': 'Go to previous page',
      disabled,
      onClick: goToPreviousPage,
    };
  }, [currentPage, goToPreviousPage]);

  const getNextButtonProps = useCallback(() => {
    const disabled = currentPage >= totalPages;
    
    return {
      'aria-label': 'Go to next page',
      disabled,
      onClick: goToNextPage,
    };
  }, [currentPage, totalPages, goToNextPage]);

  return {
    goToPage,
    goToNextPage,
    goToPreviousPage,
    getPageButtonProps,
    getPreviousButtonProps,
    getNextButtonProps,
  };
};

/**
 * Hook for managing dropdown/combobox accessibility
 */
export const useAccessibleDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const handleKeyDown = useCallback((event: KeyboardEvent, options: string[]) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setActiveIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setActiveIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;

      case 'Escape':
        event.preventDefault();
        close();
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          open();
        }
        break;
    }
  }, [isOpen, open, close]);

  const getDropdownProps = useCallback(() => ({
    ref: dropdownRef,
    'aria-expanded': isOpen,
    'aria-haspopup': 'listbox' as const,
    role: 'combobox' as const,
  }), [isOpen]);

  const getOptionProps = useCallback((index: number) => ({
    role: 'option' as const,
    'aria-selected': index === activeIndex,
    id: `option-${index}`,
  }), [activeIndex]);

  return {
    isOpen,
    activeIndex,
    open,
    close,
    toggle,
    handleKeyDown,
    getDropdownProps,
    getOptionProps,
  };
};

export default {
  useAnnouncement,
  useFocusManagement,
  useAccessibleLoading,
  useAccessibleForm,
  useAccessibleModal,
  useAccessibleTable,
  useAccessiblePagination,
  useAccessibleDropdown,
};