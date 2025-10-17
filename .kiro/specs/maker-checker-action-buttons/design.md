# Design Document

## Overview

This design implements role-based action buttons for the maker-checker workflow, ensuring that Checkers and Admins see appropriate "Accept/Reject" buttons when viewing submitted Reviews and Exceptions, while Makers see "Save/Submit" buttons for their own draft items.

The solution involves:
1. Enhanced role and status detection logic
2. Conditional button rendering based on user permissions
3. Proper API integration for approve/reject actions
4. Consistent UX patterns across Review and Exception forms
5. Comprehensive error handling and user feedback

## Architecture

### Component Structure

```
ReviewForm/ExceptionForm
├── ActionButtonGroup (new component)
│   ├── MakerActions (Save Draft, Submit for Review)
│   ├── CheckerActions (Accept, Reject)
│   └── ReadOnlyIndicator (for completed items)
├── RejectionDialog (new component)
└── ConfirmationDialog (existing, enhanced)
```

### State Management

The forms will maintain additional state for:
- `userRole`: Current user's role ('maker', 'checker', 'admin')
- `itemStatus`: Current status of the Review/Exception
- `canEdit`: Boolean indicating if user can edit the item
- `canApprove`: Boolean indicating if user can approve/reject
- `actionInProgress`: Tracks which action is currently being performed

### Permission Logic

```typescript
interface PermissionContext {
  user: User
  item: Review | Exception
  isOwner: boolean
}

const getAvailableActions = (context: PermissionContext): ActionType[] => {
  const { user, item, isOwner } = context
  
  // Read-only states
  if (['APPROVED', 'REJECTED', 'COMPLETED', 'CLOSED', 'RESOLVED'].includes(item.status)) {
    return ['VIEW_ONLY']
  }
  
  // Maker actions (own items only)
  if (user.role === 'maker' && isOwner && ['DRAFT', 'OPEN'].includes(item.status)) {
    return ['SAVE_DRAFT', 'SUBMIT']
  }
  
  // Checker/Admin actions (submitted items)
  if (['checker', 'admin'].includes(user.role) && ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS'].includes(item.status)) {
    return ['ACCEPT', 'REJECT']
  }
  
  return ['VIEW_ONLY']
}
```

## Components and Interfaces

### ActionButtonGroup Component

```typescript
interface ActionButtonGroupProps {
  actions: ActionType[]
  onSave?: () => Promise<void>
  onSubmit?: () => Promise<void>
  onAccept?: (comments?: string) => Promise<void>
  onReject?: (reason: string) => Promise<void>
  loading?: {
    save?: boolean
    submit?: boolean
    accept?: boolean
    reject?: boolean
  }
  disabled?: boolean
}

const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
  actions,
  onSave,
  onSubmit,
  onAccept,
  onReject,
  loading = {},
  disabled = false
}) => {
  // Render appropriate buttons based on actions array
  // Handle loading states and confirmation dialogs
}
```

### RejectionDialog Component

```typescript
interface RejectionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  title: string
  itemType: 'Review' | 'Exception'
  loading?: boolean
}

const RejectionDialog: React.FC<RejectionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  itemType,
  loading = false
}) => {
  // Modal dialog with required reason field
  // Validation for minimum reason length
  // Loading state during API call
}
```

### Enhanced Form Logic

Both ReviewForm and ExceptionForm will be updated with:

1. **Permission Detection**:
   ```typescript
   const permissions = useMemo(() => {
     return getAvailableActions({
       user: user!,
       item: reviewData || exceptionData,
       isOwner: isOwner(user, reviewData || exceptionData)
     })
   }, [user, reviewData, exceptionData])
   ```

2. **Action Handlers**:
   ```typescript
   const handleAccept = async (comments?: string) => {
     try {
       setLoading(prev => ({ ...prev, accept: true }))
       if (reviewId) {
         await approveReview(reviewId, comments)
       } else if (exceptionId) {
         await approveException(exceptionId, comments)
       }
       showSuccess('Item approved successfully')
       onRefresh?.()
     } catch (error) {
       showError(error.message)
     } finally {
       setLoading(prev => ({ ...prev, accept: false }))
     }
   }

   const handleReject = async (reason: string) => {
     try {
       setLoading(prev => ({ ...prev, reject: true }))
       if (reviewId) {
         await rejectReview(reviewId, reason)
       } else if (exceptionId) {
         await rejectException(exceptionId, reason)
       }
       showSuccess('Item rejected successfully')
       onRefresh?.()
     } catch (error) {
       showError(error.message)
     } finally {
       setLoading(prev => ({ ...prev, reject: false }))
       setRejectionDialogOpen(false)
     }
   }
   ```

## Data Models

### Enhanced Action Types

```typescript
type ActionType = 
  | 'SAVE_DRAFT'
  | 'SUBMIT'
  | 'ACCEPT'
  | 'REJECT'
  | 'VIEW_ONLY'

interface ActionConfig {
  type: ActionType
  label: string
  variant: 'contained' | 'outlined' | 'text'
  color: 'primary' | 'secondary' | 'success' | 'error'
  icon: React.ComponentType
  requiresConfirmation?: boolean
  requiresReason?: boolean
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  SAVE_DRAFT: {
    type: 'SAVE_DRAFT',
    label: 'Save Draft',
    variant: 'outlined',
    color: 'secondary',
    icon: SaveIcon
  },
  SUBMIT: {
    type: 'SUBMIT',
    label: 'Submit for Review',
    variant: 'contained',
    color: 'primary',
    icon: SendIcon,
    requiresConfirmation: true
  },
  ACCEPT: {
    type: 'ACCEPT',
    label: 'Accept',
    variant: 'contained',
    color: 'success',
    icon: CheckIcon,
    requiresConfirmation: true
  },
  REJECT: {
    type: 'REJECT',
    label: 'Reject',
    variant: 'contained',
    color: 'error',
    icon: CloseIcon,
    requiresConfirmation: true,
    requiresReason: true
  },
  VIEW_ONLY: {
    type: 'VIEW_ONLY',
    label: 'Read Only',
    variant: 'text',
    color: 'secondary',
    icon: VisibilityIcon
  }
}
```

### API Integration

The existing `makerCheckerActions.ts` service will be enhanced to support Exception approval/rejection:

```typescript
// Add to makerCheckerActions.ts
export const approveException = async (exceptionId: number, comments?: string): Promise<any> => {
  validateId(exceptionId, 'exception')
  
  try {
    return await apiClient.updateExceptionStatus(exceptionId, {
      status: 'RESOLVED',
      resolution_notes: trimOrUndefined(comments)
    })
  } catch (error) {
    throw new MakerCheckerError(
      error instanceof Error ? error.message : 'Failed to approve exception',
      error as Error
    )
  }
}

export const rejectException = async (exceptionId: number, reason: string): Promise<any> => {
  validateId(exceptionId, 'exception')
  
  const trimmedReason = reason?.trim()
  if (!trimmedReason) {
    throw new MakerCheckerError('Rejection reason is required')
  }
  
  try {
    return await apiClient.updateExceptionStatus(exceptionId, {
      status: 'CLOSED',
      resolution_notes: trimmedReason
    })
  } catch (error) {
    throw new MakerCheckerError(
      error instanceof Error ? error.message : 'Failed to reject exception',
      error as Error
    )
  }
}
```

## Error Handling

### Error Scenarios

1. **Permission Errors**: User lacks permission to perform action
2. **Network Errors**: API calls fail due to connectivity
3. **Validation Errors**: Missing required fields (e.g., rejection reason)
4. **State Errors**: Item status changed during user interaction
5. **Session Errors**: User session expired during action

### Error Handling Strategy

```typescript
const handleActionError = (error: Error, actionType: ActionType) => {
  if (error.message.includes('permission') || error.message.includes('unauthorized')) {
    showError('You do not have permission to perform this action')
    // Optionally refresh user permissions
  } else if (error.message.includes('network') || error.message.includes('fetch')) {
    showError('Network error. Please check your connection and try again.')
  } else if (error.message.includes('validation')) {
    showError('Please check all required fields and try again')
  } else {
    showError(`Failed to ${actionType.toLowerCase()}. Please try again.`)
  }
  
  // Log error for debugging
  console.error(`Action ${actionType} failed:`, error)
}
```

## Testing Strategy

### Unit Tests

1. **Permission Logic Tests**: Verify correct actions are returned for different user/item combinations
2. **Button Rendering Tests**: Ensure correct buttons are displayed based on permissions
3. **Action Handler Tests**: Verify API calls are made with correct parameters
4. **Error Handling Tests**: Ensure errors are properly caught and displayed

### Integration Tests

1. **End-to-End Workflow Tests**: Test complete maker-checker flow from creation to approval
2. **Role Switching Tests**: Verify behavior when user role changes
3. **Status Transition Tests**: Ensure buttons update correctly when item status changes
4. **Cross-Component Tests**: Verify consistency between Review and Exception forms

### Test Scenarios

```typescript
describe('Maker-Checker Action Buttons', () => {
  describe('Review Form', () => {
    it('shows Save/Submit buttons for maker viewing own draft review', () => {
      // Test maker permissions on draft review
    })
    
    it('shows Accept/Reject buttons for checker viewing submitted review', () => {
      // Test checker permissions on submitted review
    })
    
    it('shows read-only mode for completed reviews', () => {
      // Test read-only state for completed items
    })
  })
  
  describe('Exception Form', () => {
    it('shows appropriate buttons based on user role and exception status', () => {
      // Test exception-specific logic
    })
  })
  
  describe('Error Handling', () => {
    it('handles permission errors gracefully', () => {
      // Test permission error scenarios
    })
    
    it('handles network errors with retry options', () => {
      // Test network error handling
    })
  })
})
```

This design ensures a consistent, role-appropriate user experience while maintaining the integrity of the maker-checker workflow and providing comprehensive error handling and user feedback.