# Question flow design

How the assessment should ask, based on how clinicians actually take a history. This is the
reference for `configs/questions/health_assessment.v*.json`; update it when the bank changes.

## The shape of a consultation

Clinicians do not ask everyone the same follow-ups. A history runs in this order:

1. **Red flags first.** Anything needing emergency care is asked before characterisation, so the
   questionnaire can stop early. This is the one part every presentation shares.
2. **Characterise the presenting complaint**, using the dimensions that matter *for that complaint*.
   The standard frameworks are SOCRATES (site, onset, character, radiation, associations, timing,
   exacerbating/relieving, severity) for pain, and OLDCARTS (onset, location, duration, character,
   aggravating/alleviating, radiation, timing, severity) more generally. Both are *menus*, not
   checklists: a clinician picks the dimensions that discriminate for the complaint in front of them.
3. **Context**: existing conditions, medicines, family history, pregnancy.
4. **Impact and expectations**, where they change management.

The mistake the v3 bank makes is treating step 2 as fixed: every concern gets
`concern_duration` + `concern_impact` and nothing else. Duration is discriminating for fatigue and
a lump; it is meaningless for "I am pregnant". Impact matters for joint pain; it is close to
meaningless for a changing mole, where morphology is what counts.

**Rule:** each concern owns its follow-ups. Shared questions are asked only where they discriminate.

## Per-concern follow-ups

### Skin, hair and nails
The single `skin_spreading` ("is it spreading?") suits a rash and nothing else.

- **Acne** is graded by lesion type and count, not by spread. NICE grades it as *mild to moderate*
  (any number of comedones, up to 34 inflammatory lesions, or up to two nodules) and *moderate to
  severe* (35+ inflammatory lesions, or three or more nodules). What changes management: whether
  lesions are comedones or inflamed, whether nodules/cysts are present, whether it is **scarring**
  (timely referral prevents scarring), what has already been tried, and — in women — whether it
  comes with irregular periods or unusual hair growth, which points at PCOS.
- **Rash**: spread, itch, fever, new medicine, blistering or mucosal involvement.
- **Mole or spot**: change in size, shape, colour, bleeding — not duration or daily impact.
- **Hair and nails**: pattern and distribution, and whether it is diffuse shedding.

### Pregnancy
Asking a pregnant woman "how long has this been going on?" and "how does it affect your daily life?"
is the clearest symptom of a one-size-fits-all bank. What matters is **trimester** and the WHO
danger signs, any one of which means urgent care rather than a routine appointment:

- vaginal bleeding
- convulsions (fits)
- severe headache **with blurred vision** — possible pre-eclampsia
- severe abdominal pain
- fast or difficult breathing, or being too weak to stand
- reduced or absent fetal movement
- fever
- swelling of the fingers, face and legs

Also relevant: whether antenatal care has started, and anaemia, which is why the eyelid reading
matters more in pregnancy.

### Long-term conditions
People commonly live with more than one — high blood pressure *and* diabetes is the ordinary case,
not the exception. A single-choice question cannot record that, and routing that reads one value
silently drops the rest. Conditions must be multi-select, and every selected condition should
contribute its own tests and specialty.

## Mental wellbeing results

PHQ and GAD are clinical shorthand. A person reading their own result should be told, in their own
language, what was asked and what the number means:

- **PHQ-9** — nine questions about depression symptoms over the last two weeks.
- **GAD-7** — seven questions about anxiety symptoms over the same period.
- On GAD-7: 5+ mild, 10+ moderate, 15+ severe. A score of 10 or more is the point at which
  clinicians look more closely; 15 or more usually means active treatment is warranted.
- The score is a measure of symptom severity, not a diagnosis.

## Sources

- SOCRATES / OLDCARTS history frameworks — Geeky Medics, standard clinical texts
- NICE NG198, *Acne vulgaris: management* (2021) — severity grading and referral
- WHO antenatal care guidance — danger signs in pregnancy
- Kroenke & Spitzer, PHQ-9 and GAD-7 validation and scoring bands
