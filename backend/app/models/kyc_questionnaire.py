"""
KYC Questionnaire model for structured review data collection.
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, ForeignKey, Integer, JSON, Index
from sqlalchemy.orm import relationship
from typing import Optional, List, Dict, Any

from app.models.base import BaseModel


class YesNoNA(enum.Enum):
    """Enumeration for Yes/No/Not Applicable responses."""
    YES = "yes"
    NO = "no"
    NOT_APPLICABLE = "not_applicable"


class YesNo(enum.Enum):
    """Enumeration for Yes/No responses."""
    YES = "yes"
    NO = "no"


class KYCQuestionnaire(BaseModel):
    """
    KYC Questionnaire model for structured compliance review data.
    
    This model stores responses to the 12 standardized KYC questions
    that replace free-form comments in the review process.
    
    Attributes:
        review_id: Foreign key to Review model (one-to-one relationship)
        purpose_of_account: Q1 - Free text response for account purpose
        kyc_documents_complete: Q2 - Yes/No/NA for document completeness
        missing_kyc_details: Q3 - Free text for missing KYC details (conditional)
        account_purpose_aligned: Q4 - Yes/No/NA for purpose alignment
        adverse_media_completed: Q5 - Yes/No/NA for adverse media check
        adverse_media_evidence: Q5 - Additional info/evidence for adverse media
        senior_mgmt_approval: Q6 - Yes/No for senior management approval (conditional)
        pep_approval_obtained: Q7 - Yes/No/NA for PEP approval
        static_data_correct: Q8 - Yes/No/NA for static data correctness
        kyc_documents_valid: Q9 - Yes/No/NA for document validity
        regulated_business_license: Q10 - Yes/No/NA for business license
        remedial_actions: Q11 - Free text for remedial actions (conditional)
        source_of_funds_docs: Q12 - JSON array of document IDs for source of funds
    """
    __tablename__ = "kyc_questionnaires"
    
    # Foreign key relationship (one-to-one with Review)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), 
                      nullable=False, unique=True, index=True)
    
    # Q1: Purpose of the account (free text)
    purpose_of_account = Column(Text, nullable=True)
    
    # Q2: Are all KYC documents complete? (Yes/No/NA)
    kyc_documents_complete = Column(Enum(YesNoNA), nullable=True)
    
    # Q3: Missing KYC details (conditional - free text)
    missing_kyc_details = Column(Text, nullable=True)
    
    # Q4: Is the account purpose aligned with the business? (Yes/No/NA)
    account_purpose_aligned = Column(Enum(YesNoNA), nullable=True)
    
    # Q5: Has adverse media been completed? (Yes/No/NA)
    adverse_media_completed = Column(Enum(YesNoNA), nullable=True)
    
    # Q5: Additional info for adverse media (free text)
    adverse_media_evidence = Column(Text, nullable=True)
    
    # Q6: Senior management approval obtained? (Yes/No - conditional)
    senior_mgmt_approval = Column(Enum(YesNo), nullable=True)
    
    # Q7: PEP approval obtained? (Yes/No/NA)
    pep_approval_obtained = Column(Enum(YesNoNA), nullable=True)
    
    # Q8: Is static data correct? (Yes/No/NA)
    static_data_correct = Column(Enum(YesNoNA), nullable=True)
    
    # Q9: Are KYC documents valid? (Yes/No/NA)
    kyc_documents_valid = Column(Enum(YesNoNA), nullable=True)
    
    # Q10: Regulated business license obtained? (Yes/No/NA)
    regulated_business_license = Column(Enum(YesNoNA), nullable=True)
    
    # Q11: Remedial actions required (conditional - free text)
    remedial_actions = Column(Text, nullable=True)
    
    # Q12: Source of funds documents (JSON array of document IDs)
    source_of_funds_docs = Column(JSON, nullable=True, default=list)
    
    # Relationships
    review = relationship("Review", back_populates="kyc_questionnaire", uselist=False)
    
    # Create indexes for common query patterns
    __table_args__ = (
        Index('idx_kyc_review_id', 'review_id'),
        Index('idx_kyc_created_at', 'created_at'),
    )
    
    def __repr__(self):
        """String representation of the KYCQuestionnaire model."""
        return f"<KYCQuestionnaire(id={self.id}, review_id={self.review_id})>"
    
    @property
    def is_complete(self) -> bool:
        """
        Check if the questionnaire has all required fields completed.
        
        Returns:
            True if all required questions are answered, False otherwise
        """
        # Q1 is required
        if not self.purpose_of_account or not self.purpose_of_account.strip():
            return False
        
        # Q2 is required
        if self.kyc_documents_complete is None:
            return False
        
        # Q3 is required if Q2 is "NO"
        if (self.kyc_documents_complete == YesNoNA.NO and 
            (not self.missing_kyc_details or not self.missing_kyc_details.strip())):
            return False
        
        # Q4 is required
        if self.account_purpose_aligned is None:
            return False
        
        # Q5 is required
        if self.adverse_media_completed is None:
            return False
        
        # Q7 is required
        if self.pep_approval_obtained is None:
            return False
        
        # Q8 is required
        if self.static_data_correct is None:
            return False
        
        # Q9 is required
        if self.kyc_documents_valid is None:
            return False
        
        # Q10 is required
        if self.regulated_business_license is None:
            return False
        
        # Q12 should have at least one document
        if not self.source_of_funds_docs or len(self.source_of_funds_docs) == 0:
            return False
        
        return True
    
    @property
    def requires_missing_kyc_details(self) -> bool:
        """Check if Q3 (missing KYC details) is required based on Q2."""
        return self.kyc_documents_complete == YesNoNA.NO
    
    @property
    def requires_senior_mgmt_approval(self) -> bool:
        """
        Check if Q6 (senior management approval) is required.
        This is conditional based on business rules (e.g., high-risk clients).
        """
        # This would be determined by business logic
        # For now, we'll make it optional but could be required based on client risk
        return False
    
    @property
    def requires_remedial_actions(self) -> bool:
        """
        Check if Q11 (remedial actions) is required.
        This is conditional based on other responses indicating issues.
        """
        # Required if any critical questions are answered "NO"
        critical_nos = [
            self.kyc_documents_complete == YesNoNA.NO,
            self.account_purpose_aligned == YesNoNA.NO,
            self.static_data_correct == YesNoNA.NO,
            self.kyc_documents_valid == YesNoNA.NO,
        ]
        return any(critical_nos)
    
    def validate_conditional_fields(self) -> List[str]:
        """
        Validate conditional field requirements and return list of errors.
        
        Returns:
            List of validation error messages
        """
        errors = []
        
        # Validate Q3 requirement
        if self.requires_missing_kyc_details:
            if not self.missing_kyc_details or not self.missing_kyc_details.strip():
                errors.append("Missing KYC details (Q3) is required when KYC documents are incomplete")
        
        # Validate Q6 requirement (if business rules require it)
        if self.requires_senior_mgmt_approval:
            if self.senior_mgmt_approval is None:
                errors.append("Senior management approval (Q6) is required for this client")
        
        # Validate Q11 requirement
        if self.requires_remedial_actions:
            if not self.remedial_actions or not self.remedial_actions.strip():
                errors.append("Remedial actions (Q11) are required when critical issues are identified")
        
        return errors
    
    def get_document_ids(self) -> List[int]:
        """
        Get all document IDs associated with this questionnaire.
        
        Returns:
            List of document IDs from source_of_funds_docs
        """
        if not self.source_of_funds_docs:
            return []
        
        # Ensure all items are integers
        try:
            return [int(doc_id) for doc_id in self.source_of_funds_docs if doc_id is not None]
        except (ValueError, TypeError):
            return []
    
    def add_source_of_funds_document(self, document_id: int) -> None:
        """
        Add a document ID to the source of funds documents list.
        
        Args:
            document_id: ID of the document to add
        """
        if self.source_of_funds_docs is None:
            self.source_of_funds_docs = []
        
        if document_id not in self.source_of_funds_docs:
            self.source_of_funds_docs.append(document_id)
    
    def remove_source_of_funds_document(self, document_id: int) -> None:
        """
        Remove a document ID from the source of funds documents list.
        
        Args:
            document_id: ID of the document to remove
        """
        if self.source_of_funds_docs and document_id in self.source_of_funds_docs:
            self.source_of_funds_docs.remove(document_id)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert questionnaire to dictionary format.
        
        Returns:
            Dictionary representation of the questionnaire
        """
        return {
            "id": self.id,
            "review_id": self.review_id,
            "purpose_of_account": self.purpose_of_account,
            "kyc_documents_complete": self.kyc_documents_complete.value if self.kyc_documents_complete else None,
            "missing_kyc_details": self.missing_kyc_details,
            "account_purpose_aligned": self.account_purpose_aligned.value if self.account_purpose_aligned else None,
            "adverse_media_completed": self.adverse_media_completed.value if self.adverse_media_completed else None,
            "adverse_media_evidence": self.adverse_media_evidence,
            "senior_mgmt_approval": self.senior_mgmt_approval.value if self.senior_mgmt_approval else None,
            "pep_approval_obtained": self.pep_approval_obtained.value if self.pep_approval_obtained else None,
            "static_data_correct": self.static_data_correct.value if self.static_data_correct else None,
            "kyc_documents_valid": self.kyc_documents_valid.value if self.kyc_documents_valid else None,
            "regulated_business_license": self.regulated_business_license.value if self.regulated_business_license else None,
            "remedial_actions": self.remedial_actions,
            "source_of_funds_docs": self.source_of_funds_docs or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    @classmethod
    def get_by_review_id(cls, db_session, review_id: int) -> Optional['KYCQuestionnaire']:
        """
        Get KYC questionnaire by review ID.
        
        Args:
            db_session: Database session
            review_id: Review ID
            
        Returns:
            KYCQuestionnaire instance or None if not found
        """
        return db_session.query(cls).filter(cls.review_id == review_id).first()
    
    @classmethod
    def create_for_review(cls, db_session, review_id: int) -> 'KYCQuestionnaire':
        """
        Create a new KYC questionnaire for a review.
        
        Args:
            db_session: Database session
            review_id: Review ID
            
        Returns:
            New KYCQuestionnaire instance
            
        Raises:
            ValueError: If questionnaire already exists for the review
        """
        existing = cls.get_by_review_id(db_session, review_id)
        if existing:
            raise ValueError(f"KYC questionnaire already exists for review {review_id}")
        
        questionnaire = cls(review_id=review_id)
        db_session.add(questionnaire)
        return questionnaire