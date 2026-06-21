import { Button } from '@/components/ui/button';
export const GoogleSignInButton = ({ disabled, onClick, isPending, text }) => {
  return (
    <Button
      type='button'
      onClick={onClick}
      disabled={disabled}
      variant='outline'
    >
      {isPending ? 'Connecting to Google...' : text}
    </Button>
  );
};
