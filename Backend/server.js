const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Your Amazon PartnerTag
const AMAZON_PARTNER_TAG = "your-partner-tag";

// Sample Product Database (Replace with dynamic queries if needed)
const productDatabase = [
  {
    keywords: ["cooking", "under50", "christmas"],
    title: "Non-Stick Baking Set",
    url: `https://www.amazon.com/example-product1?tag=${AMAZON_PARTNER_TAG}`,
    image: "https://via.placeholder.com/200?text=Baking+Set",
  },
  {
    keywords: ["fitness", "50-100", "birthday"],
    title: "Wireless Fitness Tracker",
    url: `https://www.amazon.com/example-product2?tag=${AMAZON_PARTNER_TAG}`,
    image: "https://via.placeholder.com/200?text=Fitness+Tracker",
  },
];

// Helper Function: Match Keywords
function matchProducts(keywords) {
  return productDatabase.filter((product) =>
    keywords.some((keyword) => product.keywords.includes(keyword.toLowerCase()))
  );
}

// Route: Analyze Questionnaire & Generate Recommendations
app.post("/api/recommend", async (req, res) => {
  const userInput = req.body;

  // Compose prompt for OpenAI
  const prompt = `
    Analyze the following user input and recommend product categories or keywords:
    Occasion: ${userInput.occasion}
    Budget: ${userInput.budget}
    Interest: ${userInput.interest}
    Notes: ${userInput.notes || "No additional notes provided."}
    
    Output 3-5 recommended product keywords for gifts.
  `;

  try {
    // Call OpenAI API
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "text-davinci-003",
        prompt,
        max_tokens: 50,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const aiKeywords = response.data.choices[0].text
      .trim()
      .split(",")
      .map((keyword) => keyword.trim());

    // Match products using AI-generated keywords
    const recommendations = matchProducts(aiKeywords);

    res.json(recommendations);
  } catch (error) {
    console.error("Error calling OpenAI API:", error.message);
    res.status(500).json({ error: "Failed to generate recommendations." });
  }
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
