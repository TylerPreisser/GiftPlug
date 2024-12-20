const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
const aws4 = require('aws4');

// These will come from environment variables on Render.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG; 
const AMAZON_HOST = 'webservices.amazon.com'; 
const AMAZON_REGION = 'us-east-1';

const app = express();
app.use(cors());
app.use(express.json());

const configuration = new Configuration({ apiKey: OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

async function searchAmazonProducts(keywords, priceRange) {
  const params = {
    PartnerTag: AMAZON_PARTNER_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com',
    Keywords: keywords,
    ItemPage: 1,
    SortBy: 'Featured',
    MinPrice: priceRange.min * 100,
    MaxPrice: priceRange.max * 100,
    Resources: [
      'Images.Primary.Medium',
      'ItemInfo.Title',
      'Offers.Listings.Price'
    ]
  };

  const path = '/paapi5/searchitems';
  const request = {
    host: AMAZON_HOST,
    path: path,
    service: 'execute-api',
    region: AMAZON_REGION,
    method: 'POST',
    url: `https://${AMAZON_HOST}${path}`,
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Target': 'com.amazon.paapi5.v1.SearchItems',
      'X-Amz-Content-Sha256': 'required'
    },
    data: JSON.stringify(params)
  };

  const opts = aws4.sign(request, {
    accessKeyId: AMAZON_ACCESS_KEY,
    secretAccessKey: AMAZON_SECRET_KEY
  });

  delete opts.headers.Host;
  delete opts.headers['Content-Length'];

  const response = await axios(opts);
  if (response.data.SearchResult && response.data.SearchResult.Items) {
    return response.data.SearchResult.Items;
  } else {
    return [];
  }
}

app.post('/api/recommend', async (req, res) => {
  const { occasion, budget, interest, notes } = req.body;

  let priceRange = { min: 0, max: 5000 };
  if (budget === 'under50') {
    priceRange = { min: 0, max: 50 };
  } else if (budget === '50-100') {
    priceRange = { min: 50, max: 100 };
  } else if (budget === '100plus') {
    priceRange = { min: 100, max: 1000 };
  }

  const prompt = `
  The user wants gift recommendations for a ${occasion}.
  Budget: ${budget}
  Interest: ${interest}
  Additional notes: ${notes}

  Provide 3 keyword sets in JSON:
  {
    "keywords": ["kw1", "kw2", "kw3"]
  }
  `;

  try {
    const aiResponse = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 150,
      temperature: 0.7
    });

    const text = aiResponse.data.choices[0].text.trim();
    let keywordsArray = [];
    try {
      const parsed = JSON.parse(text);
      keywordsArray = parsed.keywords || [];
    } catch (err) {
      keywordsArray = [text];
    }

    let products = [];
    for (const kw of keywordsArray) {
      const items = await searchAmazonProducts(kw, priceRange);
      products = products.concat(items);
      if (products.length >= 6) break;
    }

    const recommendations = products.slice(0, 6).map(item => ({
      title: item.ItemInfo?.Title?.DisplayValue || "No Title",
      image: item.Images?.Primary?.Medium?.URL || "",
      link: item.DetailPageURL
    }));

    res.json({ recommendations });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred processing your request.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
