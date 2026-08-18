import multer from 'multer';

// Multer configuration
export const upload = multer({
  storage: multer.memoryStorage(),

  // Weight limit
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB as maximum
  },

  // File type
  fileFilter: (req, file, cb) => {
    // Mimetype is checked unsupported
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new multer.MulterError('UNSUPPORTED_FORMAT');
      cb(error, false);
    }
  },
});
