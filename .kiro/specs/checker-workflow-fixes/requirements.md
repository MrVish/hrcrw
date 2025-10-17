# Checker Workflow Fixes - Requirements Document

## Introduction

This specification addresses critical issues in the checker workflow where KYC questionnaires are not properly displayed for completed reviews (approved/rejected) and read-only mode is not properly enforced in the KYC questionnaire form.

## Requirements

### Requirement 1: KYC Questionnaire Visibility for All Review Statuses

**User Story:** As a checker, I want to view KYC questionnaires for all reviews regardless of their status (draft, submitted, approved, rejected), so that I can review the complete assessment information.

#### Acceptance Criteria

1. WHEN a checker views an approved review THEN the system SHALL display the KYC questionnaire in read-only mode
2. WHEN a checker views a rejected review THEN the system SHALL display the KYC questionnaire in read-only mode  
3. WHEN a checker views a draft review THEN the system SHALL display the KYC questionnaire in read-only mode
4. WHEN a checker views a submitted review THEN the system SHALL display the KYC questionnaire in editable mode for review actions
5. WHEN a checker views an under-review review THEN the system SHALL display the KYC questionnaire in editable mode for review actions

### Requirement 2: Proper Read-Only Mode Enforcement

**User Story:** As a checker, I want the KYC questionnaire form to be truly read-only when viewing completed reviews, so that I cannot accidentally modify the assessment data.

#### Acceptance Criteria

1. WHEN the KYC questionnaire form is in read-only mode THEN all form fields SHALL be disabled and non-editable
2. WHEN the KYC questionnaire form is in read-only mode THEN dropdown selections SHALL be displayed as text values
3. WHEN the KYC questionnaire form is in read-only mode THEN text areas SHALL be displayed as formatted text
4. WHEN the KYC questionnaire form is in read-only mode THEN document upload functionality SHALL be hidden
5. WHEN the KYC questionnaire form is in read-only mode THEN exception selection SHALL be disabled

### Requirement 3: Enhanced Checker Panel Review Loading

**User Story:** As a checker, I want to access historical review data including KYC questionnaires for all review statuses, so that I can reference previous assessments and decisions.

#### Acceptance Criteria

1. WHEN a checker selects any review THEN the system SHALL load the associated KYC questionnaire data
2. WHEN KYC questionnaire data is not available THEN the system SHALL display an appropriate fallback message
3. WHEN loading review details fails THEN the system SHALL display a clear error message without breaking the interface
4. WHEN a checker switches between reviews THEN the system SHALL properly clear and reload the KYC data

### Requirement 4: Status-Based Action Controls

**User Story:** As a checker, I want the review actions (approve/reject) to be available only for appropriate review statuses, so that I cannot perform invalid operations.

#### Acceptance Criteria

1. WHEN viewing a draft review THEN approve/reject actions SHALL be hidden
2. WHEN viewing a submitted review THEN approve/reject actions SHALL be available
3. WHEN viewing an under-review review THEN approve/reject actions SHALL be available
4. WHEN viewing an approved review THEN approve/reject actions SHALL be hidden
5. WHEN viewing a rejected review THEN approve/reject actions SHALL be hidden