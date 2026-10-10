const fs = require('fs');
let content = fs.readFileSync('src/components/Store.tsx', 'utf8');

const replacement = `  const getInitialFormData = () => {
    try {
      const saved = localStorage.getItem('order_draft');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      nama: '', whatsapp: '', sosmed: '', jenisLayanan: '', layananLainnya: '', tujuan: '', gaya: '', format: '', jumlah: '', deadline: '', budget: '', materi: '', referensiUrl: '', catatan: '',
    };
  };
  const [formData, setFormData] = useState(getInitialFormData);
  const [isDraftLoaded, setIsDraftLoaded] = useState(() => !!localStorage.getItem('order_draft'));
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [showNavPopup, setShowNavPopup] = useState(false);
  const [pendingNavView, setPendingNavView] = useState<string | null>(null);

  useEffect(() => {
    const handleNavRequest = (e: any) => {
      if (formData.jenisLayanan) {
        e.preventDefault();
        setPendingNavView(e.detail.view);
        setShowNavPopup(true);
      }
    };
    window.addEventListener('requestChangeView', handleNavRequest);
    return () => window.removeEventListener('requestChangeView', handleNavRequest);
  }, [formData.jenisLayanan, formData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (formData.jenisLayanan) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData.jenisLayanan]);

  const clearForm = () => {
    setFormData({ nama: '', whatsapp: '', sosmed: '', jenisLayanan: '', layananLainnya: '', tujuan: '', gaya: '', format: '', jumlah: '', deadline: '', budget: '', materi: '', referensiUrl: '', catatan: '' });
    setStep(1);
    setIsDraftLoaded(false);
    localStorage.removeItem('order_draft');
  };

  const confirmCancelOrder = () => {
    clearForm();
    setShowCancelPopup(false);
  };

  const navDiscard = () => {
    clearForm();
    setShowNavPopup(false);
    if (pendingNavView) {
      window.dispatchEvent(new CustomEvent('forceChangeView', { detail: { view: pendingNavView } }));
    }
  };

  const navDraft = () => {
    localStorage.setItem('order_draft', JSON.stringify(formData));
    setIsDraftLoaded(true);
    setShowNavPopup(false);
    if (pendingNavView) {
      window.dispatchEvent(new CustomEvent('forceChangeView', { detail: { view: pendingNavView } }));
    }
  };

  const navStay = () => {
    setShowNavPopup(false);
    setPendingNavView(null);
  };
`;

content = content.replace(
  /const \[formData, setFormData\] = useState\(\{\n    nama: '',\n    whatsapp: '',\n    sosmed: '',\n    jenisLayanan: '',\n    layananLainnya: '',\n    tujuan: '',\n    gaya: '',\n    format: '',\n    jumlah: '',\n    deadline: '',\n    budget: '',\n    materi: '',\n    referensiUrl: '',\n    catatan: '',\n  \}\);/,
  replacement
);

fs.writeFileSync('src/components/Store.tsx', content);
