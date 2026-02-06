// Mail Profile - SMTP configuration
export interface Profile {
  ProfileId: number;
  ProfileCode: string;
  FromName: string;
  FromEmail: string;
  SmtpHost: string;
  SmtpPort: number;
  AuthUser: string;
  AuthSecretRef: string;
  SecurityMode: string;
  IsActive: boolean;
  App_ID?: number | null;
  App_Code?: string;
}

// Application that uses the notification system
export interface Application {
  App_ID: number;
  App_Code: string;
  Descr: string;
  ProfileID: number | null;
}

// Email Template
export interface EmailTemplate {
  ET_ID: number;
  ET_Code: string;
  Lang_Code?: string;
  Subject: string;
  Body: string;
  App_ID?: number | null;
  App_Code?: string;
}

// Task configuration
export interface Task {
  Task_ID: number;
  TaskCode: string;
  TaskType: string;
  Status: string;
  MailPriority: string;
  ProfileID: number | null;
  TemplateID: number | null;
  TestMailTo: string;
  LangCode: string;
  MailFromName: string;
  MailFrom: string;
  MailTo: string;
  MailCC: string;
  MailBCC: string;
  AttachmentProcName: string;
  App_ID?: number;
}

// Outbox item - pending email
export interface OutboxItem {
  ID: number;
  TaskID: number;
  TaskCode?: string;
  Status: string;
  CreatedAt: string;
  ToList: string;
  CcList: string;
  BccList: string;
  Attempts: number;
  LastError: string;
  BodyJson: string;
  DetailJson: string;
  ObjectId?: string;
}

// Sent email history
export interface HistoryItem {
  ID: number;
  TaskCode: string;
  Status: string;
  CreatedAt: string;
  ToList: string;
  CcList: string;
  BccList: string;
  Attempts: number;
  LastError: string;
  BodyJson: string;
  DetailJson: string;
}

// Audit trail entry
export interface AuditItem {
  Audit_ID: number;
  DT_Audit: string;
  NextAttemptAt: string;
  Status: string;
  Attempts: number;
  LastError: string;
}

// Dropdown option
export interface SelectOption {
  Value: string;
  Text: string;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Form modes
export type FormMode = 'view' | 'create' | 'edit';

// Security modes for SMTP
export const SecurityModes: SelectOption[] = [
  { Value: '0', Text: 'None' },
  { Value: '1', Text: 'StartTls' },
  { Value: '2', Text: 'SslOnConnect' },
];

// Task statuses
export const TaskStatuses: SelectOption[] = [
  { Value: 'A', Text: 'Active' },
  { Value: 'T', Text: 'Testing' },
  { Value: 'N', Text: 'Inactive' },
];

// Task types
export const TaskTypes: SelectOption[] = [
  { Value: 'E', Text: 'Email' },
  { Value: 'T', Text: 'SMS/Text' },
];

// Mail priorities
export const MailPriorities: SelectOption[] = [
  { Value: 'L', Text: 'Low' },
  { Value: 'N', Text: 'Normal' },
  { Value: 'H', Text: 'High' },
];

// Outbox statuses
export const OutboxStatuses: SelectOption[] = [
  { Value: 'P', Text: 'Pending' },
  { Value: 'S', Text: 'Sent' },
  { Value: 'F', Text: 'Failed' },
  { Value: 'H', Text: 'On Hold' },
];

// Yes/No boolean options
export const YesNoOptions: SelectOption[] = [
  { Value: 'true', Text: 'Yes' },
  { Value: 'false', Text: 'No' },
];
