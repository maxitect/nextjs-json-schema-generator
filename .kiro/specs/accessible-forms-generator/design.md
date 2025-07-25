# Design Document

## Overview

This design outlines the technical approach for refactoring the forms generator to produce WCAG 2.2 AA compliant React form components. The solution maintains the existing JSON-driven architecture while completely overhauling the generated component structure to prioritize accessibility, semantic HTML, and inclusive user experience.

The design focuses on generating form components that work seamlessly with assistive technologies, provide proper keyboard navigation, meet touch target requirements, and handle dynamic content announcements appropriately.

## Architecture

### Current vs. Proposed Architecture

**Current Flow:**

```
JSON Schema → forms.ts generator → Non-semantic components with accessibility violations
```

**Proposed Flow:**

```
JSON Schema → Enhanced forms.ts generator → Accessible semantic components with ARIA support
```

### Key Architectural Changes

1. **Semantic HTML First**: Replace div-based layouts with fieldset/legend structures
2. **Accessibility-First Generation**: Every generated element includes proper ARIA attributes by default
3. **Focus Management System**: Built-in focus management for validation and form state changes
4. **Live Region Integration**: Automatic live region setup for dynamic content announcements
5. **Touch Target Compliance**: Automatic sizing and spacing to meet WCAG 2.2 requirements

## Components and Interfaces

### Enhanced Form Field Generator

The core `generateFormField` function will be completely rewritten to produce accessible field components:

```typescript
interface FieldConfig {
  fieldId: string;
  labelId: string;
  errorId: string;
  helpId: string;
  ariaDescribedBy: string[];
  touchTargetCompliant: boolean;
  semanticRole?: string;
}

function generateFormField(
  columnName: string,
  columnConfig: any,
  enums: EnumsConfig,
  fieldConfig: FieldConfig
): string;
```

### Form Component Structure

Generated form components will follow this semantic structure and shall not have any div wrapper:

```typescript
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Screen reader announcements */}
  <div aria-live="polite" className="sr-only" id="form-status">
    {statusMessage}
  </div>

  {/* Form sections as fieldsets */}
  <fieldset className="space-y-4">
    <legend className="text-lg font-semibold">Section Name</legend>
    {/* Accessible form fields */}
  </fieldset>

  {/* Action buttons with proper spacing */}
  <div className="flex gap-4 justify-end">
    {/* Touch-target compliant buttons */}
  </div>
</form>
```

### Accessibility Utilities

New utility functions will be added to support accessibility features:

```typescript
// Generate unique IDs for form elements
function generateFieldIds(
  fieldName: string,
  formId: string
): AccessibleFieldConfig;

// Create ARIA describedby strings
function buildAriaDescribedBy(ids: string[]): string;

// Generate focus management hooks
function generateFocusManagement(fields: string[]): string;

// Create live region announcements
function generateLiveRegions(formType: string): string;
```

## Data Models

### Enhanced Column Configuration

The existing column configuration will be extended to support accessibility metadata:

```typescript
interface AccessibleColumnConfig extends ColumnConfig {
  accessibility?: {
    role?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string[];
    landmark?: boolean;
    announceChanges?: boolean;
    customValidationMessage?: string;
  };
  touchTarget?: {
    minSize?: number;
    spacing?: number;
    priority?: "high" | "medium" | "low";
  };
}
```

### Form Generation Context

A new context object will track accessibility requirements during generation:

```typescript
interface FormAccessibilityContext {
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
```

## Error Handling

### Accessible Error Management

Error handling will be completely redesigned to meet accessibility standards:

1. **Error Association**: All errors will be programmatically associated with their fields using `aria-describedby`
2. **Live Announcements**: Errors will be announced via `role="alert"` or `aria-live="assertive"`
3. **Focus Management**: Focus will automatically move to the first field with an error
4. **Specific Messages**: Generic error messages will be replaced with specific, actionable guidance

### Error Component Generation

```typescript
function generateErrorComponent(fieldName: string, errorId: string): string {
  return `
    {errors.${fieldName} && (
      <div id="${errorId}" className="label" role="alert">
        <span className="label-text-alt text-error">
          {errors.${fieldName}?.message}
        </span>
      </div>
    )}
  `;
}
```

## Testing Strategy

### Accessibility Testing Integration

The generator will include built-in accessibility testing capabilities:

1. **Static Analysis**: Generated components will be validated against WCAG criteria during generation
2. **ARIA Validation**: Automatic validation of ARIA attribute usage and relationships
3. **Touch Target Validation**: Automatic checking of minimum size requirements
4. **Semantic Structure Validation**: Verification of proper HTML semantics

### Testing Utilities

```typescript
// Validate generated component accessibility
function validateAccessibility(componentCode: string): AccessibilityReport;

// Check touch target compliance
function validateTouchTargets(componentCode: string): TouchTargetReport;

// Verify ARIA relationships
function validateAriaRelationships(componentCode: string): AriaReport;
```

### Manual Testing Guidelines

Generated components will include comments with manual testing instructions:

```typescript
/*
 * Accessibility Testing Checklist:
 * □ Screen reader navigation (NVDA, JAWS, VoiceOver)
 * □ Keyboard-only navigation
 * □ High contrast mode compatibility
 * □ Touch target size on mobile devices
 * □ Focus indicator visibility
 * □ Error announcement functionality
 */
```

## Implementation Details

### Field Type Mapping Enhancement

The existing field type mapping will be enhanced with accessibility considerations:

```typescript
interface FieldType {
  inputType: string;
  semanticRole?: string;
  ariaAttributes: Record<string, string>;
  keyboardBehavior: "standard" | "custom";
  touchTargetSize: number;
  focusManagement: "auto" | "manual";
}

function mapToFieldType(columnConfig: ColumnConfig): FieldType;
```

### Live Region Management

Automatic live region setup for dynamic content:

```typescript
function generateLiveRegionSetup(formType: string): string {
  return `
    // Live regions for dynamic announcements
    const [statusMessage, setStatusMessage] = useState('');
    const [errorAnnouncement, setErrorAnnouncement] = useState('');
    
    // Announce form state changes
    useEffect(() => {
      if (isSubmitting) {
        setStatusMessage('Submitting form data...');
      } else if (submitSuccess) {
        setStatusMessage('Form submitted successfully');
      }
    }, [isSubmitting, submitSuccess]);
  `;
}
```

### Focus Management Implementation

Focus management using react-focus-trap for proper accessibility:

```typescript
function generateFocusManagement(fields: string[]): string {
  return `
    import FocusTrap from 'focus-trap-react';
    
    // Focus management for validation errors
    useEffect(() => {
      if (Object.keys(errors).length > 0) {
        const firstErrorField = Object.keys(errors)[0];
        const element = document.getElementById(\`\${firstErrorField}-input\`);
        element?.focus();
        
        // Announce error count to screen readers
        setErrorAnnouncement(\`\${Object.keys(errors).length} validation error\${Object.keys(errors).length > 1 ? 's' : ''} found\`);
      }
    }, [errors]);
    
    // For modal forms, wrap in FocusTrap
    const FormWrapper = ({ children, isModal = false }) => {
      if (isModal) {
        return (
          <FocusTrap
            focusTrapOptions={{
              returnFocusOnDeactivate: true,
              allowOutsideClick: true,
            }}
          >
            {children}
          </FocusTrap>
        );
      }
      return children;
    };
  `;
}
```

### Touch Target Compliance

Automatic touch target size enforcement:

```typescript
function generateTouchTargetClasses(elementType: string): string {
  const baseClasses = "min-h-[24px] min-w-[24px]";
  const spacingClasses = "my-2"; // Minimum spacing between targets

  switch (elementType) {
    case "button":
      return `${baseClasses} px-4 py-2 ${spacingClasses}`;
    case "input":
      return `${baseClasses} p-3 ${spacingClasses}`;
    case "select":
      return `${baseClasses} p-2 ${spacingClasses}`;
    default:
      return `${baseClasses} ${spacingClasses}`;
  }
}
```

## Migration Strategy

None required, reset all functions and components.

## Performance Considerations

### Bundle Size Impact

Accessibility enhancements will have minimal impact on bundle size:

- ARIA attributes add negligible overhead
- Focus management hooks are lightweight
- Live regions use existing React state management

### Runtime Performance

- Focus management uses efficient DOM queries with caching
- Live region updates are debounced to prevent excessive announcements
- Touch target calculations are performed at build time, not runtime

## Security Considerations

### XSS Prevention

Generated components will include XSS protection:

- All dynamic content will be properly escaped
- ARIA attributes will be validated to prevent injection
- Error messages will be sanitized before display

### Content Security Policy

Generated components will be compatible with strict CSP policies:

- No inline styles or scripts
- All interactions use event handlers, not inline JavaScript
- ARIA attributes use only safe, validated values
