// `server-only` throws outside Next's react-server condition. Tests run in plain Node,
// where importing server modules is intended, so it resolves to this empty module.
export {};
