const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { logger } = require("firebase-functions");

// Initialize Firebase Admin SDK
initializeApp();

// Access environment variables for the API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.generateReport = onCall(async (request) => {
  // 1. Authentication Check: Ensure the user is authenticated.
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to generate a report.",
    );
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  try {
    // 2. Data Validation: Get the user's data from Firestore.
    const userDocRef = db.collection("users").doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      throw new HttpsError("not-found", "User data not found.");
    }

    const userData = userDocSnap.data();
    if (!userData.onboardingData) {
      throw new HttpsError(
        "failed-precondition",
        "Onboarding must be completed first.",
      );
    }

    logger.info(`Generating report for user: ${uid}`);

    // 3. Construct the Secure API Call
    const masterPrompt = `
      Act as an expert career counselor named Disha. Analyze the following student profile and generate a personalized insight report and career recommendations.
      
      Student Profile:
      - Name: ${userData.displayName || "the user"}
      - Interests: ${userData.onboardingData.interests}
      - Favorite Subjects: ${userData.onboardingData.subjects}
      - Hobbies: ${userData.onboardingData.hobbies}

      Based on this, generate a JSON object with a specific schema.
    `;

    const schema = {
      type: "OBJECT",
      properties: {
        personalInsightReport: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            summary: { type: "STRING" },
            strengths: { type: "ARRAY", items: { type: "STRING" } },
          },
        },
        recommendedCareerPaths: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              cluster: { type: "STRING" },
              description: { type: "STRING" },
            },
          },
        },
      },
    };

    const payload = {
      contents: [{ role: "user", parts: [{ text: masterPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error("Gemini API call failed:", response.status);
      throw new HttpsError("internal", "Failed to call the AI service.");
    }

    const result = await response.json();
    const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);

    // 4. Return the result to the client
    return jsonResponse;
  } catch (error) {
    logger.error("Error in generateReport function:", error);
    if (error instanceof HttpsError) {
      throw error; // Re-throw HttpsErrors
    }
    throw new HttpsError("internal", "An unexpected error occurred.");
  }
});
