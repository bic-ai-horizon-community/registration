import type { Registration, FormField } from "../types";

export const exportToCsv = (registrations: Registration[], fields: FormField[], filename = "registrations.csv") => {
  const headers = [
    "ID",
    ...fields.map(f => f.label),
    "Present",
    "Checked In At",
    "Registered At"
  ].map(header => `"${String(header).replace(/"/g, '""')}"`);

  const csvRows = [headers.join(",")];

  for (const row of registrations) {
    const values = [
      row.id,
      ...fields.map(f => String(row.responses[f.id] || '')),
      row.present ? "Yes" : "No",
      row.checkedInAt ? new Date(row.checkedInAt).toLocaleString() : "N/A",
      row.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A"
    ].map(value => `"${String(value).replace(/"/g, '""')}"`);
    
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (registrations: Registration[], fields: FormField[], filename = "registrations.xlsx") => {
  // A simple fallback to CSV if no Excel library is present
  exportToCsv(registrations, fields, filename.replace('.xlsx', '.csv'));
};

