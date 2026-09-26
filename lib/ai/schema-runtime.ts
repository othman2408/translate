import { config } from 'zod/v4/core';

// Extension CSP disallows dynamic code generation. Configure this before the
// providers construct schemas, including Zod's otherwise-caught eval probe.
config({ jitless: true });
