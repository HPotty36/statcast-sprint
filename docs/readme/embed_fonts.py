"""README 그림(SVG)에 그 그림이 쓰는 글자만 골라 서체를 base64 로 넣는다.

GitHub 은 README 의 SVG 를 <img> 로 보여 주므로 외부 서체를 불러오지 못한다. 그래서 앱과 같은
서체(Big Shoulders Display, Black Han Sans, Archivo, Pretendard — 모두 SIL OFL)를 node_modules 에서
읽어 필요한 글자만 남기고 SVG 의 <style id="fonts"> 에 넣는다. SVG 의 글자를 고친 뒤 다시 돌린다.

    npm ci
    python -m pip install fonttools brotli
    python docs/readme/embed_fonts.py docs/readme/banner.svg docs/readme/social-preview.svg
"""

import base64
import html
import io
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

NM = Path(__file__).resolve().parents[2] / 'node_modules'

# (font-family, font-weight 범위, 파일) — src/ui/styles.css 의 --display / --ui 스택과 같은 이름
FACES = [
    ('Big Shoulders Display', '700 800', NM / '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2'),
    # Black Han Sans 는 한 굵기뿐: 굵기 범위를 넓게 잡아 브라우저가 가짜 볼드를 만들지 않게 한다
    ('Black Han Sans', '100 900', NM / '@fontsource/black-han-sans/files/black-han-sans-korean-400-normal.woff2'),
    ('Archivo Variable', '100 900', NM / '@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2'),
    ('Pretendard Variable', '45 920', NM / 'pretendard/dist/web/variable/woff2/PretendardVariable.woff2'),
]

FONTS_BLOCK = re.compile(r'(<style id="fonts">).*?(</style>)', re.S)


def used_chars(svg: str) -> set[str]:
    chars: set[str] = set()
    for body in re.findall(r'<text\b[^>]*>(.*?)</text>', svg, re.S):
        chars.update(html.unescape(re.sub(r'<[^>]+>', '', body)))
    return {c for c in chars if not c.isspace()} | {' '}


def face_css(family: str, weight: str, path: Path, chars: set[str]) -> str | None:
    cmap = TTFont(path).getBestCmap()
    codes = sorted(ord(c) for c in chars if ord(c) in cmap)
    if not codes or codes == [0x20]:
        return None
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']  # tnum(표 숫자), kern 유지
    opts.name_IDs = [1, 2]
    font = subset.load_font(str(path), opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=codes)
    sub.subset(font)
    buf = io.BytesIO()
    subset.save_font(font, buf, opts)
    data = base64.b64encode(buf.getvalue()).decode('ascii')
    return f"@font-face{{font-family:'{family}';font-weight:{weight};src:url(data:font/woff2;base64,{data}) format('woff2');}}"


def main(paths: list[str]) -> None:
    for p in map(Path, paths):
        svg = p.read_text(encoding='utf-8')
        if not FONTS_BLOCK.search(svg):
            sys.exit(f'{p}: <style id="fonts"></style> 가 없습니다')
        chars = used_chars(svg)
        # 이 SVG 의 글꼴 스택에 들어 있는 서체만 넣는다
        stacks = FONTS_BLOCK.sub('', svg)
        rules = [r for f in FACES if f[0] in stacks and (r := face_css(*f, chars))]
        svg = FONTS_BLOCK.sub(lambda m: m.group(1) + ''.join(rules) + m.group(2), svg)
        p.write_text(svg, encoding='utf-8')
        print(f'{p}: 글자 {len(chars)}개, 서체 {len(rules)}개, {p.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    main(sys.argv[1:])
