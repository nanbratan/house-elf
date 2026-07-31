import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

// Testing Library only registers its own auto-cleanup when Vitest globals are
// enabled. They are not, so unmount between tests explicitly — without this,
// components accumulate in the document and role queries match the previous test's
// markup as well as the current one's.
afterEach(cleanup);
