import { Toast } from "@base-ui/react/toast";

/** Shared manager so toasts can be queued from hooks outside the viewport subtree. */
export const appToastManager = Toast.createToastManager();
