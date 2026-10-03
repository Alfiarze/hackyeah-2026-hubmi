# HubMI.pl — Landing (Astro)

Landing page Małopolskiego Hubu Innowacji Społecznych (HackYeah 2026, zadanie partnerskie).
Statyczna strona zbudowana w [Astro](https://astro.build), serwowana przez nginx.

## Struktura repo

To repo zawiera wiele projektów. Landing żyje w katalogu `landing/` — każdy kolejny
projekt (frontend, backend, ...) dostanie własny katalog i własny Dockerfile.

## Szybki start

```bash
cd landing
npm install
npm run dev      # dev server na http://localhost:4321
npm run build    # produkcyjny build do ./dist
```

## Docker

```bash
cd landing
docker build -t hubmi-landing .
docker run --rm -p 8080:8080 hubmi-landing
# → http://localhost:8080
```

Obraz: multi-stage (`node:22-alpine` → `nginxinc/nginx-unprivileged:1.27-alpine`),
kontener działa jako user nieuprzywilejowany, port **8080**, healthcheck wbudowany.

## Deploy (Coolify)

- **Katalog bazowy (Dockerfile location):** `landing/Dockerfile`
- **Port:** `8080`
- Build z subdirectory — Coolify klonuje repo i buduje `landing/Dockerfile`

## Dostępność

Strona projektowana pod **WCAG 2.1 AA**: skip-link, kontrast AA, focus-visible,
semantyczna struktura nagłówków, `lang="pl"`, wsparcie `prefers-reduced-motion`.
