const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const startIdx = content.indexOf("{view === 'home' && (");
const endStr = "{view === 'admin' && (";
const endIdx = content.indexOf(endStr);
// Find the end of the admin block
const restOfContent = content.substring(endIdx);
const finalEndIdx = endIdx + restOfContent.indexOf("</AnimatePresence>");

const newViews = `
            {view === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <AnimatePresence>{isAppLoading && <HomeSkeleton />}</AnimatePresence>
                <div style={{ opacity: isAppLoading ? 0 : 1, transition: 'opacity 0.4s ease-out' }}>
                  <Hero />
                  <About />
                  <Portfolio />
                  <Blog />
                  <Stats />
                  <Experience />
                  <Store />
                  <Contact />
                </div>
              </motion.div>
            )}

            {view === 'about' && (
              <motion.div key="about" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen pt-12"><About /></div>
              </motion.div>
            )}

            {view === 'portfolio' && (
              <motion.div key="portfolio" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen pt-12"><Portfolio /></div>
              </motion.div>
            )}

            {view === 'store' && (
              <motion.div key="store" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen pt-12"><Store /></div>
              </motion.div>
            )}

            {view === 'contact' && (
              <motion.div key="contact" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <div className="min-h-screen pt-12"><Contact /></div>
              </motion.div>
            )}

            {view === 'blog' && (
              <motion.div
                key="blog"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="min-h-screen pt-12"><Blog /></div>
              </motion.div>
            )}
            {view === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="min-h-screen pt-12"><Stats /></div>
              </motion.div>
            )}
            {view === 'experience' && (
              <motion.div
                key="experience"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <div className="min-h-screen pt-12"><Experience /></div>
              </motion.div>
            )}
            {view === 'cv' && (
              <div style={{ opacity: isAppLoading ? 0 : 1, transition: 'opacity 0.4s ease-out' }}>
                <CvDetail />
              </div>
            )}
            {view === 'admin' && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
              >
                <AdminDashboard />
              </motion.div>
            )}
`;

content = content.substring(0, startIdx) + newViews + content.substring(finalEndIdx);
fs.writeFileSync('src/App.tsx', content);
