const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const cors = require("cors");

const app = express(); // Initialize the Express app

// CORS configuration
const allowedOrigins = [
  "https://oscarmcglone.com", 
  "https://duck.oscarmcglone.com", 
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); 
    } else {
      callback(new Error("Not allowed by CORS")); 
    }
  },
  methods: ["GET", "POST", "OPTIONS"], 
  allowedHeaders: ["Content-Type"],   
  credentials: true                   
};


app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); 

app.use(bodyParser.json()); 

const SPREADSHEET_ID = "1nHVC5ahA0qOj4uE05YKWb3Fn3BjGSu_Uq8_ZXJ4cm_0";
const SHEET_NAME_VIBE = "WhetherAppVibes";
const SHEET_NAME_VOTE = "WhetherAppVotes";

// Authenticate with the service account
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY), 
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Vote for a whether type from sun, rain, cloud, fog, snow, wind, storm or hail
app.post("/vote", async (req, res) => {
    const { weatherType } = req.body;

    if (!weatherType) {
        return res.status(400).send("Missing weatherType");
    }

    try {
        const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
        const range = `${SHEET_NAME_VOTE}!A2:H2`; // Assuming the weather types are in columns A to H
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });

        const row = response.data.values[0] || Array(8).fill(0); // Default to 0 if no data
        const weatherTypes = ["sun", "rain", "cloudy", "fog", "snow", "wind", "storm", "hail"];
        const index = weatherTypes.indexOf(weatherType);

        if (index === -1) {
            return res.status(400).send("Invalid weatherType");
        }

        row[index] = parseInt(row[index], 10) + 1; // Increment the count

        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [row],
            },
        });

        res.status(200).send("Vote recorded successfully");
    } catch (error) {
        console.error("Error recording vote:", error);
            res.status(500).send("Failed to record vote");
        }
    });

app.get("/getvotes", async (req, res) => {
    try {
        const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
        const range = `${SHEET_NAME_VOTE}!A2:H2`; // Assuming the weather types are in columns A to H
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range,
        });

        const row = response.data.values[0] || Array(8).fill(0); // Default to 0 if no data
        const weatherTypes = ["sun", "rain", "cloudy", "fog", "snow", "wind", "storm", "hail"];
        const votes = Object.fromEntries(weatherTypes.map((type, index) => [type, parseInt(row[index], 10)]));

        res.status(200).json(votes);
    } catch (error) {
        console.error("Error retrieving votes:", error);
        res.status(500).send("Failed to retrieve votes");
    }
});

// Add a vibe
app.post("/vibe", async (req, res) => {
  const { vibe } = req.body;

  if (!vibe) {
    return res.status(400).send("Missing vibe");
  }

  try {
    const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
    const range = `${SHEET_NAME_VIBE}!A2:A`; // Assuming the vibes are in column A
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[vibe]],
      },
    });

    res.status(200).send("Vibe recorded successfully");
  } catch (error) {
    console.error("Error recording vibe:", error);
    res.status(500).send("Failed to record vibe");
  }
});

// Get a random vibe
app.get("/getvibe", async (req, res) => {
  try {
    const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
    const range = `${SHEET_NAME_VIBE}!A2:A`; // Assuming the vibes are in column A
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const vibes = response.data.values || [];

    if (vibes.length === 0) {
      return res.status(404).send("No vibes found");
    }

    const randomIndex = Math.floor(Math.random() * vibes.length);
    const randomVibe = vibes[randomIndex][0];

    res.status(200).json({ vibe: randomVibe });
  } catch (error) {
    console.error("Error retrieving vibe:", error);
    res.status(500).send("Failed to retrieve vibe");
  }
});


//Health Check for Uptime Robot
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});