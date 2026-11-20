from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

TEAL = RGBColor(0x0F, 0x76, 0x6E); INK = RGBColor(0x0F, 0x17, 0x2A); GREY = RGBColor(0x64, 0x74, 0x8B)
doc = Document()
sec = doc.sections[0]
sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
sec.top_margin = sec.bottom_margin = Cm(1.4); sec.left_margin = sec.right_margin = Cm(1.6)
st = doc.styles['Normal']; st.font.name = 'Calibri'; st.font.size = Pt(10); st.font.color.rgb = INK
st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Calibri')
st.paragraph_format.space_after = Pt(2); st.paragraph_format.line_spacing = 1.08

def runs(p, text, size=None, color=None):
    # **bold** markup
    parts = text.split('**')
    for i, t in enumerate(parts):
        if not t: continue
        r = p.add_run(t); r.bold = i % 2 == 1
        if size: r.font.size = Pt(size)
        if color: r.font.color.rgb = color
    return p

def para(text, size=None, color=None, after=2, before=0):
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(after); p.paragraph_format.space_before = Pt(before)
    return runs(p, text, size, color)

def h2(text):
    p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(7); p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text); r.bold = True; r.font.size = Pt(11); r.font.color.rgb = TEAL
    p.paragraph_format.keep_with_next = True

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr(); s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), hexcolor); tcPr.append(s)

def borders(table):
    tbl = table._tbl; tblPr = tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for side in ('top', 'bottom', 'insideH'):
        e = OxmlElement(f'w:{side}'); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:color'), 'CBD5E1'); b.append(e)
    for side in ('left', 'right', 'insideV'):
        e = OxmlElement(f'w:{side}'); e.set(qn('w:val'), 'nil'); b.append(e)
    tblPr.append(b)

def table(header, rows, widths, total=False):
    t = doc.add_table(rows=1 + len(rows), cols=len(header)); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False
    borders(t)
    tblPr = t._tbl.tblPr
    lay = OxmlElement('w:tblLayout'); lay.set(qn('w:type'), 'fixed'); tblPr.append(lay)
    grid = t._tbl.tblGrid
    for i, gc in enumerate(grid.findall(qn('w:gridCol'))): gc.set(qn('w:w'), str(int(widths[i] * 567)))
    for i, w in enumerate(widths):
        t.columns[i].width = Cm(w)
        for row in t.rows: row.cells[i].width = Cm(w)
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]; shade(c, 'E6F2F1'); p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h); r.bold = True; r.font.size = Pt(9); r.font.color.rgb = TEAL
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            c = t.rows[ri + 1].cells[ci]; p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
            runs(p, val, 9)
            if total and ri == len(rows) - 1: shade(c, 'F1F5F9')
    for row in t.rows:
        for c in row.cells:
            tcPr = c._tc.get_or_add_tcPr(); mar = OxmlElement('w:tcMar')
            for side, v in (('top', 40), ('bottom', 40), ('left', 70), ('right', 70)):
                e = OxmlElement(f'w:{side}'); e.set(qn('w:w'), str(v)); e.set(qn('w:type'), 'dxa'); mar.append(e)
            tcPr.append(mar)
    return t

def bullet(text):
    p = doc.add_paragraph(style='List Bullet'); p.paragraph_format.space_after = Pt(1)
    runs(p, text, 10)

W = 17.8
# Title
p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(0)
r = p.add_run('Relationship Engine — Strategic One-Pager'); r.bold = True; r.font.size = Pt(16); r.font.color.rgb = INK
para('Daniel Stein · LIQID case study · Senior PM Private Wealth · 20 Nov 2026', 8.5, GREY, after=4)
para('**One relationship, not two systems: read the whole book, spend RM time where it changes the outcome, show RM and client the same picture.**', 10, TEAL, after=2)

h2('1. Problem & hypothesis')
table(['Problem', 'Evidence (case)', 'Answer'], [
  ['**Wrong clients**', '≈ 4,000 meetings for ≈ 3,500 clients, yet half get no proactive contact; churn 2–3× higher there', 'Allocate deliberately — **first**'],
  ['**Too much admin**', '≈ 60% of RM time away from clients; ≈ 2 h prep + docs per meeting', 'AI drafts brief and documentation — **second**'],
  ['**Two truths**', 'Client sees a capital call in the app; the RM doesn\'t', 'One shared timeline'],
], [3.2, 9.6, 5.0])
para('**Why AI:** signals are contextual. Same €150k withdrawal — “daughter\'s apartment” is a life event, “my bank is cheaper” is churn. Code reads the transaction, AI reads the why.', before=3)

h2('2. Solution: monthly plan, daily watch')
table(['Daily', 'Monthly', 'Per contact'], [
  ['Code flags transactions and cash flows; AI reads notes, emails, chats. Hard triggers reach the RM at once.',
   'Value at stake × urgency → 20 RM slots, ≈ 60 digital touchpoints, rest nothing.',
   'AI drafts a sourced brief or a personal message; the RM approves; the client sees the same timeline.'],
], [5.93, 5.93, 5.94])
para('**Guardrails:** numbers only from code (a guard flags any other) · a second AI call verifies suitability text · nothing reaches a client without the RM.', before=3)

h2('3. Hybrid orchestration')
table(['Code', 'AI', 'RM', 'Client'], [
  ['Numbers, eligibility, allocation', 'Reads, drafts, checks — never sends, never advises', 'Decides, attests, owns the advice', 'Facts, reading, signing, funding'],
], [4.45, 4.45, 4.45, 4.45])
bullet('AI faces the client only for facts on their own data; advice goes to the RM with a draft.')
bullet('Need, not AUM, sets service: happy €700k client → quarterly note; €4m entrepreneur → RM at every cash-flow event.')

h2('4. Trade-offs & risks')
para('**Scope:** existing clients only — 45–60% of net new money, 65–80% of their wealth still elsewhere. Not built: prospects, integrations, auto-send, chatbot, real Lombard process.', after=3)
table(['Risk', 'Mitigation'], [
  ['Wrong suitability text', 'Verifier + number guard; the RM is named author'],
  ['Churn gap not causal', '10% control group for 3 months, then an uplift model'],
  ['Data can\'t be matched to clients', 'Week-1 data check before setting targets'],
  ['RMs don\'t adopt', 'Monday start screen; the brief saves prep from day one'],
], [5.5, 12.3])

h2('5. Commercial impact: ≈ €1.1m revenue a year (+5%)')
para('Baseline (case midpoints): €3.0bn segment AUM · €22.5m revenue · €165m AUM lost to churn a year.', after=3)
table(['Lever', 'Assumption', 'Revenue p.a.'], [
  ['Coverage → churn', 'Uncontacted half reached; half the gap causal → €36m AUM kept', '≈ €0.27m (range 0–0.55m)'],
  ['Share of wallet', '+1 pp of €10.9bn stated wealth → €109m new money', '≈ €0.82m'],
  ['RM time', 'AI halves prep + docs → ≈ +9 meetings per RM per month, reinvested', 'not counted'],
  ['**Total**', '', '**≈ €1.1m (+5%)**'],
], [3.6, 10.0, 4.2], total=True)
para('**Rollout:** week-1 data check → plan + brief → suitability drafting (after compliance) → uplift model.', before=3)

doc.save('/tmp/claude-0/op/Relationship_Engine_One-Pager.docx')
print('ok')
