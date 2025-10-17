"""
Pydantic schemas for KYC questionnaire data validation and serialization.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

from app.models.kyc_questionnaire import YesNoNA, YesNo


class KYCQuestionnaireBase(BaseModel):
    """Base KYC questionnaire schema with common fields."""
    purpose_of_account: Optional[str] = Field(None, description="Q1: Purpose of the account")
    kyc_documents_complete: Optional[YesNoNA] = Field(None, description="Q2: Are all KYC documents complete?")
    missing_kyc_details: Optional[str] = Field(None, description="Q3: Missing KYC details (conditional)")
    account_purpose_aligned: Optional[YesNoNA] = Field(None, description="Q4: Is account purpose aligned with business?")
    adverse_media_completed: Optional[YesNoNA] = Field(None, description="Q5: Has adverse media been completed?")
    adverse_media_evidence: Optional[str] = Field(None, description="Q5: Additional info for adverse media")
    senior_mgmt_approval: Optional[YesNo] = Field(None, description="Q6: Senior management approval obtained? (conditional)")
    pep_approval_obtained: Optional[YesNoNA] = Field(None, description="Q7: PEP approval obtained?")
    static_data_correct: Optional[YesNoNA] = Field(None, description="Q8: Is static data correct?")
    kyc_documents_valid: Optional[YesNoNA] = Field(None, description="Q9: Are KYC documents valid?")
    regulated_business_license: Optional[YesNoNA] = Field(None, description="Q10: Regulated business license obtained?")
    remedial_actions: Optional[str] = Field(None, description="Q11: Remedial actions required (conditional)")
    source_of_funds_docs: Optional[List[int]] = Field(default_factory=list, description="Q12: Source of funds document IDs")


class KYCQuestionnaireCreate(KYCQuestionnaireBase):
    """Schema for creating a new KYC questionnaire."""
    review_id: int = Field(..., description="Review ID this questionnaire belongs to")
    
    @field_validator('purpose_of_account')
    @classmethod
    def validate_purpose_of_account(cls, v):
        """Validate purpose of account field."""
        if v is not None and not v.strip():
            raise ValueError('Purpose of account cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('missing_kyc_details')
    @classmethod
    def validate_missing_kyc_details(cls, v):
        """Validate missing KYC details field."""
        if v is not None and not v.strip():
            raise ValueError('Missing KYC details cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('adverse_media_evidence')
    @classmethod
    def validate_adverse_media_evidence(cls, v):
        """Validate adverse media evidence field."""
        if v is not None and not v.strip():
            raise ValueError('Adverse media evidence cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('remedial_actions')
    @classmethod
    def validate_remedial_actions(cls, v):
        """Validate remedial actions field."""
        if v is not None and not v.strip():
            raise ValueError('Remedial actions cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('source_of_funds_docs')
    @classmethod
    def validate_source_of_funds_docs(cls, v):
        """Validate source of funds document IDs."""
        if v is None:
            return []
        
        # Ensure all items are positive integers
        validated_docs = []
        for doc_id in v:
            if not isinstance(doc_id, int) or doc_id <= 0:
                raise ValueError(f'Document ID must be a positive integer, got: {doc_id}')
            validated_docs.append(doc_id)
        
        return validated_docs
    
    @model_validator(mode='after')
    def validate_conditional_fields(self):
        """Validate conditional field requirements."""
        errors = []
        
        # Q3 is required if Q2 is "NO"
        if (self.kyc_documents_complete == YesNoNA.NO and 
            (not self.missing_kyc_details or not self.missing_kyc_details.strip())):
            errors.append("Missing KYC details (Q3) is required when KYC documents are incomplete (Q2 = No)")
        
        # Q11 is required if any critical questions are "NO"
        critical_nos = [
            self.kyc_documents_complete == YesNoNA.NO,
            self.account_purpose_aligned == YesNoNA.NO,
            self.static_data_correct == YesNoNA.NO,
            self.kyc_documents_valid == YesNoNA.NO,
        ]
        
        if (any(critical_nos) and 
            (not self.remedial_actions or not self.remedial_actions.strip())):
            errors.append("Remedial actions (Q11) are required when critical issues are identified")
        
        if errors:
            raise ValueError('; '.join(errors))
        
        return self


class KYCQuestionnaireUpdate(KYCQuestionnaireBase):
    """Schema for updating KYC questionnaire information."""
    
    @field_validator('purpose_of_account')
    @classmethod
    def validate_purpose_of_account(cls, v):
        """Validate purpose of account field."""
        if v is not None and not v.strip():
            raise ValueError('Purpose of account cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('missing_kyc_details')
    @classmethod
    def validate_missing_kyc_details(cls, v):
        """Validate missing KYC details field."""
        if v is not None and not v.strip():
            raise ValueError('Missing KYC details cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('adverse_media_evidence')
    @classmethod
    def validate_adverse_media_evidence(cls, v):
        """Validate adverse media evidence field."""
        if v is not None and not v.strip():
            raise ValueError('Adverse media evidence cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('remedial_actions')
    @classmethod
    def validate_remedial_actions(cls, v):
        """Validate remedial actions field."""
        if v is not None and not v.strip():
            raise ValueError('Remedial actions cannot be empty if provided')
        return v.strip() if v else None
    
    @field_validator('source_of_funds_docs')
    @classmethod
    def validate_source_of_funds_docs(cls, v):
        """Validate source of funds document IDs."""
        if v is None:
            return []
        
        # Ensure all items are positive integers
        validated_docs = []
        for doc_id in v:
            if not isinstance(doc_id, int) or doc_id <= 0:
                raise ValueError(f'Document ID must be a positive integer, got: {doc_id}')
            validated_docs.append(doc_id)
        
        return validated_docs
    
    @model_validator(mode='after')
    def validate_conditional_fields(self):
        """Validate conditional field requirements."""
        errors = []
        
        # Q3 is required if Q2 is "NO"
        if (self.kyc_documents_complete == YesNoNA.NO and 
            (not self.missing_kyc_details or not self.missing_kyc_details.strip())):
            errors.append("Missing KYC details (Q3) is required when KYC documents are incomplete (Q2 = No)")
        
        # Q11 is required if any critical questions are "NO"
        critical_nos = [
            self.kyc_documents_complete == YesNoNA.NO,
            self.account_purpose_aligned == YesNoNA.NO,
            self.static_data_correct == YesNoNA.NO,
            self.kyc_documents_valid == YesNoNA.NO,
        ]
        
        if (any(critical_nos) and 
            (not self.remedial_actions or not self.remedial_actions.strip())):
            errors.append("Remedial actions (Q11) are required when critical issues are identified")
        
        if errors:
            raise ValueError('; '.join(errors))
        
        return self


class KYCQuestionnaireResponse(KYCQuestionnaireBase):
    """Schema for KYC questionnaire response data."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Internal database ID")
    review_id: int = Field(..., description="Review ID this questionnaire belongs to")
    created_at: datetime = Field(..., description="Timestamp when questionnaire was created")
    updated_at: datetime = Field(..., description="Timestamp when questionnaire was last updated")
    
    # Computed properties
    is_complete: bool = Field(..., description="Whether questionnaire has all required fields completed")
    requires_missing_kyc_details: bool = Field(..., description="Whether Q3 is required based on Q2")
    requires_senior_mgmt_approval: bool = Field(..., description="Whether Q6 is required")
    requires_remedial_actions: bool = Field(..., description="Whether Q11 is required")


class KYCQuestionnaireValidationResult(BaseModel):
    """Schema for KYC questionnaire validation results."""
    is_valid: bool = Field(..., description="Whether questionnaire is valid")
    is_complete: bool = Field(..., description="Whether questionnaire is complete")
    errors: List[str] = Field(default_factory=list, description="List of validation errors")
    warnings: List[str] = Field(default_factory=list, description="List of validation warnings")
    missing_required_fields: List[str] = Field(default_factory=list, description="List of missing required fields")
    conditional_field_issues: List[str] = Field(default_factory=list, description="List of conditional field issues")


class KYCQuestionnaireSubmissionRequest(BaseModel):
    """Schema for KYC questionnaire submission with validation."""
    questionnaire_data: KYCQuestionnaireCreate = Field(..., description="Questionnaire data")
    force_submit: bool = Field(default=False, description="Force submission despite warnings")


class KYCQuestionnaireDetailResponse(KYCQuestionnaireResponse):
    """Schema for detailed KYC questionnaire information including related data."""
    # Include review information
    review_status: Optional[str] = Field(None, description="Status of the associated review")
    review_client_id: Optional[str] = Field(None, description="Client ID from the associated review")
    
    # Include document information for Q12
    source_of_funds_document_names: List[str] = Field(default_factory=list, description="Names of source of funds documents")
    source_of_funds_document_count: int = Field(0, description="Number of source of funds documents")
    
    # Validation status
    validation_result: KYCQuestionnaireValidationResult = Field(..., description="Current validation status")


class KYCQuestionnaireStats(BaseModel):
    """Schema for KYC questionnaire statistics."""
    total_questionnaires: int = Field(..., description="Total number of questionnaires")
    complete_questionnaires: int = Field(..., description="Number of complete questionnaires")
    incomplete_questionnaires: int = Field(..., description="Number of incomplete questionnaires")
    questionnaires_with_issues: int = Field(..., description="Number of questionnaires with validation issues")
    avg_completion_rate: float = Field(..., description="Average completion rate as percentage")
    
    # Question-specific statistics
    question_completion_rates: Dict[str, float] = Field(default_factory=dict, description="Completion rate by question")
    common_missing_fields: List[str] = Field(default_factory=list, description="Most commonly missing fields")
    conditional_field_usage: Dict[str, int] = Field(default_factory=dict, description="Usage count of conditional fields")


class KYCQuestionTemplate(BaseModel):
    """Schema for KYC question template information."""
    question_number: int = Field(..., description="Question number (1-12)")
    question_text: str = Field(..., description="Question text")
    field_name: str = Field(..., description="Field name in the model")
    field_type: str = Field(..., description="Field type (text, dropdown, document)")
    is_required: bool = Field(..., description="Whether question is always required")
    is_conditional: bool = Field(..., description="Whether question is conditionally required")
    condition_description: Optional[str] = Field(None, description="Description of when question is required")
    options: Optional[List[str]] = Field(None, description="Available options for dropdown questions")
    validation_rules: List[str] = Field(default_factory=list, description="Validation rules for the field")


class KYCQuestionnaireTemplate(BaseModel):
    """Schema for complete KYC questionnaire template."""
    questions: List[KYCQuestionTemplate] = Field(..., description="List of all questions in the questionnaire")
    total_questions: int = Field(..., description="Total number of questions")
    required_questions: int = Field(..., description="Number of always required questions")
    conditional_questions: int = Field(..., description="Number of conditionally required questions")
    document_questions: int = Field(..., description="Number of questions requiring document upload")


class KYCDocumentLinkRequest(BaseModel):
    """Schema for linking documents to KYC questionnaire."""
    document_ids: List[int] = Field(..., description="List of document IDs to link")
    question_field: str = Field(default="source_of_funds_docs", description="Question field to link documents to")
    
    @field_validator('document_ids')
    @classmethod
    def validate_document_ids(cls, v):
        """Validate document IDs."""
        if not v:
            raise ValueError('At least one document ID is required')
        
        for doc_id in v:
            if not isinstance(doc_id, int) or doc_id <= 0:
                raise ValueError(f'Document ID must be a positive integer, got: {doc_id}')
        
        return v
    
    @field_validator('question_field')
    @classmethod
    def validate_question_field(cls, v):
        """Validate question field name."""
        allowed_fields = ['source_of_funds_docs']  # Can be extended for other document fields
        if v not in allowed_fields:
            raise ValueError(f'Question field must be one of: {allowed_fields}')
        return v


class KYCDocumentLinkResponse(BaseModel):
    """Schema for document linking response."""
    questionnaire_id: int = Field(..., description="KYC questionnaire ID")
    question_field: str = Field(..., description="Question field documents were linked to")
    linked_document_ids: List[int] = Field(..., description="List of successfully linked document IDs")
    failed_document_ids: List[int] = Field(default_factory=list, description="List of document IDs that failed to link")
    total_documents: int = Field(..., description="Total number of documents now linked to the field")