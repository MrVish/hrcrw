# Exception API Alignment Design

## Overview

This design addresses the mismatch between frontend exception expectations and backend implementation by extending the backend to support comprehensive exception management while maintaining API compatibility.

## Architecture

### Backend Model Enhancement

The `ReviewException` model will be extended to include:
- `title`: String field for exception title
- `priority`: Enum field (LOW, MEDIUM, HIGH, CRITICAL)
- `due_date`: Optional datetime for resolution deadline
- `resolution_notes`: Text field for resolution details

### API Schema Updates

The `ReviewExceptionCreate` schema will be updated to:
- Accept all frontend fields with proper validation
- Use field aliases to maintain compatibility
- Support both `type` and `exception_type` field names

### Database Migration Strategy

A new migration will:
- Add new columns to the `review_exceptions` table
- Create the `ExceptionPriority` enum type
- Set default values for existing records
- Apply proper constraints

## Components and Interfaces

### Enhanced Exception Model

```python
class ReviewException(BaseModel):
    __tablename__ = "review_exceptions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    review_id: Mapped[int] = mapped_column(Integer, ForeignKey("reviews.id"), nullable=False, index=True)
    exception_type: Mapped[ExceptionType] = mapped_column(Enum(ExceptionType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[ExceptionPriority] = mapped_column(Enum(ExceptionPriority), default=ExceptionPriority.MEDIUM, nullable=False)
    status: Mapped[ExceptionStatus] = mapped_column(Enum(ExceptionStatus), default=ExceptionStatus.OPEN, nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # ... existing fields
```

### Updated API Schemas

```python
class ReviewExceptionCreate(BaseModel):
    review_id: int = Field(..., description="ID of the associated review")
    type: ExceptionType = Field(..., description="Type of exception", alias="exception_type")
    title: str = Field(..., min_length=1, max_length=255, description="Exception title")
    description: str = Field(..., min_length=1, max_length=2000, description="Detailed description")
    priority: ExceptionPriority = Field(default=ExceptionPriority.MEDIUM, description="Exception priority")
    due_date: Optional[datetime] = Field(None, description="Due date for resolution")
    assigned_to: Optional[int] = Field(None, description="ID of assigned user")
    
    class Config:
        allow_population_by_field_name = True
```

### API Endpoint Enhancement

The existing `/reviews/{review_id}/exceptions` endpoint will be updated to:
- Accept the enhanced `ReviewExceptionCreate` schema
- Create exceptions with all provided fields
- Return comprehensive exception details with user names
- Handle proper error responses

## Data Models

### Exception Priority Enum

```python
class ExceptionPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
```

### Extended Exception Types

```python
class ExceptionType(enum.Enum):
    DOCUMENTATION = "documentation"
    COMPLIANCE = "compliance"
    TECHNICAL = "technical"
    OPERATIONAL = "operational"
    KYC_NON_COMPLIANCE = "kyc_non_compliance"
    DORMANT_FUNDED_UFAA = "dormant_funded_ufaa"
    DORMANT_OVERDRAWN_EXIT = "dormant_overdrawn_exit"
```

## Error Handling

### Validation Errors
- Field validation errors will return 422 with detailed field-level messages
- Missing required fields will be clearly identified
- Invalid enum values will provide available options

### Database Errors
- Constraint violations will return appropriate HTTP status codes
- Foreign key errors will provide meaningful messages
- Transaction rollback will ensure data consistency

## Testing Strategy

### Unit Tests
- Model validation tests for new fields
- Schema serialization/deserialization tests
- Enum value validation tests

### Integration Tests
- End-to-end exception creation flow
- API endpoint response validation
- Database migration verification

### API Tests
- Exception creation with all fields
- Error response validation
- Field alias functionality testing