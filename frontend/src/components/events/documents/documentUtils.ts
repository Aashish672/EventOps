export type DocumentCategory = "pdf" | "sheet" | "image" | "doc" | "link";

export interface DocumentTypeInfo {
  category: DocumentCategory;
  label: string;
  badgeClass: string;
  iconClass: string;
}

export function detectDocumentType(url: string, title?: string): DocumentTypeInfo {
  const target = (url || title || "").toLowerCase().split("?")[0].split("#")[0];

  if (target.endsWith(".pdf")) {
    return {
      category: "pdf",
      label: "PDF",
      badgeClass: "doc-badge-pdf",
      iconClass: "doc-icon-pdf",
    };
  }

  if (
    target.endsWith(".xlsx") ||
    target.endsWith(".xls") ||
    target.endsWith(".csv") ||
    target.includes("sheet") ||
    target.includes("spreadsheets")
  ) {
    return {
      category: "sheet",
      label: "Spreadsheet",
      badgeClass: "doc-badge-sheet",
      iconClass: "doc-icon-sheet",
    };
  }

  if (
    target.endsWith(".png") ||
    target.endsWith(".jpg") ||
    target.endsWith(".jpeg") ||
    target.endsWith(".webp") ||
    target.endsWith(".svg") ||
    target.endsWith(".gif")
  ) {
    return {
      category: "image",
      label: "Image",
      badgeClass: "doc-badge-image",
      iconClass: "doc-icon-image",
    };
  }

  if (
    target.endsWith(".doc") ||
    target.endsWith(".docx") ||
    target.endsWith(".txt") ||
    target.endsWith(".rtf")
  ) {
    return {
      category: "doc",
      label: "Document",
      badgeClass: "doc-badge-generic",
      iconClass: "doc-icon-wrap",
    };
  }

  return {
    category: "link",
    label: "Link / File",
    badgeClass: "doc-badge-generic",
    iconClass: "doc-icon-link",
  };
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
