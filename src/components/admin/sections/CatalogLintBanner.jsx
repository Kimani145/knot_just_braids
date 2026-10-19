import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function CatalogLintBanner({ warnings = [] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  if (!warnings.length) return null

  return (
    <div className="catalog-lint-banner" role="region" aria-label="Catalog Health Issues">
      <div className="catalog-lint-header" onClick={() => setIsExpanded((prev) => !prev)}>
        <div className="catalog-lint-title">
          <AlertTriangle size={18} className="catalog-lint-icon" />
          <span>
            <strong>Catalog Health:</strong> {warnings.length} {warnings.length === 1 ? 'issue' : 'issues'} detected
          </span>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded((prev) => !prev)
          }}
        >
          {isExpanded ? 'Hide' : 'Review'}
        </button>
      </div>
      {isExpanded ? (
        <ul className="catalog-lint-list">
          {warnings.map((warn) => (
            <li key={warn.id} className="catalog-lint-item">
              <span className={`catalog-lint-tag tag-${warn.catalogType}`}>
                {warn.catalogType === 'salon' ? 'SALON' : 'BEADS'}
              </span>
              <span className="catalog-lint-msg">{warn.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
