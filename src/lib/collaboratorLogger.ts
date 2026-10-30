import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

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

/**
 * Mendeteksi informasi perangkat & browser secara ramah dan ringkas
 */
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

/**
 * Format tanggal dan waktu dalam bahasa Indonesia
 */
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

/**
 * Mencatat aktivitas kolaborator secara realtime & terperinci ke 3 lapisan:
 * 1. Cloud Firestore (koleksi: collaboratorLogs)
 * 2. Server Disk Registry (/api/collaborator-logs)
 * 3. LocalStorage browser (collaborator_activity_logs)
 */
export async function recordCollaboratorActivity(
  action: string,
  details = '',
  path = '',
  customUser?: { username: string; partnerName?: string; role?: string }
): Promise<CollaboratorActivityLog | null> {
  if (typeof window === 'undefined') return null;

  // Dapatkan profil user yang sedang aktif
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

  // Jika bukan kolaborator, tidak perlu mencatat aktivitas
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

  // 1. Simpan ke LocalStorage browser
  try {
    const existing = localStorage.getItem('collaborator_activity_logs');
    let list: CollaboratorActivityLog[] = existing ? JSON.parse(existing) : [];
    if (!Array.isArray(list)) list = [];
    list.unshift(logRecord);
    if (list.length > 500) list = list.slice(0, 500);
    localStorage.setItem('collaborator_activity_logs', JSON.stringify(list));
  } catch {}

  // 2. Simpan ke Server Disk Registry (/api/collaborator-logs)
  try {
    fetch('/api/collaborator-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      },
      body: JSON.stringify(logRecord)
    }).catch(() => {});
  } catch {}

  // 3. Simpan ke Cloud Firestore (realtime sinkronisasi ke menu kolaborator)
  try {
    setDoc(doc(db, 'collaboratorLogs', logId), {
      ...logRecord,
      _adminAuth: 'alfreelnc_admin_auth_verified',
      updatedByAdmin: true
    }, { merge: true }).catch((err) => {
      console.warn("Notice: Firestore collaborator log error:", err);
    });
  } catch {}

  // 4. Siarkan event ke aplikasi agar UI langsung terupdate seketika tanpa refresh
  try {
    window.dispatchEvent(new CustomEvent('collaborator_activity_logged', { detail: logRecord }));
  } catch {}

  return logRecord;
}

/**
 * Mengambil log aktivitas kolaborator dari penyimpanan lokal
 */
export function getStoredCollaboratorLogs(): CollaboratorActivityLog[] {
  try {
    const data = localStorage.getItem('collaborator_activity_logs');
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Menghapus satu log kolaborator
 */
export async function deleteCollaboratorLog(logId: string): Promise<void> {
  // 1. LocalStorage
  try {
    const list = getStoredCollaboratorLogs().filter(l => l.id !== logId);
    localStorage.setItem('collaborator_activity_logs', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('collaborator_logs_updated', { detail: list }));
  } catch {}

  // 2. Cloud Firestore
  try {
    await deleteDoc(doc(db, 'collaboratorLogs', logId));
  } catch (e) {
    console.warn("Delete log firestore error:", e);
  }
}

/**
 * Membersihkan semua log aktivitas kolaborator
 */
export async function clearAllCollaboratorLogs(): Promise<void> {
  try {
    localStorage.removeItem('collaborator_activity_logs');
    window.dispatchEvent(new CustomEvent('collaborator_logs_updated', { detail: [] }));
  } catch {}

  try {
    fetch('/api/collaborator-logs', {
      method: 'DELETE',
      headers: {
        'x-admin-token': 'alfreelnc_admin_auth_verified'
      }
    }).catch(() => {});
  } catch {}
}
