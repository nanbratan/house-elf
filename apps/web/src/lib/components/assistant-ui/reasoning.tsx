'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import { BrainIcon, ChevronDownIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { useScrollLock } from '@assistant-ui/react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible.tsx';
import { cn } from '../../utils/cn.ts';

const ANIMATION_DURATION = 200;
const MS_IN_S = 1000;

interface ReasoningState {
	/** The disclosure is open *and* still streaming: content is pinned to the newest tokens. */
	isPreview: boolean;
	/** Seconds spent streaming, known only once streaming has stopped. */
	duration: number | undefined;
}

const ReasoningContext = createContext<ReasoningState>({ isPreview: false, duration: undefined });

const reasoningVariants = cva('aui-reasoning-root w-full', {
	variants: {
		variant: {
			outline: 'rounded-lg border px-3 py-2',
			ghost: '',
			muted: 'bg-muted/50 rounded-lg px-3 py-2'
		}
	},
	defaultVariants: { variant: 'outline' }
});

export type ReasoningRootProps = Omit<
	React.ComponentProps<typeof Collapsible>,
	'open' | 'onOpenChange'
> &
	VariantProps<typeof reasoningVariants> & {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		defaultOpen?: boolean;
		/**
		 * Whether the reasoning is currently streaming. While `true` the disclosure is
		 * held open with a bottom-pinned live preview; when streaming ends it returns to
		 * `defaultOpen`, and the first manual toggle takes over the open state permanently.
		 */
		streaming?: boolean;
	};

function ReasoningRoot({
	className,
	variant,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	defaultOpen,
	streaming,
	children,
	...props
}: ReasoningRootProps) {
	const collapsibleRef = useRef<HTMLDivElement>(null);
	// State rather than a ref, though it never changes: the resting open state is read
	// during render, which a ref may not be. Resolved here rather than as a default in
	// the destructuring pattern above, which would bail the component out of the
	// React Compiler.
	const [initialOpen] = useState(defaultOpen ?? false);
	const isStreaming = streaming === true;
	const [userOpen, setUserOpen] = useState<boolean | null>(null);
	const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

	const isControlled = controlledOpen !== undefined;
	const isOpen = isControlled ? controlledOpen : (userOpen ?? (isStreaming || initialOpen));
	const isPreview = isStreaming && isOpen;

	const startedAtRef = useRef<number | null>(null);
	const [duration, setDuration] = useState<number | undefined>(undefined);

	// Wall-clock, so it cannot be derived during render: how long the model thought is
	// the gap between the first and last streaming render, and the answer has to outlive
	// the streaming→settled transition that stops the re-renders producing it.
	useEffect(() => {
		if (isStreaming) {
			// The React Compiler has no lowering for `??=` yet ("Handle ??= operators in
			// AssignmentExpression") and bails out of the entire component when it meets
			// one, costing ReasoningRoot its memoisation. The compiler outranks the idiom.
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			if (startedAtRef.current === null) {
				startedAtRef.current = Date.now();
			}
			return;
		}
		if (startedAtRef.current === null) return;
		setDuration(Math.ceil((Date.now() - startedAtRef.current) / MS_IN_S));
		startedAtRef.current = null;
	}, [isStreaming]);

	const prevStreamingRef = useRef(streaming);
	// Measured against the pre-paint layout: the panel opening on stream start would
	// otherwise shove the transcript under the reader before the scroll lock can hold it.
	useLayoutEffect(() => {
		if (prevStreamingRef.current === streaming) return;
		prevStreamingRef.current = streaming;
		// A streaming transition only animates the panel when the resting state is
		// collapsed; with `defaultOpen` the disclosure stays open across it.
		if (!isControlled && userOpen === null && !initialOpen) {
			lockScroll();
		}
	}, [streaming, isControlled, userOpen, initialOpen, lockScroll]);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			lockScroll();
			if (!isControlled) {
				setUserOpen(open);
			}
			controlledOnOpenChange?.(open);
		},
		[lockScroll, isControlled, controlledOnOpenChange]
	);

	return (
		<Collapsible
			ref={collapsibleRef}
			data-slot="reasoning-root"
			data-variant={variant ?? 'outline'}
			open={isOpen}
			onOpenChange={handleOpenChange}
			className={cn(reasoningVariants({ variant }), 'group/reasoning-root', className)}
			style={{ '--animation-duration': `${String(ANIMATION_DURATION)}ms` }}
			{...props}
		>
			<ReasoningContext.Provider value={{ isPreview, duration }}>
				{children}
			</ReasoningContext.Provider>
		</Collapsible>
	);
}

function ReasoningFade({
	side,
	className,
	...props
}: React.ComponentProps<'div'> & { side?: 'top' | 'bottom' }) {
	// See ReasoningRoot: a default in the destructuring pattern costs the compiler pass.
	const edge = side ?? 'bottom';

	return (
		<div
			data-slot="reasoning-fade"
			className={cn(
				'aui-reasoning-fade pointer-events-none absolute inset-x-0 z-10 h-8',
				'animate-in duration-(--animation-duration) fade-in-0',
				edge === 'top'
					? 'top-0 bg-[linear-gradient(to_bottom,var(--color-background),transparent)] group-data-[variant=muted]/reasoning-root:bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--color-muted)_50%,var(--color-background)),transparent)]'
					: 'bottom-0 bg-[linear-gradient(to_top,var(--color-background),transparent)] group-data-[variant=muted]/reasoning-root:bg-[linear-gradient(to_top,color-mix(in_oklab,var(--color-muted)_50%,var(--color-background)),transparent)]',
				className
			)}
			{...props}
		/>
	);
}

function thinkingLabel(isActive: boolean, duration: number | undefined) {
	if (isActive) return 'Thinking...';
	// A message restored from history never streamed in this session, so nothing timed it.
	// Deliberately unquantified: the run could have been seconds or minutes, and the
	// transcript carries no record of which.
	if (duration === undefined) return 'Thought for some time';
	return `Thought for ${String(duration)} ${duration === 1 ? 'second' : 'seconds'}`;
}

function ReasoningTrigger({
	active,
	className,
	...props
}: React.ComponentProps<typeof CollapsibleTrigger> & { active?: boolean }) {
	// See ReasoningRoot: a default in the destructuring pattern costs the compiler pass.
	const isActive = active ?? false;
	const { duration } = useContext(ReasoningContext);
	const label = thinkingLabel(isActive, duration);

	return (
		<CollapsibleTrigger
			data-slot="reasoning-trigger"
			className={cn(
				'aui-reasoning-trigger group/trigger flex max-w-[75%] origin-left items-center gap-2 py-1.5 text-sm transition-[color,scale] active:scale-[0.98]',
				'text-muted-foreground hover:text-foreground',
				className
			)}
			{...props}
		>
			<BrainIcon
				data-slot="reasoning-trigger-icon"
				className="aui-reasoning-trigger-icon size-4 shrink-0"
			/>
			<span
				data-slot="reasoning-trigger-label"
				className="aui-reasoning-trigger-label-wrapper relative inline-block text-start leading-none tabular-nums"
			>
				<span>{label}</span>
				{isActive ? (
					<span
						aria-hidden
						data-slot="reasoning-trigger-shimmer"
						className="aui-reasoning-trigger-shimmer pointer-events-none absolute inset-0 shimmer motion-reduce:animate-none"
					>
						{label}
					</span>
				) : null}
			</span>
			<ChevronDownIcon
				data-slot="reasoning-trigger-chevron"
				className={cn(
					'aui-reasoning-trigger-chevron mt-0.5 size-4 shrink-0',
					'transition-transform duration-(--animation-duration) ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
					'-rotate-90',
					'group-data-open/trigger:rotate-0',
					'group-data-panel-open/trigger:rotate-0'
				)}
			/>
		</CollapsibleTrigger>
	);
}

function ReasoningContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof CollapsibleContent>) {
	const { isPreview } = useContext(ReasoningContext);

	return (
		<CollapsibleContent
			data-slot="reasoning-content"
			className={cn(
				'aui-reasoning-content relative overflow-hidden text-sm text-muted-foreground outline-none',
				'group/collapsible-content ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none',
				'data-closed:animate-collapsible-up',
				'data-open:animate-collapsible-down',
				'data-closed:fill-mode-forwards',
				'data-closed:pointer-events-none',
				'data-open:duration-(--animation-duration)',
				'data-closed:duration-(--animation-duration)',
				className
			)}
			{...props}
		>
			<ReasoningFade side="top" />
			{children}
			{isPreview ? <ReasoningFade side="bottom" /> : null}
		</CollapsibleContent>
	);
}

function ReasoningText({ className, children, ...props }: React.ComponentProps<'div'>) {
	const { isPreview } = useContext(ReasoningContext);
	const scrollRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);

	// Imperative scroll pinning against a growing DOM node: neither the scroll position
	// nor the ResizeObserver that drives it exists during render, and the reader's own
	// scrolling has to be able to take it over.
	useEffect(() => {
		if (!isPreview) return;
		const scrollEl = scrollRef.current;
		const contentEl = contentRef.current;
		if (!scrollEl || !contentEl) return;

		let pinned = true;
		let lastScrollTop = scrollEl.scrollTop;
		let lastScrollHeight = scrollEl.scrollHeight;
		const isAtBottom = () =>
			Math.abs(scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight) <= 1 ||
			scrollEl.scrollHeight <= scrollEl.clientHeight;

		const pin = () => {
			if (!pinned) return;
			scrollEl.scrollTop = scrollEl.scrollHeight;
		};
		// A pin's own scroll event can arrive after new content grew the scroll height and
		// read as "not at bottom"; only an upward move at unchanged scroll height is user intent.
		const onScroll = () => {
			if (isAtBottom()) {
				pinned = true;
			} else if (scrollEl.scrollTop < lastScrollTop && scrollEl.scrollHeight === lastScrollHeight) {
				pinned = false;
			}
			lastScrollTop = scrollEl.scrollTop;
			lastScrollHeight = scrollEl.scrollHeight;
		};

		pin();
		scrollEl.addEventListener('scroll', onScroll);
		const observer = new ResizeObserver(pin);
		observer.observe(contentEl);
		return () => {
			scrollEl.removeEventListener('scroll', onScroll);
			observer.disconnect();
		};
	}, [isPreview]);

	return (
		<div
			ref={scrollRef}
			data-slot="reasoning-text"
			className={cn(
				'aui-reasoning-text relative z-0 max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed text-pretty',
				'transform-gpu transition-[transform,opacity] ease-[cubic-bezier(0.32,0.72,0,1)]',
				'motion-reduce:animate-none',
				'group-data-open/collapsible-content:animate-in',
				'group-data-closed/collapsible-content:animate-out',
				'group-data-open/collapsible-content:fade-in-0',
				'group-data-closed/collapsible-content:fade-out-0',
				'group-data-open/collapsible-content:slide-in-from-top-4',
				'group-data-closed/collapsible-content:slide-out-to-top-4',
				'group-data-open/collapsible-content:blur-in-[2px]',
				'group-data-closed/collapsible-content:blur-out-[2px]',
				'group-data-open/collapsible-content:duration-(--animation-duration)',
				'group-data-closed/collapsible-content:duration-(--animation-duration)',
				className
			)}
			{...props}
		>
			<div ref={contentRef} className="aui-reasoning-text-content space-y-4">
				{children}
			</div>
		</div>
	);
}

// The registry also ships a `Reasoning` part component that renders assistant-ui's own
// markdown text, plus a deprecated `ReasoningGroup` composite targeting the legacy
// `components.ReasoningGroup` prop on `<MessagePrimitive.Parts>`. Both are dropped:
// `chat/Thread.tsx` composes these four under `<MessagePrimitive.GroupedParts>` and
// renders the reasoning text through `chat/MarkdownText.tsx`, so vendoring a second
// markdown component would only duplicate Streamdown.
export { ReasoningRoot, ReasoningTrigger, ReasoningContent, ReasoningText, reasoningVariants };
