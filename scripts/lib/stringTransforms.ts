// String transformation utilities

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

export function toPascalCase(str: string): string {
  return str.replace(/(^|_)([a-z])/g, (_, __, letter) => letter.toUpperCase());
}

// Singularization utility for common English plurals
export function toSingular(str: string): string {
  // Handle common irregular plurals
  const irregulars: Record<string, string> = {
    people: "person",
    children: "child",
    feet: "foot",
    teeth: "tooth",
    geese: "goose",
    mice: "mouse",
    men: "man",
    women: "woman",
  };

  const lower = str.toLowerCase();
  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // Handle regular plurals
  if (str.endsWith("ies")) {
    return str.slice(0, -3) + "y"; // amenities -> amenity
  }
  if (str.endsWith("ves")) {
    return str.slice(0, -3) + "f"; // lives -> life
  }
  if (
    str.endsWith("es") &&
    (str.endsWith("ches") ||
      str.endsWith("shes") ||
      str.endsWith("xes") ||
      str.endsWith("zes"))
  ) {
    return str.slice(0, -2); // boxes -> box, dishes -> dish
  }
  if (str.endsWith("s") && !str.endsWith("ss")) {
    return str.slice(0, -1); // users -> user, bookings -> booking
  }

  return str; // Already singular or unknown pattern
}

// Convert table name to singular Pascal case for types
export function toSingularPascalCase(tableName: string): string {
  return toPascalCase(toSingular(tableName));
}

// Convert table name to singular camel case
export function toSingularCamelCase(tableName: string): string {
  return toCamelCase(toSingular(tableName));
}

export function toKebabCase(str: string): string {
  return str.replace(/_/g, "-");
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
