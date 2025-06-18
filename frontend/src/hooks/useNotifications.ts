import { toast } from 'sonner';
import type { NotificationType } from '@/lib/types';

interface NotificationMessage {
  type: NotificationType;
  title: string;
  message: string;
}

export function useNotifications() {
  const addNotification = ({ type, title, message }: NotificationMessage) => {
    switch (type) {
      case 'success':
        toast.success(title, { description: message });
        break;
      case 'error':
        toast.error(title, { description: message });
        break;
      case 'warning':
        toast.warning(title, { description: message });
        break;
      case 'info':
      default:
        toast.info(title, { description: message });
        break;
    }
  };

  const addSuccessNotification = (title: string, message?: string) => {
    addNotification({ type: 'success', title, message: message || '' });
  };

  const addErrorNotification = (title: string, message?: string) => {
    addNotification({ type: 'error', title, message: message || '' });
  };

  const addWarningNotification = (title: string, message?: string) => {
    addNotification({ type: 'warning', title, message: message || '' });
  };

  const addInfoNotification = (title: string, message?: string) => {
    addNotification({ type: 'info', title, message: message || '' });
  };

  return {
    addNotification,
    addSuccessNotification,
    addErrorNotification,
    addWarningNotification,
    addInfoNotification
  };
} 