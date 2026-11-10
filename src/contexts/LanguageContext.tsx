import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCookie, setCookie } from '../lib/cookies';

export type LanguageCode = 'id' | 'en' | 'ja' | 'zh' | 'es' | 'ar' | 'fr' | 'de' | 'pt' | 'ko';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', dir: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr' },
];

export const translations: Record<LanguageCode, Record<string, string>> = {
  id: {
    // Nav
    'nav.about': 'Tentang Saya',
    'nav.home': 'Beranda',
    'nav.portfolio': 'Karya',
    'nav.experience': 'Pengalaman',
    'nav.order': 'Order',
    'nav.stats': 'Statistik',
    'nav.contact': 'Kontak',
    'nav.search_insight': 'Cari Insight',
    'nav.search_placeholder': 'Cari topik atau pertanyaan desain...',
    'nav.theme_toggle': 'Ganti Tema',
    'nav.theme_light': 'Mode Terang',
    'nav.theme_dark': 'Mode Gelap',
    'nav.lang_toggle': 'Pilih Bahasa',
    'nav.back_to_home': 'Kembali ke Beranda',

    // Hero
    'hero.badge': 'DESAINER GRAFIS & UI/UX',
    'hero.title1': 'SELAMAT DATANG',
    'hero.title2': 'KARYA & DESAIN SAYA',
    'hero.view_works': 'Lihat Karya',
    'hero.contact_btn': 'Kontak',

    // About
    'about.available': 'Available for Freelance',
    'about.copy_wa': 'Klik untuk menyalin nomor WhatsApp',
    'about.copied': 'Tersalin',
    'about.view_cv': 'Lihat CV Lengkap',
    'about.location': 'Kabupaten Sinjai Utara',

    // Portfolio
    'portfolio.title': 'Galeri Karya',
    'portfolio.subtitle': 'Eksplorasi portofolio desain grafis, poster kreatif, dan identitas visual.',
    'portfolio.all': 'Semua',
    'portfolio.search': 'Cari karya...',
    'portfolio.no_results': 'Tidak ada karya ditemukan',
    'portfolio.view_details': 'Lihat Detail',
    'portfolio.share': 'Bagikan',

    // Store
    'store.title': 'Pesan Layanan Desain',
    'store.subtitle': 'Pilih paket desain grafis profesional dengan proses cepat dan hasil terbaik.',
    'store.order_btn': 'Pesan Sekarang',
    'store.form_name': 'Nama Lengkap',
    'store.form_wa': 'Nomor WhatsApp',
    'store.form_notes': 'Detail Pesanan / Catatan',
    'store.send_wa': 'Kirim Pesanan via WhatsApp',

    // Experience
    'experience.title': 'Riwayat Pengalaman',
    'experience.subtitle': 'Perjalanan karier, kolaborasi proyek, dan kontribusi kreatif.',
    'experience.download_cv': 'Unduh CV',

    // Stats
    'stats.title': 'Statistik Portofolio',
    'stats.visits': 'Total Kunjungan',
    'stats.projects': 'Proyek Selesai',
    'stats.satisfaction': 'Kepuasan Klien',
    'stats.hours': 'Jam Desain',

    // Contact
    'contact.title': 'Hubungi Saya',
    'contact.subtitle': 'Mari diskusikan ide proyek kreatif Anda bersama saya.',
    'contact.name': 'Nama Lengkap',
    'contact.email': 'Email',
    'contact.message': 'Pesan Anda',
    'contact.send': 'Kirim Pesan',
    'contact.success': 'Pesan Terkirim!',

    // Insight
    'insight.title': 'Insight & Tanya Jawab Desain',
    'insight.subtitle': 'Eksplorasi jawaban kurasi seputar tren warna, tips branding, dan proses kreatif.',
    'insight.select_hint': 'Pilih pertanyaan untuk membaca detail & melihat referensi visual.',
    'insight.back_btn': 'Kembali ke Daftar Pertanyaan',
    'insight.answers_title': 'Jawaban & Wawasan',
    'insight.visuals_title': 'Gambar & Referensi Visual',
    'insight.loading': 'Memuat konten',
    'insight.no_results': 'Tidak ada pertanyaan yang sesuai dengan pencarian Anda.',

    // Common
    'common.back_home': 'Kembali ke Beranda',
    'common.close': 'Tutup',
    'common.loading': 'Memuat konten',
    'common.rights': 'Semua hak cipta dilindungi.',
  },

  en: {
    // Nav
    'nav.about': 'About Me',
    'nav.home': 'Home',
    'nav.portfolio': 'Works',
    'nav.experience': 'Experience',
    'nav.order': 'Order',
    'nav.stats': 'Statistics',
    'nav.contact': 'Contact',
    'nav.search_insight': 'Search Insights',
    'nav.search_placeholder': 'Search design topics or questions...',
    'nav.theme_toggle': 'Toggle Theme',
    'nav.theme_light': 'Light Mode',
    'nav.theme_dark': 'Dark Mode',
    'nav.lang_toggle': 'Select Language',
    'nav.back_to_home': 'Back to Home',

    // Hero
    'hero.badge': 'GRAPHIC & UI/UX DESIGNER',
    'hero.title1': 'WELCOME',
    'hero.title2': 'MY PORTFOLIO DESIGN',
    'hero.view_works': 'View Works',
    'hero.contact_btn': 'Contact',

    // About
    'about.available': 'Available for Freelance',
    'about.copy_wa': 'Click to copy WhatsApp number',
    'about.copied': 'Copied',
    'about.view_cv': 'View Full CV',
    'about.location': 'North Sinjai, Indonesia',

    // Portfolio
    'portfolio.title': 'Work Gallery',
    'portfolio.subtitle': 'Exploration of graphic design, creative posters, and visual branding.',
    'portfolio.all': 'All',
    'portfolio.search': 'Search works...',
    'portfolio.no_results': 'No works found',
    'portfolio.view_details': 'View Details',
    'portfolio.share': 'Share',

    // Store
    'store.title': 'Order Design Services',
    'store.subtitle': 'Choose professional graphic design packages with fast delivery and high quality.',
    'store.order_btn': 'Order Now',
    'store.form_name': 'Full Name',
    'store.form_wa': 'WhatsApp Number',
    'store.form_notes': 'Order Details / Notes',
    'store.send_wa': 'Send Order via WhatsApp',

    // Experience
    'experience.title': 'Experience History',
    'experience.subtitle': 'Career journey, project collaborations, and creative contributions.',
    'experience.download_cv': 'Download CV',

    // Stats
    'stats.title': 'Portfolio Statistics',
    'stats.visits': 'Total Visits',
    'stats.projects': 'Completed Projects',
    'stats.satisfaction': 'Client Satisfaction',
    'stats.hours': 'Design Hours',

    // Contact
    'contact.title': 'Get In Touch',
    'contact.subtitle': "Let's discuss your creative project ideas together.",
    'contact.name': 'Full Name',
    'contact.email': 'Email Address',
    'contact.message': 'Your Message',
    'contact.send': 'Send Message',
    'contact.success': 'Message Sent!',

    // Insight
    'insight.title': 'Design Insights & Q&A',
    'insight.subtitle': 'Explore curated answers on color trends, branding tips, and creative workflows.',
    'insight.select_hint': 'Select a question to read details & view visual references.',
    'insight.back_btn': 'Back to Question List',
    'insight.answers_title': 'Answer & Insights',
    'insight.visuals_title': 'Images & Visual References',
    'insight.loading': 'Loading content',
    'insight.no_results': 'No questions match your search.',

    // Common
    'common.back_home': 'Back to Home',
    'common.close': 'Close',
    'common.loading': 'Loading content',
    'common.rights': 'All rights reserved.',
  },

  ja: {
    // Nav
    'nav.about': '自己紹介',
    'nav.home': 'ホーム',
    'nav.portfolio': '作品',
    'nav.experience': '経歴',
    'nav.order': '依頼',
    'nav.stats': '統計',
    'nav.contact': 'お問い合わせ',
    'nav.search_insight': 'インサイト検索',
    'nav.search_placeholder': 'デザインのトピックや質問を検索...',
    'nav.theme_toggle': 'テーマ切替',
    'nav.theme_light': 'ライトモード',
    'nav.theme_dark': 'ダークモード',
    'nav.lang_toggle': '言語を選択',
    'nav.back_to_home': 'ホームに戻る',

    // Hero
    'hero.badge': 'グラフィック＆UI/UXデザイナー',
    'hero.title1': 'ようこそ',
    'hero.title2': 'デザインポートフォリオ',
    'hero.view_works': '作品を見る',
    'hero.contact_btn': 'お問い合わせ',

    // About
    'about.available': 'フリーランス受付中',
    'about.copy_wa': 'クリックしてWhatsApp番号をコピー',
    'about.copied': 'コピー完了',
    'about.view_cv': '履歴書を見る',
    'about.location': '北シンジャイ（インドネシア）',

    // Portfolio
    'portfolio.title': '作品ギャラリー',
    'portfolio.subtitle': 'グラフィックデザイン、ポスター、ビジュアルブランドの探求。',
    'portfolio.all': 'すべて',
    'portfolio.search': '作品を検索...',
    'portfolio.no_results': '作品が見つかりません',
    'portfolio.view_details': '詳細を見る',
    'portfolio.share': '共有',

    // Store
    'store.title': 'デザインサービスを依頼',
    'store.subtitle': 'スピーディで高品質なプロのデザインパッケージをご提供。',
    'store.order_btn': '今すぐ依頼',
    'store.form_name': 'お名前',
    'store.form_wa': 'WhatsApp番号',
    'store.form_notes': '注文内容・ご要望',
    'store.send_wa': 'WhatsAppで注文を送信',

    // Experience
    'experience.title': '経歴・実績',
    'experience.subtitle': 'キャリアの歩み、プロジェクト連携、クリエイティブな成果。',
    'experience.download_cv': '履歴書をダウンロード',

    // Stats
    'stats.title': 'ポートフォリオ統計',
    'stats.visits': '総アクセス数',
    'stats.projects': '完了プロジェクト',
    'stats.satisfaction': '顧客満足度',
    'stats.hours': '制作時間',

    // Contact
    'contact.title': 'お問い合わせ',
    'contact.subtitle': 'あなたのクリエイティブなプロジェクトのアイデアを一緒に形にしましょう。',
    'contact.name': 'お名前',
    'contact.email': 'メールアドレス',
    'contact.message': 'メッセージ',
    'contact.send': 'メッセージを送信',
    'contact.success': '送信完了！',

    // Insight
    'insight.title': 'デザインインサイト＆Q&A',
    'insight.subtitle': '色彩トレンド、ブランディングのコツ、制作フローに関する厳選されたQ&A。',
    'insight.select_hint': '質問を選択して詳細とビジュアルリファレンスを確認。',
    'insight.back_btn': '質問一覧に戻る',
    'insight.answers_title': '回答とインサイト',
    'insight.visuals_title': '画像とビジュアル参考',
    'insight.loading': 'コンテンツを読み込み中',
    'insight.no_results': '該当する質問は見つかりませんでした。',

    // Common
    'common.back_home': 'ホームに戻る',
    'common.close': '閉じる',
    'common.loading': 'コンテンツを読み込み中',
    'common.rights': '無断転載を禁じます。',
  },

  zh: {
    // Nav
    'nav.about': '关于我',
    'nav.home': '首页',
    'nav.portfolio': '作品集',
    'nav.experience': '经验',
    'nav.order': '订购',
    'nav.stats': '统计',
    'nav.contact': '联系',
    'nav.search_insight': '搜索见解',
    'nav.search_placeholder': '搜索设计主题或问题...',
    'nav.theme_toggle': '切换主题',
    'nav.theme_light': '浅色模式',
    'nav.theme_dark': '深色模式',
    'nav.lang_toggle': '选择语言',
    'nav.back_to_home': '返回首页',

    // Hero
    'hero.badge': '平面与UI/UX设计师',
    'hero.title1': '欢迎访问',
    'hero.title2': '我的设计作品集',
    'hero.view_works': '浏览作品',
    'hero.contact_btn': '联系我',

    // About
    'about.available': '接受自由职业接单',
    'about.copy_wa': '点击复制WhatsApp号码',
    'about.copied': '已复制',
    'about.view_cv': '查看完整简历',
    'about.location': '印尼北辛贾伊',

    // Portfolio
    'portfolio.title': '作品画廊',
    'portfolio.subtitle': '探索平面设计、创意海报与视觉品牌作品。',
    'portfolio.all': '全部',
    'portfolio.search': '搜索作品...',
    'portfolio.no_results': '未找到作品',
    'portfolio.view_details': '查看详情',
    'portfolio.share': '分享',

    // Store
    'store.title': '订购设计服务',
    'store.subtitle': '选择高质高效的专业平面设计服务方案。',
    'store.order_btn': '立即下单',
    'store.form_name': '全名',
    'store.form_wa': 'WhatsApp号码',
    'store.form_notes': '订单要求与备注',
    'store.send_wa': '通过WhatsApp发送订单',

    // Experience
    'experience.title': '从业经历',
    'experience.subtitle': '职业发展历程、项目合作与创意成果。',
    'experience.download_cv': '下载简历',

    // Stats
    'stats.title': '作品集统计',
    'stats.visits': '总访问量',
    'stats.projects': '完成项目',
    'stats.satisfaction': '客户满意度',
    'stats.hours': '设计工时',

    // Contact
    'contact.title': '联系我',
    'contact.subtitle': '让我们一起探讨您的创意设计构想。',
    'contact.name': '全名',
    'contact.email': '电子邮箱',
    'contact.message': '您的留言',
    'contact.send': '发送留言',
    'contact.success': '消息已发送！',

    // Insight
    'insight.title': '设计见解与问答',
    'insight.subtitle': '探索色彩趋势、品牌策略与设计流程的精选回答。',
    'insight.select_hint': '选择问题查看详细解答及视觉参考图。',
    'insight.back_btn': '返回问题列表',
    'insight.answers_title': '解答与见解',
    'insight.visuals_title': '图片与视觉参考',
    'insight.loading': '正在加载内容',
    'insight.no_results': '没有符合您搜索条件的问题。',

    // Common
    'common.back_home': '返回首页',
    'common.close': '关闭',
    'common.loading': '正在加载内容',
    'common.rights': '版权所有，保留一切权利。',
  },

  es: {
    // Nav
    'nav.about': 'Sobre mí',
    'nav.home': 'Inicio',
    'nav.portfolio': 'Obras',
    'nav.experience': 'Experiencia',
    'nav.order': 'Pedir',
    'nav.stats': 'Estadísticas',
    'nav.contact': 'Contacto',
    'nav.search_insight': 'Buscar Insights',
    'nav.search_placeholder': 'Buscar temas o preguntas de diseño...',
    'nav.theme_toggle': 'Cambiar tema',
    'nav.theme_light': 'Modo Claro',
    'nav.theme_dark': 'Modo Oscuro',
    'nav.lang_toggle': 'Seleccionar idioma',
    'nav.back_to_home': 'Volver al Inicio',

    // Hero
    'hero.badge': 'DISEÑADOR GRÁFICO Y UI/UX',
    'hero.title1': 'BIENVENIDO',
    'hero.title2': 'MI PORTAFOLIO DE DISEÑO',
    'hero.view_works': 'Ver Obras',
    'hero.contact_btn': 'Contacto',

    // About
    'about.available': 'Disponible para Freelance',
    'about.copy_wa': 'Haz clic para copiar WhatsApp',
    'about.copied': 'Copiado',
    'about.view_cv': 'Ver CV Completo',
    'about.location': 'Sinjai del Norte, Indonesia',

    // Portfolio
    'portfolio.title': 'Galería de Obras',
    'portfolio.subtitle': 'Exploración de diseño gráfico, carteles creativos e identidad visual.',
    'portfolio.all': 'Todos',
    'portfolio.search': 'Buscar obras...',
    'portfolio.no_results': 'No se encontraron obras',
    'portfolio.view_details': 'Ver Detalles',
    'portfolio.share': 'Compartir',

    // Store
    'store.title': 'Solicitar Servicios de Diseño',
    'store.subtitle': 'Elige paquetes de diseño gráfico profesional con entrega rápida y máxima calidad.',
    'store.order_btn': 'Pedir Ahora',
    'store.form_name': 'Nombre Completo',
    'store.form_wa': 'Número de WhatsApp',
    'store.form_notes': 'Detalles del Pedido / Notas',
    'store.send_wa': 'Enviar Pedido por WhatsApp',

    // Experience
    'experience.title': 'Trayectoria y Experiencia',
    'experience.subtitle': 'Trayectoria profesional, colaboraciones en proyectos y aportes creativos.',
    'experience.download_cv': 'Descargar CV',

    // Stats
    'stats.title': 'Estadísticas del Portafolio',
    'stats.visits': 'Visitas Totales',
    'stats.projects': 'Proyectos Completados',
    'stats.satisfaction': 'Satisfacción del Cliente',
    'stats.hours': 'Horas de Diseño',

    // Contact
    'contact.title': 'Contáctame',
    'contact.subtitle': 'Conversemos sobre tus ideas y proyectos creativos.',
    'contact.name': 'Nombre Completo',
    'contact.email': 'Correo Electrónico',
    'contact.message': 'Tu Mensaje',
    'contact.send': 'Enviar Mensaje',
    'contact.success': '¡Mensaje Enviado!',

    // Insight
    'insight.title': 'Insights y Preguntas Frecuentes',
    'insight.subtitle': 'Explora respuestas curadas sobre tendencias de color, branding y procesos creativos.',
    'insight.select_hint': 'Selecciona una pregunta para ver el detalle y referencias visuales.',
    'insight.back_btn': 'Volver a la lista de preguntas',
    'insight.answers_title': 'Respuesta e Insights',
    'insight.visuals_title': 'Imágenes y Referencias Visuales',
    'insight.loading': 'Cargando contenido',
    'insight.no_results': 'No se encontraron preguntas que coincidan con la búsqueda.',

    // Common
    'common.back_home': 'Volver al Inicio',
    'common.close': 'Cerrar',
    'common.loading': 'Cargando contenido',
    'common.rights': 'Todos los derechos reservados.',
  },

  ar: {
    // Nav
    'nav.about': 'نبذة عني',
    'nav.home': 'الرئيسية',
    'nav.portfolio': 'الأعمال',
    'nav.experience': 'الخبرات',
    'nav.order': 'طلب',
    'nav.stats': 'الإحصائيات',
    'nav.contact': 'اتصل بنا',
    'nav.search_insight': 'بحث عن أفكار',
    'nav.search_placeholder': 'ابحث عن مواضيع أو أسئلة في التصميم...',
    'nav.theme_toggle': 'تبديل المظهر',
    'nav.theme_light': 'الوضع الفاتح',
    'nav.theme_dark': 'الوضع الداكن',
    'nav.lang_toggle': 'اختر اللغة',
    'nav.back_to_home': 'العودة للرئيسية',

    // Hero
    'hero.badge': 'مصمم جرافيك وواجهات مستخدم',
    'hero.title1': 'أهلاً وسهلاً',
    'hero.title2': 'معرض أعمالي وتصاميمي',
    'hero.view_works': 'مشاهدة الأعمال',
    'hero.contact_btn': 'تواصل معي',

    // About
    'about.available': 'متاح للعمل الحر',
    'about.copy_wa': 'انقر لنسخ رقم واتساب',
    'about.copied': 'تم النسخ',
    'about.view_cv': 'عرض السيرة الذاتية',
    'about.location': 'شمال سينجاي، إندونيسيا',

    // Portfolio
    'portfolio.title': 'معرض الأعمال',
    'portfolio.subtitle': 'استكشف أعمال التصميم الجرافيكي والملصقات الإبداعية والهوية البصرية.',
    'portfolio.all': 'الكل',
    'portfolio.search': 'ابحث عن عمل...',
    'portfolio.no_results': 'لم يتم العثور على أعمال',
    'portfolio.view_details': 'عرض التفاصيل',
    'portfolio.share': 'مشاركة',

    // Store
    'store.title': 'طلب خدمات التصميم',
    'store.subtitle': 'اختر باقات تصميم جرافيكي احترافية بتسليم سريع وجودة فائقة.',
    'store.order_btn': 'اطلب الآن',
    'store.form_name': 'الاسم بالكامل',
    'store.form_wa': 'رقم واتساب',
    'store.form_notes': 'تفاصيل الطلب وملاحظات',
    'store.send_wa': 'إرسال الطلب عبر واتساب',

    // Experience
    'experience.title': 'سجل الخبرات',
    'experience.subtitle': 'مسيرة مهنية وتعاون في مشاريع وإنجازات إبداعية متنوعة.',
    'experience.download_cv': 'تحميل السيرة الذاتية',

    // Stats
    'stats.title': 'إحصائيات المعرض',
    'stats.visits': 'إجمالي الزيارات',
    'stats.projects': 'المشاريع المنجزة',
    'stats.satisfaction': 'رضا العملاء',
    'stats.hours': 'ساعات التصميم',

    // Contact
    'contact.title': 'تواصل معي',
    'contact.subtitle': 'دعنا نناقش أفكار مشروعك الإبداعي معاً.',
    'contact.name': 'الاسم بالكامل',
    'contact.email': 'البريد الإلكتروني',
    'contact.message': 'رسالتك',
    'contact.send': 'إرسال الرسالة',
    'contact.success': 'تم الإرسال بنجاح!',

    // Insight
    'insight.title': 'أفكار وأسئلة شائعة في التصميم',
    'insight.subtitle': 'إجابات مختارة بعناية حول اتجاهات الألوان ونصائح الهوية ومسار العمل الإبداعي.',
    'insight.select_hint': 'اختر سؤالاً لقراءة التفاصيل ومشاهدة الصور المرجعية.',
    'insight.back_btn': 'العودة لقائمة الأسئلة',
    'insight.answers_title': 'الإجابة والرؤى الإبداعية',
    'insight.visuals_title': 'الصور والمراجع البصرية',
    'insight.loading': 'جاري تحميل المحتوى',
    'insight.no_results': 'لا توجد أسئلة تطابق بحثك.',

    // Common
    'common.back_home': 'العودة للرئيسية',
    'common.close': 'إغلاق',
    'common.loading': 'جاري تحميل المحتوى',
    'common.rights': 'جميع الحقوق محفوظة.',
  },

  fr: {
    // Nav
    'nav.about': 'À propos',
    'nav.home': 'Accueil',
    'nav.portfolio': 'Réalisations',
    'nav.experience': 'Expérience',
    'nav.order': 'Commander',
    'nav.stats': 'Statistiques',
    'nav.contact': 'Contact',
    'nav.search_insight': 'Recherche d\'insights',
    'nav.search_placeholder': 'Rechercher des thèmes ou questions...',
    'nav.theme_toggle': 'Changer de thème',
    'nav.theme_light': 'Mode Clair',
    'nav.theme_dark': 'Mode Sombre',
    'nav.lang_toggle': 'Choisir la langue',
    'nav.back_to_home': 'Retour à l\'accueil',

    // Hero
    'hero.badge': 'DESIGNER GRAPHIQUE & UI/UX',
    'hero.title1': 'BIENVENUE',
    'hero.title2': 'MON PORTFOLIO DESIGN',
    'hero.view_works': 'Voir les travaux',
    'hero.contact_btn': 'Contacter',

    // About
    'about.available': 'Disponible en Freelance',
    'about.copy_wa': 'Cliquer pour copier le numéro WhatsApp',
    'about.copied': 'Copié',
    'about.view_cv': 'Voir le CV complet',
    'about.location': 'Sinjai Nord, Indonésie',

    // Portfolio
    'portfolio.title': 'Galerie de créations',
    'portfolio.subtitle': 'Exploration de design graphique, affiches créatives et identité visuelle.',
    'portfolio.all': 'Tous',
    'portfolio.search': 'Rechercher...',
    'portfolio.no_results': 'Aucun résultat trouvé',
    'portfolio.view_details': 'Voir les détails',
    'portfolio.share': 'Partager',

    // Store
    'store.title': 'Commander des services de design',
    'store.subtitle': 'Choisissez des forfaits de design graphique professionnels de haute qualité.',
    'store.order_btn': 'Commander',
    'store.form_name': 'Nom complet',
    'store.form_wa': 'Numéro WhatsApp',
    'store.form_notes': 'Détails de la commande / Notes',
    'store.send_wa': 'Envoyer la commande via WhatsApp',

    // Experience
    'experience.title': 'Parcours & Expérience',
    'experience.subtitle': 'Parcours professionnel, projets collaboratifs et réalisations créatives.',
    'experience.download_cv': 'Télécharger le CV',

    // Stats
    'stats.title': 'Statistiques du portfolio',
    'stats.visits': 'Visites totales',
    'stats.projects': 'Projets terminés',
    'stats.satisfaction': 'Satisfaction client',
    'stats.hours': 'Heures de design',

    // Contact
    'contact.title': 'Me Contacter',
    'contact.subtitle': 'Discutons ensemble de vos idées de projets créatifs.',
    'contact.name': 'Nom complet',
    'contact.email': 'Adresse e-mail',
    'contact.message': 'Votre message',
    'contact.send': 'Envoyer le message',
    'contact.success': 'Message envoyé !',

    // Insight
    'insight.title': 'Insights & FAQ Design',
    'insight.subtitle': 'Découvrez des réponses sélectionnées sur les tendances de couleur et le branding.',
    'insight.select_hint': 'Sélectionnez une question pour afficher les détails et références visuelles.',
    'insight.back_btn': 'Retour à la liste des questions',
    'insight.answers_title': 'Réponse & Perspectives',
    'insight.visuals_title': 'Images & Références visuelles',
    'insight.loading': 'Chargement du contenu',
    'insight.no_results': 'Aucune question ne correspond à votre recherche.',

    // Common
    'common.back_home': 'Retour à l\'accueil',
    'common.close': 'Fermer',
    'common.loading': 'Chargement...',
    'common.rights': 'Tous droits réservés.',
  },

  de: {
    // Nav
    'nav.about': 'Über mich',
    'nav.home': 'Startseite',
    'nav.portfolio': 'Werke',
    'nav.experience': 'Erfahrung',
    'nav.order': 'Bestellen',
    'nav.stats': 'Statistiken',
    'nav.contact': 'Kontakt',
    'nav.search_insight': 'Insights suchen',
    'nav.search_placeholder': 'Design-Themen oder Fragen suchen...',
    'nav.theme_toggle': 'Design wechseln',
    'nav.theme_light': 'Heller Modus',
    'nav.theme_dark': 'Dunkler Modus',
    'nav.lang_toggle': 'Sprache wählen',
    'nav.back_to_home': 'Zurück zur Startseite',

    // Hero
    'hero.badge': 'GRAFIK- & UI/UX-DESIGNER',
    'hero.title1': 'WILLKOMMEN',
    'hero.title2': 'MEIN DESIGN-PORTFOLIO',
    'hero.view_works': 'Werke ansehen',
    'hero.contact_btn': 'Kontaktieren',

    // About
    'about.available': 'Verfügbar für Freelance',
    'about.copy_wa': 'Klicken, um WhatsApp-Nummer zu kopieren',
    'about.copied': 'Kopiert',
    'about.view_cv': 'Vollständigen Lebenslauf ansehen',
    'about.location': 'Nord-Sinjai, Indonesien',

    // Portfolio
    'portfolio.title': 'Werksgalerie',
    'portfolio.subtitle': 'Erkundung von Grafikdesign, kreativen Plakaten und visueller Markenidentität.',
    'portfolio.all': 'Alle',
    'portfolio.search': 'Werke suchen...',
    'portfolio.no_results': 'Keine Werke gefunden',
    'portfolio.view_details': 'Details ansehen',
    'portfolio.share': 'Teilen',

    // Store
    'store.title': 'Design-Services bestellen',
    'store.subtitle': 'Wählen Sie professionelle Grafikdesign-Pakete mit schneller Fertigstellung.',
    'store.order_btn': 'Jetzt bestellen',
    'store.form_name': 'Vollständiger Name',
    'store.form_wa': 'WhatsApp-Nummer',
    'store.form_notes': 'Bestelldetails / Notizen',
    'store.send_wa': 'Bestellung per WhatsApp senden',

    // Experience
    'experience.title': 'Erfahrungsverlauf',
    'experience.subtitle': 'Beruflicher Werdegang, Projektzusammenarbeit und kreative Beiträge.',
    'experience.download_cv': 'Lebenslauf herunterladen',

    // Stats
    'stats.title': 'Portfolio-Statistiken',
    'stats.visits': 'Gesamtaufrufe',
    'stats.projects': 'Abgeschlossene Projekte',
    'stats.satisfaction': 'Kundenzufriedenheit',
    'stats.hours': 'Design-Stunden',

    // Contact
    'contact.title': 'Kontakt aufnehmen',
    'contact.subtitle': 'Lassen Sie uns gemeinsam über Ihre kreativen Projektideen sprechen.',
    'contact.name': 'Vollständiger Name',
    'contact.email': 'E-Mail-Adresse',
    'contact.message': 'Ihre Nachricht',
    'contact.send': 'Nachricht senden',
    'contact.success': 'Nachricht gesendet!',

    // Insight
    'insight.title': 'Design-Insights & FAQ',
    'insight.subtitle': 'Kuratierte Antworten zu Farbtrends, Branding-Tipps und kreativen Arbeitsabläufen.',
    'insight.select_hint': 'Wählen Sie eine Frage, um Details und visuelle Referenzen anzuzeigen.',
    'insight.back_btn': 'Zurück zur Fragenliste',
    'insight.answers_title': 'Antwort & Einblicke',
    'insight.visuals_title': 'Bilder & Visuelle Referenzen',
    'insight.loading': 'Inhalt wird geladen',
    'insight.no_results': 'Keine passenden Fragen gefunden.',

    // Common
    'common.back_home': 'Zurück zur Startseite',
    'common.close': 'Schließen',
    'common.loading': 'Wird geladen...',
    'common.rights': 'Alle Rechte vorbehalten.',
  },

  pt: {
    // Nav
    'nav.about': 'Sobre mim',
    'nav.home': 'Início',
    'nav.portfolio': 'Projetos',
    'nav.experience': 'Experiência',
    'nav.order': 'Pedir',
    'nav.stats': 'Estatísticas',
    'nav.contact': 'Contato',
    'nav.search_insight': 'Buscar Insights',
    'nav.search_placeholder': 'Buscar temas ou dúvidas de design...',
    'nav.theme_toggle': 'Mudar tema',
    'nav.theme_light': 'Modo Claro',
    'nav.theme_dark': 'Modo Escuro',
    'nav.lang_toggle': 'Selecionar idioma',
    'nav.back_to_home': 'Voltar ao Início',

    // Hero
    'hero.badge': 'DESIGNER GRÁFICO E UI/UX',
    'hero.title1': 'BEM-VINDO',
    'hero.title2': 'MEU PORTFÓLIO DE DESIGN',
    'hero.view_works': 'Ver Trabalhos',
    'hero.contact_btn': 'Contato',

    // About
    'about.available': 'Disponível para Freelance',
    'about.copy_wa': 'Clique para copiar o WhatsApp',
    'about.copied': 'Copiado',
    'about.view_cv': 'Ver CV Completo',
    'about.location': 'Sinjai do Norte, Indonésia',

    // Portfolio
    'portfolio.title': 'Galeria de Projetos',
    'portfolio.subtitle': 'Exploração de design gráfico, pôsteres criativos e identidade visual.',
    'portfolio.all': 'Todos',
    'portfolio.search': 'Buscar projetos...',
    'portfolio.no_results': 'Nenhum projeto encontrado',
    'portfolio.view_details': 'Ver Detalhes',
    'portfolio.share': 'Compartilhar',

    // Store
    'store.title': 'Solicitar Serviços de Design',
    'store.subtitle': 'Escolha pacotes profissionais de design gráfico com rapidez e qualidade.',
    'store.order_btn': 'Pedir Agora',
    'store.form_name': 'Nome Completo',
    'store.form_wa': 'Número de WhatsApp',
    'store.form_notes': 'Detalhes do Pedido / Notas',
    'store.send_wa': 'Enviar Pedido via WhatsApp',

    // Experience
    'experience.title': 'Histórico de Experiência',
    'experience.subtitle': 'Trajetória profissional, parcerias em projetos e criações visuais.',
    'experience.download_cv': 'Baixar CV',

    // Stats
    'stats.title': 'Estatísticas do Portfólio',
    'stats.visits': 'Total de Visitas',
    'stats.projects': 'Projetos Concluídos',
    'stats.satisfaction': 'Satisfação do Cliente',
    'stats.hours': 'Horas de Design',

    // Contact
    'contact.title': 'Fale Comigo',
    'contact.subtitle': 'Vamos conversar sobre suas ideias e projetos criativos.',
    'contact.name': 'Nome Completo',
    'contact.email': 'E-mail',
    'contact.message': 'Sua Mensagem',
    'contact.send': 'Enviar Mensagem',
    'contact.success': 'Mensagem Enviada!',

    // Insight
    'insight.title': 'Insights e Perguntas de Design',
    'insight.subtitle': 'Explore respostas selecionadas sobre tendências de cores, branding e criação.',
    'insight.select_hint': 'Selecione uma pergunta para ver detalhes e referências visuais.',
    'insight.back_btn': 'Voltar à lista de perguntas',
    'insight.answers_title': 'Resposta e Insights',
    'insight.visuals_title': 'Imagens e Referências Visuais',
    'insight.loading': 'Carregando conteúdo',
    'insight.no_results': 'Nenhuma pergunta encontrada para sua busca.',

    // Common
    'common.back_home': 'Voltar ao Início',
    'common.close': 'Fechar',
    'common.loading': 'Carregando...',
    'common.rights': 'Todos os direitos reservados.',
  },

  ko: {
    // Nav
    'nav.about': '소개',
    'nav.home': '홈',
    'nav.portfolio': '작품',
    'nav.experience': '경력',
    'nav.order': '주문',
    'nav.stats': '통계',
    'nav.contact': '연락처',
    'nav.search_insight': '인사이트 검색',
    'nav.search_placeholder': '디자인 주제나 질문 검색...',
    'nav.theme_toggle': '테마 변경',
    'nav.theme_light': '라이트 모드',
    'nav.theme_dark': '다크 모드',
    'nav.lang_toggle': '언어 선택',
    'nav.back_to_home': '홈으로 돌아가기',

    // Hero
    'hero.badge': '그래픽 & UI/UX 디자이너',
    'hero.title1': '환영합니다',
    'hero.title2': '디자인 포트폴리오',
    'hero.view_works': '작품 보기',
    'hero.contact_btn': '문의하기',

    // About
    'about.available': '프리랜서 작업 가능',
    'about.copy_wa': 'WhatsApp 번호 복사',
    'about.copied': '복사됨',
    'about.view_cv': '전체 이력서 보기',
    'about.location': '인도네시아 북신자이',

    // Portfolio
    'portfolio.title': '작품 갤러리',
    'portfolio.subtitle': '그래픽 디자인, 크리에이티브 포스터, 비주얼 브랜딩 탐색.',
    'portfolio.all': '전체',
    'portfolio.search': '작품 검색...',
    'portfolio.no_results': '작품을 찾을 수 없습니다',
    'portfolio.view_details': '자세히 보기',
    'portfolio.share': '공유',

    // Store
    'store.title': '디자인 서비스 주문',
    'store.subtitle': '빠른 작업과 뛰어난 퀄리티의 전문 그래픽 디자인 패키지.',
    'store.order_btn': '지금 주문하기',
    'store.form_name': '성명',
    'store.form_wa': 'WhatsApp 번호',
    'store.form_notes': '주문 상세 / 요청사항',
    'store.send_wa': 'WhatsApp으로 주문 전송',

    // Experience
    'experience.title': '경력 및 이력',
    'experience.subtitle': '경력 여정, 프로젝트 협업 및 창의적 성과.',
    'experience.download_cv': '이력서 다운로드',

    // Stats
    'stats.title': '포트폴리오 통계',
    'stats.visits': '총 방문자 수',
    'stats.projects': '완료된 프로젝트',
    'stats.satisfaction': '고객 만족도',
    'stats.hours': '디자인 작업 시간',

    // Contact
    'contact.title': '연락하기',
    'contact.subtitle': '창의적인 프로젝트 아이디어를 함께 나누어 보세요.',
    'contact.name': '성명',
    'contact.email': '이메일',
    'contact.message': '메시지',
    'contact.send': '메시지 보내기',
    'contact.success': '전송 완료!',

    // Insight
    'insight.title': '디자인 인사이트 & Q&A',
    'insight.subtitle': '컬러 트렌드, 브랜딩 팁, 디자인 프로세스에 관한 엄선된 질문과 답변.',
    'insight.select_hint': '질문을 선택하여 상세 내용과 시각적 레퍼런스를 확인하세요.',
    'insight.back_btn': '질문 목록으로 돌아가기',
    'insight.answers_title': '답변 및 인사이트',
    'insight.visuals_title': '이미지 및 시각 자료',
    'insight.loading': '콘텐츠 불러오는 중',
    'insight.no_results': '검색된 질문이 없습니다.',

    // Common
    'common.back_home': '홈으로 돌아가기',
    'common.close': '닫기',
    'common.loading': '로딩 중...',
    'common.rights': '모든 권리 보유.',
  },
};

import { translateDynamicSync, fetchDynamicTranslation } from '../lib/dynamicTranslator';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  translateDynamic: (text: string) => string;
  translateAsync: (text: string) => Promise<string>;
  languages: LanguageInfo[];
  currentLangInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const fromCookie = getCookie('app-language') as LanguageCode | null;
    const validCodes: LanguageCode[] = ['id', 'en', 'ja', 'zh', 'es', 'ar', 'fr', 'de', 'pt', 'ko'];
    if (fromCookie && validCodes.includes(fromCookie)) {
      return fromCookie;
    }
    const saved = localStorage.getItem('app-language') as LanguageCode | null;
    if (saved && validCodes.includes(saved)) {
      return saved;
    }
    return 'id';
  });

  const [, setTranslationVersion] = useState(0);

  useEffect(() => {
    const handleTransUpdate = () => {
      setTranslationVersion(v => v + 1);
    };
    window.addEventListener('app_translation_updated', handleTransUpdate);
    return () => window.removeEventListener('app_translation_updated', handleTransUpdate);
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
    setCookie('app-language', lang, { days: 365 });
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', language);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.code === language);
    if (langObj?.dir === 'rtl') {
      root.setAttribute('dir', 'rtl');
    } else {
      root.removeAttribute('dir');
    }
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const currentDict = translations[language] || translations.id;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to id or provided fallback or key
    if (translations.id[key]) {
      return translations.id[key];
    }
    return fallback !== undefined ? fallback : key;
  };

  const translateDynamic = (text: string): string => {
    if (!text || language === 'id') return text;
    return translateDynamicSync(text, language);
  };

  const translateAsync = async (text: string): Promise<string> => {
    if (!text || language === 'id') return text;
    return fetchDynamicTranslation(text, language);
  };

  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      translateDynamic,
      translateAsync,
      languages: SUPPORTED_LANGUAGES,
      currentLangInfo
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

