import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Calendar, Phone, CheckCircle, Clock, Search, MessageSquare, ExternalLink, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface OrderItem {
  id: string;
  nama?: string;
  whatsapp?: string;
  sosmed?: string;
  layanan?: string;
  tujuan?: string;
  gaya?: string;
  format?: string;
  jumlah?: string;
  deadline?: string;
  budget?: string;
  totalEstimasi?: number;
  status?: 'pending' | 'proses' | 'selesai';
  createdAt?: any;
}

export default function StoreAdmin() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const loaded: OrderItem[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as OrderItem);
        });
        loaded.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setOrders(loaded);
        setLoading(false);
      },
      (error) => {
        console.warn('Orders Admin Error:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus riwayat order ini?')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
      showToast('Order berhasil dihapus.');
      if (selectedOrder?.id === id) setSelectedOrder(null);
    } catch (e) {
      showToast('Gagal menghapus order.', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'pending' | 'proses' | 'selesai') => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
      showToast(`Status order diperbarui menjadi ${status}.`);
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (e) {
      showToast('Gagal memperbarui status.', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    return (
      (o.nama || '').toLowerCase().includes(q) ||
      (o.whatsapp || '').toLowerCase().includes(q) ||
      (o.layanan || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (val: any) => {
    if (!val) return '-';
    try {
      const d = val.toDate ? val.toDate() : new Date(val);
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch (e) {
      return String(val);
    }
  };

  const formatIDR = (num?: number) => {
    if (!num) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-xl text-xs font-bold shadow-xl ${
              toast.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-black text-white dark:bg-white dark:text-black'
            }`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h3 className="text-xl font-black text-black dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
            Kelola Order Desain Masuk
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Daftar pesanan custom desain yang dikirimkan klien melalui formulir pemesanan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari nama / layanan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-black dark:text-white outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Memuat data order...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-semibold">Belum ada order pemesanan desain yang masuk.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => {
            const cleanPhone = (order.whatsapp || '').replace(/\D/g, '');
            const currentStatus = order.status || 'pending';

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-[#111111] p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-black dark:text-white">
                      {order.nama || 'Klien Tanpa Nama'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        currentStatus === 'selesai'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : currentStatus === 'proses'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {currentStatus}
                    </span>
                    <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-600 dark:text-zinc-300 flex flex-wrap gap-x-4 gap-y-1">
                    <div>
                      <span className="text-zinc-400">Layanan:</span>{' '}
                      <strong className="text-black dark:text-white">{order.layanan || 'Custom'}</strong>
                    </div>
                    {order.deadline && (
                      <div>
                        <span className="text-zinc-400">Deadline:</span> {order.deadline}
                      </div>
                    )}
                    {order.totalEstimasi ? (
                      <div>
                        <span className="text-zinc-400">Estimasi:</span>{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {formatIDR(order.totalEstimasi)}
                        </strong>
                      </div>
                    ) : null}
                  </div>

                  {(order.tujuan || order.format || order.gaya) && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {[order.tujuan, order.gaya, order.format].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all active:scale-95 shadow-xs"
                      title="Hubungi di WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5" /> Chat WA
                    </a>
                  )}

                  <select
                    value={currentStatus}
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value as any)}
                    className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold rounded-xl px-2.5 py-1.5 text-black dark:text-white outline-none cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="proses">Diproses</option>
                    <option value="selesai">Selesai</option>
                  </select>

                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
