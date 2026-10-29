import React from "react";

/**
 * Pieces shared by the longer pages for grown-ups (/parents/research,
 * /parents/how-it-works, /parents/ai), most of which is adapted from the Codako book
 * chapter by Smith, Gotow and Yuan.
 */

const REFERENCES = {
  mcleod: (
    <>
      McLeod, S. Constructivism Learning Theory &amp; Philosophy of Education,{" "}
      <a
        href="https://www.simplypsychology.org/constructivism.html"
        target="_blank"
        rel="noreferrer"
      >
        simplypsychology.org/constructivism.html
      </a>
      , (March 2025).
    </>
  ),
  kidsim: (
    <>
      Smith, D.C., Cypher, A., and Spohrer, J. KidSim: Programming Agents without a Programming
      Language, <em>CACM</em> 37,7 (July 1994), 54-67.
    </>
  ),
  star: (
    <>
      Smith, D.C., Irby, C., Kimball, R., Verplank, W., and Harslem, E. Designing the Star User
      Interface, <em>Byte</em> 7,4 (April 1982), 242-282.
    </>
  ),
  cocoa: (
    <>
      Miller, Gregory, Demo of Cocoa at Apple&rsquo;s Worldwide Developers&rsquo; Conference, 1996.{" "}
      <a href="https://www.youtube.com/watch?v=NtmGTrr3R-E" target="_blank" rel="noreferrer">
        youtube.com/watch?v=NtmGTrr3R-E
      </a>
    </>
  ),
};

export type ReferenceId = keyof typeof REFERENCES;

/**
 * Footnotes for one page, numbered in the order the page's `refs` lists them
 * (so a page's notes read 1, 2, 3... even though the book numbers them
 * differently).
 */
export const Citation = ({
  refs,
  id,
}: {
  refs: ReferenceId[];
  id: ReferenceId | ReferenceId[];
}) => (
  <sup>
    {(Array.isArray(id) ? id : [id]).map((one, idx) => {
      const n = refs.indexOf(one) + 1;
      return (
        <React.Fragment key={one}>
          {idx > 0 && ", "}
          <a href={`#ref-${n}`}>{n}</a>
        </React.Fragment>
      );
    })}
  </sup>
);

export const References = ({ refs }: { refs: ReferenceId[] }) => (
  <>
    <h4>References</h4>
    <ol className="parents-article__references">
      {refs.map((id, idx) => (
        <li key={id} id={`ref-${idx + 1}`}>
          {REFERENCES[id]}
        </li>
      ))}
    </ol>
  </>
);

export const Figure = ({
  src,
  caption,
  alt,
  narrow,
}: {
  src: string | string[];
  caption?: React.ReactNode;
  alt: string;
  narrow?: boolean;
}) => (
  <figure className={`parents-article__figure ${narrow ? "narrow" : ""}`}>
    <div className="parents-article__figure-images">
      {/* Screenshots are dense; tapping one opens it full size. */}
      {(Array.isArray(src) ? src : [src]).map((s) => (
        <a key={s} href={s} target="_blank" rel="noreferrer">
          <img src={s} alt={alt} />
        </a>
      ))}
    </div>
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
);

/** The book chapter most of these pages are adapted from, hosted from public/. */
export const BookChapterLink = ({ children }: { children: React.ReactNode }) => (
  <a href="/codako-book-chapter.pdf" target="_blank" rel="noreferrer">
    {children}
  </a>
);

export const BookCredit = () => (
  <p className="parents-article__credit">
    Adapted from{" "}
    <BookChapterLink>
      &ldquo;Codako, A Video Game Construction Set: Constructivist learning with simulations&rdquo;
    </BookChapterLink>{" "}
    by David Canfield Smith, Ben Gotow, and Joyce Yuan (2026).
    {/* TODO: name the book and link to it once it's published. */}
  </p>
);
/** A few plain-language bullets at the top of a long page, for skimmers. */
export const InShort = ({ children }: { children: React.ReactNode }) => (
  <div className="parents-article__in-short">
    <strong>In short</strong>
    <ul>{children}</ul>
  </div>
);
