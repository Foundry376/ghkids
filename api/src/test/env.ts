// Loaded first (see .mocharc.json), before anything imports the data source,
// which picks its database from NODE_ENV when it's first imported. Setting it
// later - in setup.ts, say - is too late: by then the data source has already
// chosen DATABASE_URL, and the tests' TRUNCATEs run against it.
process.env.NODE_ENV = "test";
