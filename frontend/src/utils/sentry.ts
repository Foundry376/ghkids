import * as Sentry from "@sentry/react";

export const initializeSentry = () => {
  Sentry.init({
    dsn: "https://576c3be267b52f88fb193c6b169a72bd@o4509647560835072.ingest.us.sentry.io/4509647562407936",
    tracesSampleRate: 1.0,
    environment: import.meta.env.MODE || "development",
    // No IP addresses or cookies: the privacy policy promises we only keep
    // what we need.
    sendDefaultPii: false,
  });
};
