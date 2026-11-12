import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

export default function NotFound({ inApp }) {
  return (
    <div className={inApp ? 'py-24 text-center' : 'grid min-h-dvh place-items-center p-6 text-center'}>
      <div>
        {!inApp && <Logo className="mb-10" />}
        <p className="font-display text-7xl font-bold">404</p>
        <p className="mt-3 text-lg text-ink-3">This page wandered off.</p>
        <Button to={inApp ? '/app' : '/'} className="mt-8">{inApp ? 'Back to Today' : 'Go home'}</Button>
      </div>
    </div>
  );
}
