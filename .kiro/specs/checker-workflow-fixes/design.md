# Checker Workflow Fixes - Design Document

## Overview

This design addresses the checker workflow issues by enhancing the CheckerPanel component to properly load and display KYC questionnaires for all review statuses, and improving the KYCQuestionnaireForm component to properly enforce read-only mode.

## Architecture

### Component Hierarchy
```
CheckerPanel
├── ReviewList (existing)
├── ReviewDetail (existing)
│   ├── KYCResponseDisplay (for read-only views)
│   ├── KYCQuestionnaireForm (for editable views)
│   ├── ExceptionDisplay (existing)
│   └── DocumentList (existing)
└── ActionButtons (status-dependent)
```

### Data Flow
1. **Review Selection**: CheckerPanel loads review details including KYC data for any status
2. **Status Evaluation**: Component determines display mode based on review status
3. **Component Selection**: Renders appropriate KYC component (read-only vs editable)
4. **Action Availability**: Shows/hides action buttons based on review status

## Components and Interfaces

### Enhanced CheckerPanel Component

#### New Props Interface
```typescript
interface ReviewDisplayMode {
  isReadOnly: boolean
  showActions: boolean
  displayMode: 'view' | 'review'
}
```

#### Status-Based Display Logic
```typescript
const getDisplayMode = (status: string): ReviewDisplayMode => {
  switch (status) {
    case 'DRAFT':
    case 'APPROVED': 
    case 'REJECTED':
      return { isReadOnly: true, showActions: false, displayMode: 'view' }
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return { isReadOnly: false, showActions: true, displayMode: 'review' }
    default:
      return { isReadOnly: true, showActions: false, displayMode: 'view' }
  }
}
```

#### Enhanced Review Loading
- Remove status filtering from `loadReviewDetails()` method
- Load KYC data for all review statuses
- Implement proper error handling for missing data
- Add loading states for better UX

### Enhanced KYCQuestionnaireForm Component

#### Read-Only Mode Improvements
```typescript
interface ReadOnlyFieldProps {
  label: string
  value: string | undefined
  type: 'text' | 'dropdown' | 'document'
  options?: Array<{value: string, label: string}>
}
```

#### Field Rendering Strategy
- **Text Fields**: Convert to read-only text display with proper formatting
- **Dropdowns**: Show selected value as formatted text with visual indicators
- **Document Fields**: Display document list without upload functionality
- **Conditional Fields**: Show/hide based on conditions but disable editing

#### Visual Indicators
- Add visual styling to distinguish read-only mode
- Use different color schemes for read-only vs editable states
- Add status badges to indicate form mode

### API Integration Enhancements

#### Modified API Calls
```typescript
// Remove status restrictions from KYC loading
const loadKYCForAnyStatus = async (reviewId: number) => {
  try {
    const kycData = await apiClient.getKYCQuestionnaire(reviewId)
    return kycData
  } catch (error) {
    // Handle missing data gracefully
    console.warn(`No KYC data found for review ${reviewId}`)
    return null
  }
}
```

## Data Models

### Enhanced Review Status Handling
```typescript
type ReviewStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'

interface ReviewDisplayConfig {
  status: ReviewStatus
  canEdit: boolean
  canApprove: boolean
  canReject: boolean
  kycMode: 'readonly' | 'editable'
  showActions: boolean
}
```

### KYC Display Modes
```typescript
interface KYCDisplayProps {
  questionnaire: KYCQuestionnaire
  mode: 'readonly' | 'editable'
  onDataChange?: (data: KYCQuestionnaire) => void
  disabled?: boolean
}
```

## Error Handling

### Graceful Degradation
- **Missing KYC Data**: Show informative message instead of error
- **API Failures**: Display retry options and fallback content
- **Invalid Status**: Default to read-only mode for safety

### Error Messages
```typescript
const ERROR_MESSAGES = {
  NO_KYC_DATA: "No KYC questionnaire data available for this review",
  LOAD_FAILED: "Failed to load review details. Please try again.",
  INVALID_STATUS: "Review status not recognized. Displaying in read-only mode."
}
```

## Testing Strategy

### Unit Tests
- Test status-based display mode logic
- Test KYC form read-only enforcement
- Test error handling scenarios
- Test conditional field visibility

### Integration Tests
- Test complete checker workflow for each status
- Test KYC data loading for all review types
- Test action button visibility logic
- Test form mode switching

### User Acceptance Tests
- Verify checkers can view approved/rejected reviews
- Verify read-only mode prevents editing
- Verify actions are available only for appropriate statuses
- Verify error handling provides clear feedback

## Implementation Notes

### Backward Compatibility
- Maintain existing API contracts
- Preserve current functionality for active reviews
- Ensure no breaking changes to existing workflows

### Performance Considerations
- Cache KYC data to avoid repeated API calls
- Implement lazy loading for large document lists
- Optimize re-rendering when switching between reviews

### Security Considerations
- Enforce read-only mode on both frontend and backend
- Validate review status before allowing modifications
- Audit all checker actions for compliance tracking