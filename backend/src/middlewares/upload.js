import multer from 'multer';

const storage = multer.memoryStorage();

const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedAudioMimeTypes = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/m4a',
  'audio/webm',
  'audio/ogg',
  'audio/x-wav',
];

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (allowedImageMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image type (${file.mimetype}). Only JPEG, PNG, and WebP are allowed.`));
    }
  },
});

export const audioUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (allowedAudioMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio type (${file.mimetype}). Only standard audio files are allowed.`));
    }
  },
});
