#!/usr/bin/env python3
"""
svg_to_mdi.py -- Rescale a vendor SVG logo's path data into the 24x24 viewBox that an `mdi:` page
icon takes.

Browser modules trace each site's own mark for their sidebar icon (`defaults.mdi`). A vendor SVG
uses its own viewBox (mod.io's cog is 3478 x 3638 units, offset from the origin), so its path data
has to be moved and scaled before it fits. This reads the file's viewBox and path(s), scales the
artwork to fit the target size minus padding, centres it, and prints the new path data. Absolute
coordinates are scaled and shifted, relative ones only scaled, arc radii scaled with flags kept.

Transforms are NOT applied: when the file carries a `transform=` attribute the script warns, and a
plain translate can be supplied with --translate (ModWorkshop's logo needed translate(-23.4,-34.8)).

Always look at the result: pass --render to draw it through render_svg.py, or run
`python render_svg.py --path "<output>"` yourself.

Usage:
    python svg_to_mdi.py FILE.svg [--path-index N ...] [--translate X Y] [--pad P] [--size S]
                         [--decimals D] [--js-const NAME] [--render PNG]
    python svg_to_mdi.py modio-cog-white.svg
    python svg_to_mdi.py mws_logo_white.svg --path-index 0 --translate -23.375834 -34.820791
    python svg_to_mdi.py logo.svg --js-const DEFAULT_MDI --render icon.png

Arguments:
    FILE.svg            Vendor SVG with a viewBox and one or more <path d="..."> elements
    --path-index N      Use only path N (0-based, repeatable). Default: every path, joined
    --translate X Y     Translate applied to the source coordinates before scaling
    --pad P             Empty margin left inside the target box, in target units (default 0.5)
    --size S            Target viewBox size (default 24)
    --decimals D        Decimal places in the output (default 2)
    --js-const NAME     Print as `const NAME = "...";` instead of bare path data
    --render PNG        Also render the result to PNG through render_svg.py (256 px)

Output:
    The rescaled path data (or const declaration) on stdout; warnings on stderr.
    Exit code 1 when the file has no viewBox or no paths.

Environment variables:
    none
"""

import argparse
import os
import re
import subprocess
import sys

from vortex_utils import SVG_PATH_COMMAND_RE, SVG_PATH_NUMBER_RE

ARG_COUNTS = {"M": 2, "L": 2, "H": 1, "V": 1, "C": 6, "S": 4, "Q": 4, "T": 2, "A": 7, "Z": 0}


def fmt(value, decimals):
    text = f"{value:.{decimals}f}".rstrip("0").rstrip(".")
    return "0" if text in ("", "-0") else text


def transform_path(d, scale, ox, oy, tx, ty, decimals):
    """Rescale one path's data. Absolute x -> (x + tx) * scale + ox; relative values only scale."""
    out = []
    for command, raw in SVG_PATH_COMMAND_RE.findall(d):
        code = command.upper()
        nums = [float(n) for n in SVG_PATH_NUMBER_RE.findall(raw)]
        step = ARG_COUNTS[code]
        if code == "Z":
            out.append(command)
            continue
        if not nums or len(nums) % step:
            sys.exit(f"Malformed path near '{command}{raw.strip()[:40]}'")
        relative = command.islower()
        groups = []
        for i in range(0, len(nums), step):
            args = nums[i : i + step]
            if code == "A":
                rx, ry, rotation, large, sweep, x, y = args
                if not relative:
                    x, y = (x + tx) * scale + ox, (y + ty) * scale + oy
                else:
                    x, y = x * scale, y * scale
                parts = [fmt(rx * scale, decimals), fmt(ry * scale, decimals), fmt(rotation, decimals),
                         str(int(large)), str(int(sweep)), fmt(x, decimals), fmt(y, decimals)]
            elif code == "H":
                parts = [fmt(args[0] * scale if relative else (args[0] + tx) * scale + ox, decimals)]
            elif code == "V":
                parts = [fmt(args[0] * scale if relative else (args[0] + ty) * scale + oy, decimals)]
            else:
                parts = []
                for k in range(0, step, 2):
                    x, y = args[k], args[k + 1]
                    if relative:
                        parts += [fmt(x * scale, decimals), fmt(y * scale, decimals)]
                    else:
                        parts += [fmt((x + tx) * scale + ox, decimals), fmt((y + ty) * scale + oy, decimals)]
            groups.append(",".join(parts))
        out.append(command + " ".join(groups))
    return "".join(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("svg")
    parser.add_argument("--path-index", type=int, action="append")
    parser.add_argument("--translate", type=float, nargs=2, default=(0.0, 0.0), metavar=("X", "Y"))
    parser.add_argument("--pad", type=float, default=0.5)
    parser.add_argument("--size", type=float, default=24.0)
    parser.add_argument("--decimals", type=int, default=2)
    parser.add_argument("--js-const")
    parser.add_argument("--render")
    args = parser.parse_args()

    with open(args.svg, encoding="utf-8") as handle:
        src = handle.read()
    viewbox = re.search(r'viewBox\s*=\s*"([^"]+)"', src)
    if viewbox is None:
        sys.exit(f"No viewBox in {args.svg}")
    vb = [float(v) for v in viewbox.group(1).replace(",", " ").split()]
    paths = re.findall(r'<path\b[^>]*?\sd\s*=\s*"([^"]+)"', src, re.DOTALL)
    if not paths:
        sys.exit(f"No <path d=...> in {args.svg}")
    if args.path_index:
        paths = [paths[i] for i in args.path_index]
    if "transform=" in src and args.translate == (0.0, 0.0):
        print("warning: the file uses transform= attributes, which are not applied - pass --translate "
              "for a plain translate", file=sys.stderr)

    tx, ty = args.translate
    scale = (args.size - 2 * args.pad) / max(vb[2], vb[3])
    ox = (args.size - vb[2] * scale) / 2 - (vb[0] + tx) * scale
    oy = (args.size - vb[3] * scale) / 2 - (vb[1] + ty) * scale
    result = "".join(transform_path(d, scale, ox, oy, tx, ty, args.decimals) for d in paths)

    print(f'const {args.js_const} = "{result}";' if args.js_const else result)

    if args.render:
        render_svg = os.path.join(os.path.dirname(os.path.abspath(__file__)), "render_svg.py")
        viewbox_arg = f"0 0 {fmt(args.size, 4)} {fmt(args.size, 4)}"
        subprocess.run([sys.executable, render_svg, "--path", result, "--viewbox", viewbox_arg,
                        "-o", args.render], check=True)


if __name__ == "__main__":
    main()
