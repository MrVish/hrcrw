# Implementation Plan

- [x] 1. Fix Client List Display Issues





  - Update ClientList component to use proper backend integration instead of mock data
  - Replace custom Chip components with StatusBadge component for consistent styling
  - Integrate with useClients hook for proper data fetching
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Enhance Backend API for Accurate Review Counts





  - [x] 2.1 Update clients API endpoint to calculate review_count from database


    - Modify get_clients endpoint to use proper database queries for review counting
    - Ensure review_count includes all review statuses for each client
    - Add last_review_date calculation using most recent review creation date
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Update client schemas to include review statistics


    - Modify ClientListItem schema to properly serialize review_count and last_review_date
    - Ensure ClientListResponse returns structured data with computed fields
    - Add proper type definitions for enhanced client data
    - _Requirements: 3.5_

- [x] 3. Add Auto-Review Creation System





  - [x] 3.1 Extend client database model with auto-review flags


    - Add five boolean columns: auto_kyc_review, auto_aml_review, auto_sanctions_review, auto_pep_review, auto_financial_review
    - Create database migration script for new columns
    - Add database indexes for efficient querying of high-risk clients with flags
    - _Requirements: 4.1, 4.6_

  - [x] 3.2 Implement auto-review creation engine



    - Create service to check high-risk clients and create reviews based on flags
    - Implement logic to create separate reviews for each enabled flag type
    - Set auto-created reviews to 'draft' status initially
    - Add review_type field to distinguish auto-created reviews
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 3.3 Update client forms to manage auto-review flags


    - Add checkbox controls for each auto-review flag in client creation/edit forms
    - Show auto-review flag indicators in client list display
    - Implement validation to ensure flags are only meaningful for high-risk clients
    - _Requirements: 4.6, 8.6_

- [x] 4. Implement Form Navigation Confirmation




  - [x] 4.1 Create useFormConfirmation hook


    - Implement dirty state tracking for form changes
    - Add navigation blocking when forms have unsaved changes
    - Provide methods to reset dirty state after successful saves
    - _Requirements: 6.1, 6.8_

  - [x] 4.2 Build reusable confirmation dialog component


    - Create ConfirmationDialog component with "Stay", "Leave", and "Save and Leave" options
    - Implement proper accessibility features and keyboard navigation
    - Add consistent styling that matches application theme
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 8.7_

  - [x] 4.3 Integrate confirmation system with forms


    - Add useFormConfirmation to client, review, and exception forms
    - Implement navigation guards using React Router
    - Handle save-and-leave functionality with proper error handling
    - _Requirements: 6.7, 8.4_

- [x] 5. Enhance Maker-Checker Workflow





  - [x] 5.1 Add specific error handling and messaging



    - Replace generic error messages with specific, actionable descriptions
    - Implement error message mapping for common failure scenarios
    - Add proper error recovery options and retry mechanisms
    - _Requirements: 7.1, 7.10, 8.5_

  - [x] 5.2 Implement review approval/rejection actions


    - Add "Accept" and "Reject" buttons for reviews in submitted status
    - Create approval workflow that updates status to "approved" with checker recording
    - Implement rejection workflow with required reason input and status update to "rejected"
    - Store rejection reasons and checker comments with review records
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 5.3 Add workflow history tracking


    - Create workflow_history table to track status transitions
    - Implement history recording for all review and exception status changes
    - Display workflow history with timestamps, users, and actions in UI
    - Add notification system for status change communications
    - _Requirements: 7.6, 7.9_

  - [x] 5.4 Update exception maker-checker workflow


    - Apply similar approval/rejection actions to exception management
    - Implement consistent status indicators and action buttons
    - Add exception-specific workflow history and notifications
    - _Requirements: 7.8, 8.8_

- [-] 6. Create Comprehensive Data Seeding



  - [x] 6.1 Build realistic client data with relationships


    - Create seed script for diverse client data with proper risk level distribution
    - Set appropriate auto-review flags for high-risk clients
    - Ensure all clients have proper contact information and metadata
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 6.2 Generate linked review and exception data


    - Create reviews linked to clients with proper foreign key relationships
    - Generate reviews in various statuses (draft, submitted, approved, rejected)
    - Create exceptions linked to reviews with realistic scenarios
    - Ensure data demonstrates complete maker-checker workflows
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 6.3 Validate data relationships and integrity



    - Implement data validation checks for all foreign key relationships
    - Create at least 20 clients, 50 reviews, and 30 exceptions as specified
    - Test auto-review creation with seeded high-risk clients
    - Verify all workflow states and transitions work with seeded data
    - _Requirements: 5.7_

- [ ] 7. Testing and Quality Assurance
  - [x] 7.1 Write unit tests for core components







    - Test ClientList component rendering with accurate data
    - Test useFormConfirmation hook behavior and state management
    - Test auto-review creation engine logic and flag evaluation
    - Test maker-checker action functions and error handling
    - _Requirements: 8.4, 8.5_

  - [ ] 7.2 Create integration tests
    - Test complete client list data flow from API to UI
    - Test form confirmation dialogs across different navigation scenarios
    - Test maker-checker workflows end-to-end
    - Test auto-review creation with database integration
    - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 7.1_

  - [ ] 7.3 Implement accessibility testing
    - Verify color contrast ratios for status badges meet WCAG standards
    - Test keyboard navigation through all enhanced interfaces
    - Validate screen reader compatibility for status indicators and dialogs
    - Test focus management in confirmation dialogs and maker-checker interfaces
    - _Requirements: 2.4, 6.8, 8.7_