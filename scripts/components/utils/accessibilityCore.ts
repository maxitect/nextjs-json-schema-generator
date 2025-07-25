/**
 * Core accessibility utilities for form generation
 * Provides functions for ID generation, ARIA attribute management, and context creation
 */

import { TableConfig } from "../../lib/config";

// Interface for accessible field configuration
export interface AccessibleFieldConfig {
  fieldId: string;
  labelId: string;
  errorId: string;
  helpId: string;
  ariaDescribedBy: string[];
  touchTargetCompliant: boolean;
  semanticRole?: string;
}

// Interface for form accessibility context
export interface FormAccessibilityContext {
  formId: string;
  fieldIds: Map<string, AccessibleFieldConfig>;
  liveRegionIds: string[];
  focusManagementRequired: boolean;
  touchTargetViolations: string[];
  semanticStructure: {
    fieldsets: Array<{
      legend: string;
      fields: string[];
    }>;
  };
}

/**
 * Generate unique IDs for form elements
 * Ensures consistent ID generation across form components
 */
export function generateFieldIds(
  fieldName: string,
  formId: string,
): AccessibleFieldConfig {
  const baseId = `${formId}-${fieldName}`;

  return {
    fieldId: `${baseId}-input`,
    labelId: `${baseId}-label`,
    errorId: `${baseId}-error`,
    helpId: `${baseId}-help`,
    ariaDescribedBy: [],
    touchTargetCompliant: true,
    semanticRole: undefined,
  };
}

/**
 * Create ARIA describedby strings from array of IDs
 * Handles conditional inclusion of error and help text IDs
 */
export function buildAriaDescribedBy(ids: string[]): string {
  return ids.filter(Boolean).join(" ");
}

/**
 * Generate focus management hooks for form components
 * Creates React hooks for managing focus on validation errors
 */
export function generateFocusManagement(fields: string[]): string {
  return `
  // Focus management for validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      const element = document.getElementById(\`\${firstErrorField}-input\`);
      element?.focus();
      
      // Announce error count to screen readers
      setErrorAnnouncement(\`\${Object.keys(errors).length} validation error\${Object.keys(errors).length > 1 ? 's' : ''} found\`);
    }
  }, [errors]);`;
}

/**
 * Create live region announcements for form state changes
 * Generates aria-live regions for dynamic content updates
 */
export function generateLiveRegions(formType: string): string {
  return `
  // Live regions for dynamic announcements
  const [errorAnnouncement, setErrorAnnouncement] = useState('');
  const [successAnnouncement, setSuccessAnnouncement] = useState('');
  
  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id={\`\${formId}-status\`}
      >
        {errorAnnouncement}
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id={\`\${formId}-success\`}
      >
        {successAnnouncement}
      </div>
    </>
  );`;
}

/**
 * Generate touch-target compliant CSS classes
 * Ensures minimum 44px touch targets per WCAG 2.1 AA
 */
export function generateTouchTargetClasses(): string {
  return `
// Touch target compliance classes
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 8px 12px;
}

.touch-target-small {
  min-height: 32px;
  min-width: 32px;
  padding: 4px 8px;
}

// Ensure adequate spacing between touch targets
.touch-target + .touch-target {
  margin-left: 8px;
}

.touch-target-row .touch-target {
  margin-bottom: 8px;
}`;
}

/**
 * Generate motion-safe CSS classes for reduced motion preferences
 * Respects prefers-reduced-motion media query
 */
export function generateMotionSafeClasses(): string {
  return `
// Motion-safe animations
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

// Safe animations for form interactions
.form-field-enter {
  animation: form-field-slide-in 0.2s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .form-field-enter {
    animation: none;
    opacity: 1;
  }
}

@keyframes form-field-slide-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`;
}

/**
 * Create form accessibility context with proper semantic structure
 * Initializes accessibility state for complex forms
 */
export function createFormAccessibilityContext(
  table: TableConfig,
  formId: string,
): FormAccessibilityContext {
  const fieldIds = new Map<string, AccessibleFieldConfig>();
  const fieldsets: Array<{ legend: string; fields: string[] }> = [];

  // Group fields by section for semantic structure
  const sections: { [key: string]: string[] } = {};

  Object.entries(table.columns).forEach(([fieldName, config]) => {
    const ui = config.ui || {};
    const section = ui.section || "General";

    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(fieldName);

    // Generate field IDs
    const fieldConfig = generateFieldIds(fieldName, formId);
    fieldIds.set(fieldName, fieldConfig);
  });

  // Convert sections to fieldsets
  Object.entries(sections).forEach(([legend, fields]) => {
    fieldsets.push({ legend, fields });
  });

  return {
    formId,
    fieldIds,
    liveRegionIds: [`${formId}-status`, `${formId}-success`],
    focusManagementRequired: true,
    touchTargetViolations: [],
    semanticStructure: {
      fieldsets,
    },
  };
}
