/** One record the picker can point at. `value` is what gets stored: the record's id. */
export interface RelationOption {
  value: string;
  label: string;
  labelAr?: string;
  /** Second line: an email, a code, an address. */
  description?: string;
  disabled?: boolean;
}
