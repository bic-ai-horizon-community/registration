export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select';
  required: boolean;
  options?: string[]; // Used for 'select' field type
}

export interface EventSettings {
  isRegistrationOpen: boolean;
  formFields: FormField[];
}

export interface Registration {
  id: string;
  userId?: string;
  token: string;
  responses: Record<string, string>;
  present: boolean;
  createdAt: number;
  checkedInAt: number | null;
}
