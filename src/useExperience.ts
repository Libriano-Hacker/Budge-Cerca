import { useEffect } from "react";

export default function useExperience() {
  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const total = root.scrollHeight - innerHeight;
      root.style.setProperty(
        "--page-progress",
        `${total > 0 ? scrollY / total : 0}`,
      );
      root.style.setProperty(
        "--scroll-shift",
        `${Math.min(scrollY * 0.12, 100)}px`,
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    update();
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("is-visible");
                  observer?.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.06 },
          )
        : null;
    const observed = new WeakSet<Element>();
    const prepare = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (
          !observer ||
          reduced.matches ||
          observed.has(el) ||
          el.classList.contains("is-visible")
        )
          return;
        observed.add(el);
        el.classList.add("reveal-prepared");
        observer.observe(el);
      });
    };
    prepare();
    const mutation = new MutationObserver(prepare);
    mutation.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    const motionChange = () => {
      if (reduced.matches)
        document
          .querySelectorAll(".reveal-prepared")
          .forEach((el) => el.classList.add("is-visible"));
    };
    reduced.addEventListener("change", motionChange);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      reduced.removeEventListener("change", motionChange);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      mutation.disconnect();
      root.style.removeProperty("--page-progress");
      root.style.removeProperty("--scroll-shift");
    };
  }, []);
}
