import fetch from 'node-fetch';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { extname } from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  const { doc_url } = req.body;
  if (!doc_url) return res.status(400).json({ error: 'No document URL provided' });

  try {
    // Step 1: Download the file
    const response = await fetch(doc_url);
    const buffer = await response.buffer();

    const fileExt = extname(doc_url).toLowerCase();

    let extractedText = '';

    if (fileExt === '.pdf') {
      // Step 2: Extract text from PDF
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (['.png', '.jpg', '.jpeg'].includes(fileExt)) {
      // Step 3: OCR for image files
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
      extractedText = text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Step 4: Return analysis result
    res.status(200).json({
      summary: extractedText.slice(0, 300) + '...',  // Truncate for preview
      word_count: extractedText.split(/\s+/).length
    });
  } catch (err) {
    console.error('Error processing document:', err);
    res.status(500).json({ error: 'Failed to process document' });
  }
}

  
