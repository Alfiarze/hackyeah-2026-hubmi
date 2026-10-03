/**
 * Materiał filmowy tła.
 *
 * Jedno miejsce do podmiany — reszta aplikacji o nim nie wie.
 *
 * Dobór materiału nie jest przypadkowy. Ujęcie jest abstrakcyjne i prawie
 * czarne, więc wtapia się w tło `--bg` zamiast z nim walczyć; nie ma w nim
 * tekstu, twarzy ani gwałtownych cięć, a dziesięciosekundowa pętla nie zwraca
 * na siebie uwagi. Materiał „kosmos / render 3D / neon" byłby z innego
 * produktu — wyglądałby jak startup kryptowalutowy, nie jak narzędzie
 * samorządu. Ten jest cichy i niesie tylko fakturę.
 *
 * Wariant `small` (960×540, 1,8 MB), nie `large` (5,4 MB): obraz i tak idzie
 * rozmyty, przyciemniony i odbarwiony, więc rozdzielczość nie robi różnicy,
 * a waga na komórce w gminie wiejskiej — robi.
 *
 * Plakat jest obowiązkowy nawet przy wideo: pokazuje się przed startem, przy
 * `prefers-reduced-motion`, w trybie wysokiego kontrastu i gdy przeglądarka
 * zablokuje autoodtwarzanie.
 */

export interface HeroMedia {
  src?: string;
  poster?: string;
  /** opis sceny dla czytników ekranu */
  caption?: string;
  /** źródło i licencja — do przypisu w zgłoszeniu */
  credit?: string;
}

export const HERO_MEDIA: HeroMedia = {
  src: "./media/hero.mp4",
  poster: "./media/hero-poster.jpg",
  caption:
    "abstrakcyjne, powoli przesuwające się cząstki światła na ciemnym tle",
  credit:
    "Pixabay („Abstract, Lights, Particles”), Pixabay Content License — " +
    "użycie komercyjne bez wymogu podania autorstwa",
};
