#!/usr/bin/env python3
"""
render_svg.py -- Rasterize an SVG file, or a single SVG path string, to PNG.

Built for checking extension icons: the `mdi:` option on registerMainPage takes raw
SVG path data in a 24x24 viewBox, and there is no other way to see what a hand-scaled
or vendor-traced path actually looks like before it ships.

Two backends, on purpose:
    --path / --js-const  drawn with pycairo through this file's own path parser. svglib's
                         parser drops paths it cannot handle and says nothing, rendering the
                         icon as an empty image (game-subnautica2's UE4SS_ICON does exactly
                         that), and only cairo gives a real alpha channel.
    FILE.svg             svglib + reportlab's renderPM, which handles whole documents
                         (groups, gradients, text) this parser deliberately does not.

Usage:
    python render_svg.py FILE.svg
    python render_svg.py FILE.svg -o out.png --size 256
    python render_svg.py FILE.svg --out out.png
    python render_svg.py --path "M11 15H6L13 1V9H18L11 23V15Z" --bg none
    python render_svg.py --path "M..." --viewbox "0 0 32 32" --fill "#23FFB1" --bg "#0d1117"
    python render_svg.py --js-const UE4SS_ICON game-subnautica2/index.js

Arguments:
    FILE.svg        SVG file to rasterize (omit when using --path or --js-const)
    -o, --out       Output PNG path (default: alongside the input, or ./<name>.png)
    --size          Output size in pixels (default: 256). Square for --path / --js-const;
                    for a file it is the bounding box, aspect ratio preserved.
    --path          Raw SVG path data instead of a file
    --viewbox       viewBox for --path / --js-const (default: "0 0 24 24")
    --fill          Path fill colour (default: "#ffffff"). --fill and --bg apply to the path
                    modes only; an SVG file keeps its own colours on a white canvas.
    --bg            Background colour, or "none" for a transparent PNG (default: "#0d1117").
                    "none" applies to --path / --js-const only; SVG files render opaque.
    --js-const NAME Read the path string out of `const NAME = '...'` in a .js file,
                    which is how these extensions store icon paths

Environment variables:
    none
"""

import argparse
import os
import re
import sys

try:
    from svglib.svglib import svg2rlg
    from reportlab.graphics import renderPM
except ImportError:  # pragma: no cover - install hint only
    sys.exit("Missing dependencies. Install with: python -m pip install --user svglib reportlab pillow")

DEFAULT_VIEWBOX = "0 0 24 24"
DEFAULT_SIZE = 256
DEFAULT_FILL = "#ffffff"
DEFAULT_BG = "#0d1117"


def path_from_js(js_file, const_name):
    """Return the SVG path string assigned to `const <const_name> = '...'` in a .js file."""
    with open(js_file, "r", encoding="utf-8") as handle:
        src = handle.read()
    pattern = r"^[ \t]*(?:const|let|var)\s+%s\s*=\s*['\"]([^'\"]+)['\"]\s*;?" % re.escape(const_name)
    match = re.search(pattern, src, re.MULTILINE)
    if match is None:
        sys.exit("No `const %s = '...'` found in %s" % (const_name, js_file))
    return match.group(1)


def svg_from_path(path_data, viewbox, size, fill, bg):
    """Wrap raw path data in a standalone SVG document."""
    background = ""
    if bg.lower() != "none":
        vb = [float(part) for part in viewbox.replace(",", " ").split()]
        background = ('<rect x="%g" y="%g" width="%g" height="%g" fill="%s"/>'
                      % (vb[0], vb[1], vb[2], vb[3], bg))
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="%s">'
            '%s<path d="%s" fill="%s"/></svg>' % (size, size, viewbox, background, path_data, fill))


def render(svg_file, out_file, size):
    """Rasterize an SVG file to PNG at the given square size."""
    drawing = svg2rlg(svg_file)
    if drawing is None:
        sys.exit("Could not parse %s" % svg_file)
    if drawing.width and drawing.height:  # scale to the requested output size, keeping aspect
        scale = min(size / drawing.width, size / drawing.height)
        drawing.scale(scale, scale)
        drawing.width *= scale
        drawing.height *= scale
    renderPM.drawToFile(drawing, out_file, fmt="PNG")
    return out_file


def render_path(path_data, viewbox, size, fill, bg, out_file):
    """Render a single SVG path with pycairo, honouring transparency.

    Deliberately not routed through svglib: its path parser drops shapes it cannot handle and
    reports nothing, which renders an icon as an empty image (`UE4SS_ICON` in game-subnautica2
    is one). Drawing the path here means the parser is ours and a bad command raises.
    """
    import cairo

    vb = [float(part) for part in viewbox.replace(",", " ").split()]
    scale = min(size / vb[2], size / vb[3])
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, size, size)
    ctx = cairo.Context(surface)
    if bg.lower() != "none":
        red, green, blue = hex_to_rgb(bg)
        ctx.set_source_rgb(red / 255, green / 255, blue / 255)
        ctx.paint()
    ctx.translate((size - vb[2] * scale) / 2, (size - vb[3] * scale) / 2)
    ctx.scale(scale, scale)
    ctx.translate(-vb[0], -vb[1])
    red, green, blue = hex_to_rgb(fill)
    ctx.set_source_rgb(red / 255, green / 255, blue / 255)
    ctx.set_fill_rule(cairo.FILL_RULE_WINDING)  # SVG's default nonzero rule
    draw_svg_path(ctx, path_data)
    ctx.fill()
    surface.write_to_png(out_file)
    return out_file


NUMBER_RE = re.compile(r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?")
COMMAND_RE = re.compile(r"([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)")


def arc_to_beziers(x0, y0, rx, ry, rotation, large_arc, sweep, x1, y1):
    """Convert an SVG elliptical arc to a list of cubic bezier control points."""
    import math

    if rx == 0 or ry == 0 or (x0 == x1 and y0 == y1):
        return [(x1, y1, x1, y1, x1, y1)]
    rx, ry = abs(rx), abs(ry)
    phi = math.radians(rotation)
    dx2, dy2 = (x0 - x1) / 2.0, (y0 - y1) / 2.0
    x1p = math.cos(phi) * dx2 + math.sin(phi) * dy2
    y1p = -math.sin(phi) * dx2 + math.cos(phi) * dy2
    lam = (x1p ** 2) / (rx ** 2) + (y1p ** 2) / (ry ** 2)
    if lam > 1:  # radii too small for the endpoints - scale them up, per the spec
        rx *= math.sqrt(lam)
        ry *= math.sqrt(lam)
    denom = (rx ** 2) * (y1p ** 2) + (ry ** 2) * (x1p ** 2)
    num = max((rx ** 2) * (ry ** 2) - denom, 0.0)
    coef = math.sqrt(num / denom) if denom else 0.0
    if large_arc == sweep:
        coef = -coef
    cxp, cyp = coef * rx * y1p / ry, -coef * ry * x1p / rx
    cx = math.cos(phi) * cxp - math.sin(phi) * cyp + (x0 + x1) / 2.0
    cy = math.sin(phi) * cxp + math.cos(phi) * cyp + (y0 + y1) / 2.0
    start = math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx)
    end = math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx)
    sweep_angle = end - start
    if sweep and sweep_angle < 0:
        sweep_angle += 2 * math.pi
    elif not sweep and sweep_angle > 0:
        sweep_angle -= 2 * math.pi
    segments = max(int(math.ceil(abs(sweep_angle) / (math.pi / 2))), 1)
    delta = sweep_angle / segments
    alpha = 4.0 / 3.0 * math.tan(delta / 4.0)
    out = []
    theta = start
    px, py = x0, y0
    for _ in range(segments):
        theta2 = theta + delta
        cos1, sin1 = math.cos(theta), math.sin(theta)
        cos2, sin2 = math.cos(theta2), math.sin(theta2)
        ex = cx + math.cos(phi) * rx * cos2 - math.sin(phi) * ry * sin2
        ey = cy + math.sin(phi) * rx * cos2 + math.cos(phi) * ry * sin2
        d1x = -rx * sin1 * math.cos(phi) - ry * cos1 * math.sin(phi)
        d1y = -rx * sin1 * math.sin(phi) + ry * cos1 * math.cos(phi)
        d2x = -rx * sin2 * math.cos(phi) - ry * cos2 * math.sin(phi)
        d2y = -rx * sin2 * math.sin(phi) + ry * cos2 * math.cos(phi)
        out.append((px + alpha * d1x, py + alpha * d1y, ex - alpha * d2x, ey - alpha * d2y, ex, ey))
        px, py, theta = ex, ey, theta2
    return out


def draw_svg_path(ctx, path_data):
    """Trace SVG path data onto a cairo context. Supports M L H V C S Q T A Z, absolute and relative."""
    cx = cy = sx = sy = 0.0
    prev_cubic = None   # second control point of the last C/S, for S's reflection
    prev_quad = None    # control point of the last Q/T, for T's reflection
    for command, raw in COMMAND_RE.findall(path_data):
        nums = [float(value) for value in NUMBER_RE.findall(raw)]
        relative = command.islower()
        code = command.upper()
        if code == "Z":
            ctx.close_path()
            cx, cy = sx, sy
            prev_cubic = prev_quad = None
            continue
        step = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "A": 7}[code]
        if not nums or len(nums) % step:
            sys.exit("Malformed path near '%s%s'" % (command, raw.strip()[:40]))
        for index in range(0, len(nums), step):
            args = nums[index:index + step]
            if code == "M":
                x, y = (cx + args[0], cy + args[1]) if relative else (args[0], args[1])
                if index == 0:
                    ctx.move_to(x, y)
                    sx, sy = x, y
                else:  # extra pairs after a moveto are implicit linetos
                    ctx.line_to(x, y)
                cx, cy = x, y
                prev_cubic = prev_quad = None
            elif code == "L":
                x, y = (cx + args[0], cy + args[1]) if relative else (args[0], args[1])
                ctx.line_to(x, y)
                cx, cy = x, y
                prev_cubic = prev_quad = None
            elif code == "H":
                x = cx + args[0] if relative else args[0]
                ctx.line_to(x, cy)
                cx = x
                prev_cubic = prev_quad = None
            elif code == "V":
                y = cy + args[0] if relative else args[0]
                ctx.line_to(cx, y)
                cy = y
                prev_cubic = prev_quad = None
            elif code in ("C", "S"):
                if code == "C":
                    points = [cx + value if relative and i % 2 == 0 else cy + value if relative else value
                              for i, value in enumerate(args)]
                    x1, y1, x2, y2, x, y = points
                else:
                    x2, y2, x, y = [cx + value if relative and i % 2 == 0 else cy + value if relative else value
                                    for i, value in enumerate(args)]
                    x1, y1 = (2 * cx - prev_cubic[0], 2 * cy - prev_cubic[1]) if prev_cubic else (cx, cy)
                ctx.curve_to(x1, y1, x2, y2, x, y)
                cx, cy, prev_cubic, prev_quad = x, y, (x2, y2), None
            elif code in ("Q", "T"):
                if code == "Q":
                    qx, qy, x, y = [cx + value if relative and i % 2 == 0 else cy + value if relative else value
                                    for i, value in enumerate(args)]
                else:
                    x, y = (cx + args[0], cy + args[1]) if relative else (args[0], args[1])
                    qx, qy = (2 * cx - prev_quad[0], 2 * cy - prev_quad[1]) if prev_quad else (cx, cy)
                ctx.curve_to(cx + 2.0 / 3 * (qx - cx), cy + 2.0 / 3 * (qy - cy),  # quad -> cubic
                             x + 2.0 / 3 * (qx - x), y + 2.0 / 3 * (qy - y), x, y)
                cx, cy, prev_quad, prev_cubic = x, y, (qx, qy), None
            elif code == "A":
                rx, ry, rotation, large_arc, sweep = args[0], args[1], args[2], args[3], args[4]
                x, y = (cx + args[5], cy + args[6]) if relative else (args[5], args[6])
                for seg in arc_to_beziers(cx, cy, rx, ry, rotation, int(large_arc), int(sweep), x, y):
                    ctx.curve_to(*seg)
                cx, cy, prev_cubic, prev_quad = x, y, None, None


def hex_to_rgb(colour):
    """Return an (r, g, b) tuple for a #rgb / #rrggbb colour, defaulting to white."""
    value = colour.lstrip("#")
    if len(value) == 3:
        value = "".join(char * 2 for char in value)
    if len(value) != 6:
        return (255, 255, 255)
    try:
        return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return (255, 255, 255)


def main():
    parser = argparse.ArgumentParser(description="Rasterize an SVG file or path string to PNG.")
    parser.add_argument("svg", nargs="?", help="SVG file to rasterize")
    parser.add_argument("-o", "--out", help="output PNG path")
    parser.add_argument("--size", type=int, default=DEFAULT_SIZE, help="output size in pixels")
    parser.add_argument("--path", help="raw SVG path data instead of a file")
    parser.add_argument("--viewbox", default=DEFAULT_VIEWBOX, help="viewBox for --path / --js-const")
    parser.add_argument("--fill", default=DEFAULT_FILL, help="path fill colour")
    parser.add_argument("--bg", default=DEFAULT_BG, help="background colour, or 'none'")
    parser.add_argument("--js-const", help="read the path out of `const NAME = '...'` in the given .js file")
    args = parser.parse_args()

    path_data = args.path
    if args.js_const:
        if not args.svg:
            sys.exit("--js-const needs the .js file as the positional argument")
        path_data = path_from_js(args.svg, args.js_const)

    transparent = args.bg.lower() == "none"
    if path_data:
        name = args.js_const or "path"
        out_file = args.out or os.path.abspath("%s.png" % name)
        svg_file = os.path.splitext(out_file)[0] + ".svg"
        with open(svg_file, "w", encoding="utf-8") as handle:  # the SVG is kept, it is often what you want next
            handle.write(svg_from_path(path_data, args.viewbox, args.size, args.fill, args.bg))
        render_path(path_data, args.viewbox, args.size, args.fill, args.bg, out_file)
        print("Wrote %s (%d bytes) from %s" % (out_file, os.path.getsize(out_file), svg_file))
        return

    if not args.svg:
        parser.error("give an SVG file, or --path / --js-const")
    if not os.path.isfile(args.svg):
        sys.exit("No such file: %s" % args.svg)
    if transparent:  # only the path modes can key the shape out of its own background
        print("Note: --bg none applies to --path / --js-const only; rendering %s opaque." % args.svg)
    out_file = args.out or os.path.splitext(args.svg)[0] + ".png"
    render(args.svg, out_file, args.size)
    print("Wrote %s (%d bytes)" % (out_file, os.path.getsize(out_file)))


if __name__ == "__main__":
    main()
