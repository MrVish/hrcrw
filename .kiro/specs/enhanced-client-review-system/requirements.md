# Enhanced Client Review System Requirements

## Introduction

This specification outlines enhancements to the existing client review workflow system to include additional client details, structured KYC questionnaires, and improved exception handling capabilities.

## Requirements

### Requirement 1: Enhanced Client Information

**User Story:** As a compliance officer, I want to view comprehensive client information including domicile branch, relationship manager, business unit, and AML risk level, so that I can make informed decisions during reviews.

#### Acceptance Criteria

1. WHEN viewing client details THEN the system SHALL display domicile branch information
2. WHEN viewing client details THEN the system SHALL display assigned relationship manager
3. WHEN viewing client details THEN the system SHALL display business unit classification
4. WHEN viewing client details THEN the system SHALL display current AML risk assessment
5. WHEN creating or updating clients THEN the system SHALL allow input of all new fields
6. WHEN displaying client lists THEN the system SHALL include the new fields in table views

### Requirement 2: Structured KYC Review Questionnaire

**User Story:** As a maker, I want to complete a structured 12-question KYC assessment instead of free-form comments, so that reviews are consistent and comprehensive.

#### Acceptance Criteria

1. WHEN creating a review THEN the system SHALL present 12 specific KYC questions
2. WHEN answering question 2 THEN the system SHALL provide Yes/No/Not Applicable options
3. WHEN answering question 3 THEN the system SHALL allow free-text input for missing KYC details
4. WHEN answering question 4 THEN the system SHALL provide Yes/No/Not Applicable options
5. WHEN answering question 5 THEN the system SHALL provide Yes/No/Not Applicable dropdown with additional info field
6. WHEN answering questions 6-10 THEN the system SHALL provide appropriate dropdown options
7. WHEN answering question 11 THEN the system SHALL allow free-text input for remedial actions
8. WHEN answering question 12 THEN the system SHALL allow document upload for source of funds evidence
9. WHEN saving review progress THEN the system SHALL preserve all question responses
10. WHEN submitting review THEN the system SHALL validate that required questions are answered

### Requirement 3: Exception Management Integration

**User Story:** As a maker, I want to raise specific exceptions during review submission, so that compliance issues are properly flagged and tracked.

#### Acceptance Criteria

1. WHEN submitting a review THEN the system SHALL provide option to raise exceptions
2. WHEN raising exceptions THEN the system SHALL offer predefined exception types:
   - Flag Customer for KYC Non-Compliance
   - Dormant or Non-reachable (funded account) - UFAA
   - Dormant or non-reachable (overdrawn account) - Exit
3. WHEN selecting exception types THEN the system SHALL allow multiple selections
4. WHEN exceptions are raised THEN the system SHALL create linked exception records
5. WHEN viewing review details THEN the system SHALL display associated exceptions

### Requirement 4: Enhanced Checker Review Process

**User Story:** As a checker, I want to review structured KYC responses and manage exceptions, so that I can make informed approval decisions.

#### Acceptance Criteria

1. WHEN reviewing submitted reviews THEN the system SHALL display all 12 KYC question responses
2. WHEN reviewing submitted reviews THEN the system SHALL display any raised exceptions
3. WHEN approving reviews THEN the system SHALL allow adding approval comments
4. WHEN rejecting reviews THEN the system SHALL require rejection reason and comments
5. WHEN managing exceptions THEN the system SHALL allow status updates on exception records
6. WHEN completing review THEN the system SHALL update both review and exception statuses appropriately

### Requirement 5: Database Schema Updates

**User Story:** As a system administrator, I want the database to support new client fields and structured review data, so that all information is properly stored and retrievable.

#### Acceptance Criteria

1. WHEN migrating database THEN the system SHALL add new client fields without data loss
2. WHEN storing review responses THEN the system SHALL maintain structured question-answer format
3. WHEN linking exceptions THEN the system SHALL maintain referential integrity
4. WHEN querying data THEN the system SHALL support efficient retrieval of enhanced information