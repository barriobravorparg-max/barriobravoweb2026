import { navLinks } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="font-display text-2xl tracking-widest text-white">BARRIO BRAVO RP</span>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            IP del servidor: <span className="font-mono text-cyan">Próximamente</span>
          </p>
        </div>

        <ul className="flex flex-wrap gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm text-gray-400 hover:text-peach">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex gap-4 text-sm text-gray-400">
          <a href="https://www.tiktok.com/@barriobravo.arg" target="_blank" rel="noopener noreferrer" className="hover:text-peach">
            TikTok
          </a>
          <span>Discord: Próximamente</span>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-xs text-gray-600">
        Barrio Bravo RP no está afiliado a Rockstar Games ni a Take-Two Interactive.
      </p>
    </footer>
  );
}
