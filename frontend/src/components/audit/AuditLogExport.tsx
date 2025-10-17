import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface FilterState {
    user_id?: number
    entity_type?: string
    entity_id?: string
    action?: string
    start_date?: string
    end_date?: string
    search_text?: string
    page: number
    per_page: number
    sort_by: string
    sort_order: 'asc' | 'desc'
}

interface AuditLogExportProps {
    filters: FilterState
}

export const AuditLogExport: React.FC<AuditLogExportProps> = ({ filters }) => {
    const { user } = useAuth()
    const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'xml'>('csv')
    const [includeDetails, setIncludeDetails] = useState(true)
    const [maxRecords, setMaxRecords] = useState(10000)
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState<string | null>(null)

    const handleExport = async () => {
        if (!user?.token) return

        setExporting(true)
        setExportError(null)

        try {
            const queryParams = new URLSearchParams()

            // Add current filters to export
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '' &&
                    key !== 'page' && key !== 'per_page' && key !== 'sort_by' && key !== 'sort_order') {
                    queryParams.append(key, value.toString())
                }
            })

            // Add export-specific parameters
            queryParams.append('format', exportFormat)
            queryParams.append('include_details', includeDetails.toString())
            queryParams.append('max_records', maxRecords.toString())

            const response = await fetch(`/api/audit/logs/export?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            })

            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`)
            }

            // Get the filename from the response headers
            const contentDisposition = response.headers.get('Content-Disposition')
            let filename = `audit_logs.${exportFormat}`
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
                if (filenameMatch) {
                    filename = filenameMatch[1]
                }
            }

            // Download the file
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

        } catch (err) {
            setExportError(err instanceof Error ? err.message : 'Export failed')
        } finally {
            setExporting(false)
        }
    }

    const getEstimatedSize = () => {
        // Rough estimation based on format and details
        const baseSize = maxRecords * (includeDetails ? 500 : 200) // bytes per record
        const formatMultiplier = exportFormat === 'json' ? 1.5 : exportFormat === 'xml' ? 2 : 1
        const estimatedBytes = baseSize * formatMultiplier

        if (estimatedBytes < 1024) return `${estimatedBytes} B`
        if (estimatedBytes < 1024 * 1024) return `${(estimatedBytes / 1024).toFixed(1)} KB`
        return `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const hasActiveFilters = Boolean(
        filters.user_id ||
        filters.entity_type ||
        filters.entity_id ||
        filters.action ||
        filters.start_date ||
        filters.end_date ||
        filters.search_text
    )

    return (
        <div className="audit-export">
            <h3>Export Audit Logs</h3>
            <p>Export audit logs matching your current filters for compliance reporting.</p>

            <div className="export-options">
                <div className="option-group">
                    <label>Export Format</label>
                    <div className="format-options">
                        <label className="radio-option">
                            <input
                                type="radio"
                                value="csv"
                                checked={exportFormat === 'csv'}
                                onChange={(e) => setExportFormat(e.target.value as 'csv')}
                            />
                            <span>CSV (Comma Separated Values)</span>
                            <small>Best for spreadsheet applications</small>
                        </label>

                        <label className="radio-option">
                            <input
                                type="radio"
                                value="json"
                                checked={exportFormat === 'json'}
                                onChange={(e) => setExportFormat(e.target.value as 'json')}
                            />
                            <span>JSON (JavaScript Object Notation)</span>
                            <small>Best for programmatic processing</small>
                        </label>

                        <label className="radio-option">
                            <input
                                type="radio"
                                value="xml"
                                checked={exportFormat === 'xml'}
                                onChange={(e) => setExportFormat(e.target.value as 'xml')}
                            />
                            <span>XML (Extensible Markup Language)</span>
                            <small>Best for structured data exchange</small>
                        </label>
                    </div>
                </div>

                <div className="option-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={includeDetails}
                            onChange={(e) => setIncludeDetails(e.target.checked)}
                        />
                        Include detailed information
                    </label>
                    <small>Include full details JSON in the export (increases file size)</small>
                </div>

                <div className="option-group">
                    <label htmlFor="max_records">Maximum Records</label>
                    <select
                        id="max_records"
                        value={maxRecords}
                        onChange={(e) => setMaxRecords(parseInt(e.target.value))}
                        className="form-select"
                    >
                        <option value={1000}>1,000 records</option>
                        <option value={5000}>5,000 records</option>
                        <option value={10000}>10,000 records</option>
                        <option value={25000}>25,000 records</option>
                        <option value={50000}>50,000 records (Max)</option>
                    </select>
                    <small>Limit the number of records to prevent large downloads</small>
                </div>
            </div>

            <div className="export-summary">
                <h4>Export Summary</h4>
                <div className="summary-details">
                    <div className="summary-item">
                        <span>Format:</span>
                        <span>{exportFormat.toUpperCase()}</span>
                    </div>
                    <div className="summary-item">
                        <span>Max Records:</span>
                        <span>{maxRecords.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                        <span>Include Details:</span>
                        <span>{includeDetails ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="summary-item">
                        <span>Estimated Size:</span>
                        <span>{getEstimatedSize()}</span>
                    </div>
                    <div className="summary-item">
                        <span>Filters Applied:</span>
                        <span>{hasActiveFilters ? 'Yes' : 'No'}</span>
                    </div>
                </div>
            </div>

            {hasActiveFilters && (
                <div className="active-filters-summary">
                    <h4>Active Filters</h4>
                    <p>The export will include only records matching your current filters:</p>
                    <ul>
                        {filters.user_id && <li>User ID: {filters.user_id}</li>}
                        {filters.entity_type && <li>Entity Type: {filters.entity_type}</li>}
                        {filters.entity_id && <li>Entity ID: {filters.entity_id}</li>}
                        {filters.action && <li>Action: {filters.action}</li>}
                        {filters.start_date && <li>From: {new Date(filters.start_date).toLocaleDateString()}</li>}
                        {filters.end_date && <li>To: {new Date(filters.end_date).toLocaleDateString()}</li>}
                        {filters.search_text && <li>Search: "{filters.search_text}"</li>}
                    </ul>
                </div>
            )}

            {exportError && (
                <div className="export-error">
                    <p>Export Error: {exportError}</p>
                </div>
            )}

            <div className="export-actions">
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="btn btn-primary"
                >
                    {exporting ? 'Exporting...' : 'Export Audit Logs'}
                </button>
            </div>

            <div className="export-notes">
                <h4>Important Notes</h4>
                <ul>
                    <li>Exports are limited to {maxRecords.toLocaleString()} records for performance reasons</li>
                    <li>Large exports may take several minutes to complete</li>
                    <li>Exported data contains sensitive information - handle securely</li>
                    <li>Export activities are logged for compliance purposes</li>
                </ul>
            </div>
        </div>
    )
}