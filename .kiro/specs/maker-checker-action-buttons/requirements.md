# Requirements Document

## Introduction

The current maker-checker workflow has a critical UX issue where Checkers and Admins viewing submitted Reviews or Exceptions see "Submit for Review" buttons instead of the appropriate "Accept/Reject" actions. This breaks the fundamental maker-checker workflow where:

- **Makers** create and submit Reviews/Exceptions
- **Checkers** and **Admins** review and approve/reject submitted items

The system needs to display role-appropriate action buttons based on the user's role and the item's status.

## Requirements

### Requirement 1: Role-Based Review Actions

**User Story:** As a Checker or Admin, I want to see Accept/Reject buttons when viewing a submitted Review, so that I can properly perform my checker role in the maker-checker workflow.

#### Acceptance Criteria

1. WHEN a Checker views a Review with status 'SUBMITTED' or 'UNDER_REVIEW' THEN the system SHALL display "Accept" and "Reject" buttons instead of "Submit for Review"
2. WHEN an Admin views a Review with status 'SUBMITTED' or 'UNDER_REVIEW' THEN the system SHALL display "Accept" and "Reject" buttons instead of "Submit for Review"
3. WHEN a Maker views their own Review with status 'DRAFT' THEN the system SHALL display "Save Draft" and "Submit for Review" buttons
4. WHEN a Checker clicks "Accept" THEN the system SHALL call the approveReview API with optional comments
5. WHEN a Checker clicks "Reject" THEN the system SHALL prompt for a rejection reason and call the rejectReview API
6. WHEN a Review has status 'APPROVED', 'REJECTED', or 'COMPLETED' THEN the system SHALL display the Review in read-only mode with no action buttons

### Requirement 2: Role-Based Exception Actions

**User Story:** As a Checker or Admin, I want to see Accept/Reject buttons when viewing a submitted Exception, so that I can properly resolve exceptions in the maker-checker workflow.

#### Acceptance Criteria

1. WHEN a Checker views an Exception with status 'OPEN' or 'IN_PROGRESS' THEN the system SHALL display "Accept" and "Reject" buttons instead of "Submit for Review"
2. WHEN an Admin views an Exception with status 'OPEN' or 'IN_PROGRESS' THEN the system SHALL display "Accept" and "Reject" buttons instead of "Submit for Review"
3. WHEN a Maker views their own Exception with status 'OPEN' THEN the system SHALL display "Save" and "Submit for Review" buttons
4. WHEN a Checker clicks "Accept" on an Exception THEN the system SHALL call the approveException API with optional comments
5. WHEN a Checker clicks "Reject" on an Exception THEN the system SHALL prompt for a rejection reason and call the rejectException API
6. WHEN an Exception has status 'RESOLVED' or 'CLOSED' THEN the system SHALL display the Exception in read-only mode with no action buttons

### Requirement 3: Action Button Styling and UX

**User Story:** As a user, I want the action buttons to be clearly distinguishable and follow consistent styling patterns, so that I can quickly identify the appropriate actions.

#### Acceptance Criteria

1. WHEN displaying Accept/Reject buttons THEN the "Accept" button SHALL use success styling (green) and the "Reject" button SHALL use error styling (red)
2. WHEN displaying Save/Submit buttons THEN the "Save Draft" button SHALL use secondary styling and the "Submit for Review" button SHALL use primary styling
3. WHEN an action is in progress THEN the corresponding button SHALL show a loading spinner and be disabled
4. WHEN buttons are disabled due to permissions THEN they SHALL display appropriate tooltips explaining why they are disabled
5. WHEN a rejection action is triggered THEN the system SHALL display a modal dialog requiring a rejection reason before proceeding

### Requirement 4: Permission Validation

**User Story:** As a system administrator, I want the system to validate user permissions before displaying action buttons, so that users only see actions they are authorized to perform.

#### Acceptance Criteria

1. WHEN a user lacks permission to perform an action THEN the system SHALL hide the corresponding action button
2. WHEN a Maker tries to approve/reject items they didn't create THEN the system SHALL not display Accept/Reject buttons
3. WHEN a user's session expires during an action THEN the system SHALL redirect to login and preserve the intended action
4. WHEN API calls fail due to permission errors THEN the system SHALL display appropriate error messages
5. WHEN a user's role changes during their session THEN the system SHALL refresh the available actions on the next page load

### Requirement 5: Audit Trail and Notifications

**User Story:** As a compliance officer, I want all approve/reject actions to be properly logged and trigger notifications, so that we maintain a complete audit trail.

#### Acceptance Criteria

1. WHEN a Review is approved or rejected THEN the system SHALL create an audit log entry with the action, user, timestamp, and comments
2. WHEN an Exception is approved or rejected THEN the system SHALL create an audit log entry with the action, user, timestamp, and comments
3. WHEN a Review is approved THEN the system SHALL notify the original submitter
4. WHEN a Review is rejected THEN the system SHALL notify the original submitter with the rejection reason
5. WHEN an Exception is resolved THEN the system SHALL notify relevant stakeholders including the assigned user and creator