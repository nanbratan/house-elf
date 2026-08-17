/**
 * Who the assistant remembers things about. Single-user app, so it is a constant.
 *
 * Working memory is filed under this value and Mastra fixes a thread's owner at
 * creation, so changing it orphans every memory rather than migrating it.
 */
export const OWNER_RESOURCE_ID = 'owner';
