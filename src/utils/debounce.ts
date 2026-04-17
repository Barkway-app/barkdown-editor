export type DebouncedFn<T extends (...args: any[]) => void> = ((...args: Parameters<T>) => void) & {
    cancel: () => void;
};

/**
 * Lightweight debounce helper for editor interactions.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number): DebouncedFn<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const debounced = ((...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn(...args);
        }, waitMs);
    }) as DebouncedFn<T>;

    debounced.cancel = () => {
        if (!timeoutId) {
            return;
        }

        clearTimeout(timeoutId);
        timeoutId = null;
    };

    return debounced;
}
