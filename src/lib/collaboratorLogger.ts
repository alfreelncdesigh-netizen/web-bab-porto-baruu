import { db } from './firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

export interface CollaboratorActivityLog {
  id: string;
  username: string;
  partnerName: string;
  role: 'collaborator';
  action: string;
  details: string;
  timestamp: number;
  isoDate: string;
  date: string;
  time: string;
  device: string;
  path?: string;
}

function getDeviceDescription(): string {
  if (typeof window === 'undefined' || !navigator) return 'Browser Web';

  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  let os = isMobile ? 'Mobile' : 'Desktop';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = isMobile ? 'iOS' : 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} di ${os} (${isMobile ? 'Ponsel' : 'Komputer'})`;
}

function getFormattedDateTime(now = new Date()): { date: string; time: string } {
  try {
    const date = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(now);

    const time = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now) + ' WITA/WIB';

    return { date, time };
  } catch {
    return {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString()
    };
  }
}

export async function recordCollaboratorActivity(
  action: string,
  details = '',
  path = '',
  customUser?: { username: string; partnerName?: string; role?: string }
): Promise<CollaboratorActivityLog | null> {
  if (typeof window === 'undefined') return null;

  let username = customUser?.username || '';
  let partnerName = customUser?.partnerName || '';
  let role = customUser?.role || '';

  if (!username) {
    try {
      const saved = sessionStorage.getItem('admin_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role === 'collaborator') {
          username = parsed.username || 'kolaborator';
          partnerName = parsed.partnerName || '';
          role = 'collaborator';
        }
      }
    } catch {}
  }

  if (!username && role !== 'collaborator') {
    return null;
  }

  const now = new Date();
  const { date, time } = getFormattedDateTime(now);
  const logId = `collab_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const logRecord: CollaboratorActivityLog = {
    id: logId,
    username: username.toLowerCase().trim(),
    partnerName: partnerName || 'Mitra Kolaborasi',
    role: 'collaborator',
    action,
    details: details || `Aktivitas ${action}`,
    timestamp: now.getTime(),
    isoDate: now.toISOString(),
    date,
    time,
    device: getDeviceDescription(),
    path: path || window.location.hash || window.location.pathname
  };

  try {
    await setDoc(
      doc(db, 'collaboratorLogs', logId),
      {
        ...logRecord,
        _adminAuth: 'alfreelnc_admin_auth_verified',
        updatedByAdmin: true
      },
      { merge: true }
    );
    window.dispatchEvent(new CustomEvent('collaborator_activity_logged', { detail: logRecord }));
  } catch (err) {
    console.error('Firestore collaborator log error:', err);
  }

  return logRecord;
}

export function getStoredCollaboratorLogs(): CollaboratorActivityLog[] {
  return [];
}

export async function deleteCollaboratorLog(logId: string): Promise<void> {
  await deleteDoc(doc(db, 'collaboratorLogs', logId));
}

export async function clearAllCollaboratorLogs(): Promise<void> {
  const snap = await getDocs(collection(db, 'collaboratorLogs'));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('collaborator_logs_updated', { detail: [] }));
  }
}
