import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

import { resetStubProps } from '../stubs/stub-props';

// Testing Library only registers its own auto-cleanup when Vitest globals are
// enabled. They are not, so unmount between tests explicitly — without this,
// components accumulate in the document and role queries match the previous test's
// markup as well as the current one's.
afterEach(cleanup);

// The stub prop recorder is module state, and modules are shared by every test in a
// file, so it outlives the components that wrote to it.
afterEach(resetStubProps);
