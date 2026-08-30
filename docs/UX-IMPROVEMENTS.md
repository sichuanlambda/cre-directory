# UX improvement backlog

Compiled 2026-08-30 from a full review of every page type. Ordered by
priority within each tier. Items marked [shipped] are done.

## Quick wins (small effort, do first)

1. **Favicon** — the site has none; browsers show a blank tab icon on every
   page. Add favicon.ico + apple-touch-icon derived from the logo mark.
2. **Custom 404 page** — GitHub Pages serves its default 404. Add 404.html
   with search, top categories, and popular comparisons so mistyped/stale
   URLs recover instead of dead-ending.
3. **Category page → guide cross-link** — every category page should link its
   buyer's guide prominently ("Read the full guide") and vice versa. Big
   internal-linking win, two lines in the generator.
4. **"Last verified" date near pricing** — product pages have `last_updated`
   in the data; render it ("Pricing last verified Aug 2026") for trust.
5. **"Claim this listing" destination** — currently points at the generic
   submit form; point at mailto with prefilled subject, mention free updates.
6. **[shipped] Collapsed badge section** — was a large block on every product
   page; now a one-line toggle.

## High priority (structural)

7. **Search in the nav** — search only exists on the homepage. Anyone on a
   product/category page has to go Home to search. Add a search icon/box in
   the nav on all generated pages (client-side over products.json, reusing
   the homepage search logic).
8. **Guides need the site chrome** — guides have no nav bar and no footer,
   just a "back" link; they're dead ends for both users and crawlers. Wrap
   them in the standard nav/footer (keep their reading layout).
9. **Richer shared footer** — generated pages' footer is three links. Add
   category links + top guides + popular comparisons columns; every page
   becomes an internal-linking hub.
10. **Category page filters** — the old category page had filters
    (property type, pricing model, deployment); the static rebuild dropped
    them. Reintroduce client-side filtering + sort (featured first /
    alphabetical) on top of the static grid.
11. **Category grid ordering** — currently alphabetical, so obscure tools
    outrank household names. Order by prominence (featured, then data
    richness), with alphabetical as secondary.

## Medium

12. **Compare tool upgrades** — the two selects are 200+ item flat lists.
    Group options by category, add type-ahead, and put state in the URL
    (?a=yardi&b=appfolio) so custom comparisons are shareable; vs-pages can
    then link "customize this comparison".
13. **Sticky section tabs on product pages** — the tab strip scrolls away on
    long pages; make it sticky.
14. **Product-page FAQ block** — generate 3-4 FAQs per product from data
    (pricing, trial, who it's for) with FAQPage schema. UX + rich results.
15. **Homepage Popular Comparisons strip** — the comparison cards exist;
    surface 3-6 on the homepage.
16. **Submit form category select** — categories is a free-text field; make
    it a multi-select of the real taxonomy so submissions arrive pre-mapped.
17. **Post-submit thank-you state** — set expectations (research process,
    ~2 business days, you'll get your listing URL).
18. **About/methodology page** — how listings are researched, how Featured
    works, who runs the site. Supports trust and E-E-A-T; link from footer.
19. **Related-carousel cap** — products in 3 categories render 3 carousels
    with overlap; cap at 2 and dedupe.
20. **Mobile pass on the 6-link nav** — verify the mobile menu with the
    added Advertise link; consider collapsing to a hamburger sooner.

## Later

21. **Screenshots on product pages** — almost no listings have them; an
    automated homepage-screenshot pipeline per product would transform page
    richness. (Belongs to the content roadmap too.)
22. **Search page with URL state** — /search?q= for shareable searches and
    a place to send 404 traffic.
23. **Consolidate inline styles** — generator templates carry inline styles;
    fold into style.css for consistency and smaller pages.
24. **Organization schema + consistent brand block** sitewide.
25. **Market map filter/search box** on the map page.
26. **Category "at a glance" table** — sortable price/trial/deployment table
    view as an alternative to cards on category pages.
