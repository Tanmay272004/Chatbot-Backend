export default async function handler(req, res) {
    if (req.method === 'POST') {
      const { doc_url } = req.body;
  
      // You can now fetch and analyze the document
      console.log("Document URL received:", doc_url);
  
      // Sample response
      return res.status(200).json({
        summary: `Received doc: ${doc_url}`,
        keywords: ["sample", "document", "analysis"]
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  }
  