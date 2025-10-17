# Client List Display Fixes - Requirements Document

## Introduction

The client list page currently has two critical issues that need to be resolved:
1. Review counts are showing incorrect numbers (mock data instead of actual review counts from database)
2. Risk level and status columns are missing proper color coding and visual indicators

This specification addresses fixing these display issues to provide accurate data and improved user experience.

## Requirements

### Requirement 1: Accurate Review Count Display

**User Story:** As a compliance officer, I want to see the correct number of reviews for each client so that I can accurately assess review activity and compliance status.

#### Acceptance Criteria

1. WHEN viewing the client list THEN the system SHALL display the actual count of reviews from the database for each client
2. WHEN a client has no reviews THEN the system SHALL display "0" as the review count
3. WHEN the review count is calculated THEN the system SHALL include all review statuses (draft, pending_review, pending_approval, approved, rejected)
4. WHEN the backend API is called THEN the system SHALL return review_count as a computed field for each client
5. WHEN the frontend displays review counts THEN the system SHALL use the review_count field from the API response

### Requirement 2: Visual Status and Risk Level Indicators

**User Story:** As a compliance officer, I want to quickly identify client risk levels and statuses through color-coded visual indicators so that I can prioritize my work effectively.

#### Acceptance Criteria

1. WHEN viewing risk levels THEN the system SHALL display color-coded badges with:
   - High risk: Red background with white text
   - Medium risk: Orange/yellow background with dark text  
   - Low risk: Green background with white text
2. WHEN viewing client statuses THEN the system SHALL display color-coded badges with:
   - Active: Green background with white text
   - Inactive: Gray background with white text
   - Suspended: Red background with white text
   - Pending: Orange background with dark text
3. WHEN displaying status badges THEN the system SHALL use consistent styling across the application
4. WHEN badges are displayed THEN the system SHALL ensure proper contrast for accessibility
5. WHEN status text is shown THEN the system SHALL capitalize the first letter of each status

### Requirement 3: Backend API Integration

**User Story:** As a system, I need to properly calculate and return review statistics so that the frontend can display accurate information.

#### Acceptance Criteria

1. WHEN the clients API endpoint is called THEN the system SHALL calculate review_count for each client using database queries
2. WHEN calculating review counts THEN the system SHALL count all reviews associated with each client_id
3. WHEN returning client data THEN the system SHALL include last_review_date as the most recent review creation date
4. WHEN no reviews exist for a client THEN the system SHALL return review_count as 0 and last_review_date as null
5. WHEN the API response is structured THEN the system SHALL use the ClientListResponse schema with proper field definitions

### Requirement 4: Auto-Review Creation Flags

**User Story:** As a compliance officer, I want the system to automatically create reviews for high-risk clients based on configurable flags so that critical compliance activities are not missed.

#### Acceptance Criteria

1. WHEN the client table is extended THEN the system SHALL add five new boolean flag fields:
   - auto_kyc_review: Triggers KYC compliance reviews
   - auto_aml_review: Triggers AML screening reviews  
   - auto_sanctions_review: Triggers sanctions screening reviews
   - auto_pep_review: Triggers PEP (Politically Exposed Person) reviews
   - auto_financial_review: Triggers financial documentation reviews
2. WHEN any auto-review flag is set to true for a high-risk client THEN the system SHALL automatically create a corresponding review
3. WHEN auto-review creation is triggered THEN the system SHALL only apply to clients with risk_level = 'high'
4. WHEN creating auto-reviews THEN the system SHALL set the review status to 'draft' initially
5. WHEN multiple flags are true THEN the system SHALL create separate reviews for each flag type
6. WHEN displaying clients THEN the system SHALL show indicators for which auto-review flags are enabled

### Requirement 5: Enhanced Data Relationships and Seeding

**User Story:** As a system administrator, I want properly linked sample data across clients, reviews, and exceptions so that the system can be tested with realistic scenarios.

#### Acceptance Criteria

1. WHEN the database is seeded THEN the system SHALL create realistic client data with proper relationships
2. WHEN creating sample clients THEN the system SHALL ensure a mix of risk levels (high, medium, low)
3. WHEN creating sample reviews THEN the system SHALL link them to existing clients with proper foreign key relationships
4. WHEN creating sample exceptions THEN the system SHALL link them to existing reviews with proper associations
5. WHEN seeding data THEN the system SHALL create reviews in various statuses (draft, pending_review, pending_approval, approved, rejected)
6. WHEN high-risk clients are created THEN the system SHALL set appropriate auto-review flags to demonstrate the functionality
7. WHEN the seeded data is complete THEN the system SHALL have at least 20 clients, 50 reviews, and 30 exceptions with proper linkages

### Requirement 6: Form Navigation Confirmation

**User Story:** As a user, I want to be warned before leaving a form with unsaved changes so that I don't accidentally lose my work.

#### Acceptance Criteria

1. WHEN a user has made changes to any form THEN the system SHALL track the form's dirty state
2. WHEN a user attempts to navigate away from a form with unsaved changes THEN the system SHALL display a confirmation dialog
3. WHEN the confirmation dialog is shown THEN the system SHALL provide options to "Stay on Page", "Leave Without Saving", or "Save and Leave"
4. WHEN a user chooses "Stay on Page" THEN the system SHALL cancel the navigation and keep the form open
5. WHEN a user chooses "Leave Without Saving" THEN the system SHALL discard changes and proceed with navigation
6. WHEN a user chooses "Save and Leave" THEN the system SHALL attempt to save the form and then navigate
7. WHEN the save operation fails THEN the system SHALL show an error message and remain on the form
8. WHEN forms are successfully saved THEN the system SHALL clear the dirty state to allow normal navigation

### Requirement 7: Enhanced Maker-Checker Workflow

**User Story:** As a checker, I want clear and specific information about review and exception statuses with appropriate actions so that I can make informed decisions efficiently.

#### Acceptance Criteria

1. WHEN displaying error messages THEN the system SHALL provide specific, actionable error descriptions instead of generic "failed" messages
2. WHEN a review is in "submitted" status THEN the system SHALL display "Accept" and "Reject" action buttons for checkers
3. WHEN a checker clicks "Accept" THEN the system SHALL change the review status to "approved" and record the checker's decision
4. WHEN a checker clicks "Reject" THEN the system SHALL prompt for rejection reasons and change status to "rejected"
5. WHEN rejection reasons are provided THEN the system SHALL store them with the review for maker reference
6. WHEN a review is approved or rejected THEN the system SHALL send notifications to the original maker
7. WHEN displaying review status THEN the system SHALL show clear indicators for:
   - Draft: Editable by maker
   - Submitted: Awaiting checker action
   - Approved: Completed successfully
   - Rejected: Returned to maker with reasons
8. WHEN exceptions are in maker-checker workflow THEN the system SHALL apply similar status management and action buttons
9. WHEN displaying workflow history THEN the system SHALL show timestamps, user actions, and status transitions
10. WHEN error messages are shown THEN the system SHALL include specific details like validation failures, permission issues, or system constraints

### Requirement 8: Component Architecture

**User Story:** As a developer, I want to use reusable components for status displays so that the UI is consistent across the application.

#### Acceptance Criteria

1. WHEN displaying status badges THEN the system SHALL use the existing StatusBadge component
2. WHEN the StatusBadge component is used THEN the system SHALL pass appropriate props for risk levels and client statuses
3. WHEN integrating with the backend THEN the system SHALL use the useClients hook for data fetching
4. WHEN handling loading states THEN the system SHALL display appropriate loading indicators
5. WHEN errors occur THEN the system SHALL display user-friendly error messages with retry options
6. WHEN displaying auto-review flags THEN the system SHALL show visual indicators for enabled flags
7. WHEN implementing form confirmation THEN the system SHALL use reusable dialog components
8. WHEN implementing maker-checker actions THEN the system SHALL use consistent button styling and confirmation patterns