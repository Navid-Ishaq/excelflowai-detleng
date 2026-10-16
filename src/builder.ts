import { type Source, type Mapping } from "./domain";
export type Field = {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "list";
  role: string;
  required: boolean;
  options: string;
};
export const modelNames = [
  "Sales & Orders",
  "Products & Stock",
  "Customers / Buyers",
  "Suppliers / Purchases",
  "Business Transactions",
  "Complete Business Workbook",
  "Custom Workbook",
];
const field = (
  name: string,
  type: Field["type"] = "text",
  role = "",
): Field => ({
  id: crypto.randomUUID(),
  name,
  type,
  role,
  required: !!role && ["Date", "Amount"].includes(role),
  options: "",
});
export function fieldsFor(model: string): Field[] {
  const base = [
    field("Date", "date", "Date"),
    field("Reference", "text", "Reference"),
    field("Description", "text", "Description"),
    field("Category", "list", "Category"),
    field("Amount", "number", "Amount"),
    field("Currency", "list", "Currency"),
    field("Notes", "text", "Notes"),
  ];
  if (model === "Custom Workbook")
    return [field("Name"), field("Value", "number")];
  if (model === "Sales & Orders")
    base.splice(
      4,
      0,
      field("Customer"),
      field("Product / Service"),
      field("Quantity", "number"),
      field("Unit Price", "number"),
      field("Sales Channel", "list"),
    );
  if (model === "Products & Stock")
    base.splice(
      4,
      0,
      field("SKU"),
      field("Product / Service"),
      field("Quantity", "number"),
      field("Movement", "list"),
    );
  if (model === "Customers / Buyers")
    base.splice(4, 0, field("Customer"), field("Region", "list"));
  if (model === "Suppliers / Purchases")
    base.splice(
      4,
      0,
      field("Supplier"),
      field("Product / Service"),
      field("Quantity", "number"),
    );
  if (model === "Complete Business Workbook")
    base.splice(
      4,
      0,
      field("Transaction Type", "list"),
      field("Counterparty"),
      field("Product / Service"),
      field("Quantity", "number"),
      field("Unit Price", "number"),
      field("Payment Method", "list"),
      field("Region", "list"),
      field("Sales Channel", "list"),
      field("Bank Balance", "number", "Balance"),
    );
  for (const f of base) {
    if (f.name === "Category")
      f.options = "Sales,Services,Supplies,Rent,Operations";
    if (f.name === "Currency") f.options = "EUR,USD,GBP";
    if (f.name === "Region") f.options = "North,South,East,West";
    if (f.name === "Sales Channel") f.options = "Online,Store,Partner";
    if (f.name === "Payment Method") f.options = "Bank transfer,Card,Cash";
    if (f.name === "Transaction Type") f.options = "Sale,Purchase";
    if (f.name === "Movement") f.options = "Received,Issued";
  }
  return base;
}
export type BuildSettings = {
  model: string;
  fields: Field[];
  count: number;
  filename: string;
  currency: string;
  months: number;
  start: string;
  end: string;
  dateFormat: string;
  numberStyle: "point" | "comma";
};
export function validateBuild(s: BuildSettings) {
  if (!s.fields.length || s.fields.length > 100)
    throw Error("Choose between one and one hundred fields.");
  const names = s.fields.map((f) => f.name.trim().toLowerCase());
  if (names.some((n) => !n) || new Set(names).size !== names.length)
    throw Error("Field headings must be non-empty and unique.");
  for (const f of s.fields) {
    if (["Amount", "Balance"].includes(f.role) && f.type !== "number")
      throw Error("Amount and Balance require a number field.");
    if (f.role === "Date" && f.type !== "date")
      throw Error("Date requires a date field.");
  }
  const roles = s.fields.map((f) => f.role).filter(Boolean);
  if (new Set(roles).size !== roles.length)
    throw Error("Assign each reporting role once.");
  if (!Number.isInteger(s.count) || s.count < 1 || s.count > 5000)
    throw Error("Choose a row capacity between one and five thousand.");
  if (!/^[A-Z]{3}$/.test(s.currency))
    throw Error("Use a three-letter currency code.");
  if (
    s.months === 0 &&
    (!s.start ||
      !s.end ||
      s.start > s.end ||
      !Number.isFinite(Date.parse(s.start)) ||
      !Number.isFinite(Date.parse(s.end)))
  )
    throw Error("Choose a valid sample date range.");
}
export function sampleSource(s: BuildSettings, blank = false): Source {
  validateBuild(s);
  const mapping: Mapping = {};
  s.fields.forEach((f, i) => {
    if (f.role) mapping[f.role as keyof Mapping] = i;
  });
  const now = new Date(),
    end = s.months
      ? new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0))
      : new Date(s.end + "T00:00:00Z"),
    start = s.months
      ? new Date(Date.UTC(now.getFullYear(), now.getMonth() - s.months + 1, 1))
      : new Date(s.start + "T00:00:00Z");
  let balance = 12000;
  const rows: Source["rows"] = [s.fields.map((f) => f.name)];
  if (!blank)
    for (let i = 0; i < s.count; i++) {
      const quantity = 1 + (i % 8),
        unit = 15.25 + (i % 19) * 7.5,
        negative =
          s.model === "Suppliers / Purchases" ||
          (s.model !== "Sales & Orders" && i % 3 === 0),
        amount =
          (Math.round(quantity * unit * 100) / 100) * (negative ? -1 : 1);
      balance = Math.round((balance + amount) * 100) / 100;
      rows.push(
        s.fields.map((f) => {
          const name = f.name.toLowerCase();
          if (f.role === "Date" || f.type === "date")
            return new Date(
              +start +
                Math.floor(((+end - +start) * i) / Math.max(s.count - 1, 1)),
            )
              .toISOString()
              .slice(0, 10);
          if (f.role === "Amount") return amount;
          if (f.role === "Balance") return balance;
          if (f.role === "Currency") return s.currency;
          if (f.role === "Reference")
            return `EF-${String(i + 1).padStart(6, "0")}`;
          if (f.role === "Description")
            return negative
              ? "Synthetic operating payment"
              : "Synthetic business receipt";
          if (f.role === "Notes")
            return "Synthetic example — not a real transaction";
          if (name.includes("quantity")) return quantity;
          if (name.includes("unit price")) return unit;
          if (name === "transaction type")
            return negative ? "Purchase" : "Sale";
          if (name.includes("product"))
            return ["Notebook", "Desk lamp", "Service package", "Storage box"][
              i % 4
            ];
          if (name.includes("customer") || name.includes("counterparty"))
            return `Example Company ${1 + (i % 24)}`;
          if (name.includes("supplier"))
            return `Sample Supplier ${1 + (i % 12)}`;
          if (name.includes("sku")) return `SKU-${1 + (i % 4)}`;
          if (f.type === "list")
            return (
              f.options
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)[
                i % Math.max(f.options.split(",").length, 1)
              ] || "Example"
            );
          if (f.type === "number") return i + 1;
          return `Sample ${i + 1}`;
        }),
      );
    }
  return {
    name: s.filename || "excelflow-sample.xlsx",
    sheet: "Workbook Data",
    sheets: ["Workbook Data"],
    header: 0,
    rows,
    mapping,
    numberStyle: s.numberStyle,
    dateOrder: s.dateFormat.startsWith("yyyy")
      ? "YMD"
      : s.dateFormat.startsWith("mm")
        ? "MDY"
        : "DMY",
    recognized: true,
  };
}
