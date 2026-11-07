const profiles = [
  { name: "Facebook", href: "https://www.facebook.com/Techidea.online/" },
  { name: "YouTube", href: "https://www.youtube.com/@techidea.online" },
] as const;

export function SocialLinks({ iconsOnly = false }: { iconsOnly?: boolean }) {
  return <div className="social-links">{profiles.map(({ name, href }) =>
    <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`TechIdea on ${name}`}>
      {iconsOnly ? <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor">
        {name === "Facebook"
          ? <path d="M14 22v-9h3l.5-3H14V8c0-1 .4-1.5 1.6-1.5H18V3.2c-.8-.1-1.9-.2-3-.2-3 0-5 1.8-5 5v2H7v3h3v9z" />
          : <path fillRule="evenodd" d="M22.4 6.8a3 3 0 0 0-2.1-2.1C18.5 4.2 12 4.2 12 4.2s-6.5 0-8.3.5a3 3 0 0 0-2.1 2.1C1.1 8.6 1.1 12 1.1 12s0 3.4.5 5.2a3 3 0 0 0 2.1 2.1c1.8.5 8.3.5 8.3.5s6.5 0 8.3-.5a3 3 0 0 0 2.1-2.1c.5-1.8.5-5.2.5-5.2s0-3.4-.5-5.2ZM10 15.5v-7l6 3.5-6 3.5Z" />}
      </svg> : name}
    </a>
  )}</div>;
}
