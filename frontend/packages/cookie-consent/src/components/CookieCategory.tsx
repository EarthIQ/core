import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, Cookie } from 'lucide-react';
import { CookieToggle } from './CookieToggle';
import type { CookieCategoryConfig } from '../types';

export interface CookieCategoryProps {
  category: CookieCategoryConfig;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const CookieCategory: React.FC<CookieCategoryProps> = ({
  category,
  enabled,
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasCookies = category.cookies && category.cookies.length > 0;

  return (
    <div className="cc-category">
      {/* Header */}
      <div className="cc-category__header">
        <div className="cc-category__info">
          <div className={`cc-category__icon ${category.required ? 'cc-category__icon--required' : enabled ? 'cc-category__icon--enabled' : ''}`}>
            {category.required ? (
              <Lock className="cc-icon cc-icon--sm" />
            ) : (
              <Cookie className="cc-icon cc-icon--sm" />
            )}
          </div>
          <div className="cc-category__text">
            <div className="cc-category__title-row">
              <h3 className="cc-category__title">{category.name}</h3>
              {category.required && (
                <span className="cc-badge cc-badge--required">Required</span>
              )}
            </div>
            {hasCookies && (
              <p className="cc-category__cookie-count">
                {category.cookies!.length} cookie{category.cookies!.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        
        <div className="cc-category__actions">
          <CookieToggle
            id={`cookie-toggle-${category.id}`}
            checked={enabled}
            onChange={onToggle}
            disabled={category.required}
            aria-label={`${enabled ? 'Disable' : 'Enable'} ${category.name} cookies`}
          />
          
          {hasCookies && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="cc-category__expand-btn"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="cc-icon cc-icon--sm" />
              ) : (
                <ChevronDown className="cc-icon cc-icon--sm" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="cc-category__description">
        <p>{category.description}</p>
      </div>

      {/* Expanded Cookie List */}
      {isExpanded && hasCookies && (
        <div className="cc-category__cookies">
          <h4 className="cc-category__cookies-title">Cookies Used</h4>
          <div className="cc-category__cookies-list">
            {category.cookies!.map((cookie, index) => (
              <div key={index} className="cc-cookie-item">
                <div className="cc-cookie-item__header">
                  <code className="cc-cookie-item__name">{cookie.name}</code>
                  <span className="cc-badge cc-badge--type">{cookie.type}</span>
                  <span className="cc-cookie-item__expiry">{cookie.expiry}</span>
                </div>
                <p className="cc-cookie-item__purpose">
                  <span className="cc-cookie-item__provider">{cookie.provider}:</span> {cookie.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};