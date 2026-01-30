const statusStyles = {
  // Notification statuses
  Sent: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  Cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  // Task statuses
  Active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  A: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Testing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  T: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  Inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  N: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  // Boolean
  true: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  false: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const statusLabels = {
  A: 'Active',
  T: 'Testing',
  N: 'Inactive',
  true: 'Yes',
  false: 'No',
};

export default function StatusBadge({ status, className = '' }) {
  const key = String(status);
  const style = statusStyles[key] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  const label = statusLabels[key] || key;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}
    >
      {label}
    </span>
  );
}
