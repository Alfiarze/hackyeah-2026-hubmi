-- Rozszerzenia Postgres, od których zależy HubMI.
--
-- vector — wyszukiwanie podobnych kart po wektorach 48D (pgvector)
--
-- Uwaga: Postgres NIE ma w rdzeniu polskiego stemmera (brak konfiguracji
-- `polish`), dlatego kolumny `search_vector` używają konfiguracji `simple`,
-- a polskie końcówki ogarnia prefiksowe zapytanie z rdzeniami z naszego
-- stemmera — zob. backend/catalog/search.py → prefix_query().
CREATE EXTENSION IF NOT EXISTS vector;
