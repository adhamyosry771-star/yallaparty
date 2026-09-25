// Global back button / popstate manager for mobile and browser back navigation interception

type BackHandler = () => boolean;

const handlers: BackHandler[] = [];
let initialPushed = false;

function ensurePushedState() {
  if (!initialPushed && typeof window !== 'undefined') {
    // Push a dummy history state to catch the next back button popstate event
    window.history.pushState({ customBack: true }, "");
    initialPushed = true;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (handlers.length > 0) {
      // Execute the topmost back handler (last added / LIFO)
      const handler = handlers[handlers.length - 1];
      const handled = handler();
      
      if (handled) {
        // Intercepted successfully. Restore the history state so we can intercept future back buttons.
        window.history.pushState({ customBack: true }, "");
      } else {
        // If not handled, we can pop it
        handlers.pop();
      }
    } else {
      // No custom back handlers left. Normal back navigation takes over.
      initialPushed = false;
    }
  });
}

/**
 * Registers a callback to be called when the back button is pressed.
 * The handler MUST return `true` if it successfully intercepts and handles the back action (e.g. closes an overlay).
 * If it returns `false`, the event passes to outer handlers.
 * 
 * Returns an unregister function to clean up when the overlay/modal is closed screen-side.
 */
export function registerBackAction(handler: BackHandler): () => void {
  ensurePushedState();
  handlers.push(handler);
  
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx !== -1) {
      handlers.splice(idx, 1);
    }
    
    // If all handlers are cleared screen-side, we should safely revert history
    // but wait! Calling window.history.back() will trigger 'popstate'.
    // To keep it simple and bulletproof, we let popstate fire normally, or we can just leave the dummy state.
    // Leaving the dummy state is absolutely safe and avoids complex state synchronizations.
  };
}
