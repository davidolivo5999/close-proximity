import { useEffect, useRef, useState } from 'react';
import { oneSignalService } from '@/lib/oneSignalService';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function OneSignalVerificationDialog() {
  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  const checkAndShow = (id) => {
    if (!id || id.startsWith('local-') || shownRef.current) return;
    shownRef.current = true;
    setOpen(true);
  };

  useEffect(() => {
    // Check immediately in case subscription ID is already server-assigned
    checkAndShow(oneSignalService.getSubscriptionId());

    // Also listen for changes
    const removeListener = oneSignalService.addSubscriptionChangeListener((change) => {
      checkAndShow(change?.current?.id);
    });

    return removeListener;
  }, []);

  const handleGotIt = async () => {
    setOpen(false);
    await oneSignalService.requestPermission();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Your OneSignal SDK integration is complete!</AlertDialogTitle>
          <AlertDialogDescription>
            You can now send Push Notifications &amp; In-App Messages through OneSignal. Tap below to enable push notifications.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleGotIt}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}