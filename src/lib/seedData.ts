import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { projects as defaultProjects } from '../data/projects';
import { defaultTemplates } from '../data/templates';
import { defaultSettings } from '../data/settings';
import { defaultBlogPosts } from '../data/blogs';

let seedingInProgress = false;

export async function ensureInitialData(): Promise<void> {
  // Do not seed dummy/mock projects, blogs, or templates into user's database
  // Only user added/edited content should exist.
  return Promise.resolve();
}
