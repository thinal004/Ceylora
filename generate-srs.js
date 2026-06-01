const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, Header, Footer, LevelFormat, TableOfContents
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 100, bottom: 100, left: 150, right: 150 };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: "2E4057" })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: "2E4057" })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 23, font: "Arial", color: "048A81" })]
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text, font: "Arial", size: 22, ...opts })]
  });
}
function bullet(text, indent = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level: indent },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22 })]
  });
}
function soonBadge() {
  return new TextRun({ text: "  [AVAILABLE SOON]", font: "Arial", size: 18, bold: true, color: "CC6600" });
}
function pageBreak() {
  return new Paragraph({ pageBreakBefore: true, children: [new TextRun("")] });
}
function tHeader(cells, colWidths) {
  return new TableRow({
    tableHeader: true,
    children: cells.map((text, i) => new TableCell({
      borders, margins: cellMargins,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: "2E4057", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 20 })] })]
    }))
  });
}
function tRow(cells, colWidths, shade = false) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders, margins: cellMargins,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: shade ? "F5F5F5" : "FFFFFF", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20 })] })]
    }))
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "2E4057" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E4057" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: "Arial", color: "048A81" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E4057", space: 1 } },
          children: [
            new TextRun({ text: "Ceylora — Rent Management System  |  Software Requirements Specification", font: "Arial", size: 18, color: "666666" }),
            new TextRun({ text: "\t", font: "Arial", size: 18 }),
            new TextRun({ text: "v1.0  CONFIDENTIAL", font: "Arial", size: 18, bold: true, color: "CC0000" }),
          ],
          tabStops: [{ type: "right", position: 9360 }]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "2E4057", space: 1 } },
          children: [
            new TextRun({ text: "Ceylora Rent Management System  |  Page ", font: "Arial", size: 18, color: "666666" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "666666" }),
            new TextRun({ text: " of ", font: "Arial", size: 18, color: "666666" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: "666666" }),
          ]
        })]
      })
    },
    children: [

      // ── TITLE PAGE ──
      new Paragraph({ spacing: { before: 1440 }, children: [new TextRun("")] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: "Ceylora", font: "Arial", size: 80, bold: true, color: "2E4057" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: "Rent Management System", font: "Arial", size: 40, color: "048A81" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [new TextRun({ text: "Software Requirements Specification", font: "Arial", size: 30, bold: true, color: "333333" })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: "Version 1.0  |  June 2026", font: "Arial", size: 22, color: "888888" })]
      }),
      new Table({
        width: { size: 6000, type: WidthType.DXA },
        columnWidths: [2400, 3600],
        rows: [
          tRow(["Document Status", "Draft"], [2400, 3600], true),
          tRow(["Version", "1.0"], [2400, 3600], false),
          tRow(["Date", "June 2026"], [2400, 3600], true),
          tRow(["Platform", "Web — React + Supabase"], [2400, 3600], false),
          tRow(["Hosting", "Netlify (Frontend) + Supabase (Backend)"], [2400, 3600], true),
          tRow(["Currency", "LKR (multi-currency planned for future release)"], [2400, 3600], false),
          tRow(["Region", "Sri Lanka (multi-country planned for future release)"], [2400, 3600], true),
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "Note: Features marked ", font: "Arial", size: 18, color: "666666" }),
          new TextRun({ text: "[AVAILABLE SOON]", font: "Arial", size: 18, bold: true, color: "CC6600" }),
          new TextRun({ text: " are designed but not implemented in v1.0.", font: "Arial", size: 18, color: "666666" })]
      }),

      pageBreak(),

      // ── TABLE OF CONTENTS ──
      h1("Table of Contents"),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 1 — SYSTEM OVERVIEW
      // ══════════════════════════════════════════
      h1("1. System Overview"),
      p("The Ceylora Rent Management System is a cloud-based multi-tenant application designed to manage landlords, tenants, rental properties, lease agreements, rent collection, and related operations."),
      p("The system ensures complete tenant isolation — data belonging to one landlord can never be accessed by another landlord."),
      p(""),
      p("Key design principles:", { bold: true }),
      bullet("Multi-tenant architecture with strict data isolation per landlord"),
      bullet("Three-tier user hierarchy: Super Admin → Landlord → Tenant"),
      bullet("Role-Based Access Control (RBAC) enforced at both application and database level"),
      bullet("Currently optimized for Sri Lanka (LKR currency, NIC, districts) — multi-country and multi-currency support planned for future releases"),
      bullet("Modular design — future features (Lease Management, Maintenance, Reports) are architected but not yet active"),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 2 — MULTI-TENANT ARCHITECTURE
      // ══════════════════════════════════════════
      h1("2. Multi-Tenant Architecture"),

      h2("2.1 Tenant Definition"),
      p("In this system, each Landlord Account represents a separate tenant. Every landlord operates in a fully isolated data environment."),

      h2("2.2 Data Isolation Rules"),
      bullet("Each landlord shall have a unique Tenant ID"),
      bullet("All data (properties, units, tenancies, payments) shall be associated with a Tenant ID"),
      bullet("Users shall only access records belonging to their Tenant ID"),
      bullet("Cross-tenant data access shall be strictly prohibited"),
      bullet("All database queries shall be filtered by Tenant ID via Supabase Row-Level Security (RLS)"),
      bullet("Audit logs shall capture all tenant-related activities"),

      h2("2.3 Isolation Enforcement"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          tHeader(["Layer", "Enforcement Method"], [3000, 6360]),
          tRow(["Database", "Supabase Row-Level Security (RLS) policies on all tables"], [3000, 6360], false),
          tRow(["Application", "Role checks in React routes — users redirected if wrong role"], [3000, 6360], true),
          tRow(["API", "Supabase anon key + RLS — service role key never exposed to frontend"], [3000, 6360], false),
          tRow(["Storage", "Receipt files stored in paths scoped to tenancy ID"], [3000, 6360], true),
        ]
      }),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 3 — USER ROLES
      // ══════════════════════════════════════════
      h1("3. User Roles"),

      h2("3.1 Super Administrator"),
      p("The Super Administrator represents the software provider (Ceylora). There is one Super Admin account, seeded directly in the database — no public registration path exists for this role."),
      p(""),
      h3("Responsibilities"),
      bullet("Create landlord accounts"),
      bullet("Activate and deactivate landlord accounts"),
      bullet("View system-wide statistics and dashboards"),
      bullet("Manage subscription plans"),
      bullet("Reset landlord passwords"),
      bullet("View audit logs"),
      bullet("Configure global system settings"),
      bullet("Manage support requests"),
      p(""),
      h3("Restrictions"),
      bullet("Cannot modify landlord financial records"),
      bullet("Cannot create tenant records on behalf of landlords unless explicitly authorized"),
      bullet("Cannot access individual tenant data directly"),

      h2("3.2 Landlord"),
      p("A landlord manages their own rental business. Each landlord is created by the Super Admin — there is no public self-registration for landlords."),
      p(""),
      h3("Responsibilities"),
      bullet("Manage their own profile information"),
      bullet("Create and manage properties"),
      bullet("Create and manage units within their properties"),
      bullet("Create tenants and assign them to specific units"),
      bullet("Create lease agreements (available soon)"),
      bullet("Record and confirm rent payments"),
      bullet("View reports and dashboards"),
      p(""),
      h3("Restrictions"),
      bullet("Can only access their own data — full isolation from other landlords"),
      bullet("Cannot view other landlords' properties, tenants, or payments"),

      h2("3.3 Tenant"),
      p("A tenant is the renter occupying a unit. Tenants are created by the Landlord — there is no public self-registration for tenants."),
      p(""),
      h3("Responsibilities"),
      bullet("View lease information (available soon)"),
      bullet("Submit rent payment amount and upload receipt (for bank transfers)"),
      bullet("View payment history"),
      bullet("View upcoming rent dues"),
      bullet("Submit maintenance requests (available soon)"),
      bullet("Update personal profile information"),
      p(""),
      h3("Restrictions"),
      bullet("Cannot access landlord settings or admin panels"),
      bullet("Cannot access other tenants' information"),
      bullet("Cannot modify confirmed payment records"),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 4 — CORE MODULES
      // ══════════════════════════════════════════
      h1("4. Core Modules"),

      // 4.1
      h2("4.1 Landlord Management"),
      p("Created by: Super Administrator", { bold: true }),
      p(""),
      h3("Features"),
      bullet("Create landlord account (email, name, phone, NIC/Passport)"),
      bullet("Edit landlord details"),
      bullet("Suspend landlord account"),
      bullet("Activate/reactivate landlord account"),
      bullet("View full landlord list"),
      bullet("Search landlords by name or email"),
      p(""),
      h3("Landlord Fields"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3360],
        rows: [
          tHeader(["Field", "Required", "Notes"], [3000, 3000, 3360]),
          tRow(["Full Name", "Yes", ""], [3000, 3000, 3360], false),
          tRow(["Email Address", "Yes", "Used for login"], [3000, 3000, 3360], true),
          tRow(["Phone Number", "Yes", ""], [3000, 3000, 3360], false),
          tRow(["NIC / Passport Number", "Yes", "National Identity Card or Passport"], [3000, 3000, 3360], true),
          tRow(["Account Status", "Auto", "Active / Suspended"], [3000, 3000, 3360], false),
        ]
      }),

      // 4.2
      h2("4.2 Property Management"),
      p("Created by: Landlord", { bold: true }),
      p(""),
      h3("Features"),
      bullet("Create property"),
      bullet("Edit property details"),
      bullet("Delete property (blocked if active tenancies exist)"),
      bullet("Upload property images"),
      bullet("View property occupancy status"),
      p(""),
      h3("Property Fields"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3360],
        rows: [
          tHeader(["Field", "Required", "Notes"], [3000, 3000, 3360]),
          tRow(["Property Code", "Yes", "Auto-generated or manual"], [3000, 3000, 3360], false),
          tRow(["Property Name", "Yes", "e.g. Perera Residencies"], [3000, 3000, 3360], true),
          tRow(["Address", "Yes", ""], [3000, 3000, 3360], false),
          tRow(["City", "Yes", ""], [3000, 3000, 3360], true),
          tRow(["Country", "Yes", "Default: Sri Lanka — expandable"], [3000, 3000, 3360], false),
          tRow(["Property Type", "Yes", "e.g. Apartment, House, Commercial"], [3000, 3000, 3360], true),
          tRow(["Number of Units", "Auto", "Calculated from unit records"], [3000, 3000, 3360], false),
          tRow(["Status", "Auto", "Active / Inactive"], [3000, 3000, 3360], true),
        ]
      }),

      // 4.3
      h2("4.3 Unit Management"),
      p("Created by: Landlord", { bold: true }),
      p(""),
      h3("Features"),
      bullet("Create units under a property"),
      bullet("Assign tenants to units"),
      bullet("Track unit occupancy"),
      p(""),
      h3("Unit Fields"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3360],
        rows: [
          tHeader(["Field", "Required", "Notes"], [3000, 3000, 3360]),
          tRow(["Unit Number", "Yes", "e.g. Unit 3A, Room 2"], [3000, 3000, 3360], false),
          tRow(["Floor", "No", ""], [3000, 3000, 3360], true),
          tRow(["Monthly Rent (LKR)", "Yes", "Base rent amount"], [3000, 3000, 3360], false),
          tRow(["Electricity Charges", "No", "Fixed or metered"], [3000, 3000, 3360], true),
          tRow(["Water Charges", "No", "Fixed or metered"], [3000, 3000, 3360], false),
          tRow(["Deposit Amount", "No", "Security deposit"], [3000, 3000, 3360], true),
          tRow(["Status", "Auto", "Occupied / Vacant"], [3000, 3000, 3360], false),
        ]
      }),

      // 4.4
      h2("4.4 Tenant Management"),
      p("Created by: Landlord", { bold: true }),
      p(""),
      h3("Features"),
      bullet("Create tenant account"),
      bullet("Edit tenant details"),
      bullet("Activate / deactivate tenant"),
      bullet("Upload tenant documents and images"),
      bullet("View tenant payment history"),
      bullet("Add payments on behalf of tenant"),
      p(""),
      h3("Tenant Fields"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3360],
        rows: [
          tHeader(["Field", "Required", "Notes"], [3000, 3000, 3360]),
          tRow(["Tenant ID", "Auto", "System generated"], [3000, 3000, 3360], false),
          tRow(["Full Name", "Yes", ""], [3000, 3000, 3360], true),
          tRow(["NIC / Passport Number", "Yes", ""], [3000, 3000, 3360], false),
          tRow(["Mobile Number", "Yes", ""], [3000, 3000, 3360], true),
          tRow(["Email", "Yes", "Used for login"], [3000, 3000, 3360], false),
          tRow(["Address", "No", "Permanent address"], [3000, 3000, 3360], true),
          tRow(["Emergency Contact", "No", "Name and phone"], [3000, 3000, 3360], false),
        ]
      }),

      // 4.5
      h2("4.5 Lease Management"),
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({ text: "Status: ", font: "Arial", size: 22, bold: true }),
          new TextRun({ text: "NOT IMPLEMENTED IN v1.0 — AVAILABLE SOON", font: "Arial", size: 22, bold: true, color: "CC6600" }),
        ]
      }),
      p("The lease management module is designed and will be activated in a future release. The database schema supports it from day one."),
      p(""),
      h3("Planned Features"),
      bullet("Create lease agreement"),
      bullet("Renew lease"),
      bullet("Terminate lease"),
      bullet("Upload signed lease documents"),
      p(""),
      h3("Lease Fields (Planned)"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          tHeader(["Field", "Notes"], [3000, 6360]),
          tRow(["Lease Number", "Auto-generated"], [3000, 6360], false),
          tRow(["Property", "Linked to property"], [3000, 6360], true),
          tRow(["Unit", "Linked to unit"], [3000, 6360], false),
          tRow(["Tenant", "Linked to tenant"], [3000, 6360], true),
          tRow(["Start Date", ""], [3000, 6360], false),
          tRow(["End Date", ""], [3000, 6360], true),
          tRow(["Monthly Rent", "May differ from unit base rent"], [3000, 6360], false),
          tRow(["Security Deposit", ""], [3000, 6360], true),
          tRow(["Status", "Active / Expired / Terminated"], [3000, 6360], false),
        ]
      }),

      // 4.6
      h2("4.6 Rent Collection"),
      p("Created by: Tenant (submission) / Landlord (confirmation or manual entry)", { bold: true }),
      p(""),
      h3("Features"),
      bullet("Tenant submits payment with amount, date, and optional receipt upload"),
      bullet("Landlord confirms or rejects submitted payments"),
      bullet("Landlord can manually record a payment on behalf of a tenant"),
      bullet("Track outstanding balances per unit"),
      bullet("View payment history filtered by property, unit, month, year, or status"),
      p(""),
      h3("Payment Fields"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 3000, 3360],
        rows: [
          tHeader(["Field", "Required", "Notes"], [3000, 3000, 3360]),
          tRow(["Payment Reference", "Auto", "System generated"], [3000, 3000, 3360], false),
          tRow(["Payment Date", "Yes", "Date tenant made the payment"], [3000, 3000, 3360], true),
          tRow(["Payment Method", "No", "e.g. Bank Transfer, Cash"], [3000, 3000, 3360], false),
          tRow(["Amount (LKR)", "Yes", ""], [3000, 3000, 3360], true),
          tRow(["Receipt Upload", "No", "JPG, PNG, PDF — max 5MB"], [3000, 3000, 3360], false),
          tRow(["Notes", "No", "e.g. Bank transfer ref #123"], [3000, 3000, 3360], true),
          tRow(["Status", "Auto", "Pending / Confirmed / Overdue"], [3000, 3000, 3360], false),
        ]
      }),

      // 4.7
      h2("4.7 Maintenance Management"),
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({ text: "Status: ", font: "Arial", size: 22, bold: true }),
          new TextRun({ text: "NOT IMPLEMENTED IN v1.0 — AVAILABLE SOON", font: "Arial", size: 22, bold: true, color: "CC6600" }),
        ]
      }),
      p(""),
      h3("Planned Features"),
      bullet("Tenant creates a maintenance request with description and optional images"),
      bullet("Landlord assigns status and updates progress"),
      bullet("Both parties can upload images"),
      bullet("Track completion with timestamps"),
      p(""),
      h3("Request Statuses (Planned)"),
      bullet("Open"),
      bullet("In Progress"),
      bullet("Completed"),
      bullet("Cancelled"),

      // 4.8
      h2("4.8 Reports"),
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({ text: "Status: ", font: "Arial", size: 22, bold: true }),
          new TextRun({ text: "NOT IMPLEMENTED IN v1.0 — AVAILABLE SOON", font: "Arial", size: 22, bold: true, color: "CC6600" }),
        ]
      }),
      p(""),
      h3("Landlord Reports (Planned)"),
      bullet("Occupancy Report"),
      bullet("Rent Collection Report"),
      bullet("Outstanding Rent Report"),
      bullet("Lease Expiry Report"),
      bullet("Maintenance Report"),
      p(""),
      h3("Super Admin Reports (Planned)"),
      bullet("Total Landlords"),
      bullet("Active Landlords"),
      bullet("Total Properties"),
      bullet("Total Tenants"),
      bullet("Subscription Revenue"),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 5 — SECURITY
      // ══════════════════════════════════════════
      h1("5. Security Requirements"),

      h2("5.1 Authentication"),
      bullet("Secure login for all roles via email and password"),
      bullet("Passwords hashed by Supabase Auth (bcrypt)"),
      bullet("Password complexity enforcement: minimum 6 characters"),
      bullet("Password reset via emailed link (Supabase built-in)"),
      bullet("Session timeout on inactivity"),
      bullet("Account lockout after repeated failed login attempts"),

      h2("5.2 Authorization"),
      bullet("Role-Based Access Control (RBAC) — Super Admin, Landlord, Tenant"),
      bullet("Tenant-level data segregation via Supabase Row-Level Security"),
      bullet("All API calls validated against the authenticated user's role and tenant"),
      bullet("Permission-based menu and route visibility in the React frontend"),

      h2("5.3 Data Security"),
      bullet("HTTPS mandatory — enforced by Netlify and Supabase"),
      bullet("Sensitive data encrypted at rest (Supabase managed encryption)"),
      bullet("All data in transit encrypted via TLS"),
      bullet("Secure document storage in Supabase Storage with signed URLs"),
      bullet("File upload validation: type checking, size limit (5MB), virus scan planned"),

      h2("5.4 Audit Logging"),
      p("The system shall log the following events:"),
      bullet("Login attempts (successful and failed)"),
      bullet("User creation and deactivation"),
      bullet("Tenant creation"),
      bullet("Lease creation and termination (when implemented)"),
      bullet("Payment creation and confirmation"),
      bullet("Property and unit updates"),
      bullet("Permission and role changes"),
      p(""),
      p("Each audit log entry shall include:"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          tHeader(["Field", "Description"], [3000, 6360]),
          tRow(["User", "Who performed the action"], [3000, 6360], false),
          tRow(["Action", "What was done"], [3000, 6360], true),
          tRow(["Timestamp", "When it happened (UTC)"], [3000, 6360], false),
          tRow(["IP Address", "User's IP at time of action"], [3000, 6360], true),
          tRow(["Tenant ID", "Which landlord account was affected"], [3000, 6360], false),
        ]
      }),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 6 — DASHBOARDS
      // ══════════════════════════════════════════
      h1("6. Dashboard Requirements"),

      h2("6.1 Super Admin Dashboard"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          tHeader(["Metric", "Status in v1.0"], [4680, 4680]),
          tRow(["Total Landlords", "Implemented"], [4680, 4680], false),
          tRow(["Active Landlords", "Implemented"], [4680, 4680], true),
          tRow(["Total Properties", "Implemented"], [4680, 4680], false),
          tRow(["Total Units", "Implemented"], [4680, 4680], true),
          tRow(["Total Tenants", "Implemented"], [4680, 4680], false),
          tRow(["Monthly Revenue", "Available Soon"], [4680, 4680], true),
          tRow(["Active Subscriptions", "Available Soon"], [4680, 4680], false),
        ]
      }),

      h2("6.2 Landlord Dashboard"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          tHeader(["Metric", "Status in v1.0"], [4680, 4680]),
          tRow(["Total Properties", "Implemented"], [4680, 4680], false),
          tRow(["Total Units", "Implemented"], [4680, 4680], true),
          tRow(["Occupied Units", "Implemented"], [4680, 4680], false),
          tRow(["Vacant Units", "Implemented"], [4680, 4680], true),
          tRow(["Monthly Rent Due", "Implemented"], [4680, 4680], false),
          tRow(["Rent Collected", "Implemented"], [4680, 4680], true),
          tRow(["Outstanding Rent", "Implemented"], [4680, 4680], false),
          tRow(["Upcoming Lease Expiries", "Available Soon"], [4680, 4680], true),
          tRow(["Open Maintenance Requests", "Available Soon"], [4680, 4680], false),
        ]
      }),

      h2("6.3 Tenant Dashboard"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          tHeader(["Metric", "Status in v1.0"], [4680, 4680]),
          tRow(["Current Lease", "Available Soon"], [4680, 4680], false),
          tRow(["Monthly Rent Amount", "Implemented"], [4680, 4680], true),
          tRow(["Next Due Date", "Implemented"], [4680, 4680], false),
          tRow(["Outstanding Balance", "Implemented"], [4680, 4680], true),
          tRow(["Recent Payments", "Implemented"], [4680, 4680], false),
          tRow(["Maintenance Requests", "Available Soon"], [4680, 4680], true),
        ]
      }),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 7 — DATABASE DESIGN
      // ══════════════════════════════════════════
      h1("7. Database Design"),

      h2("7.1 Core Tables"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 7160],
        rows: [
          tHeader(["Table", "Purpose"], [2200, 7160]),
          tRow(["profiles", "Extends auth.users with role (super_admin / landlord / tenant), name, phone, NIC"], [2200, 7160], false),
          tRow(["properties", "Properties owned by landlords — name, address, city, country, type, status"], [2200, 7160], true),
          tRow(["units", "Rentable units — unit number, floor, rent, electricity, water charges, deposit, occupancy"], [2200, 7160], false),
          tRow(["tenancies", "Links tenant to unit — start/end date, monthly rent, deposit, active flag"], [2200, 7160], true),
          tRow(["payments", "Rent payments — period, amount, method, status, receipt path, notes"], [2200, 7160], false),
          tRow(["leases", "Lease agreements (schema ready, feature available soon)"], [2200, 7160], true),
          tRow(["maintenance_requests", "Maintenance tickets (schema ready, feature available soon)"], [2200, 7160], false),
          tRow(["audit_logs", "System-wide audit trail — user, action, timestamp, IP, tenant ID"], [2200, 7160], true),
        ]
      }),

      h2("7.2 Role Values"),
      bullet("super_admin — software provider, seeded manually"),
      bullet("landlord — created by super_admin only, no public registration"),
      bullet("tenant — created by landlord only, no public registration"),

      h2("7.3 Payment Status Values"),
      bullet("pending — submitted by tenant, awaiting landlord confirmation"),
      bullet("confirmed — approved by landlord"),
      bullet("overdue — unpaid past due date"),

      h2("7.4 Future Scalability Notes"),
      bullet("Currency field on properties/payments allows multi-currency in a future release"),
      bullet("Country field on properties allows multi-country expansion"),
      bullet("NIC field label can be relabeled to 'National ID / Passport' for other countries"),
      bullet("All monetary values stored as NUMERIC(12,2) — no currency conversion needed at database level"),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 8 — UI/UX REQUIREMENTS
      // ══════════════════════════════════════════
      h1("8. UI/UX Requirements"),
      bullet("Clean, minimal design with navy accent color (#2E4057)"),
      bullet("Fully responsive — works on mobile phones, tablets, and desktops"),
      bullet("Role-based navigation — each role sees only their relevant menu items"),
      bullet("Loading spinners on all async operations"),
      bullet("Clear success and error messages on all form submissions"),
      bullet("Confirmation dialogs before any destructive action (delete, end tenancy, suspend)"),
      bullet("All monetary values displayed as: LKR X,XXX.XX"),
      bullet("Dates displayed in Sri Lankan format: DD/MM/YYYY"),
      bullet("'Available Soon' badges shown on locked features so users understand the roadmap"),

      pageBreak(),

      // ══════════════════════════════════════════
      // SECTION 9 — FUTURE ENHANCEMENTS
      // ══════════════════════════════════════════
      h1("9. Future Enhancements"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2800, 6560],
        rows: [
          tHeader(["Feature", "Description"], [2800, 6560]),
          tRow(["Lease Management", "Full lease lifecycle — create, renew, terminate, upload signed documents"], [2800, 6560], false),
          tRow(["Maintenance Requests", "Tenant submits tickets; landlord tracks and resolves them"], [2800, 6560], true),
          tRow(["Reports Module", "Occupancy, rent collection, outstanding rent, lease expiry reports"], [2800, 6560], false),
          tRow(["Email Notifications", "Automated emails for payment submission, confirmation, and overdue alerts"], [2800, 6560], true),
          tRow(["Subscription Billing", "Super Admin charges landlords a monthly/annual subscription fee"], [2800, 6560], false),
          tRow(["Multi-Currency", "Support currencies beyond LKR for international landlords"], [2800, 6560], true),
          tRow(["Multi-Country", "Remove Sri Lanka-specific constraints; support any country"], [2800, 6560], false),
          tRow(["PDF Receipts", "Auto-generated PDF rent receipts for confirmed payments"], [2800, 6560], true),
          tRow(["Mobile App", "React Native app for tenants to submit payments on mobile"], [2800, 6560], false),
          tRow(["Sinhala / Tamil", "Multi-language support for Sri Lankan users"], [2800, 6560], true),
        ]
      }),

      p(""),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "— End of Document —", font: "Arial", size: 20, bold: true, color: "888888" })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("Ceylora_SRS_v1.0.docx", buffer);
  console.log("SRS document created: Ceylora_SRS_v1.0.docx");
});
