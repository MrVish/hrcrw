"""
KYC Questionnaire service layer for business logic and database operations.
"""
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func

from app.models.kyc_questionnaire import KYCQuestionnaire, YesNoNA, YesNo
from app.models.review import Review, ReviewStatus
from app.models.document import Document
from app.models.user import User, UserRole
from app.schemas.kyc_questionnaire import (
    KYCQuestionnaireCreate, 
    KYCQuestionnaireUpdate,
    KYCQuestionnaireValidationResult,
    KYCQuestionnaireStats,
    KYCQuestionTemplate,
    KYCQuestionnaireTemplate
)
from app.services.audit import AuditService


logger = logging.getLogger(__name__)


class KYCQuestionnaireService:
    """Service class for KYC questionnaire-related operations."""
    
    def __init__(self, db: Session, audit_service: Optional[AuditService] = None):
        """
        Initialize KYC questionnaire service.
        
        Args:
            db: Database session
            audit_service: Audit service for logging operations
        """
        self.db = db
        self.audit_service = audit_service or AuditService(db)
    
    def get_questionnaire_by_id(self, questionnaire_id: int) -> Optional[KYCQuestionnaire]:
        """
        Get KYC questionnaire by ID.
        
        Args:
            questionnaire_id: Questionnaire ID
            
        Returns:
            KYCQuestionnaire object or None if not found
        """
        return self.db.query(KYCQuestionnaire).filter(KYCQuestionnaire.id == questionnaire_id).first()
    
    def get_questionnaire_by_review_id(self, review_id: int) -> Optional[KYCQuestionnaire]:
        """
        Get KYC questionnaire by review ID.
        
        Args:
            review_id: Review ID
            
        Returns:
            KYCQuestionnaire object or None if not found
        """
        return self.db.query(KYCQuestionnaire).filter(KYCQuestionnaire.review_id == review_id).first()
    
    def create_questionnaire(self, questionnaire_data: KYCQuestionnaireCreate, created_by_user_id: int) -> KYCQuestionnaire:
        """
        Create a new KYC questionnaire.
        
        Args:
            questionnaire_data: Questionnaire creation data
            created_by_user_id: ID of user creating the questionnaire
            
        Returns:
            Created questionnaire object
            
        Raises:
            ValueError: If review doesn't exist, questionnaire already exists, or user doesn't have permission
        """
        # Verify review exists and is in draft status
        review = self.db.query(Review).filter(Review.id == questionnaire_data.review_id).first()
        if not review:
            raise ValueError(f"Review with ID {questionnaire_data.review_id} not found")
        
        if review.status != ReviewStatus.DRAFT:
            raise ValueError(f"KYC questionnaire can only be created for draft reviews, current status: {review.status.value}")
        
        # Check if questionnaire already exists for this review
        existing = self.get_questionnaire_by_review_id(questionnaire_data.review_id)
        if existing:
            raise ValueError(f"KYC questionnaire already exists for review {questionnaire_data.review_id}")
        
        # Verify user has permission (must be the review submitter or admin)
        user = self.db.query(User).filter(User.id == created_by_user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if review.submitted_by != created_by_user_id and not user.is_admin:
            raise ValueError("Only the review submitter or admin can create KYC questionnaire")
        
        # Validate document IDs if provided
        if questionnaire_data.source_of_funds_docs:
            self._validate_document_ids(questionnaire_data.source_of_funds_docs, questionnaire_data.review_id)
        
        # Create new questionnaire
        questionnaire = KYCQuestionnaire(
            review_id=questionnaire_data.review_id,
            purpose_of_account=questionnaire_data.purpose_of_account,
            kyc_documents_complete=questionnaire_data.kyc_documents_complete,
            missing_kyc_details=questionnaire_data.missing_kyc_details,
            account_purpose_aligned=questionnaire_data.account_purpose_aligned,
            adverse_media_completed=questionnaire_data.adverse_media_completed,
            adverse_media_evidence=questionnaire_data.adverse_media_evidence,
            senior_mgmt_approval=questionnaire_data.senior_mgmt_approval,
            pep_approval_obtained=questionnaire_data.pep_approval_obtained,
            static_data_correct=questionnaire_data.static_data_correct,
            kyc_documents_valid=questionnaire_data.kyc_documents_valid,
            regulated_business_license=questionnaire_data.regulated_business_license,
            remedial_actions=questionnaire_data.remedial_actions,
            source_of_funds_docs=questionnaire_data.source_of_funds_docs or []
        )
        
        self.db.add(questionnaire)
        self.db.flush()  # Flush to get the ID
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=created_by_user_id,
            entity_type="KYCQuestionnaire",
            entity_id=str(questionnaire.id),
            action="CREATE",
            details={
                "review_id": questionnaire.review_id,
                "is_complete": questionnaire.is_complete,
                "source_of_funds_docs_count": len(questionnaire.source_of_funds_docs or [])
            }
        )
        
        self.db.commit()
        return questionnaire
    
    def update_questionnaire(self, questionnaire_id: int, questionnaire_data: KYCQuestionnaireUpdate, 
                           updated_by_user_id: int) -> Optional[KYCQuestionnaire]:
        """
        Update an existing KYC questionnaire.
        
        Args:
            questionnaire_id: Questionnaire ID
            questionnaire_data: Questionnaire update data
            updated_by_user_id: ID of user updating the questionnaire
            
        Returns:
            Updated questionnaire object or None if not found
            
        Raises:
            ValueError: If questionnaire cannot be updated or user doesn't have permission
        """
        questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if not questionnaire:
            return None
        
        # Get associated review
        review = self.db.query(Review).filter(Review.id == questionnaire.review_id).first()
        if not review:
            raise ValueError("Associated review not found")
        
        # Check if questionnaire can be edited (only in draft status)
        if review.status != ReviewStatus.DRAFT:
            raise ValueError(f"KYC questionnaire cannot be edited when review is in status: {review.status.value}")
        
        # Check if user has permission to edit (only the submitter or admin)
        user = self.db.query(User).filter(User.id == updated_by_user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if review.submitted_by != updated_by_user_id and not user.is_admin:
            raise ValueError("Only the review submitter or admin can edit the KYC questionnaire")
        
        # Store original values for audit
        original_values = questionnaire.to_dict()
        
        # Validate document IDs if provided
        if questionnaire_data.source_of_funds_docs is not None:
            self._validate_document_ids(questionnaire_data.source_of_funds_docs, questionnaire.review_id)
        
        # Update fields
        update_data = questionnaire_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(questionnaire, field):
                setattr(questionnaire, field, value)
        
        # Log audit trail
        self.audit_service.log_action(
            user_id=updated_by_user_id,
            entity_type="KYCQuestionnaire",
            entity_id=str(questionnaire.id),
            action="UPDATE",
            details={
                "review_id": questionnaire.review_id,
                "updated_fields": list(update_data.keys()),
                "is_complete_before": original_values.get("is_complete", False),
                "is_complete_after": questionnaire.is_complete
            }
        )
        
        self.db.commit()
        return questionnaire
    
    def delete_questionnaire(self, questionnaire_id: int, deleted_by_user_id: int) -> bool:
        """
        Delete a KYC questionnaire.
        
        Args:
            questionnaire_id: Questionnaire ID
            deleted_by_user_id: ID of user deleting the questionnaire
            
        Returns:
            True if deleted successfully, False if not found
            
        Raises:
            ValueError: If questionnaire cannot be deleted or user doesn't have permission
        """
        questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if not questionnaire:
            return False
        
        # Get associated review
        review = self.db.query(Review).filter(Review.id == questionnaire.review_id).first()
        if not review:
            raise ValueError("Associated review not found")
        
        # Check if questionnaire can be deleted (only in draft status)
        if review.status != ReviewStatus.DRAFT:
            raise ValueError(f"KYC questionnaire cannot be deleted when review is in status: {review.status.value}")
        
        # Check if user has permission to delete (only the submitter or admin)
        user = self.db.query(User).filter(User.id == deleted_by_user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if review.submitted_by != deleted_by_user_id and not user.is_admin:
            raise ValueError("Only the review submitter or admin can delete the KYC questionnaire")
        
        # Log audit trail before deletion
        self.audit_service.log_action(
            user_id=deleted_by_user_id,
            entity_type="KYCQuestionnaire",
            entity_id=str(questionnaire.id),
            action="DELETE",
            details={
                "review_id": questionnaire.review_id,
                "was_complete": questionnaire.is_complete
            }
        )
        
        self.db.delete(questionnaire)
        self.db.commit()
        return True
    
    def validate_questionnaire(self, questionnaire_id: int) -> KYCQuestionnaireValidationResult:
        """
        Validate a KYC questionnaire for completeness and correctness.
        
        Args:
            questionnaire_id: Questionnaire ID
            
        Returns:
            Validation result with errors and warnings
        """
        questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if not questionnaire:
            return KYCQuestionnaireValidationResult(
                is_valid=False,
                is_complete=False,
                errors=["Questionnaire not found"],
                warnings=[],
                missing_required_fields=[],
                conditional_field_issues=[]
            )
        
        errors = []
        warnings = []
        missing_required_fields = []
        conditional_field_issues = []
        
        # Check required fields
        if not questionnaire.purpose_of_account or not questionnaire.purpose_of_account.strip():
            missing_required_fields.append("purpose_of_account")
            errors.append("Q1: Purpose of account is required")
        
        if questionnaire.kyc_documents_complete is None:
            missing_required_fields.append("kyc_documents_complete")
            errors.append("Q2: KYC documents completeness status is required")
        
        if questionnaire.account_purpose_aligned is None:
            missing_required_fields.append("account_purpose_aligned")
            errors.append("Q4: Account purpose alignment status is required")
        
        if questionnaire.adverse_media_completed is None:
            missing_required_fields.append("adverse_media_completed")
            errors.append("Q5: Adverse media completion status is required")
        
        if questionnaire.pep_approval_obtained is None:
            missing_required_fields.append("pep_approval_obtained")
            errors.append("Q7: PEP approval status is required")
        
        if questionnaire.static_data_correct is None:
            missing_required_fields.append("static_data_correct")
            errors.append("Q8: Static data correctness status is required")
        
        if questionnaire.kyc_documents_valid is None:
            missing_required_fields.append("kyc_documents_valid")
            errors.append("Q9: KYC documents validity status is required")
        
        if questionnaire.regulated_business_license is None:
            missing_required_fields.append("regulated_business_license")
            errors.append("Q10: Regulated business license status is required")
        
        if not questionnaire.source_of_funds_docs or len(questionnaire.source_of_funds_docs) == 0:
            missing_required_fields.append("source_of_funds_docs")
            errors.append("Q12: At least one source of funds document is required")
        
        # Check conditional field requirements
        conditional_errors = questionnaire.validate_conditional_fields()
        if conditional_errors:
            conditional_field_issues.extend(conditional_errors)
            errors.extend(conditional_errors)
        
        # Add warnings for best practices
        if questionnaire.adverse_media_completed == YesNoNA.YES and not questionnaire.adverse_media_evidence:
            warnings.append("Q5: Consider providing evidence or screenshots for adverse media checks")
        
        if questionnaire.pep_approval_obtained == YesNoNA.YES and questionnaire.senior_mgmt_approval is None:
            warnings.append("Q6: Senior management approval may be required for PEP clients")
        
        # Validate document references
        if questionnaire.source_of_funds_docs:
            invalid_docs = self._validate_document_ids(questionnaire.source_of_funds_docs, questionnaire.review_id, raise_on_error=False)
            if invalid_docs:
                errors.append(f"Q12: Invalid document IDs: {invalid_docs}")
                conditional_field_issues.append(f"Invalid source of funds document references: {invalid_docs}")
        
        is_valid = len(errors) == 0
        is_complete = questionnaire.is_complete and is_valid
        
        return KYCQuestionnaireValidationResult(
            is_valid=is_valid,
            is_complete=is_complete,
            errors=errors,
            warnings=warnings,
            missing_required_fields=missing_required_fields,
            conditional_field_issues=conditional_field_issues
        )
    
    def link_documents_to_questionnaire(self, questionnaire_id: int, document_ids: List[int], 
                                      question_field: str = "source_of_funds_docs") -> Tuple[List[int], List[int]]:
        """
        Link documents to a specific question in the KYC questionnaire.
        
        Args:
            questionnaire_id: Questionnaire ID
            document_ids: List of document IDs to link
            question_field: Field name to link documents to (default: source_of_funds_docs)
            
        Returns:
            Tuple of (successfully_linked_ids, failed_ids)
            
        Raises:
            ValueError: If questionnaire not found or invalid field name
        """
        questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if not questionnaire:
            raise ValueError("Questionnaire not found")
        
        if question_field != "source_of_funds_docs":
            raise ValueError(f"Invalid question field: {question_field}")
        
        # Validate document IDs
        valid_docs, invalid_docs = [], []
        for doc_id in document_ids:
            try:
                doc = self.db.query(Document).filter(
                    and_(
                        Document.id == doc_id,
                        Document.review_id == questionnaire.review_id,
                        Document.status == "active"
                    )
                ).first()
                
                if doc:
                    valid_docs.append(doc_id)
                else:
                    invalid_docs.append(doc_id)
            except Exception:
                invalid_docs.append(doc_id)
        
        # Update the questionnaire field
        if valid_docs:
            current_docs = questionnaire.source_of_funds_docs or []
            # Add new documents, avoiding duplicates
            updated_docs = list(set(current_docs + valid_docs))
            questionnaire.source_of_funds_docs = updated_docs
            
            self.db.commit()
        
        return valid_docs, invalid_docs
    
    def unlink_documents_from_questionnaire(self, questionnaire_id: int, document_ids: List[int], 
                                          question_field: str = "source_of_funds_docs") -> List[int]:
        """
        Unlink documents from a specific question in the KYC questionnaire.
        
        Args:
            questionnaire_id: Questionnaire ID
            document_ids: List of document IDs to unlink
            question_field: Field name to unlink documents from (default: source_of_funds_docs)
            
        Returns:
            List of successfully unlinked document IDs
            
        Raises:
            ValueError: If questionnaire not found or invalid field name
        """
        questionnaire = self.get_questionnaire_by_id(questionnaire_id)
        if not questionnaire:
            raise ValueError("Questionnaire not found")
        
        if question_field != "source_of_funds_docs":
            raise ValueError(f"Invalid question field: {question_field}")
        
        current_docs = questionnaire.source_of_funds_docs or []
        unlinked_docs = []
        
        for doc_id in document_ids:
            if doc_id in current_docs:
                current_docs.remove(doc_id)
                unlinked_docs.append(doc_id)
        
        questionnaire.source_of_funds_docs = current_docs
        self.db.commit()
        
        return unlinked_docs
    
    def get_questionnaire_statistics(self) -> KYCQuestionnaireStats:
        """
        Get KYC questionnaire statistics for dashboard.
        
        Returns:
            Statistics about questionnaire completion and usage
        """
        # Get all questionnaires
        questionnaires = self.db.query(KYCQuestionnaire).all()
        
        total_questionnaires = len(questionnaires)
        complete_questionnaires = sum(1 for q in questionnaires if q.is_complete)
        incomplete_questionnaires = total_questionnaires - complete_questionnaires
        
        # Count questionnaires with validation issues
        questionnaires_with_issues = 0
        question_completion_counts = {}
        conditional_field_usage = {}
        
        for questionnaire in questionnaires:
            validation_result = self.validate_questionnaire(questionnaire.id)
            if validation_result.errors or validation_result.conditional_field_issues:
                questionnaires_with_issues += 1
            
            # Track question completion rates
            fields_to_check = [
                'purpose_of_account', 'kyc_documents_complete', 'missing_kyc_details',
                'account_purpose_aligned', 'adverse_media_completed', 'adverse_media_evidence',
                'senior_mgmt_approval', 'pep_approval_obtained', 'static_data_correct',
                'kyc_documents_valid', 'regulated_business_license', 'remedial_actions',
                'source_of_funds_docs'
            ]
            
            for field in fields_to_check:
                value = getattr(questionnaire, field, None)
                is_completed = value is not None and (
                    (isinstance(value, str) and value.strip()) or
                    (isinstance(value, list) and len(value) > 0) or
                    (not isinstance(value, (str, list)))
                )
                
                if field not in question_completion_counts:
                    question_completion_counts[field] = 0
                
                if is_completed:
                    question_completion_counts[field] += 1
            
            # Track conditional field usage
            if questionnaire.missing_kyc_details:
                conditional_field_usage['missing_kyc_details'] = conditional_field_usage.get('missing_kyc_details', 0) + 1
            
            if questionnaire.senior_mgmt_approval is not None:
                conditional_field_usage['senior_mgmt_approval'] = conditional_field_usage.get('senior_mgmt_approval', 0) + 1
            
            if questionnaire.remedial_actions:
                conditional_field_usage['remedial_actions'] = conditional_field_usage.get('remedial_actions', 0) + 1
        
        # Calculate completion rates
        question_completion_rates = {}
        if total_questionnaires > 0:
            for field, count in question_completion_counts.items():
                question_completion_rates[field] = round((count / total_questionnaires) * 100, 2)
        
        avg_completion_rate = round((complete_questionnaires / total_questionnaires) * 100, 2) if total_questionnaires > 0 else 0
        
        # Find most commonly missing fields
        missing_counts = {}
        for field, completion_rate in question_completion_rates.items():
            missing_rate = 100 - completion_rate
            if missing_rate > 0:
                missing_counts[field] = missing_rate
        
        common_missing_fields = sorted(missing_counts.keys(), key=lambda x: missing_counts[x], reverse=True)[:5]
        
        return KYCQuestionnaireStats(
            total_questionnaires=total_questionnaires,
            complete_questionnaires=complete_questionnaires,
            incomplete_questionnaires=incomplete_questionnaires,
            questionnaires_with_issues=questionnaires_with_issues,
            avg_completion_rate=avg_completion_rate,
            question_completion_rates=question_completion_rates,
            common_missing_fields=common_missing_fields,
            conditional_field_usage=conditional_field_usage
        )
    
    def get_questionnaire_template(self) -> KYCQuestionnaireTemplate:
        """
        Get the KYC questionnaire template with all questions and their metadata.
        
        Returns:
            Template information for the questionnaire
        """
        questions = [
            KYCQuestionTemplate(
                question_number=1,
                question_text="What is the purpose of the account?",
                field_name="purpose_of_account",
                field_type="text",
                is_required=True,
                is_conditional=False,
                validation_rules=["Required", "Non-empty text"]
            ),
            KYCQuestionTemplate(
                question_number=2,
                question_text="Are all KYC documents complete?",
                field_name="kyc_documents_complete",
                field_type="dropdown",
                is_required=True,
                is_conditional=False,
                options=["Yes", "No", "Not Applicable"],
                validation_rules=["Required", "Must be Yes/No/Not Applicable"]
            ),
            KYCQuestionTemplate(
                question_number=3,
                question_text="What KYC details are missing?",
                field_name="missing_kyc_details",
                field_type="text",
                is_required=False,
                is_conditional=True,
                condition_description="Required when Q2 is 'No'",
                validation_rules=["Required if Q2 = No", "Non-empty text when provided"]
            ),
            KYCQuestionTemplate(
                question_number=4,
                question_text="Is the account purpose aligned with the business?",
                field_name="account_purpose_aligned",
                field_type="dropdown",
                is_required=True,
                is_conditional=False,
                options=["Yes", "No", "Not Applicable"],
                validation_rules=["Required", "Must be Yes/No/Not Applicable"]
            ),
            KYCQuestionTemplate(
                question_number=5,
                question_text="Has adverse media been completed?",
                field_name="adverse_media_completed",
                field_type="dropdown",
                is_required=True,
                is_conditional=False,
                options=["Yes", "No", "Not Applicable"],
                validation_rules=["Required", "Must be Yes/No/Not Applicable"]
            ),
            KYCQuestionTemplate(
                question_number=6,
                question_text="Has senior management approval been obtained?",
                field_name="senior_mgmt_approval",
                field_type="dropdown",
                is_required=False,
                is_conditional=True,
                condition_description="May be required for high-risk clients or PEPs",
                options=["Yes", "No"],
                validation_rules=["Must be Yes/No when provided"]
            ),
            KYCQuestionTemplate(
                question_number=7,
                question_text="Has PEP approval been obtained?",
                field_name="pep_approval_obtained",
                field_type="dropdown",
                is_required=True,
                is_conditional=False,
                options=["Yes", "No", "Not Applicable"],
                validation_rules=["Required", "Must be Yes/No/Not Applicable"]
            ),
            KYCQuestionTemplate(
                question_number=8,
                question_text="Is static data correct?",
                field_name="static_data_correct",
                field_type="dropdown",
                is_required=True,
                is_conditional=False,
                options=["Yes", "No", "Not Applicable"],
                validation_rules=["Required", "Must be Yes/No/Not Applicable"]
            ),
            KYCQuestionTemplate(
                question_number=9,
                question_text="Are KYC documents valid?",
                field_name="kyc_documents_valid",
                field_type="dropdown",
                is_required=True,
                is_conditional=False,
                options=["Yes", "No", "Not Applicable"],
                validation_rules=["Required", "Must be Yes/No/Not Applicable"]
            ),
            KYCQuestionTemplate(
                question_number=10,
                question_text="Has regulated business license been obtained?",
                field_name="regulated_business_license",
                field_type="dropdown",
                is_required=True,
                is_conditional=False,
                options=["Yes", "No", "Not Applicable"],
                validation_rules=["Required", "Must be Yes/No/Not Applicable"]
            ),
            KYCQuestionTemplate(
                question_number=11,
                question_text="What remedial actions are required?",
                field_name="remedial_actions",
                field_type="text",
                is_required=False,
                is_conditional=True,
                condition_description="Required when critical issues are identified (Q2, Q4, Q8, or Q9 = No)",
                validation_rules=["Required when critical issues identified", "Non-empty text when provided"]
            ),
            KYCQuestionTemplate(
                question_number=12,
                question_text="Upload source of funds documentation",
                field_name="source_of_funds_docs",
                field_type="document",
                is_required=True,
                is_conditional=False,
                validation_rules=["Required", "At least one document", "Valid document IDs"]
            )
        ]
        
        return KYCQuestionnaireTemplate(
            questions=questions,
            total_questions=len(questions),
            required_questions=sum(1 for q in questions if q.is_required),
            conditional_questions=sum(1 for q in questions if q.is_conditional),
            document_questions=sum(1 for q in questions if q.field_type == "document")
        )
    
    def _validate_document_ids(self, document_ids: List[int], review_id: int, raise_on_error: bool = True) -> List[int]:
        """
        Validate that document IDs exist and belong to the review.
        
        Args:
            document_ids: List of document IDs to validate
            review_id: Review ID the documents should belong to
            raise_on_error: Whether to raise exception on validation errors
            
        Returns:
            List of invalid document IDs
            
        Raises:
            ValueError: If raise_on_error is True and validation fails
        """
        if not document_ids:
            return []
        
        invalid_docs = []
        
        for doc_id in document_ids:
            doc = self.db.query(Document).filter(
                and_(
                    Document.id == doc_id,
                    Document.review_id == review_id,
                    Document.status == "active"
                )
            ).first()
            
            if not doc:
                invalid_docs.append(doc_id)
        
        if invalid_docs and raise_on_error:
            raise ValueError(f"Invalid or inactive document IDs for review {review_id}: {invalid_docs}")
        
        return invalid_docs