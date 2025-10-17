# Design Document

## Overview

This design implements consistent color-coded styling for Risk levels and Status indicators across Clients and Exceptions components to match the existing professional styling used in the Reviews component. The solution leverages the existing StatusBadge component and extends it to handle all status types with consistent visual styling.

## Architecture

### Current State Analysis

**Reviews Component:**
- Uses custom `getStatusColor()` and `getStatusIcon()` functions
- Implements Chip components with outlined variant
- Has beautiful color-coded status badges (green=approved, blue=submitted, gray=draft)
- Includes icons for each status type

**Clients Component:**
- Already imports and uses StatusBadge component
- Currently uses both filled and outlined variants
- Has basic status and risk level display

**Exceptions Component:**
- Does not currently use StatusBadge
- Uses basic text or simple styling for status and priority

### Target Architecture

**Centralized StatusBadge Component:**
- Enhanced to handle all status types (client, exception, review, risk)
- Consistent color scheme across all components
- Support for both filled and outlined variants
- Icon integration for better visual hierarchy
- Accessibility features built-in

## Components and Interfaces

### Enhanced StatusBadge Component

```typescript
interface StatusBadgeProps extends Omit<ChipProps, 'color'> {
    status: StatusType
    type: 'client' | 'exception' | 'review' | 'risk' | 'priority'
    variant?: 'filled' | 'outlined'
    showIcon?: boolean
    'aria-label'?: string
}

type StatusType = ClientStatus | ExceptionStatus | RiskLevel | Priority | ReviewStatus
```

**Key Features:**
- Type-specific color mapping
- Consistent visual styling matching Reviews
- Optional icon display
- Accessibility compliance
- Hover effects and transitions

### Color Scheme Design

**Status Colors:**
- **Green** (`success.main`): Active, Approved, Resolved, Low Risk
- **Blue** (`info.main`): Submitted, Pending
- **Orange** (`warning.main`): Under Review, In Progress, Medium Risk, High Priority
- **Red** (`error.main`): Rejected, Open, High Risk, Critical Priority
- **Gray** (`grey[500]`): Draft, Inactive, Closed, Low Priority
- **Dark Red** (`error.dark`): Critical Risk, Escalated

**Risk Level Mapping:**
- Low → Green
- Medium → Orange  
- High → Red
- Critical/Very High → Dark Red

**Client Status Mapping:**
- Active → Green
- Inactive → Gray
- Suspended → Red
- Under Review → Orange
- Pending → Blue

**Exception Status Mapping:**
- Open → Red
- In Progress → Orange
- Resolved → Green
- Closed → Gray
- Escalated → Dark Red

**Exception Priority Mapping:**
- Low → Green
- Medium → Orange
- High → Red
- Critical → Dark Red

### Icon Integration

**Status Icons:**
- Draft: FileText
- Submitted: Clock
- Under Review: Eye
- Approved: CheckCircle
- Rejected: XCircle
- Open: AlertTriangle
- In Progress: Clock
- Resolved: CheckCircle
- Closed: XCircle

**Risk Level Icons:**
- Low: Shield (green)
- Medium: AlertTriangle (orange)
- High: Warning (red)
- Critical: AlertOctagon (dark red)

## Data Models

### StatusBadge Props Interface

```typescript
interface StatusBadgeProps {
    status: StatusType
    type: 'client' | 'exception' | 'review' | 'risk' | 'priority'
    variant?: 'filled' | 'outlined'
    showIcon?: boolean
    size?: 'small' | 'medium'
    'aria-label'?: string
}
```

### Color Configuration

```typescript
interface StatusColorConfig {
    color: string
    backgroundColor?: string
    icon?: React.ComponentType
}

type ColorMap = Record<StatusType, StatusColorConfig>
```

## Error Handling

### Fallback Behavior
- Unknown status types default to gray color
- Missing icons fall back to generic status icon
- Invalid props are handled gracefully with console warnings in development

### Accessibility
- All badges include proper ARIA labels
- Color is not the only indicator (text labels included)
- Sufficient color contrast ratios maintained
- Keyboard navigation support

## Testing Strategy

### Unit Tests
- StatusBadge component with all status types
- Color mapping accuracy
- Icon rendering
- Accessibility attributes
- Prop validation

### Integration Tests
- ClientList with StatusBadge integration
- ExceptionList with StatusBadge integration
- Visual consistency across components
- Theme integration

### Visual Regression Tests
- Status badge appearance across different themes
- Hover states and transitions
- Icon alignment and sizing
- Color accuracy

## Implementation Plan

### Phase 1: StatusBadge Enhancement
1. Extend StatusBadge to support type-based styling
2. Add icon integration
3. Implement consistent color scheme
4. Add accessibility features

### Phase 2: Component Integration
1. Update ClientList to use enhanced StatusBadge
2. Update ClientDetail to use enhanced StatusBadge
3. Update ExceptionList to use StatusBadge
4. Update ExceptionDetail to use StatusBadge

### Phase 3: Consistency Verification
1. Visual testing across all components
2. Accessibility audit
3. Performance optimization
4. Documentation updates

## Migration Strategy

### Backward Compatibility
- Existing StatusBadge usage in ClientList will continue to work
- New type prop is optional with sensible defaults
- Gradual migration approach supported

### Breaking Changes
- None - all changes are additive

### Rollout Plan
1. Deploy enhanced StatusBadge component
2. Update Exceptions components first (new implementation)
3. Enhance Clients components (existing usage)
4. Verify consistency across all components
5. Update documentation and examples

## Performance Considerations

### Optimization Strategies
- Memoized color calculations
- Efficient icon rendering
- Minimal re-renders through proper prop design
- Theme-aware styling without performance impact

### Bundle Size Impact
- Minimal increase due to icon imports
- Tree-shaking friendly implementation
- No external dependencies added

## Accessibility Compliance

### WCAG 2.1 AA Standards
- Color contrast ratios ≥ 4.5:1
- Meaningful text labels for all statuses
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility

### Implementation Details
- `role="status"` for status indicators
- `aria-label` with descriptive text
- Color-blind friendly design
- High contrast mode support