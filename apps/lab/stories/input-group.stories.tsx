import {
  Button,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Eye, Search } from "lucide-react";

const meta = { title: "Components/Forms/InputGroup", component: InputGroup } satisfies Meta<typeof InputGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const ar = useNasaq().locale.startsWith("ar");
  return (
    <div className="flex max-w-sm flex-col gap-5">
      <Field>
        <FieldLabel>{ar ? "بحث" : "Search"}</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput placeholder={ar ? "ابحث في المشاريع…" : "Search projects…"} />
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel>{ar ? "الموقع" : "Website"}</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText dir="ltr">https://</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput ltr placeholder="nasaq.app" />
        </InputGroup>
        <FieldDescription>{ar ? "بدون مسار." : "Domain only."}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>{ar ? "السعر" : "Price"}</FieldLabel>
        <InputGroup>
          <InputGroupInput inputMode="decimal" placeholder="0.00" />
          <InputGroupAddon align="end">
            <InputGroupText>{ar ? "ر.س" : "SAR"}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel>{ar ? "كلمة المرور" : "Password"}</FieldLabel>
        <InputGroup>
          <InputGroupInput type="password" defaultValue="secret" />
          <InputGroupAddon align="end" className="pe-1.5">
            <Button variant="ghost" size="icon-sm" aria-label={ar ? "إظهار" : "Show password"}>
              <Eye aria-hidden="true" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

export const Invalid: Story = {
  render: () => (
    <div className="max-w-sm">
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>@</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput ltr defaultValue="fady" aria-invalid />
        </InputGroup>
        <FieldError match>Enter a complete email address.</FieldError>
      </Field>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-sm">
      <Field disabled>
        <FieldLabel>Workspace</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput defaultValue="ws_01J9" />
        </InputGroup>
      </Field>
    </div>
  ),
};
