// User types
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'checker' | 'maker'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Client types
export interface Client {
  id: number
  client_id: string
  name: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  country: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UNDER_REVIEW'
  last_review_date: string | null
  created_at: string
  updated_at: string
  review_count: number
  is_high_risk: boolean
  is_active: boolean
  needs_review: boolean
  // Enhanced client fields
  domicile_branch?: string | null
  relationship_manager?: string | null
  business_unit?: string | null
  aml_risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null
  // Auto-review flags
  auto_kyc_review: boolean
  auto_aml_review: boolean
  auto_sanctions_review: boolean
  auto_pep_review: boolean
  auto_financial_review: boolean
  has_auto_review_flags: boolean
  enabled_auto_review_types: string[]
}

// Review types
export interface Review {
  id: number
  client_id: string
  submitted_by: number
  reviewed_by: number | null
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  review_type: 'MANUAL' | 'KYC' | 'AML' | 'SANCTIONS' | 'PEP' | 'FINANCIAL'
  auto_created: boolean
  comments: string | null
  rejection_reason: string | null
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  is_draft: boolean
  is_submitted: boolean
  is_pending_review: boolean
  is_completed: boolean
  is_approved: boolean
  is_rejected: boolean
  is_auto_created: boolean
  is_manual_review: boolean
}

export interface ReviewDetail extends Review {
  client_name: string | null
  client_risk_level: string | null
  submitter_name: string | null
  reviewer_name: string | null
  document_count: number
  exception_count: number
  kyc_questionnaire?: KYCQuestionnaire | null
}

// Exception types
export interface Exception {
  id: number
  review_id: number
  assigned_to: number | null
  created_by: number
  type: 'DOCUMENTATION' | 'COMPLIANCE' | 'TECHNICAL' | 'REGULATORY' | 'OPERATIONAL' | 'OTHER'
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated'
  resolution_notes: string | null
  resolved_at: string | null
  due_date: string | null
  created_at: string
  updated_at: string
  // Additional fields from API response
  client_id?: string
  client_name?: string
  assigned_user_name?: string | null
  assigned_to_name?: string | null
  creator_name?: string
  review_client_id?: string
  review_status?: string
  is_open?: boolean
  is_in_progress?: boolean
  is_resolved?: boolean
  is_closed?: boolean
  is_escalated?: boolean
  is_active?: boolean
  is_overdue?: boolean
  is_high_priority?: boolean
}

// Document types
export interface Document {
  id: number
  review_id: number
  uploaded_by: number
  filename: string
  file_path: string
  file_size: number
  content_type: string
  document_type: string
  status: string
  version: number
  is_sensitive: boolean
  retention_date: string | null
  access_count: number
  last_accessed_at: string | null
  created_at: string
  updated_at: string
}

// KYC Questionnaire types
export type YesNoNA = 'yes' | 'no' | 'not_applicable'
export type YesNo = 'yes' | 'no'

export interface KYCQuestionnaire {
  id?: number
  review_id: number
  purpose_of_account?: string
  kyc_documents_complete?: YesNoNA
  missing_kyc_details?: string
  account_purpose_aligned?: YesNoNA
  adverse_media_completed?: YesNoNA
  adverse_media_evidence?: string
  senior_mgmt_approval?: YesNo
  pep_approval_obtained?: YesNoNA
  static_data_correct?: YesNoNA
  kyc_documents_valid?: YesNoNA
  regulated_business_license?: YesNoNA
  remedial_actions?: string
  source_of_funds_docs?: number[]
  created_at?: string
  updated_at?: string
}

export interface KYCQuestionnaireValidation {
  is_valid: boolean
  is_complete: boolean
  errors: string[]
  warnings: string[]
  missing_required_fields: string[]
  conditional_field_issues: string[]
}

export interface KYCQuestionTemplate {
  question_number: number
  question_text: string
  field_name: string
  field_type: 'text' | 'dropdown' | 'document'
  is_required: boolean
  is_conditional: boolean
  condition_description?: string
  options?: string[]
  validation_rules: string[]
}

// Audit Log types
export interface AuditLog {
  id: number
  user_id: number | null
  entity_type: 'USER' | 'CLIENT' | 'REVIEW' | 'EXCEPTION' | 'DOCUMENT' | 'SYSTEM'
  entity_id: string | null
  action: string
  description: string
  details: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  success: string
  error_message: string | null
  created_at: string
  updated_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Specific response types that match backend schemas
export interface ClientListResponse {
  clients: Client[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ReviewListResponse {
  reviews: Review[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ExceptionListResponse {
  exceptions: Exception[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface UserListResponse {
  users: User[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface UserForm {
  name: string
  email: string
  role: User['role']
  is_active: boolean
  password?: string
}

// Filter types
export interface ClientFilters {
  search?: string
  risk_level?: Client['risk_level']
  country?: string
  status?: Client['status']
}

export interface ReviewFilters {
  search?: string
  status?: Review['status']
  client_risk_level?: Client['risk_level']
  date_range?: string
}

export interface ExceptionFilters {
  search?: string
  status?: Exception['status']
  priority?: Exception['priority']
  assigned_to?: number
  type?: Exception['type']
}

// Form data types
export interface ReviewFormData {
  client_id: string
  comments?: string
  review_type?: 'manual' | 'kyc' | 'aml' | 'sanctions' | 'pep' | 'financial'
  auto_created?: boolean
}

export interface ExceptionFormData {
  review_id: number
  type: Exception['type']
  title: string
  description: string
  priority: Exception['priority']
  due_date?: string
}

// Document types
export interface DocumentUploadRequest {
  review_id: number
  filename: string
  content_type: string
  document_type: string
  is_sensitive?: boolean
}

export interface DocumentUploadResponse {
  upload_url: string
  document_id: number
}

export interface DocumentDownloadRequest {
  document_id: number
}

export interface DocumentDownloadResponse {
  download_url: string
  expires_at: string
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
}

// Dashboard types
export interface DashboardStats {
  total_clients: number
  high_risk_clients: number
  pending_reviews: number
  overdue_reviews: number
  open_exceptions: number
  critical_exceptions: number
}

export interface DashboardMetrics {
  pendingReviews: number
  approvedReviews: number
  rejectedReviews: number
  openExceptions: number
  activeUsers: number
  averageReviewTime: number
  highRiskClients: number
  clientsNeedingReview: number
  totalReviews: number
  completionRate: number
  reviewsByStatus: Array<{ name: string; value: number; color: string }>
  reviewsOverTime: Array<{ date: string; submitted: number; approved: number; rejected: number }>
  lastUpdated: string
}

// Notification types
export interface Notification {
  id: string
  type: 'review_submitted' | 'review_approved' | 'review_rejected' | 'exception_created' | 'user_assigned'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
  actionUrl?: string
}

// Toast types
export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

// UI State types
export interface UIState {
  toasts: Toast[]
  globalLoading: boolean
  sidebarCollapsed: boolean
}

// Auth Context types
export interface AuthContextType {
  user: User | null
  token: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

// Maker-Checker Action types
export type ActionType = 
  | 'SAVE_DRAFT'
  | 'SUBMIT'
  | 'ACCEPT'
  | 'REJECT'
  | 'VIEW_ONLY'

export interface ActionConfig {
  type: ActionType
  label: string
  variant: 'contained' | 'outlined' | 'text'
  color: 'primary' | 'secondary' | 'success' | 'error'
  icon: string // Material-UI icon name
  requiresConfirmation?: boolean
  requiresReason?: boolean
}

export interface PermissionContext {
  user: User
  item: Review | Exception
  isOwner: boolean
}

export interface ActionButtonGroupProps {
  actions: ActionType[]
  onSave?: () => Promise<void>
  onSubmit?: () => Promise<void>
  onAccept?: (comments?: string) => Promise<void>
  onReject?: (reason: string) => Promise<void>
  loading?: {
    save?: boolean
    submit?: boolean
    accept?: boolean
    reject?: boolean
  }
  disabled?: boolean
}

export interface RejectionDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  title: string
  itemType: 'Review' | 'Exception'
  loading?: boolean
}