import React from 'react';
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Announcement as AnnouncementType } from '../types';

interface AnnouncementProps {
  announcement: AnnouncementType;
  onDismiss?: (id: string) => void;
}

const Announcement: React.FC<AnnouncementProps> = ({ announcement, onDismiss }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (announcement.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getBgColor = () => {
    switch (announcement.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss(announcement.id);
    }
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 mb-4 shadow-sm ${getBgColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            {announcement.title && (
              <h4 className="font-semibold mb-1 text-base">{announcement.title}</h4>
            )}
            <p className="text-sm whitespace-pre-line leading-relaxed">{announcement.message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-4 text-current opacity-70 hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

interface AnnouncementsListProps {
  announcements: AnnouncementType[];
  onDismiss?: (id: string) => void;
}

export const AnnouncementsList: React.FC<AnnouncementsListProps> = ({ announcements, onDismiss }) => {
  if (announcements.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      {announcements.map((announcement) => (
        <Announcement
          key={announcement.id}
          announcement={announcement}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

export default Announcement;

