import { Router } from 'express';
import { uploadAndTranscribeAudio, uploadAndExtractImage } from '../controllers/uploadController.js';
import { audioUpload, imageUpload } from '../middlewares/upload.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.post('/audio', audioUpload.single('file'), uploadAndTranscribeAudio);
router.post('/image', imageUpload.single('file'), uploadAndExtractImage);

export default router;
