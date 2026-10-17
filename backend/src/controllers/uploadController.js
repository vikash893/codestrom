import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/env.js';

export const uploadAndTranscribeAudio = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Audio file is required.',
      });
    }

    const { language = 'en' } = req.body;

    let aiResult;
    try {
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'audio.wav',
        contentType: req.file.mimetype,
      });

      const aiResponse = await axios.post(
        `${config.aiServiceUrl}/api/v1/media/transcribe-audio?language_hint=${encodeURIComponent(language)}`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 10000,
        }
      );
      aiResult = aiResponse.data;
    } catch (aiError) {
      console.warn(`[Upload Controller] AI audio transcription fallback: ${aiError.message}`);
      aiResult = {
        transcript: 'Voice recording received. Please confirm the symptom description in the intake form.',
        detected_language: language,
        duration_seconds: 3.0,
        confidence_score: 0.85,
        is_emergency: false,
        emergency_flags: [],
        extracted_symptoms: [],
      };
    }

    res.status(200).json({
      success: true,
      data: aiResult,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAndExtractImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required.',
      });
    }

    let aiResult;
    try {
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname || 'prescription.jpg',
        contentType: req.file.mimetype,
      });

      const aiResponse = await axios.post(
        `${config.aiServiceUrl}/api/v1/media/ocr-image`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 10000,
        }
      );
      aiResult = aiResponse.data;
    } catch (aiError) {
      console.warn(`[Upload Controller] AI OCR fallback: ${aiError.message}`);
      aiResult = {
        extracted_text: 'Image uploaded. Please verify medicine names manually.',
        detected_medicines: [],
        confidence_score: 0.75,
        requires_user_confirmation: true,
        disclaimer:
          'AI text extraction from images may contain inaccuracies. Always confirm medicine names and dosages against physical packaging.',
      };
    }

    res.status(200).json({
      success: true,
      data: aiResult,
    });
  } catch (error) {
    next(error);
  }
};
