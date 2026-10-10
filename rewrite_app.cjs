const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf8');

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
                <About />
              </motion.div>
            )}

            {view === 'portfolio' && (
              <motion.div key="portfolio" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <Portfolio />
              </motion.div>
            )}

            {view === 'store' && (
              <motion.div key="store" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <Store />
              </motion.div>
            )}

            {view === 'contact' && (
              <motion.div key="contact" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}>
                <Contact />
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
                <Blog />
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
                <Stats />
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
                <Experience />
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

const replaceRegex = /\{view === 'home' && \([\s\S]*?\{view === 'admin' && \([\s\S]*?\}\)/;
const newContent = content.replace(replaceRegex, newViews.trim());

fs.writeFileSync('src/App.tsx', newContent);
