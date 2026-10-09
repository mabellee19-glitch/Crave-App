import { Bootstrap } from '@/components/Bootstrap';

export const dynamic = 'force-static';

/*
 * Wer schon einen Datenraum hat, wird weitergeleitet, bevor React ueberhaupt
 * geladen ist – sonst kaeme erst die ganze App, nur um sofort wieder
 * wegzunavigieren. Neue Besucher landen wie bisher bei Bootstrap, das den
 * Datenraum anlegt. Muster und Schluessel wie in Bootstrap und lib/id.
 */
const SOFORT_WEITER = `try{var s=localStorage.getItem('crave:space');if(s&&/^[a-z0-9-]{4,64}$/.test(s))location.replace('/s/'+s)}catch(e){}`;

export default function HomePage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SOFORT_WEITER }} />
      <Bootstrap />
    </>
  );
}
