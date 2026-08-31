import { Link } from 'react-router-dom';

export const Footer = () => (
  <footer className='mt-auto border-t bg-muted/30'>
    <div className='container mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6'>
      <p>Hermyx · Academic final degree project prototype · Stripe test mode</p>
      <nav
        aria-label='Legal information'
        className='flex flex-wrap gap-x-4 gap-y-2'
      >
        <Link to='/terms' className='hover:text-foreground hover:underline'>
          Terms
        </Link>
        <Link to='/legal' className='hover:text-foreground hover:underline'>
          Legal notice
        </Link>
        <Link to='/privacy' className='hover:text-foreground hover:underline'>
          Privacy
        </Link>
        <Link to='/cookies' className='hover:text-foreground hover:underline'>
          Cookies
        </Link>
        <Link
          to='/community-guidelines'
          className='hover:text-foreground hover:underline'
        >
          Community
        </Link>
      </nav>
    </div>
  </footer>
);
