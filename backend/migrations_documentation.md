# Database Migrations Documentation

## Migration 006: Enhance Exception Model

**File:** `alembic/versions/006_enhance_exception_model.py`  
**Revision ID:** `006_enhance_exception_model`  
**Parent Revision:** `005`  
**Created:** 2024-01-20

### Purpose

This migration enhances the `review_exceptions` table to support comprehensive exception management by adding new fields and extending enum values to align with frontend requirements.

### Changes Made

#### 1. New Columns Added

- **`title`** (VARCHAR(255), NOT NULL)
  - Purpose: Provides a concise title/summary for each exception
  - Default for existing records: "Legacy Exception"
  - Indexed for performance

- **`priority`** (VARCHAR(20), NOT NULL)  
  - Purpose: Categorizes exceptions by urgency level
  - Values: 'low', 'medium', 'high', 'critical'
  - Default for existing records: "medium"
  - Indexed for performance

- **`due_date`** (TIMESTAMP WITH TIME ZONE, NULLABLE)
  - Purpose: Optional deadline for exception resolution
  - Allows NULL values for exceptions without specific deadlines
  - Indexed for performance

#### 2. Extended Enum Values

**ExceptionType** - Added new values:
- `documentation` - Documentation-related exceptions
- `compliance` - General compliance issues  
- `technical` - Technical system issues
- `operational` - Operational process exceptions

**Existing values preserved:**
- `kyc_non_compliance`
- `dormant_funded_ufaa` 
- `dormant_overdrawn_exit`

#### 3. Database Constraints

- **Check Constraints:** Updated to include new enum values
- **NOT NULL Constraints:** Applied to new required fields after setting defaults
- **Indexes:** Created for performance optimization on new fields

#### 4. Performance Optimizations

**New Indexes Created:**
- `idx_review_exceptions_priority` - Single column index on priority
- `idx_review_exceptions_due_date` - Single column index on due_date
- `idx_review_exceptions_priority_status` - Composite index for priority + status queries
- `idx_review_exceptions_type_priority` - Composite index for type + priority queries

### Migration Strategy

1. **Add columns as nullable** - Prevents constraint violations during migration
2. **Set default values** - Ensures existing records have valid data
3. **Apply NOT NULL constraints** - Enforces data integrity for new records
4. **Update check constraints** - Extends allowed enum values
5. **Create indexes** - Optimizes query performance

### Data Preservation

- **Zero data loss** - All existing exception records are preserved
- **Backward compatibility** - Existing enum values continue to work
- **Default values** - Legacy records get sensible defaults:
  - Title: "Legacy Exception"
  - Priority: "medium"
  - Due date: NULL (no deadline)

### Rollback Support

The migration includes a complete `downgrade()` function that:
- Drops all new indexes
- Removes new check constraints  
- Restores original check constraints
- Drops new columns

### Testing

- **Syntax validation** - Migration compiles without errors
- **Logic validation** - All requirements verified
- **Data preservation** - Existing records remain intact
- **Constraint validation** - New enum values work correctly

### Usage After Migration

After applying this migration, the exception system supports:

```python
# Create exception with new fields
exception = ReviewException(
    review_id=123,
    exception_type=ExceptionType.DOCUMENTATION,
    title="Missing KYC Documentation", 
    description="Client missing proof of address",
    priority=ExceptionPriority.HIGH,
    due_date=datetime(2024, 2, 1),
    created_by=user_id
)
```

### Performance Impact

- **Minimal impact** - New columns are added efficiently
- **Improved queries** - New indexes optimize common query patterns
- **Storage increase** - Approximately 300 bytes per exception record

### Dependencies

- Requires migration `005` (Add workflow history tracking)
- Compatible with existing exception API endpoints
- Frontend can immediately use new fields after migration

### Validation

Run the validation script to verify migration integrity:

```bash
python scripts/validate_exception_migration.py
```

### Apply Migration

```bash
# Apply migration
alembic upgrade 006_enhance_exception_model

# Rollback if needed  
alembic downgrade 005
```