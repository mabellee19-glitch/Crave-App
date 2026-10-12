import React from 'react';
import { kurzeAdresse, ohneTracking, textUndAdressen } from '@/lib/aufraeumen';

/**
 * Eine Notiz, in der Adressen als kurzer Link stehen: "swissmilk.ch" statt
 * der ganzen Adresse. Die lange Fassung liess das Blatt am iPad seitlich
 * verrutschen – eine Adresse kennt keine Stelle zum Umbrechen.
 */
export function Notiz({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return (
    <p className={className} style={style}>
      {textUndAdressen(text).map((teil, index) =>
        index % 2 === 1 ? (
          <a key={index} className="notiz__link" href={ohneTracking(teil)} target="_blank" rel="noopener noreferrer">
            {kurzeAdresse(teil)}
          </a>
        ) : (
          teil
        ),
      )}
    </p>
  );
}
