/**
 * The stage behind every page on a computer: aurora light, a neon floor
 * running into the distance, a horizon and a scan line that passes now and
 * then. Hidden on a phone; drawn by "The desktop" in `globals.css`.
 *
 * Fixed and one layer down, so it sits over whatever colour it is put on and
 * under everything else there. That is why it is put more than once: in the
 * body for the pages, and inside the studio's own full-screen sheets, which
 * paint a solid colour of their own over the body.
 */
export default function DeskStage() {
  return (
    <div aria-hidden className="fb-desk-stage hidden lg:block">
      <div className="fb-desk-floor" />
      <div className="fb-desk-scan" />
    </div>
  );
}
