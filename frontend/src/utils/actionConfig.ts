import type { ActionType, ActionConfig, PermissionContext, User, Review, Exception } from '../types'

// Action configuration mapping with Material-UI styling
export const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  SAVE_DRAFT: {
    type: 'SAVE_DRAFT',
    label: 'Save Draft',
    variant: 'outlined',
    color: 'secondary',
    icon: 'Save'
  },
  SUBMIT: {
    type: 'SUBMIT',
    label: 'Submit for Review',
    variant: 'contained',
    color: 'primary',
    icon: 'Send',
    requiresConfirmation: true
  },
  ACCEPT: {
    type: 'ACCEPT',
    label: 'Accept',
    variant: 'contained',
    color: 'success',
    icon: 'Check',
    requiresConfirmation: true
  },
  REJECT: {
    type: 'REJECT',
    label: 'Reject',
    variant: 'contained',
    color: 'error',
    icon: 'Close',
    requiresConfirmation: true,
    requiresReason: true
  },
  VIEW_ONLY: {
    type: 'VIEW_ONLY',
    label: 'Read Only',
    variant: 'text',
    color: 'secondary',
    icon: 'Visibility'
  }
}

/**
 * Determines available actions based on user role, item status, and ownership
 */
export const getAvailableActions = (context: PermissionContext): ActionType[] => {
  const { user, item, isOwner } = context
  
  // Normalize role to lowercase for consistent comparison
  const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'
  
  console.log('getAvailableActions called:', { userRole, itemId: item.id, isOwner })
  
  if ('status' in item) {
    // Handle Review items
    const review = item as Review
    
    // Maker actions (own items only)
    if (userRole === 'maker' && isOwner && review.status === 'DRAFT') {
      return ['SAVE_DRAFT', 'SUBMIT']
    }
    
    // Checker/Admin actions (submitted items)
    if (['checker', 'admin'].includes(userRole) && ['SUBMITTED', 'UNDER_REVIEW'].includes(review.status)) {
      return ['ACCEPT', 'REJECT']
    }
    
    // All completed reviews are view-only (but checkers and admins can still view them)
    if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(review.status)) {
      return ['VIEW_ONLY']
    }
  } else {
    // Handle Exception items
    const exception = item as Exception
    
    // Normalize status to uppercase for consistent comparison
    const exceptionStatus = exception.status.toUpperCase()
    
    // For new exceptions (id === 0), allow admin and checker to create/save
    if (exception.id === 0 && ['admin', 'checker'].includes(userRole)) {
      console.log('New exception detected for admin/checker, returning SAVE_DRAFT, SUBMIT')
      return ['SAVE_DRAFT', 'SUBMIT']
    }
    
    // Maker actions (own items only)
    if (userRole === 'maker' && isOwner && exceptionStatus === 'OPEN') {
      return ['SAVE_DRAFT', 'SUBMIT']
    }
    
    // Checker/Admin actions (submitted items)
    if (['checker', 'admin'].includes(userRole) && ['OPEN', 'IN_PROGRESS'].includes(exceptionStatus)) {
      return ['ACCEPT', 'REJECT']
    }
    
    // All completed exceptions are view-only
    if (['RESOLVED', 'CLOSED'].includes(exceptionStatus)) {
      return ['VIEW_ONLY']
    }
  }
  
  console.log('No matching conditions, returning VIEW_ONLY')
  return ['VIEW_ONLY']
}

/**
 * Checks if user is the owner of the item
 */
export const isOwner = (user: User, item: Review | Exception): boolean => {
  if ('submitted_by' in item) {
    // Review item
    return (item as Review).submitted_by === user.id
  } else {
    // Exception item
    return (item as Exception).created_by === user.id
  }
}

/**
 * Determines if user can edit the item
 */
export const canEdit = (user: User, item: Review | Exception): boolean => {
  const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'
  const owner = isOwner(user, item)
  
  if ('status' in item) {
    // Review item
    const review = item as Review
    return userRole === 'maker' && owner && review.status === 'DRAFT'
  } else {
    // Exception item
    const exception = item as Exception
    return userRole === 'maker' && owner && exception.status === 'open'
  }
}

/**
 * Determines if user can approve/reject the item
 */
export const canApproveReject = (user: User, item: Review | Exception): boolean => {
  const userRole = user.role.toLowerCase() as 'admin' | 'checker' | 'maker'
  
  if (!['checker', 'admin'].includes(userRole)) {
    return false
  }
  
  if ('status' in item) {
    // Review item
    const review = item as Review
    return ['SUBMITTED', 'UNDER_REVIEW'].includes(review.status)
  } else {
    // Exception item
    const exception = item as Exception
    return ['open', 'in_progress'].includes(exception.status)
  }
}