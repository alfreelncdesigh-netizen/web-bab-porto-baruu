import { LanguageCode } from '../contexts/LanguageContext';

// Comprehensive dictionary for instant 0ms translation of known terms & default content
export const BUILTIN_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, string>>> = {
  // Categories & Topics
  'Semua': {
    en: 'All', ja: 'すべて', zh: '全部', es: 'Todos', ar: 'الكل', fr: 'Tous', de: 'Alle', pt: 'Todos', ko: '전체'
  },
  'Tren Warna': {
    en: 'Color Trends', ja: 'カラートレンド', zh: '色彩趋势', es: 'Tendencias de Color', ar: 'اتجاهات الألوان', fr: 'Tendances Couleur', de: 'Farbtrends', pt: 'Tendências de Cor', ko: '색상 트렌드'
  },
  'Tren Desain': {
    en: 'Design Trends', ja: 'デザイントレンド', zh: '设计趋势', es: 'Tendencias de Diseño', ar: 'اتجاهات التصميم', fr: 'Tendances Design', de: 'Designtrends', pt: 'Tendências de Design', ko: '디자인 트렌드'
  },
  'Tips Branding': {
    en: 'Branding Tips', ja: 'ブランディングのヒント', zh: '品牌打造技巧', es: 'Consejos de Marca', ar: 'نصائح العلامة التجارية', fr: 'Conseils de Marque', de: 'Branding-Tipps', pt: 'Dicas de Branding', ko: '브랜딩 팁'
  },
  'Jasa & Order': {
    en: 'Services & Orders', ja: 'サービス＆注文', zh: '服务与下单', es: 'Servicios y Pedidos', ar: 'الخدمات والطلبات', fr: 'Services & Commandes', de: 'Dienste & Bestellungen', pt: 'Serviços e Pedidos', ko: '서비스 및 주문'
  },
  'Panduan Order': {
    en: 'Order Guide', ja: '注文ガイド', zh: '下单指南', es: 'Guía de Pedido', ar: 'دليل الطلب', fr: 'Guide de Commande', de: 'Bestellanleitung', pt: 'Guia de Pedido', ko: '주문 가이드'
  },
  'Postingan Instagram': {
    en: 'Instagram Posts', ja: 'Instagram投稿', zh: 'Instagram 帖子', es: 'Publicaciones de Instagram', ar: 'منشورات إنستغرام', fr: 'Publications Instagram', de: 'Instagram-Beiträge', pt: 'Posts do Instagram', ko: '인스타그램 포스트'
  },
  'Poster Promosi': {
    en: 'Promo Posters', ja: 'プロモーションポスター', zh: '宣传海报', es: 'Pósteres Promocionales', ar: 'ملصقات ترويجية', fr: 'Affiches Promotionnelles', de: 'Werbeposter', pt: 'Cartazes Promocionais', ko: '프로모션 포스터'
  },
  'Poster': {
    en: 'Poster', ja: 'ポスター', zh: '海报', es: 'Póster', ar: 'ملصق', fr: 'Affiche', de: 'Poster', pt: 'Cartaz', ko: '포스터'
  },
  'Identitas Visual': {
    en: 'Visual Identity', ja: 'ビジュアルアイデンティティ', zh: '视觉识别', es: 'Identidad Visual', ar: 'الهوية البصرية', fr: 'Identité Visuelle', de: 'Visuelle Identität', pt: 'Identidade Visual', ko: '시각적 아이덴티티'
  },
  'Mockup 3D': {
    en: '3D Mockup', ja: '3Dモックアップ', zh: '3D 模型', es: 'Mockup 3D', ar: 'نماذج ثلاثية الأبعاد', fr: 'Maquette 3D', de: '3D-Mockup', pt: 'Mockup 3D', ko: '3D 목업'
  },
  'Desain Grafis': {
    en: 'Graphic Design', ja: 'グラフィックデザイン', zh: '平面设计', es: 'Diseño Gráfico', ar: 'التصميم الجرافيكي', fr: 'Design Graphique', de: 'Grafikdesign', pt: 'Design Gráfico', ko: '그래픽 디자인'
  },
  'Desain Logo': {
    en: 'Logo Design', ja: 'ロゴデザイン', zh: '标志设计', es: 'Diseño de Logo', ar: 'تصميم الشعار', fr: 'Design de Logo', de: 'Logo-Design', pt: 'Design de Logotipo', ko: '로고 디자인'
  },
  'UI/UX': {
    en: 'UI/UX', ja: 'UI/UX', zh: 'UI/UX', es: 'UI/UX', ar: 'UI/UX', fr: 'UI/UX', de: 'UI/UX', pt: 'UI/UX', ko: 'UI/UX'
  },
  'Branding': {
    en: 'Branding', ja: 'ブランディング', zh: '品牌设计', es: 'Branding', ar: 'العلامة التجارية', fr: 'Branding', de: 'Branding', pt: 'Branding', ko: '브랜딩'
  },
  'Web Design': {
    en: 'Web Design', ja: 'ウェブデザイン', zh: '网页设计', es: 'Diseño Web', ar: 'تصميم الويب', fr: 'Web Design', de: 'Webdesign', pt: 'Web Design', ko: '웹 디자인'
  },
  'PowerPoint': {
    en: 'PowerPoint', ja: 'PowerPoint', zh: 'PowerPoint', es: 'PowerPoint', ar: 'باوربوينت', fr: 'PowerPoint', de: 'PowerPoint', pt: 'PowerPoint', ko: '파워포인트'
  },

  // Common Tags
  '#Warna': { en: '#Color', ja: '#カラー', zh: '#色彩', es: '#Color', ar: '#لون', fr: '#Couleur', de: '#Farbe', pt: '#Cor', ko: '#색상' },
  '#Branding': { en: '#Branding', ja: '#ブランディング', zh: '#品牌', es: '#Branding', ar: '#علامة_تجارية', fr: '#Branding', de: '#Branding', pt: '#Branding', ko: '#브랜딩' },
  '#Desain2026': { en: '#Design2026', ja: '#デザイン2026', zh: '#设计2026', es: '#Diseño2026', ar: '#تصميم2026', fr: '#Design2026', de: '#Design2026', pt: '#Design2026', ko: '#디자인2026' },
  'Tren Warna, Palet Warna, Desain Grafis': {
    en: 'Color Trends, Color Palette, Graphic Design',
    ja: 'カラートレンド, カラーパレット, グラフィックデザイン',
    zh: '色彩趋势, 配色方案, 平面设计',
    es: 'Tendencias de Color, Paleta de Colores, Diseño Gráfico',
    ar: 'اتجاهات الألوان, لوحة الألوان, التصميم الجرافيكي',
    fr: 'Tendances Couleur, Palette de Couleurs, Design Graphique',
    de: 'Farbtrends, Farbpalette, Grafikdesign',
    pt: 'Tendências de Cor, Paleta de Cores, Design Gráfico',
    ko: '색상 트렌드, 색상 팔레트, 그래픽 디자인'
  },

  // Initial Insight Questions
  'Warna apa saja yang sedang mendominasi tren desain grafis & digital branding saat ini?': {
    en: 'What colors are currently dominating graphic design & digital branding trends?',
    ja: '現在、グラフィックデザインやデジタルブランディングのトレンドを支配している色はどれですか？',
    zh: '当前哪些色彩主导着平面设计与数字化品牌趋势？',
    es: '¿Qué colores dominan actualmente las tendencias de diseño gráfico y branding digital?',
    ar: 'ما هي الألوان التي تهيمن حاليًا على اتجاهات التصميم الجرافيكي والهوية الرقمية؟',
    fr: 'Quelles couleurs dominent actuellement les tendances du graphisme et du branding numérique ?',
    de: 'Welche Farben dominieren derzeit die Trends im Grafikdesign & digitalen Branding?',
    pt: 'Quais cores estão dominando as tendências de design gráfico e branding digital atualmente?',
    ko: '현재 그래픽 디자인과 디지털 브랜딩 트렌드를 지배하는 색상은 무엇인가요?'
  },
  'Bagaimana rumus 60-30-10 diterapkan dalam pemilihan warna identitas visual?': {
    en: 'How is the 60-30-10 rule applied in visual identity color selection?',
    ja: 'ビジュアルアイデンティティのカラー選定において、60-30-10の法則はどのように適用されますか？',
    zh: '在视觉识别色彩选择中，60-30-10 法则是如何应用的？',
    es: '¿Cómo se aplica la regla 60-30-10 en la selección de colores de identidad visual?',
    ar: 'كيف تُطبق قاعدة 60-30-10 في اختيار ألوان الهوية البصرية؟',
    fr: 'Comment la règle 60-30-10 est-elle appliquée dans le choix des couleurs d\'identité visuelle ?',
    de: 'Wie wird die 60-30-10-Regel bei der Farbauswahl für die visuelle Identität angewendet?',
    pt: 'Como a regra 60-30-10 é aplicada na seleção de cores da identidade visual?',
    ko: '시각적 아이덴티티 색상 선택에서 60-30-10 규칙은 어떻게 적용되나요?'
  },
  'Apa saja ciri khas utama tren desain visual dan poster kreatif terkini?': {
    en: 'What are the main characteristics of current visual design and creative poster trends?',
    ja: '最新のビジュアルデザインとクリエイティブポスターの主な特徴は何ですか？',
    zh: '当前视觉设计和创意海报的主要特征是什么？',
    es: '¿Cuáles son las características principales de las tendencias de diseño visual y carteles creativos actuales?',
    ar: 'ما هي السمات الرئيسية لأحدث اتجاهات التصميم البصري والملصقات الإبداعية؟',
    fr: 'Quelles sont les principales caractéristiques des tendances actuelles en design visuel et affiches créatives ?',
    de: 'Was sind die Hauptmerkmale aktueller Trends im visuellen Design und bei kreativen Postern?',
    pt: 'Quais são as principais características das tendências atuais de design visual e cartazes criativos?',
    ko: '최신 시각 디자인 및 창의적인 포스터 트렌드의 주요 특징은 무엇인가요?'
  },
  'Mengapa poster promosi modern lebih efektif menggunakan visual hierarki minimalis?': {
    en: 'Why are modern promo posters more effective with minimalist visual hierarchy?',
    ja: 'なぜ現代のプロモーションポスターはミニマリストな視覚的階層を用いることでより効果的になるのですか？',
    zh: '为什么现代宣传海报采用极简视觉层级更为有效？',
    es: '¿Por qué los carteles promocionales modernos son más efectivos con una jerarquía visual minimalista?',
    ar: 'لماذا تكون الملصقات الترويجية الحديثة أكثر فاعلية عند استخدام تسلسل بصري بسيط؟',
    fr: 'Pourquoi les affiches promotionnelles modernes sont-elles plus efficaces avec une hiérarchie visuelle minimaliste ?',
    de: 'Warum sind moderne Werbeposter mit minimalistischer visueller Hierarchie effektiver?',
    pt: 'Por que os cartazes promocionais modernos são mais eficazes com hierarquia visual minimalista?',
    ko: '왜 현대 프로모션 포스터는 미니멀한 시각적 계층 구조를 사용할 때 더 효과적인가요?'
  },
  'Apa langkah awal paling krusial dalam membangun identitas brand yang konsisten?': {
    en: 'What is the most crucial first step in building a consistent brand identity?',
    ja: '一貫したブランドアイデンティティを構築する上で最も重要な初期段階は何ですか？',
    zh: '建立一致的品牌识别最重要的第一步是什么？',
    es: '¿Cuál es el primer paso más crucial para construir una identidad de marca consistente?',
    ar: 'ما هي الخطوة الأولى الأكثر أهمية في بناء هوية علامة تجارية متسقة؟',
    fr: 'Quelle est la première étape la plus cruciale pour construire une identité de marque cohérente ?',
    de: 'Was ist der wichtigste erste Schritt zum Aufbau einer konsistenten Markenidentität?',
    pt: 'Qual é o primeiro passo mais crucial na construção de uma identidade de marca consistente?',
    ko: '일관된 브랜드 아이덴티티를 구축하는 데 있어 가장 중요한 첫 단계는 무엇인가요?'
  },
  'Kapan saat yang tepat bagi brand atau UMKM untuk melakukan visual redesign / rebranding?': {
    en: 'When is the right time for a brand or small business to do a visual redesign / rebranding?',
    ja: 'ブランドや中小企業がビジュアルのリデザインやリブランディングを行う適切な時期はいつですか？',
    zh: '品牌或中小微企业何时进行视觉重塑/重新品牌化最合适？',
    es: '¿Cuándo es el momento adecuado para que una marca o pyme realice un rediseño visual o rebranding?',
    ar: 'متى يكون الوقت المناسب للعلامة التجارية أو الشركات الصغيرة لإجراء إعادة تصميم بصري أو تجديد العلامة؟',
    fr: 'Quel est le bon moment pour une marque ou PME pour effectuer une refonte visuelle ou un rebranding ?',
    de: 'Wann ist der richtige Zeitpunkt für eine Marke oder ein KMU für ein visuelles Redesign / Rebranding?',
    pt: 'Quando é o momento certo para uma marca ou pequena empresa fazer um redesign visual ou rebranding?',
    ko: '브랜드나 중소기업이 시각적 리디자인이나 리브랜딩을 진행하기에 적절한 시기는 언제인가요?'
  },
  'Bagaimana alur pemesanan jasa desain poster dan visual branding di Alfreelnc?': {
    en: 'What is the ordering process for poster design and visual branding at Alfreelnc?',
    ja: 'Alfreelncでのポスターデザインおよびビジュアルブランディングの注文手順はどうなっていますか？',
    zh: '在 Alfreelnc 订购海报设计和视觉识别服务的流程是怎样的？',
    es: '¿Cómo es el proceso de pedido de diseño de carteles y branding visual en Alfreelnc?',
    ar: 'كيف تتم عملية طلب خدمات تصميم الملصقات والهوية البصرية في Alfreelnc؟',
    fr: 'Quel est le processus de commande pour la création d\'affiches et le branding visuel chez Alfreelnc ?',
    de: 'Wie läuft der Bestellprozess für Posterdesign und visuelles Branding bei Alfreelnc ab?',
    pt: 'Como é o processo de pedido de serviços de design de cartaz e branding visual na Alfreelnc?',
    ko: 'Alfreelnc에서 포스터 디자인 및 시각적 브랜딩 서비스를 주문하는 절차는 어떻게 되나요?'
  },

  // Initial Project Titles & Descriptions
  'Idul Fitri': {
    en: 'Eid Mubarak Greetings', ja: 'イード・アル＝フィトル', zh: '开斋节贺图', es: 'Felicitaciones de Eid', ar: 'عيد الفطر المبارك', fr: 'Célébration de l\'Aïd', de: 'Zuckerfest-Design', pt: 'Celebração do Eid', ko: '이드 무바라크'
  },
  'Desain ucapan Idul Fitri yang bernuansa hangat, elegan, dan estetik untuk media sosial.': {
    en: 'Eid Mubarak greeting design with a warm, elegant, and aesthetic touch for social media.',
    ja: 'ソーシャルメディア向けの温かみがあり、エレガントで美しいイードのグリーティングデザイン。',
    zh: '为社交媒体设计的开斋节祝福，充满温暖、优雅与唯美质感。',
    es: 'Diseño de saludo de Eid con un toque cálido, elegante y estético para redes sociales.',
    ar: 'تصميم تهنئة عيد الفطر بلمسة دافئة وأنيقة وجذابة لوسائل التواصل الاجتماعي.',
    fr: 'Conception de vœux pour l\'Aïd avec une touche chaleureuse, élégante et esthétique pour les réseaux sociaux.',
    de: 'Festtagsgrüße mit warmen, eleganten und ästhetischen Nuancen für soziale Medien.',
    pt: 'Design de saudações do Eid com toque caloroso, elegante e estético para redes sociais.',
    ko: '소셜 미디어를 위한 따뜻하고 우아하며 미적인 감각의 이드 축하 디자인.'
  },
  'HUT RI-81 ': {
    en: 'Independence Day Poster', ja: '独立記念日ポスター', zh: '独立日海报', es: 'Póster Día de la Independencia', ar: 'ملصق عيد الاستقلال', fr: 'Affiche de la Fête Nationale', de: 'Unabhängigkeitstag-Poster', pt: 'Cartaz do Dia da Independência', ko: '독립기념일 포스터'
  },
  'Nike Air Max 270 React': {
    en: 'Nike Air Max 270 React', ja: 'Nike Air Max 270 React', zh: 'Nike Air Max 270 React', es: 'Nike Air Max 270 React', ar: 'نايكي إير ماكس 270 رياكت', fr: 'Nike Air Max 270 React', de: 'Nike Air Max 270 React', pt: 'Nike Air Max 270 React', ko: '나이키 에어 맥스 270 리액트'
  },
  'Desain poster promosi sepatu Nike Air Max 270 React dengan gaya modern, dinamis, dan visual kontras yang kuat.': {
    en: 'Promo poster design for Nike Air Max 270 React sneakers with modern, dynamic style and bold visual contrast.',
    ja: 'モダンでダイナミックなスタイルと強い視覚的コントラストを備えたNike Air Max 270 Reactの販促ポスターデザイン。',
    zh: 'Nike Air Max 270 React 运动鞋宣传海报设计，风格现代、动感，视觉对比鲜明。',
    es: 'Diseño de cartel promocional para zapatillas Nike Air Max 270 React con estilo moderno, dinámico y fuerte contraste visual.',
    ar: 'تصميم ملصق ترويجي لحذاء نايكي إير ماكس 270 رياكت بأسلوب عصري وديناميكي وتباين بصري قوي.',
    fr: 'Design d\'affiche promotionnelle pour les baskets Nike Air Max 270 React avec un style moderne, dynamique et un fort contraste visuel.',
    de: 'Werbeposter-Design für Nike Air Max 270 React Sneakers im modernen, dynamischen Stil mit starkem Kontrast.',
    pt: 'Design de cartaz promocional para tênis Nike Air Max 270 React com estilo moderno, dinâmico e forte contraste visual.',
    ko: '현대적이고 역동적인 스타일과 강렬한 시각적 대비를 갖춘 나이키 에어 맥스 270 리액트 스니커즈 프로모션 포스터 디자인.'
  },
  'TRAVEL TO INDONESIA': {
    en: 'Travel to Indonesia Promo', ja: 'インドネシア観光ポスター', zh: '印度尼西亚旅游宣传', es: 'Viaja a Indonesia', ar: 'سافر إلى إندونيسيا', fr: 'Voyage en Indonésie', de: 'Reise nach Indonesien', pt: 'Viaje para a Indonésia', ko: '인도네시아 여행 프로모션'
  },
  'Desain poster Promosi paket Traveling maskapai Garuda Airlines': {
    en: 'Promo poster design for Garuda Airlines travel package.',
    ja: 'ガルーダ航空の旅行パッケージプロモーションポスターデザイン。',
    zh: '印尼鹰航旅游套餐宣传海报设计。',
    es: 'Diseño de cartel promocional para paquete de viaje de Garuda Airlines.',
    ar: 'تصميم ملصق ترويجي لباقة السفر لشركة طيران غارودا.',
    fr: 'Conception d\'affiche promotionnelle pour le forfait voyage de Garuda Airlines.',
    de: 'Werbeposter-Design für das Reisepaket der Fluggesellschaft Garuda Airlines.',
    pt: 'Design de cartaz promocional para pacote de viagem da Garuda Airlines.',
    ko: '가루다 인도네시아 항공 여행 패키지 프로모션 포스터 디자인.'
  },
  'Simple Design but impact': {
    en: 'Simple Yet Impactful Design', ja: 'シンプルだがインパクトのあるデザイン', zh: '极简却震撼的设计', es: 'Diseño Simple pero de Gran Impacto', ar: 'تصميم بسيط لكنه مؤثر', fr: 'Design Simple mais Percutant', de: 'Einfaches, aber wirkungsvolles Design', pt: 'Design Simples mas de Alto Impacto', ko: '단순하지만 강렬한 디자인'
  },
  'Desain feed Instagram simpel tapi berdampak dengan visual tipografi yang kuat dan proporsi warna harmonis.': {
    en: 'Simple yet impactful Instagram feed design with strong visual typography and harmonious color proportions.',
    ja: '力強いタイポグラフィと調和のとれた色彩比率を備えた、シンプルながらインパクトのあるInstagramフィードデザイン。',
    zh: '具有强烈排版视觉冲击力和和谐色彩比例的极简 Instagram 动态设计。',
    es: 'Diseño de feed de Instagram simple pero impactante con tipografía visual fuerte y proporciones de color armoniosas.',
    ar: 'تصميم منشور إنستغرام بسيط لكنه مؤثر مع طباعة بصرية قوية وتناسب لوني متناغم.',
    fr: 'Conception de feed Instagram simple mais percutant avec une typographie visuelle forte et des proportions de couleurs harmonieuses.',
    de: 'Einfaches, aber wirkungsvolles Instagram-Feed-Design mit ausdrucksstarker Typografie und harmonischer Farbgebung.',
    pt: 'Design de feed do Instagram simples mas impactante com tipografia marcante e proporções harmoniosas de cor.',
    ko: '강렬한 타이포그래피와 조화로운 색상 비율을 갖춘 단순하지만 임팩트 있는 인스타그램 피드 디자인.'
  },
  'Idul Fitri Story': {
    en: 'Eid Mubarak Story', ja: 'イード・アル＝フィトル ストーリー', zh: '开斋节快拍设计', es: 'Historia de Eid Mubarak', ar: 'قصة عيد الفطر', fr: 'Story de l\'Aïd', de: 'Zuckerfest Story-Format', pt: 'Story do Eid Mubarak', ko: '이드 무바라크 스토리'
  },
  'Coffee Brand Identity': {
    en: 'Coffee Brand Identity', ja: 'コーヒーブランドアイデンティティ', zh: '咖啡品牌视觉识别', es: 'Identidad de Marca de Café', ar: 'هوية علامة تجارية للقهوة', fr: 'Identité de Marque de Café', de: 'Kaffeemarken-Identität', pt: 'Identidade de Marca de Café', ko: '커피 브랜드 아이덴티티'
  },
  'Minimalist 3D Studio': {
    en: 'Minimalist 3D Studio', ja: 'ミニマリスト3Dスタジオ', zh: '极简 3D 工作室', es: 'Estudio 3D Minimalista', ar: 'استوديو ثلاثي الأبعاد بسيط', fr: 'Studio 3D Minimaliste', de: 'Minimalistisches 3D-Studio', pt: 'Estúdio 3D Minimalista', ko: '미니멀 3D 스튜디오'
  }
};

// In-memory runtime translation cache
const memoryCache = new Map<string, string>();

// LocalStorage persistent cache helpers
function getCacheKey(lang: string, text: string): string {
  return `app_trans_${lang}_${text.trim()}`;
}

export function getCachedTranslation(text: string, lang: LanguageCode): string | null {
  if (!text || lang === 'id') return text;
  const trimmed = text.trim();

  // 1. Check in-memory cache
  const memKey = `${lang}::${trimmed}`;
  if (memoryCache.has(memKey)) {
    return memoryCache.get(memKey)!;
  }

  // 2. Check built-in curated dictionary
  if (BUILTIN_TRANSLATIONS[trimmed] && BUILTIN_TRANSLATIONS[trimmed][lang]) {
    const val = BUILTIN_TRANSLATIONS[trimmed][lang]!;
    memoryCache.set(memKey, val);
    return val;
  }

  // Also check without trailing punctuation or spaces
  for (const [k, v] of Object.entries(BUILTIN_TRANSLATIONS)) {
    if (k.toLowerCase() === trimmed.toLowerCase() && v[lang]) {
      memoryCache.set(memKey, v[lang]!);
      return v[lang]!;
    }
  }

  // 3. Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(getCacheKey(lang, trimmed));
      if (stored) {
        memoryCache.set(memKey, stored);
        return stored;
      }
    } catch {}
  }

  return null;
}

export function saveCachedTranslation(text: string, lang: LanguageCode, translated: string) {
  if (!text || !translated || lang === 'id') return;
  const trimmed = text.trim();
  const memKey = `${lang}::${trimmed}`;
  memoryCache.set(memKey, translated);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getCacheKey(lang, trimmed), translated);
    } catch {}
  }
}

// Active in-flight requests to avoid duplicating calls
const inFlightRequests = new Map<string, Promise<string>>();

export async function fetchDynamicTranslation(text: string, targetLang: LanguageCode): Promise<string> {
  if (!text || targetLang === 'id') return text;
  const trimmed = text.trim();

  // Check cache first
  const cached = getCachedTranslation(trimmed, targetLang);
  if (cached) return cached;

  const requestKey = `${targetLang}::${trimmed}`;
  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey)!;
  }

  const promise = (async () => {
    try {
      // 1. Try server-side translation proxy (/api/translate)
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, targetLang, sourceLang: 'id' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.translatedText && typeof data.translatedText === 'string') {
          saveCachedTranslation(trimmed, targetLang, data.translatedText);
          // Notify listeners of newly translated text
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app_translation_updated', {
              detail: { text: trimmed, lang: targetLang, translated: data.translatedText }
            }));
          }
          return data.translatedText;
        }
      }
    } catch (e) {
      console.warn('Server translation fallback triggered:', e);
    }

    // 2. Direct client fallback via MyMemory API if server is unreachable
    try {
      const langMap: Record<string, string> = {
        'zh': 'zh-CN', 'id': 'id-ID', 'en': 'en-GB', 'ja': 'ja-JP',
        'es': 'es-ES', 'ar': 'ar-SA', 'fr': 'fr-FR', 'de': 'de-DE',
        'pt': 'pt-PT', 'ko': 'ko-KR'
      };
      const targetCode = langMap[targetLang] || targetLang;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=id|${targetCode}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const translated = json?.responseData?.translatedText;
        if (translated && typeof translated === 'string' && !translated.includes('MYMEMORY WARNING')) {
          saveCachedTranslation(trimmed, targetLang, translated);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app_translation_updated', {
              detail: { text: trimmed, lang: targetLang, translated }
            }));
          }
          return translated;
        }
      }
    } catch {}

    return trimmed;
  })();

  inFlightRequests.set(requestKey, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}

/**
 * Synchronous translate helper with automatic background fetch.
 * Returns the translated text if cached/curated, or initiates background translation.
 */
export function translateDynamicSync(text: string, targetLang: LanguageCode): string {
  if (!text || targetLang === 'id') return text;
  const cached = getCachedTranslation(text, targetLang);
  if (cached) return cached;

  // Trigger background fetch if not already in flight
  fetchDynamicTranslation(text, targetLang);
  return text;
}
