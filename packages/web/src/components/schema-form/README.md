---
name: schema-form
title: SchemaForm
category: form-builders
status: stable
summary: A form generated from a JSON Schema, with enums, booleans, dates, objects nested to any depth, lists of values and lists of objects (add, remove, reorder, collapse), foreign keys, show and hide rules by path, client validation and server field errors on nested paths.
exports: [SchemaForm, SchemaFormLabels, SchemaFormRelationSource, SchemaFormSubmitResult, SchemaFormProps]
related: [schema-repeater, relation-picker, rule-builder, public-form, infolist, field]
story: components-form-builders-schema-form
keywords: [json schema, form generator, dynamic form, validation, rules, relation, admin, nested, array, repeater, tags]
---

# SchemaForm

Describe a record once as a JSON Schema and get its edit form: labels, inputs, validation messages in English and
Arabic, sections, lists of rows, and foreign-key pickers. It reuses [SchemaRepeater](../schema-repeater/README.md)'s
field types and validators, [RelationPicker](../relation-picker/README.md) for foreign keys, and the show, hide and
require rules of [RuleBuilder](../rule-builder/README.md) (the same engine as [PublicForm](../public-form/README.md)).

## When to use

- Admin screens driven by a schema from your API, plugin settings, or a form a customer defines.

## When not to use

- A one-off form with special layout: build it from Field and Input.
- A public embed: [PublicForm](../public-form/README.md).

## Import

```tsx
import { SchemaForm, schemaFormFields, schemaFormOutput } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<SchemaForm
  schema={{
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", title: "Name", "x-title-ar": "الاسم" },
      status: { type: "string", enum: ["draft", "live"] },
      owner: { type: "string", title: "Owner", "x-relation": { resource: "users" } },
    },
  }}
  relations={{ users: { search: (q, signal) => fetchUsers(q, signal) } }}
  onSubmit={async (value) => {
    const res = await api.save(value);
    if (!res.ok) return { fieldErrors: res.errors };
  }}
/>
```

## Supported schema

| Schema | Field |
| --- | --- |
| `string` | text. `format` `email`, `uri`, `tel` set the input type; `date` gives a date picker; `x-widget: "textarea"` or `maxLength` over 200 gives a text area. |
| `enum`, or `oneOf` of `const` with `title` | select. Numeric enums come back as numbers. |
| `number`, `integer` | number with `minimum`, `maximum`, `multipleOf` (step) and `x-unit`. |
| `boolean` | switch. |
| `array` of `string` | tag input (`maxItems` caps the tags; each tag is checked as it is added). |
| `array` of `number`, `integer`, `date` or a plain enum | repeated inputs with Add and Remove. |
| `array` of an enum with `uniqueItems: true` | checkbox group. The value keeps the order of the options. |
| `array` of objects | groups: collapsible, with add, remove, up and down, and drag. Each group is titled by `x-title` (or the first string field). |
| `object` | a fieldset. Objects nest to any depth, inside objects and inside array items. |
| `x-relation: { resource, multiple }` | RelationPicker. |
| `$ref` to `#/$defs/...` | resolved. |

Also: `title`, `description`, `default`, `required`, `pattern`, `minLength`, `maxLength`, `minItems`, `maxItems`, `uniqueItems`,
`x-title-ar`, `x-description-ar`, `x-enum-titles`, `x-enum-titles-ar`, `x-placeholder`, `x-width: "half"`, `x-order`, and `x-title`
(a property key, or a template such as `"{name} - {role}"`, that titles each group; `x-title-key` still works).
Remote `$ref`, arrays of arrays and unions are not drawn; `schemaFormTree(schema).unsupported` lists them.

## Paths

Every field has a path: `address.city`, `contacts[1].phone`, `contacts[1].phones[0]`. Paths are used for errors, rules and focus.

- **Errors.** Client errors, `fieldErrors` from `onSubmit` and the validation summary all use full paths. A server key can be
  written `contacts[1].phone`, `contacts.1.phone` or the JSON pointer `/contacts/1/phone`. A path into a group that no longer exists lands
  on its list, and a key that matches nothing is shown for the whole form. Errors of tags show on the list, since tags are one control.
- **Summary.** After a failed submit the form lists what to fix. Each line is a button that opens the collapsed groups on the way and puts
  focus in the field. A collapsed group with problems shows an issue count.
- **Rules.** `config.target` and a condition's `field` accept an absolute path (`company.type`), a pattern for every item
  (`contacts[].phone`) and, in conditions, a path relative to the target: `./kind` is a sibling (inside an array item, the same item) and
  `../kind` is a sibling of the enclosing object or item. Hidden fields, and everything inside a hidden object or item, are not validated or submitted.

```tsx
// Show the tax id of a contact only while that contact is the billing one.
{ conditions: /* ./kind is "billing" */, actions: [{ type: "show", config: { target: "contacts[].taxId" } }] }
```

Removing a group that has data asks first. `minItems` disables Remove at the minimum; `maxItems` disables Add at the limit and says so.

## Anatomy

```
SchemaForm               <form data-slot="schema-form">
├─ grid                  fields, two columns from the small breakpoint
├─ fieldset              one per nested object, at any depth
├─ list                  tags, repeated inputs, checkbox group, or groups of fields
│  └─ group              header (drag, title, issues, up, down, remove) and a collapsible body
├─ summary               how many fields to fix, with a button for each
├─ Alert                 server error, saved, or how many fields to fix
└─ actions               Save, Reset
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `schema` | `SchemaFormJson` | required | |
| `value` / `defaultValue` / `onValueChange` | `Record<string, unknown>` | none | Output shape: nested, numbers as numbers, empty text as `null`. |
| `onSubmit` | `(value) => Promise<void \| { error?, fieldErrors? }>` | none | Runs only when valid. Return server errors, keyed by path, to show them on the fields. |
| `rules` | `FormRule[]` | none | Show, hide and require by field path (`config.target`). See Paths. |
| `relations` | `Record<resource, { search, options, resolve, onCreate }>` | none | Sources for `x-relation`. |
| `submitLabel`, `hideActions`, `disabled`, `label` | | | |
| `locale`, `labels`, `className` | | | |

`labels` overrides any string, including the group actions (`add`, `remove`, `moveUp`, `moveDown`, `removeTitle`, `removeBody`, ...).

Helpers without React, for tests and for the server:

- Tree: `schemaFormTree(schema)`, `schemaFormTreeDefaults`, `schemaFormTreeInitial`, `schemaFormTreeOutput`.
- Checks: `schemaFormTreeValidate(root, values)` returns `{ [path]: message }`. `schemaFormTreeStates(root, values, rules)` returns visibility and required by path. `schemaFormMapErrors(root, values, errors)` returns `{ fields, unmatched }`.
- Paths: `schemaPathParse`, `schemaPathGet`, `schemaPathSet` (immutable), `schemaPathResolve`, `schemaPathMatches`.
- Flat, one level, kept for compatibility: `schemaFormFields`, `schemaFormInitial`, `schemaFormOutput`, `schemaFormFlatten`, `schemaFormResolve`, `schemaFormHumanize`.

## Accessibility

- Every input has a label; required fields carry `*` and `required`.
- Errors show when a field was edited or after a failed submit; the first invalid field takes focus.
- A summary tells how many fields to fix, with a button per problem that opens collapsed groups and moves focus to the field. Hidden fields are removed, not just dimmed, and are not validated or submitted.
- Lists are fieldsets with a legend. Each group header is a button with `aria-expanded`. Up, down and remove buttons name the group ("Move Layla up"), so reordering works without a pointer. After add, remove or move, focus stays where the person was working.

## RTL & i18n

- Titles use `x-title-ar` when the locale is Arabic and fall back to a humanised key. Messages come from the Arabic set.
- Emails, URLs, phone numbers and numbers are entered left to right. The group chevron flips in RTL, and every group string comes from the Arabic set.

## Styling & tokens

Field, Alert and Button tokens. Extend with `className`.

## Do / Don't

- Do run the same validation on the server.
- Do give every enum a title for Arabic, or `x-enum-titles-ar`.
- Do not rely on `x-` hints for security; they only shape the form.
- Do give each group a title (`x-title`) so a collapsed group is still recognisable.
- Do not use `.`, `[` or `]` in property names: they are path separators.

## Related

- [SchemaRepeater](../schema-repeater/README.md)
- [RelationPicker](../relation-picker/README.md)
- [RuleBuilder](../rule-builder/README.md)
- [Infolist](../infolist/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-form-builders-schema-form--docs
