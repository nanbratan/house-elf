/**
 * Props recorded by the component stubs in this folder.
 *
 * A stub renders a bare marker and reports what it was handed here, so a parent
 * test can assert the contract it owes its children — including callbacks, which
 * cannot be read off the DOM — without the stub inventing markup to click.
 *
 * Each marker carries `data-stub-id`, so a test that cares where a child sits in
 * the document can go from the element back to its props.
 */

/**
 * A stub identifies itself with a symbol it declares in its own module, so two
 * stubs cannot collide and this file never has to know what stubs exist. The
 * description doubles as the marker's `data-testid`.
 */
export type StubKey = symbol;

type StubProps = Record<string, unknown>;

const propsByInstance = new Map<string, StubProps>();
const instancesByKey = new Map<StubKey, string[]>();

/** Called by a stub whenever its props change. Newest props win per instance. */
export function recordStubProps(key: StubKey, instanceId: string, props: StubProps): void {
	if (!propsByInstance.has(instanceId)) {
		instancesByKey.set(key, [...(instancesByKey.get(key) ?? []), instanceId]);
	}
	propsByInstance.set(instanceId, props);
}

/** Every instance of a stub, in mount order. */
export function stubRenders(key: StubKey): StubProps[] {
	return (instancesByKey.get(key) ?? []).map((id) => propsByInstance.get(id) ?? {});
}

/** The props of the only instance of a stub. Throws if there is not exactly one. */
export function stubProps(key: StubKey): StubProps {
	const renders = stubRenders(key);
	if (renders.length !== 1) {
		throw new Error(
			`Expected exactly one ${String(key.description)} stub, found ${String(renders.length)}`
		);
	}
	return renders[0];
}

/** The props behind a rendered marker element, for position-sensitive assertions. */
export function stubPropsOf(element: Element): StubProps {
	const id = element.getAttribute('data-stub-id');
	const props = id === null ? undefined : propsByInstance.get(id);
	if (props === undefined) throw new Error('That element is not a stub marker');
	return props;
}

/** A callback the parent passed down. Arguments are checked at the call site. */
export function stubCallback(key: StubKey, prop: string): (...args: unknown[]) => unknown {
	const callback = stubProps(key)[prop];
	if (typeof callback !== 'function') {
		throw new Error(`The ${String(key.description)} stub received no function for "${prop}"`);
	}
	return callback as (...args: unknown[]) => unknown;
}

export function resetStubProps(): void {
	propsByInstance.clear();
	instancesByKey.clear();
}
