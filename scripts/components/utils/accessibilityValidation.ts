/**
 * Accessibility validation utilities
 * Provides WCAG compliance validation for generated components
 */

// Interface for accessibility validation report
export interface AccessibilityReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  touchTargetViolations: string[];
  ariaIssues: string[];
  semanticIssues: string[];
}

/**
 * Validate accessibility compliance of generated component code
 * Checks for WCAG 2.1 AA compliance issues
 */
export function validateAccessibility(
  componentCode: string,
): AccessibilityReport {
  const report: AccessibilityReport = {
    isValid: true,
    errors: [],
    warnings: [],
    touchTargetViolations: [],
    ariaIssues: [],
    semanticIssues: [],
  };

  // Check for required ARIA labels
  if (
    !componentCode.includes("aria-label") &&
    !componentCode.includes("aria-labelledby")
  ) {
    report.ariaIssues.push("Missing ARIA labels for interactive elements");
  }

  // Check for form labels
  const hasFormFields =
    componentCode.includes("<input") ||
    componentCode.includes("<select") ||
    componentCode.includes("<textarea");
  if (hasFormFields && !componentCode.includes("<label")) {
    report.errors.push("Form fields missing associated labels");
  }

  // Check for aria-describedby on form fields with validation
  if (
    componentCode.includes("error") &&
    !componentCode.includes("aria-describedby")
  ) {
    report.ariaIssues.push("Form fields with errors missing aria-describedby");
  }

  // Check for live regions
  if (componentCode.includes("error") && !componentCode.includes("aria-live")) {
    report.warnings.push("Dynamic error messages should use aria-live regions");
  }

  // Check for keyboard navigation
  if (
    componentCode.includes("onClick") &&
    !componentCode.includes("onKeyDown")
  ) {
    report.warnings.push(
      "Interactive elements should support keyboard navigation",
    );
  }

  // Check for semantic HTML
  if (
    componentCode.includes("<div") &&
    componentCode.includes("onClick") &&
    !componentCode.includes("role=") &&
    !componentCode.includes("<button")
  ) {
    report.semanticIssues.push(
      "Interactive divs should use semantic button elements or roles",
    );
  }

  // Check for heading hierarchy
  const headingMatches = componentCode.match(/<h([1-6])/g);
  if (headingMatches) {
    const headingLevels = headingMatches.map((match) =>
      parseInt(match.charAt(2)),
    );
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] - headingLevels[i - 1] > 1) {
        report.semanticIssues.push("Heading levels should not skip (h1 -> h3)");
        break;
      }
    }
  }

  // Check for alt text on images
  if (componentCode.includes("<img") && !componentCode.includes("alt=")) {
    report.errors.push("Images missing alt attributes");
  }

  // Check for focus management
  if (
    componentCode.includes("useEffect") &&
    componentCode.includes("errors") &&
    !componentCode.includes("focus()")
  ) {
    report.warnings.push("Forms with validation should manage focus on errors");
  }

  // Determine overall validity
  report.isValid = report.errors.length === 0;

  return report;
}

/**
 * Validate touch target compliance
 * Ensures interactive elements meet minimum size requirements
 */
export function validateTouchTargets(componentCode: string): string[] {
  const violations: string[] = [];

  // Check for button sizes
  if (componentCode.includes("<button") || componentCode.includes("<Button")) {
    if (
      !componentCode.includes("min-height") &&
      !componentCode.includes("touch-target")
    ) {
      violations.push("Buttons should have minimum 44px touch targets");
    }
  }

  // Check for input field sizes
  if (componentCode.includes("<input") || componentCode.includes("<Input")) {
    if (
      !componentCode.includes("min-height") &&
      !componentCode.includes("py-2")
    ) {
      violations.push(
        "Input fields should have adequate padding for touch targets",
      );
    }
  }

  // Check for link sizes
  if (componentCode.includes("<a ") || componentCode.includes("<Link")) {
    if (
      !componentCode.includes("min-height") &&
      !componentCode.includes("p-2")
    ) {
      violations.push("Links should have adequate padding for touch targets");
    }
  }

  // Check for spacing between interactive elements
  if (componentCode.includes("space-x-1") || componentCode.includes("gap-1")) {
    violations.push("Interactive elements should have at least 8px spacing");
  }

  return violations;
}

/**
 * Validate ARIA relationships and attributes
 * Ensures proper ARIA implementation
 */
export function validateAriaRelationships(componentCode: string): string[] {
  const issues: string[] = [];

  // Check for orphaned ARIA attributes
  if (componentCode.includes("aria-describedby")) {
    const describedByMatches = componentCode.match(
      /aria-describedby="([^"]+)"/g,
    );
    if (describedByMatches) {
      describedByMatches.forEach((match) => {
        const id = match.match(/"([^"]+)"/)?.[1];
        if (id && !componentCode.includes(`id="${id}"`)) {
          issues.push(`aria-describedby references non-existent ID: ${id}`);
        }
      });
    }
  }

  // Check for labelledby relationships
  if (componentCode.includes("aria-labelledby")) {
    const labelledByMatches = componentCode.match(/aria-labelledby="([^"]+)"/g);
    if (labelledByMatches) {
      labelledByMatches.forEach((match) => {
        const id = match.match(/"([^"]+)"/)?.[1];
        if (id && !componentCode.includes(`id="${id}"`)) {
          issues.push(`aria-labelledby references non-existent ID: ${id}`);
        }
      });
    }
  }

  // Check for required ARIA properties on custom roles
  if (
    componentCode.includes('role="button"') &&
    !componentCode.includes("aria-pressed") &&
    !componentCode.includes("aria-expanded")
  ) {
    issues.push("Custom button roles may need aria-pressed or aria-expanded");
  }

  // Check for ARIA hidden on focusable elements
  if (
    componentCode.includes('aria-hidden="true"') &&
    (componentCode.includes("tabIndex") || componentCode.includes("onClick"))
  ) {
    issues.push("Focusable elements should not be aria-hidden");
  }

  // Check for proper form field relationships
  if (componentCode.includes("<input") && componentCode.includes("<label")) {
    const hasFor =
      componentCode.includes("htmlFor=") || componentCode.includes("for=");
    const hasAriaLabel =
      componentCode.includes("aria-label=") ||
      componentCode.includes("aria-labelledby=");

    if (!hasFor && !hasAriaLabel) {
      issues.push(
        "Form inputs should be associated with labels via htmlFor or ARIA",
      );
    }
  }

  return issues;
}
