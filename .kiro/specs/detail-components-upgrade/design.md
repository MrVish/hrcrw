# Detail Components Material-UI Upgrade Design

## Overview

This design document outlines the comprehensive upgrade of ClientDetail and ExceptionDetail components to align with our modern Material-UI design system. The design focuses on creating visually consistent, professional interfaces that match our recently upgraded dashboard, tables, and forms while providing enhanced user experience and accessibility.

## Architecture

### Component Structure

```
DetailComponents/
├── ClientDetail/
│   ├── ClientDetailHeader
│   ├── ClientDetailTabs
│   ├── ClientOverviewTab
│   ├── ClientReviewsTab
│   ├── ClientDocumentsTab
│   └── ClientEditForm
├── ExceptionDetail/
│   ├── ExceptionDetailHeader
│   ├── ExceptionInfoCards
│   ├── ExceptionStatusForm
│   └── ExceptionTimeline
└── Shared/
    ├── DetailPageContainer
    ├── InfoCard
    ├── StatusBadge
    └── ActionButtons
```

### Layout System

Both components will use a consistent full-screen layout pattern:

```tsx
<Box sx={{ 
  width: '100%', 
  height: '100%',
  p: { xs: 2, sm: 3, lg: 4, xl: 6 },
  maxWidth: 'none'
}}>
  <DetailHeader />
  <DetailContent />
</Box>
```

## Components and Interfaces

### 1. ClientDetail Component Redesign

#### Header Section
```tsx
interface ClientDetailHeaderProps {
  client: Client
  isEditing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onCreateReview: () => void
  saving: boolean
}
```

**Design Features:**
- Gradient background header with professional typography
- Client name and ID prominently displayed
- Status and risk badges using Material-UI Chips
- Action buttons with gradient styling and hover effects
- Responsive layout for mobile devices

#### Tab Navigation
```tsx
interface ClientTabsProps {
  activeTab: 'overview' | 'reviews' | 'documents'
  onTabChange: (tab: string) => void
  reviewCount: number
}
```

**Design Features:**
- Material-UI Tabs component with custom styling
- Tab indicators with gradient colors
- Review count badge on Reviews tab
- Smooth transitions between tabs

#### Overview Tab Cards
```tsx
interface InfoCardProps {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  elevation?: number
  hover?: boolean
}
```

**Design Features:**
- Three main cards: Basic Information, Enhanced Information, System Information
- Consistent card styling with hover effects
- Icon-based section headers
- Responsive grid layout (1 column mobile → 3 columns desktop)
- Edit mode with Material-UI form components

#### Reviews Tab
```tsx
interface ClientReviewsTabProps {
  reviews: Review[]
  onViewReview: (reviewId: number) => void
  onCreateReview: () => void
}
```

**Design Features:**
- Material-UI Table with pagination
- Status chips for review status
- Action buttons for viewing reviews
- Empty state with call-to-action

### 2. ExceptionDetail Component Redesign

#### Header Section
```tsx
interface ExceptionDetailHeaderProps {
  exception: ExceptionDetailData
  canEdit: boolean
  canUpdateStatus: boolean
  onEdit: () => void
  onUpdateStatus: () => void
}
```

**Design Features:**
- Gradient background header
- Exception ID and title prominently displayed
- Status and priority chips with appropriate colors
- Action buttons with role-based visibility
- Breadcrumb navigation

#### Information Cards Grid
```tsx
interface ExceptionInfoGridProps {
  exception: ExceptionDetailData
}
```

**Design Features:**
- Four main cards: Exception Information, Related Client, Assignment & Timeline, Resolution
- Consistent card styling with icons
- Responsive grid layout
- Color-coded status and priority indicators

#### Status Update Form
```tsx
interface ExceptionStatusFormProps {
  exception: ExceptionDetailData
  users: User[]
  onUpdate: (data: StatusUpdateData) => void
  onCancel: () => void
  updating: boolean
}
```

**Design Features:**
- Collapsible form with Material-UI components
- Select dropdowns for status and assignee
- Conditional resolution notes field
- Form validation and error handling

## Data Models

### Enhanced Client Interface
```tsx
interface Client {
  client_id: string
  name: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW'
  country: string
  domicile_branch?: string
  relationship_manager?: string
  business_unit?: string
  aml_risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  last_review_date?: string
  created_at: string
  updated_at: string
}
```

### Enhanced Exception Interface
```tsx
interface ExceptionDetailData {
  id: number
  review_id: number
  client_id?: string
  client_name?: string
  title: string
  type: string
  description: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  assigned_to?: number
  assigned_user_name?: string
  created_by: number
  creator_name?: string
  created_at: string
  resolved_at?: string
  resolution_notes?: string
  due_date?: string
}
```

## Visual Design System

### Color Palette
```tsx
const statusColors = {
  ACTIVE: theme.palette.success.main,
  INACTIVE: theme.palette.grey[500],
  SUSPENDED: theme.palette.error.main,
  UNDER_REVIEW: theme.palette.warning.main,
  OPEN: theme.palette.error.main,
  IN_PROGRESS: theme.palette.warning.main,
  RESOLVED: theme.palette.success.main,
  CLOSED: theme.palette.grey[500],
  ESCALATED: theme.palette.error.dark
}

const riskColors = {
  LOW: theme.palette.success.main,
  MEDIUM: theme.palette.warning.main,
  HIGH: theme.palette.error.main,
  VERY_HIGH: theme.palette.error.dark
}

const priorityColors = {
  LOW: theme.palette.info.main,
  MEDIUM: theme.palette.warning.main,
  HIGH: theme.palette.error.main,
  CRITICAL: theme.palette.error.dark
}
```

### Typography Scale
```tsx
const typography = {
  pageTitle: {
    variant: 'h4',
    fontWeight: 'bold',
    color: 'text.primary'
  },
  sectionTitle: {
    variant: 'h6',
    fontWeight: 'bold',
    color: 'text.primary'
  },
  cardTitle: {
    variant: 'h6',
    fontWeight: 600,
    color: 'text.primary'
  },
  label: {
    variant: 'body2',
    fontWeight: 500,
    color: 'text.secondary'
  },
  value: {
    variant: 'body1',
    color: 'text.primary'
  }
}
```

### Card Styling
```tsx
const cardStyles = {
  elevation: 0,
  sx: {
    border: `1px solid ${theme.palette.grey[200]}`,
    borderRadius: 3,
    '&:hover': {
      borderColor: theme.palette.grey[300],
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      transform: 'translateY(-2px)',
    },
    transition: 'all 0.2s ease-in-out',
  }
}
```

### Button Styling
```tsx
const buttonStyles = {
  primary: {
    variant: 'contained',
    sx: {
      background: gradients.primary,
      boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
      '&:hover': {
        background: gradients.primary,
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
      },
    }
  },
  secondary: {
    variant: 'outlined',
    sx: {
      borderColor: theme.palette.grey[300],
      '&:hover': {
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.main + '08',
      },
    }
  }
}
```

## Responsive Design Strategy

### Breakpoint Adaptations
```tsx
const responsiveLayout = {
  container: {
    p: { xs: 2, sm: 3, lg: 4, xl: 6 }
  },
  grid: {
    spacing: { xs: 3, lg: 4, xl: 6 }
  },
  cards: {
    p: { xs: 3, lg: 4, xl: 5 }
  }
}
```

### Grid System
- **Mobile (xs)**: Single column layout, stacked cards
- **Tablet (sm-md)**: Two column layout for info cards
- **Desktop (lg)**: Three column layout for info cards
- **Large (xl)**: Optimized spacing for 2K+ monitors

## Error Handling

### Error States
```tsx
interface ErrorHandlingProps {
  loading: boolean
  error: string | null
  onRetry: () => void
}
```

**Design Features:**
- Material-UI Alert components for error messages
- Retry buttons with loading states
- Graceful degradation for missing data
- Clear error messaging with actionable solutions

### Loading States
```tsx
interface LoadingStateProps {
  loading: boolean
  skeleton?: boolean
}
```

**Design Features:**
- Material-UI CircularProgress for loading
- Skeleton loaders for better perceived performance
- Disabled states for form elements during operations
- Progress indicators for long-running operations

## Testing Strategy

### Component Testing
- Unit tests for all new Material-UI components
- Integration tests for form submissions and data updates
- Accessibility tests using React Testing Library
- Visual regression tests for design consistency

### User Experience Testing
- Responsive design testing across breakpoints
- Keyboard navigation testing
- Screen reader compatibility testing
- Performance testing for large datasets

### Browser Compatibility
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile browser testing (iOS Safari, Chrome Mobile)
- Touch interaction testing on mobile devices
- High contrast mode testing

## Implementation Phases

### Phase 1: ClientDetail Component
1. Create new Material-UI header component
2. Implement responsive card layout for overview tab
3. Add Material-UI tabs navigation
4. Upgrade edit form with Material-UI components
5. Implement reviews tab with Material-UI table

### Phase 2: ExceptionDetail Component
1. Create new Material-UI header component
2. Implement information cards grid
3. Add status update form with Material-UI components
4. Implement timeline and resolution sections
5. Add proper error and loading states

### Phase 3: Integration and Polish
1. Ensure consistent styling across both components
2. Add smooth animations and transitions
3. Implement accessibility improvements
4. Performance optimization and testing
5. Documentation and code review

## Accessibility Considerations

### WCAG 2.1 Compliance
- Proper heading hierarchy (h1 → h6)
- Sufficient color contrast ratios (4.5:1 minimum)
- Keyboard navigation support
- Screen reader announcements for dynamic content
- Focus management for modal dialogs and forms

### Semantic HTML
- Proper use of semantic elements (main, section, article)
- ARIA labels for complex interactions
- Form labels properly associated with inputs
- Status announcements for form submissions
- Landmark roles for navigation

## Performance Optimizations

### Code Splitting
- Lazy loading for tab content
- Dynamic imports for heavy components
- Bundle size optimization

### Rendering Optimizations
- React.memo for expensive components
- Proper dependency arrays for useEffect
- Debounced form inputs for better performance
- Virtualization for large lists (if needed)

### Caching Strategy
- API response caching
- Component state optimization
- Memoized calculations for derived data