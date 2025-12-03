import { Breadcrumb } from '../types';

/**
 * Callback type for breadcrumbs
 */
type BreadcrumbCallback = (breadcrumb: Breadcrumb) => void;

/**
 * Configuration for click breadcrumbs
 */
export interface ClickBreadcrumbsConfig {
  /**
   * Capture text content of clicked elements
   * @default true
   */
  captureText?: boolean;

  /**
   * Maximum text length to capture
   * @default 50
   */
  maxTextLength?: number;

  /**
   * CSS selectors to ignore (clicks on these elements won't be captured)
   */
  ignoredSelectors?: string[];

  /**
   * Only capture clicks on interactive elements (buttons, links, inputs)
   * @default false
   */
  interactiveOnly?: boolean;
}

/**
 * Setup click breadcrumb tracking
 *
 * @example
 * ```ts
 * const cleanup = setupClickBreadcrumbs(
 *   (breadcrumb) => tracker.addBreadcrumb(breadcrumb),
 *   { captureText: true, maxTextLength: 30 }
 * );
 *
 * // Later, to cleanup:
 * cleanup();
 * ```
 *
 * @returns Cleanup function to remove click listener
 */
export function setupClickBreadcrumbs(
  onBreadcrumb: BreadcrumbCallback,
  config?: ClickBreadcrumbsConfig
): () => void {
  const captureText = config?.captureText ?? true;
  const maxTextLength = config?.maxTextLength ?? 50;
  const ignoredSelectors = config?.ignoredSelectors ?? [];
  const interactiveOnly = config?.interactiveOnly ?? false;

  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];

  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target || !target.tagName) return;

    // Check if interactive-only mode and element is not interactive
    if (interactiveOnly && !interactiveTags.includes(target.tagName)) {
      return;
    }

    // Check ignored selectors
    for (const selector of ignoredSelectors) {
      try {
        if (target.matches(selector) || target.closest(selector)) {
          return;
        }
      } catch {
        // Invalid selector, skip
      }
    }

    // Build element description
    const tagName = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const classes =
      target.className && typeof target.className === 'string'
        ? `.${target.className
            .split(' ')
            .filter(Boolean)
            .slice(0, 3) // Limit to first 3 classes
            .join('.')}`
        : '';

    // Get text content
    let text = '';
    if (captureText) {
      text = getElementText(target, maxTextLength);
    }

    // Build selector path
    const path = buildSelectorPath(target);

    // Build message
    let message = `Clicked on ${tagName}${id}${classes}`;
    if (text) {
      message += `: "${text}"`;
    }

    onBreadcrumb({
      type: 'click',
      category: 'ui.click',
      message,
      level: 'info',
      data: {
        tagName,
        id: target.id || undefined,
        className: target.className || undefined,
        text: text || undefined,
        path,
        coordinates: {
          x: event.clientX,
          y: event.clientY,
        },
      },
      timestamp: Date.now(),
    });
  };

  // Use capture phase to catch clicks before they might be stopped
  document.addEventListener('click', handleClick, { capture: true });

  return () => {
    document.removeEventListener('click', handleClick, { capture: true });
  };
}

/**
 * Get readable text from element
 */
function getElementText(element: HTMLElement, maxLength: number): string {
  // Try aria-label first (most accessible)
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return truncate(ariaLabel.trim(), maxLength);
  }

  // Try title attribute
  const title = element.getAttribute('title');
  if (title) {
    return truncate(title.trim(), maxLength);
  }

  // For inputs, get value or placeholder
  if (element instanceof HTMLInputElement) {
    if (element.type === 'password') {
      return '[password]';
    }
    if (element.type === 'submit' || element.type === 'button') {
      return truncate(element.value, maxLength);
    }
    if (element.placeholder) {
      return `[${truncate(element.placeholder, maxLength)}]`;
    }
    return '';
  }

  if (element instanceof HTMLTextAreaElement) {
    if (element.placeholder) {
      return `[${truncate(element.placeholder, maxLength)}]`;
    }
    return '';
  }

  // For select, get selected option text
  if (element instanceof HTMLSelectElement) {
    const selectedOption = element.options[element.selectedIndex];
    if (selectedOption) {
      return truncate(selectedOption.text, maxLength);
    }
    return '';
  }

  // For buttons and links, get innerText
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLAnchorElement
  ) {
    const text = element.innerText?.trim();
    if (text) {
      return truncate(text, maxLength);
    }
  }

  // Try innerText for other elements (but only if short)
  const innerText = element.innerText?.trim();
  if (innerText && innerText.length <= maxLength) {
    return innerText;
  }

  return '';
}

/**
 * Build a CSS selector path for the element
 */
function buildSelectorPath(element: HTMLElement, maxDepth: number = 3): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && depth < maxDepth) {
    const tag = current.tagName.toLowerCase();
    const currentElement = current; // Capture for closure

    // If element has ID, use it and stop
    if (current.id) {
      parts.unshift(`${tag}#${current.id}`);
      break;
    }

    // Add nth-child for disambiguation
    const parentEl: HTMLElement | null = current.parentElement;
    let nthChild = '';
    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && child.tagName === currentElement.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(currentElement) + 1;
        nthChild = `:nth-of-type(${index})`;
      }
    }

    parts.unshift(`${tag}${nthChild}`);
    current = parentEl;
    depth++;
  }

  return parts.join(' > ');
}

/**
 * Truncate string to max length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}
