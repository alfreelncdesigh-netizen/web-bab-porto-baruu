const fs = require('fs');

let content = fs.readFileSync('src/components/ArchiveAdmin.tsx', 'utf8');

// Replace Folder Card UI to include Rename feature
const oldFolderMap = "folders.map(folder => (\\s*<div\\s*key={folder\\.id}";
const replaceFolderMap = `folders.map(folder => {
                const isEditing = editingFolderId === folder.id;
                return (
                <div
                  key={folder.id}`;

content = content.replace(/folders\.map\(folder => \(\s*<div\s*key=\{folder\.id\}/g, replaceFolderMap);

// Replace inside folder div
const oldInsideFolder = `<div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                      <Folder size={24} />
                    </div>
                    <span className="font-bold text-black dark:text-white">{folder.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash size={16} />
                  </button>`;

const newInsideFolder = `                  {isEditing ? (
                    <form className="flex items-center gap-2 w-full" onSubmit={(e) => handleRenameFolder(folder.id, e)}>
                      <input
                        autoFocus
                        type="text"
                        value={editFolderName}
                        onChange={e => setEditFolderName(e.target.value)}
                        className="flex-1 bg-white dark:bg-[#111111] border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-black dark:text-white focus:outline-none focus:border-blue-500"
                        onClick={e => e.stopPropagation()}
                      />
                      <button type="submit" className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors" onClick={e => e.stopPropagation()}>
                        <Check size={16} />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setEditingFolderId(null); }} className="w-10 h-10 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
                        <X size={16} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 truncate">
                        <div className="w-12 h-12 shrink-0 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                          <Folder size={24} />
                        </div>
                        <span className="font-bold text-black dark:text-white truncate">{folder.name}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolderId(folder.id);
                            setEditFolderName(folder.name);
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl hover:bg-zinc-200 hover:text-black dark:hover:text-white dark:hover:bg-zinc-700 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                          className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </>
                  )}`;

content = content.replace(oldInsideFolder, newInsideFolder);
content = content.replace(/<\/div>\s*\)\)\s*\)/, "</div>\n              );\n            }))\n"); // Fix bracket closure for map


// Replace Items List UI to include thumbnail
const oldItemLeft = `<div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                        {item.type === 'projects' && <LayoutTemplate size={20} />}
                        {item.type === 'blogPosts' && <FileText size={20} />}
                        {item.type === 'experiences' && <Briefcase size={20} />}
                      </div>`;

const newItemLeft = `{item.image ? (
                        <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                          <img src={getOptimizedImageUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                          {item.type === 'projects' && <LayoutTemplate size={20} />}
                          {item.type === 'blogPosts' && <FileText size={20} />}
                          {item.type === 'experiences' && <Briefcase size={20} />}
                        </div>
                      )}`;

content = content.replace(oldItemLeft, newItemLeft);

fs.writeFileSync('src/components/ArchiveAdmin.tsx', content);
