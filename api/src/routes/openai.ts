import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import express from "express";
import fs from "fs";
import https from "https";
import multer from "multer";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { Readable } from "stream";
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

router.post("/edit-sprite", userFromBasicAuth, async (req, res) => {
  try {
    openai = openai || new OpenAI({});
    const { imageData, maskData, prompt } = req.body;

    console.log("[edit-sprite API] Received request", {
      hasImageData: !!imageData,
      hasMaskData: !!maskData,
      imageDataLength: imageData?.length,
      maskDataLength: maskData?.length,
      imageDataPrefix: imageData?.substring(0, 50),
      prompt,
    });

    if (!imageData || !prompt) {
      console.error("[edit-sprite API] Missing required fields");
      res.status(400).json({ error: "Missing image data or prompt" });
      return;
    }

    // Extract base64 data for image
    let base64Data = imageData;
    if (imageData.startsWith("data:")) {
      base64Data = imageData.split(",", 2)[1];
      console.log("[edit-sprite API] Extracted base64 from image data URL");
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, "base64");
    console.log("[edit-sprite API] Image buffer size:", imageBuffer.length, "bytes");

    // Verify it's a valid PNG (PNG files start with PNG signature)
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const isPNG = imageBuffer.subarray(0, 8).equals(pngSignature);
    console.log("[edit-sprite API] Image format check:", {
      isPNG,
      firstBytes: Array.from(imageBuffer.subarray(0, 8)).map(b => `0x${b.toString(16)}`).join(" "),
    });

    if (!isPNG) {
      console.warn("[edit-sprite API] Warning: Image may not be valid PNG format");
    }

    // Prepare image and mask files for OpenAI SDK
    const imageFile = await toFile(imageBuffer, "sprite.png", { type: "image/png" });

    let maskFile: Awaited<ReturnType<typeof toFile>> | undefined;
    if (maskData) {
      let maskBase64 = maskData;
      if (maskData.startsWith("data:")) {
        maskBase64 = maskData.split(",", 2)[1];
      }
      const maskBuffer = Buffer.from(maskBase64, "base64");
      console.log("[edit-sprite API] Mask buffer size:", maskBuffer.length, "bytes");

      const isMaskPNG = maskBuffer.subarray(0, 8).equals(pngSignature);
      console.log("[edit-sprite API] Mask format check:", { isPNG: isMaskPNG });

      maskFile = await toFile(maskBuffer, "mask.png", { type: "image/png" });
    }

    console.log("[edit-sprite API] Sending request to OpenAI (gpt-image-1)", {
      model: "gpt-image-1",
      hasMask: !!maskFile,
      size: "1024x1024",
    });

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      mask: maskFile,
      prompt,
      size: "1024x1024",
    });

    console.log("[edit-sprite API] OpenAI response received", {
      hasData: !!response,
      dataKeys: response ? Object.keys(response) : [],
      hasImageData: !!response.data?.[0]?.b64_json,
    });

    let editedImageBase64 = response.data?.[0]?.b64_json;

    if (!editedImageBase64 && response.data?.[0]?.url) {
      const imageUrl = response.data[0].url;
      console.log("[edit-sprite API] Falling back to URL response", { imageUrl });
      editedImageBase64 = await new Promise<string>((resolve, reject) => {
        https
          .get(imageUrl, (imageResponse) => {
            const data: Buffer[] = [];
            imageResponse.on("data", (chunk) => data.push(chunk));
            imageResponse.on("end", () => resolve(Buffer.concat(data).toString("base64")));
          })
          .on("error", (err) => reject(err));
      });
    }

    if (!editedImageBase64) {
      console.error("[edit-sprite API] No edited image in response", {
        responseData: JSON.stringify(response.data).substring(0, 500),
      });
      res.status(500).json({ error: "Failed to retrieve edited image" });
      return;
    }

    console.log("[edit-sprite API] Edited image received", {
      base64Length: editedImageBase64.length,
    });

    const imageUrl = `data:image/png;base64,${editedImageBase64}`;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.json({ imageUrl });
  } catch (error: any) {
    console.error("[edit-sprite API] Error editing sprite:", error);
    console.error("[edit-sprite API] Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    const errorMessage = error.response?.data?.error?.message || error.message || "Failed to edit sprite";
    res.status(500).json({ error: errorMessage });
  }
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

    // Download the image using fetch (supports redirects automatically)
    const downloadResponse = await fetch(imageUrl);
    if (!downloadResponse.ok) {
      console.error(`Image download failed: HTTP ${downloadResponse.status} ${downloadResponse.statusText}`);
      res.status(500).json({ error: "Failed to download the image from provider" });
      return;
    }

    const imageBuffer = Buffer.from(await downloadResponse.arrayBuffer());
    console.log(`Downloaded image: ${imageBuffer.length} bytes`);

    try {
      // Upload the image to S3
      const publicUrl = await uploadImageToS3(imageBuffer, filename, "image/png");

      console.log("Uploaded to S3:", publicUrl);

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
  } catch (error) {
    console.error("Error generating background:", error);
    res.status(500).json({ error: "Failed to generate background" });
  }
});

// Initialize S3 client lazily
let _s3: S3Client | null = null;
const getS3 = () => {
  if (!_s3) {
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_BUCKET_NAME;
    if (!region || !bucket) {
      throw new Error(
        `S3 not configured: AWS_REGION=${region ? "set" : "MISSING"}, AWS_BUCKET_NAME=${bucket ? "set" : "MISSING"}`,
      );
    }
    _s3 = new S3Client({ region });
  }
  return _s3;
};
const getBucket = () => {
  const bucket = process.env.AWS_BUCKET_NAME;
  if (!bucket) throw new Error("AWS_BUCKET_NAME is not set");
  return bucket;
};

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post("/upload-image", upload.single("image") as any, async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const { buffer, originalname } = file;
    const key = `backgrounds/${originalname}`;

    await getS3().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: buffer,
        ContentType: file.mimetype,
      }),
    );

    const publicUrl = `/backgrounds/${encodeURIComponent(originalname)}`;
    res.json({ publicUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Proxy endpoint to serve background images from S3 (keeps bucket private)
router.get("/backgrounds/:key", async (req, res) => {
  try {
    const key = `backgrounds/${req.params.key}`;
    const result = await getS3().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: key,
      }),
    );

    res.setHeader("Content-Type", result.ContentType || "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const body = result.Body;
    if (body instanceof Readable) {
      body.pipe(res);
    } else {
      // Body is a ReadableStream or Blob in some environments
      const chunks: Buffer[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of body as any) {
        chunks.push(Buffer.from(chunk));
      }
      res.send(Buffer.concat(chunks));
    }
  } catch (err: any) {
    if (err.name === "NoSuchKey") {
      res.status(404).json({ error: "Image not found" });
    } else {
      console.error("Error serving background image:", err);
      res.status(500).json({ error: "Failed to retrieve image" });
    }
  }
});

// Function to upload image to S3
const uploadImageToS3 = async (imageBuffer: Buffer, filename: string, mimetype: string) => {
  const uploadFilename =
    filename.endsWith(".png") || filename.endsWith(".jpg") || filename.endsWith(".jpeg")
      ? filename
      : `${filename}.png`;

  const key = `backgrounds/${uploadFilename}`;
  console.log(`Uploading to S3: ${key} (${imageBuffer.length} bytes)`);

  await getS3().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: imageBuffer,
      ContentType: mimetype,
    }),
  );

  // Return the proxy URL (not a direct S3 URL)
  return `/backgrounds/${encodeURIComponent(uploadFilename)}`;
};

export default router;
