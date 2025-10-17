# Implementation Plan

- [x] 1. Create reusable action button components





  - Create ActionButtonGroup component with role-based button rendering
  - Create RejectionDialog component for rejection reason input
  - Implement action configuration system with proper styling
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 1.1 Create ActionButtonGroup component


  - Write ActionButtonGroup component with conditional button rendering based on available actions
  - Implement proper Material-UI styling for Accept (success), Reject (error), Save (secondary), Submit (primary) buttons
  - Add loading states and disabled states for each button type
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 1.2 Create RejectionDialog component


  - Write modal dialog component for rejection reason input with required validation
  - Implement proper form validation with minimum character requirements
  - Add loading state during rejection API call
  - _Requirements: 1.5, 3.5_

- [x] 1.3 Create action configuration system


  - Define ActionType enum and ActionConfig interface
  - Create ACTION_CONFIGS mapping with proper icons, colors, and behavior flags
  - Implement helper functions for action determination based on user role and item status
  - _Requirements: 3.1, 3.2, 4.1_

- [x] 2. Enhance makerCheckerActions service





  - Implement approveException and rejectException functions
  - Add proper error handling and validation
  - Update existing functions to handle edge cases
  - _Requirements: 2.4, 2.5, 4.4_

- [x] 2.1 Implement Exception approval/rejection APIs


  - Add approveException function that updates exception status to RESOLVED
  - Add rejectException function that updates exception status to CLOSED with reason
  - Implement proper validation and error handling for both functions
  - _Requirements: 2.4, 2.5_

- [x] 2.2 Enhance error handling in makerCheckerActions


  - Improve error messages and error categorization
  - Add retry logic for network errors
  - Implement proper logging for debugging
  - _Requirements: 4.4_

- [x] 3. Update ReviewForm with role-based actions





  - Replace existing button logic with ActionButtonGroup component
  - Implement permission detection and action determination
  - Add proper action handlers for approve/reject functionality
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

- [x] 3.1 Implement permission detection in ReviewForm


  - Add logic to determine user permissions based on role, ownership, and review status
  - Create helper functions to check if user can edit, approve, or reject reviews
  - Implement proper state management for permission-based UI updates
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 3.2 Replace ReviewForm action buttons


  - Remove existing hardcoded Submit for Review button logic
  - Integrate ActionButtonGroup component with proper action determination
  - Implement approve and reject action handlers using makerCheckerActions service
  - _Requirements: 1.4, 1.5, 1.6_

- [x] 3.3 Add confirmation dialogs to ReviewForm


  - Integrate RejectionDialog for reject actions
  - Add confirmation dialog for accept actions
  - Implement proper error handling and user feedback
  - _Requirements: 1.5, 3.5_

- [x] 4. Update ExceptionForm with role-based actions





  - Replace existing button logic with ActionButtonGroup component
  - Implement permission detection specific to exceptions
  - Add proper action handlers for exception approve/reject functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4.1 Implement permission detection in ExceptionForm


  - Add logic to determine user permissions based on role, ownership, and exception status
  - Create helper functions to check if user can edit, approve, or reject exceptions
  - Handle exception-specific status transitions (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [x] 4.2 Replace ExceptionForm action buttons


  - Remove existing hardcoded Save/Submit button logic
  - Integrate ActionButtonGroup component with exception-specific actions
  - Implement approve and reject action handlers for exceptions
  - _Requirements: 2.4, 2.5, 2.6_

- [x] 4.3 Add exception-specific confirmation dialogs


  - Integrate RejectionDialog for exception rejection
  - Add confirmation dialog for exception acceptance
  - Implement proper status updates and user notifications
  - _Requirements: 2.5, 3.5_

- [x] 5. Implement comprehensive error handling




  - Add proper error categorization and user-friendly messages
  - Implement retry mechanisms for network failures
  - Add logging and debugging support
  - _Requirements: 4.3, 4.4_

- [x] 5.1 Create error handling utilities


  - Write error categorization functions for permission, network, validation, and session errors
  - Implement user-friendly error message mapping
  - Add error logging utilities for debugging
  - _Requirements: 4.3, 4.4_

- [x] 5.2 Add retry mechanisms


  - Implement automatic retry for network failures
  - Add manual retry options in error messages
  - Handle session expiration with proper redirect and state preservation
  - _Requirements: 4.3_

- [ ] 6. Add audit logging and notifications
  - Implement audit trail for all approve/reject actions
  - Add notification system for action outcomes
  - Ensure proper tracking of user actions and timestamps
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6.1 Implement audit logging for actions
  - Add audit log entries for review approve/reject actions with user, timestamp, and comments
  - Add audit log entries for exception approve/reject actions
  - Ensure all maker-checker actions are properly tracked
  - _Requirements: 5.1, 5.2_

- [ ] 6.2 Add notification system
  - Implement notifications for review approval/rejection to original submitters
  - Add notifications for exception resolution to stakeholders
  - Include relevant details like rejection reasons and comments in notifications
  - _Requirements: 5.3, 5.4, 5.5_

- [ ]* 7. Write comprehensive tests
  - Create unit tests for all new components and functions
  - Add integration tests for complete maker-checker workflows
  - Implement error handling and edge case tests
  - _Requirements: All requirements_

- [ ]* 7.1 Write unit tests for components
  - Test ActionButtonGroup component with different permission scenarios
  - Test RejectionDialog component functionality and validation
  - Test permission detection logic with various user/item combinations
  - _Requirements: All requirements_

- [ ]* 7.2 Write integration tests
  - Test complete maker-checker workflow from creation to approval/rejection
  - Test role switching and permission updates
  - Test error scenarios and recovery mechanisms
  - _Requirements: All requirements_

- [ ]* 7.3 Write API integration tests
  - Test makerCheckerActions service functions with real API calls
  - Test error handling and retry mechanisms
  - Test audit logging and notification triggers
  - _Requirements: All requirements_