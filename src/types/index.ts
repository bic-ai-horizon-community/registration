export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea';
  required: boolean;
  options?: string[]; // Used for 'select' field type
}

export interface EventSettings {
  isRegistrationOpen: boolean;
  formFields: FormField[];
}

export interface Event {
  id: string;
  name: string;
  isActive: boolean;
  isRegistrationOpen: boolean;
  allowedEmailDomain?: string; // '' or 'all' for anyone, or 'bicnepal.edu.np' for college only
  description?: string;
  formFields: FormField[];
  createdAt: number;
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
