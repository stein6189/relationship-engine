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
sec.top_margin = sec.bottom_margin = Cm(1.2); sec.left_margin = sec.right_margin = Cm(1.6)
st = doc.styles['Normal']; st.font.name = 'Calibri'; st.font.size = Pt(9.5); st.font.color.rgb = INK
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
    p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(5); p.paragraph_format.space_after = Pt(2)
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
        r = p.add_run(h); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = TEAL
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            c = t.rows[ri + 1].cells[ci]; p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(0)
            runs(p, val, 8.5)
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
    runs(p, text, 9.5)

W = 17.8
p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(0)
r = p.add_run('Relationship Engine: One-Pager'); r.bold = True; r.font.size = Pt(16); r.font.color.rgb = INK
para('Daniel Stein · LIQID case study · Senior PM Private Wealth · 20 Nov 2026', 8.5, GREY, after=4)
para("**Our idea: read every client's data, give RM time to the clients who need it most, and let RM and client see the same information.**", 10, TEAL, after=2)

h2('1. Problem and idea')
table(['Problem', 'What the case says', 'Our answer'], [
  ['**RM time goes to the wrong clients**', 'About 4,000 meetings a year for about 3,500 clients. Still, half of the clients get no call from their RM. These clients leave 2 to 3 times more often.', 'Plan RM time better. We do this **first**.'],
  ['**Too much paperwork**', 'RMs spend about 60% of their time without clients. Each meeting needs about 2 hours of preparation and notes.', 'AI writes first drafts of preparation and notes. We do this **second**.'],
  ['**Two systems**', 'The client sees a capital call in the app. The RM does not know this.', 'One shared timeline for both.'],
], [3.6, 9.0, 5.2])
para("**Why AI:** the same data can mean different things. Two clients ask to withdraw €150,000. One writes “for my daughter's apartment”. The other writes “my bank is cheaper”. The first is a life event. The second wants to leave. Code reads the numbers. AI reads the reason.", before=3)

h2('2. How it works')
table(['Every day', 'Every month', 'For each contact'], [
  ['Code checks transactions and payments. AI reads notes, emails and chats. Urgent cases go to the RM the same day.',
   'Code ranks clients by money at stake and urgency. It fills 20 RM meetings and about 60 digital messages per RM.',
   'AI writes a brief or a personal message. The RM checks and sends it. The client sees the same timeline.'],
], [5.93, 5.93, 5.94])
para('**Safety rules:** all numbers come from code. A check marks any other number in red. A second AI call checks the suitability text. Nothing goes to a client without the RM.', before=3)

h2('3. Who does what')
table(['Code', 'AI', 'RM', 'Client'], [
  ['Numbers, rules, planning', 'Reads, writes drafts, checks drafts. Never sends, never gives advice.', 'Decides, signs off, is responsible for advice', 'Looks up facts, reads, signs, pays in'],
], [4.45, 4.45, 4.45, 4.45])
bullet('The AI answers clients only on facts about their own account. Questions about what to do go to the RM, with a draft answer.')
bullet('The service depends on need, not on wealth. A happy client with €700,000 gets a short update every quarter. An entrepreneur with €4m and fund payments gets an RM call at every payment event.')

h2('4. Choices and risks')
para('**Focus:** only existing clients. They bring 45 to 60% of new money and keep 65 to 80% of their wealth at other banks. Not built: new prospects, real system connections, automatic sending, a chatbot, a real loan process.', after=3)
table(['Risk', 'What we do'], [
  ['AI writes wrong suitability text', 'A second AI check and a number check. The RM signs as author.'],
  ['Contact may not really reduce churn', 'For 3 months, 10% of quiet at-risk clients get no RM call. We compare. Later, a model learns which clients really react to a call.'],
  ['Data cannot be linked to clients', 'In week 1 we check the data before we set goals.'],
  ['RMs do not use it', 'It is their start screen on Monday. The brief saves preparation time from day one.'],
], [5.5, 12.3])

h2('5. Business impact: about €1.1m more revenue per year (+5%)')
para('Starting point (middle values from the case): €3.0bn client money in the segment, €22.5m revenue, €165m lost to churn each year.', after=3)
table(['Lever', 'Assumption', 'Revenue per year'], [
  ['Fewer clients leave', 'We reach the half without contact. Half of their extra churn comes from missing contact. We keep €36m.', 'about €0.27m (between 0 and €0.55m)'],
  ["More of the client's wealth with us", '1 percentage point more of €10.9bn total client wealth: €109m new money', 'about €0.82m'],
  ['More RM time', 'AI halves preparation and notes: about 9 more meetings per RM per month. Used for clients, not to cut jobs.', 'not counted'],
  ['**Total**', '', '**about €1.1m (+5%)**'],
], [4.0, 9.4, 4.4], total=True)
para('**Plan:** week 1, check the data. Then plan and briefs. Then suitability drafts, after compliance agrees. Then the learning model.', before=3)

doc.save('/tmp/claude-0/op/Relationship_Engine_One-Pager.docx')
print('ok')
