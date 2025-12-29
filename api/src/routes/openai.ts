import { createClient } from "@supabase/supabase-js";
import express from "express";
import fs from "fs";
import https from "https";
import multer from "multer";
import OpenAI from "openai";
import { userFromBasicAuth } from "src/middleware";

// Initialize OpenAI API client

const router = express.Router();

let openai: OpenAI;

router.get("/generate-sprite", userFromBasicAuth, async (req, res) => {
  const prompt = (req.query.prompt as string) || "A sprite of a fantasy creature"; // Default prompt if none provided
  openai = openai || new OpenAI({});

  // Determine the best DALL-E 3 image size based on canvas aspect ratio
  // DALL-E 3 supports: 1024x1024, 1024x1792 (portrait), 1792x1024 (landscape)
  const canvasWidth = parseInt(req.query.width as string, 10) || 40;
  const canvasHeight = parseInt(req.query.height as string, 10) || 40;
  const aspectRatio = canvasWidth / canvasHeight;

  let imageSize: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
  if (aspectRatio > 1.3) {
    // Canvas is wider than tall (landscape)
    imageSize = "1792x1024";
  } else if (aspectRatio < 0.77) {
    // Canvas is taller than wide (portrait)
    imageSize = "1024x1792";
  }

  console.log(
    `Generating sprite with size ${imageSize} for canvas ${canvasWidth}x${canvasHeight} (aspect ratio: ${aspectRatio.toFixed(2)})`,
  );

  openai.images
    .generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: imageSize,
    })
    .then((response) => {
      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) {
        res.status(500).json({ error: "Failed to retrieve image URL" });
        return;
      }
      console.log("Downloading image from URL:", imageUrl);

      // Download the image using https
      https
        .get(imageUrl, (imageResponse) => {
          const data: Buffer[] = [];

          imageResponse.on("data", (chunk) => {
            data.push(chunk);
          });

          imageResponse.on("end", () => {
            const imageBuffer = Buffer.concat(data);

            // Save the image locally
            fs.writeFileSync("image.png", imageBuffer);
            console.log("Image saved locally as 'image.png'");

            const namePrompt = `Give a short, straightforward name for a sprite described as: ${prompt}. For example, if the sprite is a cute mouse, respond with "Mouse". Respond with only the name.`;
            openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: "You are a helpful assistant for naming video game sprites." },
                { role: "user", content: namePrompt },
              ],
              max_tokens: 10,
              temperature: 0.9,
            })
              .then((nameResponse) => {
                const spriteName = nameResponse.choices[0]?.message?.content?.trim() || "Unnamed Sprite";
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");

                // Send the image as a base64 data URL and the generated name
                res.json({
                  imageUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`,
                  name: spriteName,
                });
              })
              .catch((err) => {
                console.error("Error generating sprite name:", err);
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Content-Type", "application/json");
                res.json({
                  imageUrl: `data:image/png;base64,${imageBuffer.toString("base64")}`,
                  name: "Unnamed Sprite",
                });
              });
          });
        })
        .on("error", (error) => {
          console.error("Error downloading image:", error.message);
          res.status(500).json({ error: "Failed to download image" });
        });
    })
    .catch((error) => {
      console.error(
        "Error generating image:",
        error.response ? error.response.data : error.message,
      );
      res.status(500).json({ error: "Failed to generate image" });
    });
});

router.post("/generate-sprite-name", userFromBasicAuth, (req, res) => {
  openai = openai || new OpenAI({});
  const { imageData } = req.body;

  if (!imageData) {
    res.status(400).json({ error: "Missing image data" });
    return;
  }

  // Always extract base64 data and send as data URL for GPT-4 Vision
  let base64Data = imageData;
  if (imageData.startsWith("data:")) {
    // Format: data:image/png;base64,XXXX
    base64Data = imageData.split(",", 2)[1];
  }
  const dataUrl = `data:image/png;base64,${base64Data}`;

  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Generate a short, straightforward name for this sprite. For example, if the sprite is a cute mouse, respond with 'Mouse'. Respond with only the name.",
        },
        {
          type: "image_url",
          image_url: {
            url: dataUrl,
          },
        },
      ],
    },
  ];

  openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: messages as any,
    max_tokens: 10,
    temperature: 0.9,
  })
    .then((completion) => {
      const name = completion.choices[0]?.message?.content?.trim() || "Unnamed Sprite";
      console.log("Generated sprite name:", name);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json");
      res.json({ name });
    })
    .catch((error) => {
      console.error("Error generating sprite name:", error);
      res.status(500).json({ error: "Failed to generate sprite name" });
    });
});

router.post("/generate-rule-name", userFromBasicAuth, async (req, res) => {
  try {
    openai = openai || new OpenAI({});
    const { recording } = req.body as { recording?: unknown };

    if (!recording) {
      res.status(400).json({ error: "Missing recording" });
      return;
    }

    // Log the incoming recording data for debugging
    console.log("Generating rule name for recording:", JSON.stringify(recording, null, 2));

    const fewShotExamples = `
Examples of good rule names:
Input:
{
    "mainActorName": "Dog",
    "actions": [
        {
            "type": "move",
            "actorName": "Dog",
            "offset": {
                "x": 1,
                "y": 0
            }
        }
    ],
}
Output: "Move Right"
Input:
{
    "mainActorName": "Dog",
    "actions": [
        {
            "type": "move",
            "actorName": "Dog",
            "offset": {
                "x": 0,
                "y": -3
            }
        }
    ]
}
Output: "Leap Up"

Input:
{
    "mainActorName": "Dog",
    "actions": [
        {
            "type": "move",
            "actorName": "Dog",
            "offset": {
                "x": 1,
                "y": 0
            }
        },
        {
            "type": "delete",
            "actorName": "bone"
        },
        {
            "type": "variable",
            "actorName": "Dog",
            "operation": "add",
            "variableName": "Health",
            "value": {
                "constant": "1"
            }
        }
    ]
}
Output: "Eat Bone"

Input:
{
    "mainActorName": "Dog",
    "actions": [
        {
            "type": "variable",
            "actorName": "Dog",
            "operation": "add",
            "variableName": "Health",
            "value": {
                "constant": "1"
            }
        }
    ],
    "conditions": [
        {
            "comparator": "=",
            "enabled": true,
            "key": "main-actor-appearance",
            "left": {
                "actorName": "Dog",
                "variableName": "appearance"
            },
            "right": {
                "constant": "Sleeping"
            }
        }
    ]
}
Output: "Sleep"

Input:
{
    "mainActorName": "Dog",
    "actions": [
        {
            "type": "move",
            "actorName": "ball",
            "offset": {
                "x": 2,
                "y": 0
            }
        },
        {
            "type": "move",
            "actorName": "Dog",
            "offset": {
                "x": 1,
                "y": 0
            }
        }
    ]
}
Output: "Roll Ball"
`;

    const prompt =
      "Propose a short, straightforward 1–3 word Title Case name for this gameplay rule recording. " +
      "Be creative and think about how the characters are interacting with each other. " +
      "Instead of describing what the rule does, describe the main action or behavior (i.e. instead of move, say jump, fight, escape, eat, etc.) " +
      "Focus on the main action or behavior. Respond with only the name.\n\n" +

      // Very concise input format primer
      "The structure of the rules are divided into a series of actions that animate the characters. " +
      "The actions are defined by (x,y) offsets relative to the main actor in a coordinate system where the main actor is at (0,0). " +
      "Input format (very brief): a rule has start_scene (initial actor positions/appearances), " +
      "actions (e.g., move, delete, variable changes), optional conditions (what must be true, like appearance or variable value), and extent (coordinate metadata). " +
      "Coordinates are offsets relative to the main actor at (0,0); negative y is up, negative x is left. " +
      "Actors, variables, and appearances are provided as names, not IDs.\n\n" +

      "Here are some examples:\n" +
      fewShotExamples + "\n" +
      "Rule data:\n" +
      JSON.stringify(recording, null, 2);

    // Log the prompt being sent to OpenAI for debugging
    console.log("Prompt sent to OpenAI:", prompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You generate concise, evocative names for gameplay rules. Focus on the main action or behavior. Output only the name.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 12,
      temperature: 0.7,
    });

    const name = completion.choices[0]?.message?.content?.trim() || "Unnamed Rule";
    console.log("Generated rule name:", name);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.json({ name });
  } catch (error) {
    console.error("Error generating rule name:", error);
    res.status(500).json({ error: "Failed to generate rule name" });
  }
});

router.get("/generate-background", userFromBasicAuth, async (req, res) => {
  const prompt = (req.query.prompt as string) || "A fantasy game background scene"; // Default prompt if none provided
  const filename = (req.query.filename as string) || "background"; // Default filename if none provided
  openai = openai || new OpenAI({});

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      // prompt: `A wide landscape game background scene: ${prompt}. Make it suitable for a 2D game background, with good depth and atmosphere.`,
      prompt: `A wide 2D game background of ${prompt}, with soft, muted colors and layered depth. Stylized and subtle, no text, low contrast, not distracting.`,
      n: 1,
      size: "1792x1024",
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      res.status(500).json({ error: "Failed to retrieve image URL" });
      return;
    }
    console.log("Downloading background image from URL:", imageUrl);

    // Download the image using https
    https
      .get(imageUrl, (imageResponse) => {
        const data: Buffer[] = [];

        imageResponse.on("data", (chunk) => {
          data.push(chunk);
        });

        imageResponse.on("end", async () => {
          try {
            const imageBuffer = Buffer.concat(data);

            // Upload the image to Supabase
            const publicUrl = await uploadImageToSupabase(imageBuffer, filename, "image/png");

            console.log("Uploaded to Supabase:", publicUrl);

            // Save the image locally
            // fs.writeFileSync("background.png", imageBuffer);
            // console.log("Background image saved locally as 'background.png'");

            // Set CORS headers
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Content-Type", "application/json");
            res.json({
              success: true,
              message: "Background generated successfully",
              imageUrl: publicUrl,
            });
          } catch (err) {
            console.error("Error processing image:", err);
            res.status(500).json({ error: "Failed to process image" });
          }
        });
      })
      .on("error", (err) => {
        console.error("Error downloading the image:", err);
        res.status(500).json({ error: "Failed to download the image" });
      });
  } catch (error) {
    console.error("Error generating background:", error);
    res.status(500).json({ error: "Failed to generate background" });
  }
});

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post("/upload-image", upload.single("image") as any, async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const { buffer, originalname } = file;

    // Upload the image to Supabase Storage
    const { data, error } = await supabase.storage
      .from("background-images") // Replace with your bucket name
      .upload(`backgrounds/${originalname}`, buffer, {
        contentType: file.mimetype,
        upsert: true, // Overwrite if the file already exists
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get the public URL of the uploaded image
    const publicUrl = supabase.storage
      .from("background-images") // Replace with your bucket name
      .getPublicUrl(data.path).data.publicUrl;

    res.json({ publicUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Function to upload image to Supabase
const uploadImageToSupabase = async (imageBuffer: Buffer, filename: string, mimetype: string) => {
  try {
    const { data, error } = await supabase.storage
      .from("background-images") // Change to your Supabase bucket name
      .upload(`backgrounds/${filename}`, imageBuffer, {
        contentType: mimetype,
        upsert: true, // Allow overwriting of existing files
      });

    if (error) {
      console.error("Supabase Upload Error:", error.message);
      throw new Error(error.message);
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("background-images")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Error uploading to Supabase:", err);
    throw new Error("Failed to upload image to Supabase");
  }
};

export default router;
