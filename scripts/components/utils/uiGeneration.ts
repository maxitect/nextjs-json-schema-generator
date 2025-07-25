/**
 * UI generation utilities and helpers
 * Provides functions for generating UI component structures and index files
 */

import { writeAndFormatFile } from "../../lib/fileSystem";
import { generateFileHeader } from "../../lib/template";
import {
  toSingularCamelCase,
  toSingularPascalCase,
} from "../../lib/stringTransforms";

// Generate component index file for a table's components
export async function generateComponentIndex(
  tableName: string,
  exports: string[],
): Promise<void> {
  const fileName = toSingularCamelCase(tableName);
  let content = generateFileHeader(
    `${toSingularPascalCase(tableName)} component exports`,
  );

  content += "// Export all generated components for this entity\n";
  exports.forEach((exportName) => {
    content += `export { default as ${exportName} } from './${exportName}';\n`;
  });

  // Add a barrel export for convenience
  content += "\n// Convenience re-exports\n";
  content += `export * from './${toSingularPascalCase(tableName)}Form';\n`;
  content += `export * from './${toSingularPascalCase(tableName)}Table';\n`;

  await writeAndFormatFile(`./src/components/${fileName}/index.ts`, content);
}

// Generate section headers for forms with proper semantic structure
export function generateSectionHeaders(sections: {
  [section: string]: string[];
}): string {
  const sectionElements: string[] = [];

  Object.entries(sections).forEach(([sectionName, fields]) => {
    if (sectionName === "General" && Object.keys(sections).length === 1) {
      // Single general section doesn't need a header
      sectionElements.push(`      <div className="space-y-4">
${fields.join("\n")}
      </div>`);
    } else {
      // Use fieldset for semantic grouping
      sectionElements.push(`      <fieldset className="border rounded-lg p-4">
        <legend className="text-lg font-semibold px-2">${sectionName}</legend>
        <div className="space-y-4">
${fields.join("\n")}
        </div>
      </fieldset>`);
    }
  });

  return sectionElements.join("\n");
}

// Generate field sections with proper organization
export function generateFieldSections(
  fields: Array<{ section: string; component: string }>,
): { [section: string]: string[] } {
  const sections: { [section: string]: string[] } = {};

  fields.forEach(({ section, component }) => {
    const sectionKey = section || "General";

    if (!sections[sectionKey]) {
      sections[sectionKey] = [];
    }
    sections[sectionKey].push(component);
  });

  return sections;
}

// Generate responsive grid layout for forms
export function generateGridLayout(
  fields: string[],
  gridCols: number = 2,
): string {
  const gridClass = `grid grid-cols-1 md:grid-cols-${gridCols} gap-4`;

  return `      <div className="${gridClass}">
${fields.join("\n")}
      </div>`;
}

// Generate form actions with consistent styling
export function generateFormActions(
  entityName: string,
  hasCancel: boolean = true,
  hasDelete: boolean = false,
): string {
  const actions: string[] = [];

  if (hasCancel) {
    actions.push(`        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>`);
  }

  if (hasDelete) {
    actions.push(`        <Button
          type="button"
          variant="destructive"
          onClick={() => onDelete?.()}
          disabled={isLoading}
        >
          Delete ${entityName}
        </Button>`);
  }

  actions.push(`        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
          loading={isSubmitting || isLoading}
        >
          {initialData ? 'Update' : 'Create'} ${entityName}
        </Button>`);

  return `      <div className="flex justify-end space-x-4">
${actions.join("\n")}
      </div>`;
}

// Generate table pagination controls
export function generatePaginationControls(): string {
  return `      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            className="h-8 w-[70px] rounded border border-gray-300 text-sm"
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {"<<"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {"<"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {">"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {">>"}
            </Button>
          </div>
        </div>
      </div>`;
}

// Generate table search and filter controls
export function generateTableFilters(searchColumn: string = "name"): string {
  return `      {/* Search and filters */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search..."
          value={(table.getColumn("${searchColumn}")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("${searchColumn}")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="text-sm text-gray-500">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      </div>`;
}

// Generate loading states for components
export function generateLoadingState(
  type: "form" | "table",
  message?: string,
): string {
  if (type === "table") {
    return `            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  ${message || "Loading..."}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (`;
  }

  return `      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-2">${message || "Loading..."}</span>
        </div>
      )}`;
}

// Generate empty states for components
export function generateEmptyState(
  type: "form" | "table",
  entityName: string,
): string {
  if (type === "table") {
    return `              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No ${entityName.toLowerCase()} found.
                </TableCell>
              </TableRow>`;
  }

  return `      <div className="text-center p-8">
        <p className="text-gray-500">No ${entityName.toLowerCase()} data available.</p>
      </div>`;
}

// Generate responsive breakpoints helper
export function generateResponsiveClasses(
  mobile: string,
  tablet?: string,
  desktop?: string,
): string {
  let classes = mobile;
  if (tablet) classes += ` md:${tablet}`;
  if (desktop) classes += ` lg:${desktop}`;
  return classes;
}
