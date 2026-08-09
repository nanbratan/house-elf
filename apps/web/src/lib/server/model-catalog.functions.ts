import { createServerFn } from '@tanstack/react-start';

import { loadModelCatalog } from './model-catalog';

/**
 * A route loader runs isomorphically, so loading the catalog from one would ship
 * the private origin to the browser. `createServerFn` is the boundary the build
 * replaces with an RPC stub client-side, taking `./model-catalog` — and
 * therefore `MASTRA_URL` — with it.
 */
export const getModelCatalog = createServerFn({ method: 'GET' }).handler(() => loadModelCatalog());
