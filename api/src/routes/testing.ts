import express from "express";
import { sendForkEmail } from "src/connectors/email";
import { User } from "src/db/entity/user";

const router = express.Router();

/**
 * Test email delivery by sending a sample fork notification.
 * Only available in non-production environments.
 *
 * GET /test/sendemail?to=your@email.com
 */
router.get("/test/send-email", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not available in production" });
  }

  const to = req.query.to as string;
  if (!to) {
    return res.status(400).json({ message: "Missing 'to' query parameter" });
  }

  // Create a mock user for testing
  const mockUser: Pick<User, "email" | "username"> = {
    email: to,
    username: "TestUser",
  };

  try {
    const success = await sendForkEmail(mockUser as User, {
      forkerUsername: "SomeCreator",
      worldName: "Amazing Test World",
      worldId: 12345,
    });

    if (success) {
      res.json({
        success: true,
        message: `Test email sent to ${to}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send email - check server logs",
      });
    }
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
