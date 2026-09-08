import { useEffect, useState } from 'react';
import { createAnnouncementService } from '../../services/api/announcementService';
import type { Announcement } from '../../services/api/announcementService';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../services/supabase/client';

const announcementService = isSupabaseConfigured() ? createAnnouncementService() : null;

const TYPE_ICON: Record<Announcement['type'], string> = {
  maintenance_notice: 'bi-cone-striped',
  promotion: 'bi-gift',
  system_update: 'bi-arrow-repeat',
  important_notice: 'bi-exclamation-circle',
};

export function AnnouncementBanner() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!announcementService) return;
    announcementService
      .listActiveFor(profile?.role ?? null)
      .then((list) => setAnnouncements(list.filter((a) => a.delivery.includes('banner'))))
      .catch(() => undefined);
  }, [profile?.role]);

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="d-flex flex-column">
      {visible.map((announcement) => (
        <div key={announcement.id} className="alert alert-info rounded-0 mb-0 d-flex justify-content-between align-items-center py-2" role="status">
          <span>
            <i className={`bi ${TYPE_ICON[announcement.type]} me-2`} aria-hidden="true" />
            <strong>{announcement.title}</strong> — {announcement.body}
          </span>
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss announcement"
            onClick={() => setDismissed((current) => [...current, announcement.id])}
          />
        </div>
      ))}
    </div>
  );
}
