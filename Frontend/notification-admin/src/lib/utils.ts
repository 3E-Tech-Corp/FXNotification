import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateText(text: string | null | undefined, maxLength: number = 30): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'A':
    case 'S':
      return 'text-green-600 bg-green-100';
    case 'T':
    case 'P':
      return 'text-yellow-600 bg-yellow-100';
    case 'N':
    case 'F':
      return 'text-red-600 bg-red-100';
    case 'H':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getStatusText(status: string, options: { Value: string; Text: string }[]): string {
  const option = options.find(o => o.Value === status);
  return option?.Text || status;
}
