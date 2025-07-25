/**
 * Accessibility testing documentation generator
 * Creates comprehensive testing checklists and documentation
 */

/**
 * Generate accessibility testing documentation and checklists
 * Creates comprehensive testing guides for manual and automated testing
 */
export function generateAccessibilityTestingDocs(
  componentName: string,
): string {
  return `
# Accessibility Testing Guide for ${componentName}

## Automated Testing Checklist

### WCAG 2.1 AA Compliance
- [ ] Run axe-core accessibility scanner
- [ ] Validate with WAVE browser extension  
- [ ] Test with Pa11y CLI tool
- [ ] Verify Lighthouse accessibility score ≥ 90

### Code Analysis
- [ ] All interactive elements have accessible names
- [ ] Form fields have associated labels
- [ ] Images have appropriate alt text
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] Color contrast meets 4.5:1 ratio minimum
- [ ] Focus indicators are visible and clear

## Manual Testing Checklist

### Keyboard Navigation
- [ ] Tab through all interactive elements in logical order
- [ ] Enter/Space activates buttons and links
- [ ] Arrow keys work in menus and lists
- [ ] Escape closes modals and dropdowns
- [ ] Focus is never trapped unexpectedly
- [ ] Skip links function correctly

### Screen Reader Testing
Test with at least one screen reader (NVDA, JAWS, or VoiceOver):
- [ ] All content is announced clearly
- [ ] Form fields announce labels and validation
- [ ] Button purposes are clear
- [ ] Navigation landmarks are announced
- [ ] Live regions announce dynamic changes
- [ ] Tables have proper headers announced

### Visual Testing
- [ ] Component works at 200% zoom
- [ ] Text reflows properly at high zoom levels
- [ ] Focus indicators are clearly visible
- [ ] Color is not the only way to convey information
- [ ] Content adapts to high contrast mode
- [ ] Animations respect prefers-reduced-motion

### Touch/Mobile Testing
- [ ] Touch targets are at least 44px × 44px
- [ ] Adequate spacing between interactive elements (8px minimum)
- [ ] Component works with voice input
- [ ] Gestures have keyboard equivalents
- [ ] Pinch-to-zoom functions correctly

## Browser/Device Testing Matrix

### Desktop Browsers
- [ ] Chrome + NVDA
- [ ] Firefox + NVDA  
- [ ] Safari + VoiceOver
- [ ] Edge + JAWS

### Mobile Devices
- [ ] iOS Safari + VoiceOver
- [ ] Android Chrome + TalkBack
- [ ] Mobile keyboard navigation
- [ ] Voice input (iOS/Android)

## Component-Specific Tests

### Form Components
- [ ] Validation errors are announced to screen readers
- [ ] Focus moves to first error field on submission
- [ ] Required fields are clearly indicated
- [ ] Field instructions are associated via aria-describedby
- [ ] Error recovery is straightforward

### Table Components
- [ ] Column headers are properly associated
- [ ] Sortable columns announce sort direction
- [ ] Table pagination is keyboard accessible
- [ ] Table caption describes the data

### Interactive Components
- [ ] State changes are announced (expanded/collapsed)
- [ ] Loading states are communicated
- [ ] Success/error messages are announced
- [ ] Progressive disclosure is accessible

## Testing Tools and Commands

### Automated Tools
\`\`\`bash
# Install testing dependencies
npm install --save-dev @axe-core/react axe-playwright pa11y

# Run Pa11y tests
pa11y http://localhost:3000/${componentName.toLowerCase()}

# Run axe tests in Jest
npm test -- --testNamePattern="accessibility"
\`\`\`

### Manual Testing Setup
\`\`\`bash
# Install screen reader testing
# NVDA (Windows): https://www.nvaccess.org/download/
# VoiceOver (Mac): Built-in
# Orca (Linux): sudo apt install orca

# Browser extensions
# axe DevTools: Chrome/Firefox extension
# WAVE: https://wave.webaim.org/extension/
\`\`\`

## Common Issues and Solutions

### Focus Management
**Issue**: Focus lost after dynamic content updates
**Solution**: Use focus management hooks, move focus to relevant element

### ARIA Relationships  
**Issue**: Screen readers don't announce field errors
**Solution**: Use aria-describedby to connect fields with error messages

### Touch Targets
**Issue**: Buttons too small on mobile
**Solution**: Ensure minimum 44px × 44px touch targets with adequate spacing

### Color Contrast
**Issue**: Low contrast text fails WCAG requirements
**Solution**: Use color palette that meets 4.5:1 contrast ratio minimum

## Testing Documentation

### Test Results Template
\`\`\`markdown
## ${componentName} Accessibility Test Results

**Date**: [YYYY-MM-DD]
**Tester**: [Name]
**Tools Used**: [axe-core, NVDA, etc.]

### Automated Test Results
- axe-core: [PASS/FAIL] - [X violations found]
- Lighthouse: [Score]/100
- Pa11y: [PASS/FAIL] - [X issues found]

### Manual Test Results
- Keyboard Navigation: [PASS/FAIL]
- Screen Reader: [PASS/FAIL] - [Screen reader used]
- Visual/Zoom: [PASS/FAIL]
- Touch Targets: [PASS/FAIL]

### Issues Found
1. [Description of issue]
   - Severity: [High/Medium/Low]
   - WCAG Criterion: [X.X.X]
   - Fix Required: [Yes/No]

### Recommendations
- [List of recommended improvements]
\`\`\`

## Maintenance

### Regular Testing Schedule
- [ ] Run automated tests in CI/CD pipeline
- [ ] Manual testing before each release
- [ ] Quarterly comprehensive accessibility audit
- [ ] Annual third-party accessibility assessment

### Updates Required
- [ ] Update tests when component API changes
- [ ] Review WCAG guidelines for updates (yearly)
- [ ] Update browser/screen reader testing matrix
- [ ] Validate new design system changes for accessibility

---

*This testing guide should be updated whenever the ${componentName} component is modified or when new accessibility requirements are identified.*
`;
}
