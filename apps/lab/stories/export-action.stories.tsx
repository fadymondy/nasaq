import { type Contact, ExportButton, type ExportColumn } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeContacts, contactExportColumns } from "./_crm-demo";
import { wait } from "./_profile-demo";

const meta = { title: "Components/Actions/Export Button", component: ExportButton, parameters: { layout: "padded" } } satisfies Meta<typeof ExportButton>;
export default meta;
type Story = StoryObj;

const all = makeContacts("en");
const columns = contactExportColumns(false) as ExportColumn<Contact>[];

/** Format, rows and columns in a dialog; the file is built in the browser with a progress bar. */
export const Default: Story = {
  render: () => <ExportButton<Contact> columns={columns} scopes={{ selected: all.slice(0, 3), filtered: all.slice(0, 12), all }} filename="contacts" />,
};

/** A menu that exports at once with every column; "Export options…" opens the dialog. */
export const Menu: Story = {
  render: () => <ExportButton<Contact> mode="menu" columns={columns} scopes={{ filtered: all.slice(0, 12), all }} filename="contacts" />,
};

/** Rows on the server: a scope with `count` and `load`, so nothing is fetched until it is chosen. */
export const ServerRows: Story = {
  render: () => (
    <ExportButton<Contact>
      columns={columns}
      filename="all-contacts"
      scopes={{
        all: {
          count: 12840,
          load: async () => {
            await wait(900);
            return Array.from({ length: 12840 }, (_, i) => ({ ...(all[i % all.length] as Contact), id: `s${i}` }));
          },
        },
      }}
    />
  ),
};

/** PDF appears only when you pass `onExportPdf`. */
export const WithPdf: Story = {
  render: () => (
    <ExportButton<Contact>
      columns={columns}
      scopes={{ all }}
      onExportPdf={async (_r, { signal, onProgress }) => {
        for (let i = 1; i <= 6; i++) {
          await wait(300);
          if (signal.aborted) return;
          onProgress(i / 6);
        }
        return new Blob(["%PDF-1.4 demo"], { type: "application/pdf" });
      }}
    />
  ),
};

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => {
    const rows = makeContacts("ar");
    return <ExportButton<Contact> columns={contactExportColumns(true) as ExportColumn<Contact>[]} scopes={{ selected: rows.slice(0, 3), filtered: rows.slice(0, 12), all: rows }} filename="جهات-الاتصال" />;
  },
};
