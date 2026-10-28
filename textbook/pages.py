"""Report the pages each Lesson uses in out/<name>.pdf (markers @@LESSONn@@)."""
import pypdf, re, sys
name = sys.argv[1] if len(sys.argv) > 1 else 'beginner'
r = pypdf.PdfReader(f'out/{name}.pdf')
starts = {}
for i, pg in enumerate(r.pages):
    for m in re.findall(r'@@LESSON(\d+)@@', pg.extract_text()):
        starts[int(m)] = i + 1
keys = sorted(starts)
bad = 0
for j, k in enumerate(keys):
    end = (starts[keys[j + 1]] - 1) if j + 1 < len(keys) else len(r.pages)
    n = end - starts[k] + 1
    bad += n != 2
    print(f'Lesson {k:>2}: p.{starts[k]}–{end} ({n} pages){"  ← not 2" if n != 2 else ""}')
print(f'{len(r.pages)} pages in total' + (f', {bad} lesson(s) not on 2 pages' if bad else ''))
