export const extractPublicId = (url: string) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(p => p === 'upload');
    if (uploadIndex === -1) return null;
    
    // public_id is everything after the version number (v1234567) or immediately after upload
    // excluding the file extension
    let startIdx = uploadIndex + 1;
    if (parts[startIdx].startsWith('v') && !isNaN(parseInt(parts[startIdx].substring(1)))) {
      startIdx++;
    }
    
    const idWithExt = parts.slice(startIdx).join('/');
    const lastDot = idWithExt.lastIndexOf('.');
    return lastDot !== -1 ? idWithExt.substring(0, lastDot) : idWithExt;
  } catch (e) {
    return null;
  }
};

export const deleteFromCloudinary = async (url: string) => {
  const public_id = extractPublicId(url);
  if (!public_id) return false;
  
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("Missing Cloudinary API Key or Secret. Cannot delete image.");
    return false;
  }
  
  try {
    const timestamp = Math.round((new Date).getTime() / 1000).toString();
    const strToSign = `public_id=${public_id}&timestamp=${timestamp}${apiSecret}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(strToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const formData = new FormData();
    formData.append('public_id', public_id);
    formData.append('timestamp', timestamp);
    formData.append('api_key', apiKey);
    formData.append('signature', signature);
    
    // Determine resource type (usually image, but can be raw/auto for pdfs)
    const resourceType = url.includes('.pdf') || url.includes('.eps') || url.includes('.ai') ? 'raw' : 'image';
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      body: formData
    });
    
    const result = await res.json();
    return result.result === 'ok';
  } catch (error) {
    console.warn("Failed to delete from Cloudinary", error);
    return false;
  }
};

export const getOptimizedImageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;
  
  try {
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    
    // Check if it already has transformations, but simple insertion is usually fine for raw uploads
    // If it already has f_webp, don't duplicate
    if (parts[1].startsWith('f_webp') || parts[1].startsWith('f_auto')) return url;
    
    return `${parts[0]}/upload/f_webp,q_auto/${parts[1]}`;
  } catch (e) {
    return url;
  }
};
