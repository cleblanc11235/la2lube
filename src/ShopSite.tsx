import { useEffect } from 'react';
import { AuthGate } from './components/AuthGate';
import ShopApp from './ShopApp';
import { SHOP } from './config/shopBrand';

/** The staff app as deployed: login first, then the shop screens. */
export default function ShopSite() {
  useEffect(() => {
    document.title = `${SHOP.name} — Shop`;
    // Staff-only site: keep the login page out of search results.
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return <AuthGate>{(signOut) => <ShopApp onSignOut={signOut} />}</AuthGate>;
}
