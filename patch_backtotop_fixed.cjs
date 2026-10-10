const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const backToTopCode = `
const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > window.innerHeight) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-10 z-[90] p-3 md:p-4 rounded-full bg-black text-white dark:bg-white dark:text-black shadow-2xl hover:scale-110 active:scale-95 transition-all"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6"><path d="m18 15-6-6-6 6"/></svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
`;

if (!content.includes('BackToTop')) {
  // Insert before export default function App
  content = content.replace('export default function App() {', backToTopCode + '\nexport default function App() {');
  
  // Insert into render
  content = content.replace(
    '<Header currentView={view} setView={setView} />',
    '<Header currentView={view} setView={setView} />\n        <BackToTop />'
  );
  
  fs.writeFileSync('src/App.tsx', content);
  console.log("Successfully patched App.tsx");
} else {
  console.log("Already patched");
}
