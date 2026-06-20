export const GoogleSignInButton = ({ disabled, onClick, isPending, text }) => {
  return (
    <button type='button' onClick={onClick} disabled={disabled}>
      {isPending ? 'Connecting to Google...' : text}
    </button>
  );
};
