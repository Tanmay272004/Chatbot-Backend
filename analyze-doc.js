import fetch from 'node-fetch';
import pdfParse from 'pdf-parse';
import Tesseract from 'tesseract.js';
import { extname } from 'path';

const NOTION_API_KEY = 'secret_abc123...'  // Replace with your Notion token
const NOTION_DATABASE_ID = 'your_database_id_here'  // Replace with your DB ID

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

    // Step 2: Extract text
    if (fileExt === '.pdf') {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (['.png', '.jpg', '.jpeg'].includes(fileExt)) {
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
      extractedText = text;
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const summary = extractedText.slice(0, 1000);  // Trim for summary
    const wordCount = extractedText.split(/\s+/).length;

    // Step 3: Save to Notion
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          Name: {
            title: [
              { text: { content: `Document Summary - ${new Date().toLocaleString()}` } }
            ]
          },
          WordCount: {
            number: wordCount
          },
          SourceURL: {
            url: doc_url
          }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              text: [
                { type: 'text', text: { content: summary } }
              ]
            }
          }
        ]
      })
    });

    const notionData = await notionResponse.json();
    const notionPageURL = notionData.url || `https://notion.so/${notionData.id.replace(/-/g, '')}`;

    // Step 4: Return result to Voiceflow
    res.status(200).json({
      summary: summary.slice(0, 300) + '...',
      word_count: wordCount,
      notion_url: notionPageURL
    });
  } catch (err) {
    console.error('Error processing or storing document:', err);
    res.status(500).json({ error: 'Failed to process or store document' });
  }
}
