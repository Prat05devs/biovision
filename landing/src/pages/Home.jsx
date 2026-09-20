import { Link } from 'react-router-dom';
import { usePageMeta } from '../usePageMeta';
import { Counter, Marquee, PulseWave, Reveal } from '../components/Motion';
import {
  AlertIcon,
  BoltIcon,
  BrainIcon,
  BreathIcon,
  CheckIcon,
  ChipIcon,
  ClockIcon,
  DocumentIcon,
  DropIcon,
  FlaskIcon,
  GaugeIcon,
  GlobeIcon,
  HeartPulseIcon,
  LeafIcon,
  LockIcon,
  MapPinIcon,
  ScanIcon,
  ShieldIcon,
  SparkleIcon,
  StethoscopeIcon,
  TranslateIcon,
} from '../components/Icons';

/** Public TestFlight invitation for the iPhone beta. */
const TESTFLIGHT_URL = 'https://testflight.apple.com/join/46brVNQj';

const stats = [
  { value: 30, suffix: 's', label: 'Face scan', detail: 'One still, well-lit half-minute' },
  { value: 6, label: 'Signal groups', detail: 'From a single capture' },
  { value: 478, label: 'Face landmarks', detail: 'Tracked live by MediaPipe' },
  { value: 217, label: 'Verified listings', detail: 'Doctors and hospitals in Dehradun' },
  { value: 20, label: 'Specialties', detail: 'General medicine to psychiatry' },
  { value: 0, label: 'Bytes uploaded', detail: 'Everything runs on your iPhone' },
];

const measures = [
  {
    icon: HeartPulseIcon,
    title: 'Heart rate & HRV',
    body: 'Pulse and heart-rate variability from tiny colour changes in your face.',
    detail: 'Reports RMSSD and SDNN against the AHA resting range.',
  },
  {
    icon: GaugeIcon,
    title: 'Stress & recovery',
    body: 'A stress index and recovery score from your beat-to-beat rhythm.',
    detail: 'Derived from the same beat intervals, not a separate sensor.',
  },
  {
    icon: BreathIcon,
    title: 'Breathing rate',
    body: 'Breaths per minute from the rhythm of your pulse wave.',
    detail: 'Gated: it abstains rather than guess when the signal is weak.',
  },
  {
    icon: DropIcon,
    title: 'Haemoglobin',
    body: 'An anaemia check from the colour inside your lower eyelids.',
    detail: 'Compared with WHO 2024 cut-offs for age, sex and pregnancy.',
  },
  {
    icon: SparkleIcon,
    title: 'Face & skin signs',
    body: 'Under-eye shading, eye redness, lip colour and skin tone checks.',
    detail: 'Read from the 478-point mesh, never used to infer mood.',
  },
  {
    icon: LeafIcon,
    title: 'Lifestyle & BMI',
    body: 'Sleep, activity, tobacco, alcohol and body-mass index.',
    detail: 'Scored against WHO activity and BMI guidance.',
  },
];

const steps = [
  { title: 'About you', body: 'Age, sex, height and weight choose the right reference ranges for every result.' },
  { title: '30-second face scan', body: 'Keep still in soft light. The app reads pulse, variability, stress and breathing, and takes one photo for face and skin signs.' },
  { title: 'Two eye photos', body: 'Gently pull down each lower eyelid so the inner pink area is visible. Its colour drives the haemoglobin estimate.' },
  { title: 'A few questions', body: 'Tell it what is bothering you. Danger signs send you straight to emergency help, before anything else.' },
  { title: 'Your report', body: 'Every result with its normal range, the doctor to see, tests to ask about, and a PDF you can share.' },
];

const technology = [
  {
    icon: ScanIcon,
    title: 'MediaPipe Face Landmarker',
    body: 'Google\'s face detector and 478-point mesh locate the regions each measurement reads — cheeks for pulse, eyelids for colour, under-eye for shading.',
    tag: 'Apache 2.0',
  },
  {
    icon: HeartPulseIcon,
    title: 'FacePhys rPPG models',
    body: 'Remote photoplethysmography by Kegang Wang turns per-frame colour shifts into a pulse waveform, with a signal-quality model that rejects bad captures.',
    tag: 'MIT + privacy addendum',
  },
  {
    icon: FlaskIcon,
    title: 'Conjunctiva colour model',
    body: 'A ridge regression over HSV-masked eyelid pixels, compiled straight into the app — no model file to load, no server to call.',
    tag: 'Built in-house',
  },
  {
    icon: ChipIcon,
    title: 'TensorFlow Lite on device',
    body: 'Five quantised models ship inside the binary and run on the phone\'s own silicon. The app works with aeroplane mode on.',
    tag: '4 MB of models',
  },
];

const science = [
  {
    icon: DropIcon,
    title: 'The haemoglobin model',
    body: 'Trained and tested on 217 adults with laboratory haemoglobin results, including 95 from India, where it identified 71% of people with anaemia. A CBC blood test gives the exact value.',
  },
  {
    icon: BrainIcon,
    title: 'The wellbeing questions',
    body: 'The PHQ and GAD questionnaires, in the public domain and used in clinics worldwide. Four questions to begin, more only if your answers suggest a closer look.',
  },
  {
    icon: StethoscopeIcon,
    title: 'The reference ranges',
    body: 'WHO haemoglobin thresholds (2024), WHO physical-activity and BMI guidance, the AHA resting heart-rate range, and NHS and NICE referral guidance.',
  },
  {
    icon: AlertIcon,
    title: 'What it will not claim',
    body: 'Estimates can be wrong, and lighting, movement, make-up and skin tone all affect them. BioVision is not a medical device and does not diagnose anything.',
  },
];

const privacy = [
  { icon: LockIcon, title: 'No account, ever', body: 'There is nothing to sign up for and no profile to create. Open the app and scan.' },
  { icon: ShieldIcon, title: 'Frames are never recorded', body: 'Video is measured in memory as it arrives. Nothing is written to disk or sent anywhere.' },
  { icon: MapPinIcon, title: 'Location stays local', body: 'It only sorts the nearby-care list on your phone. It is never stored or transmitted.' },
  { icon: BoltIcon, title: 'No analytics or ads', body: 'The app contains no tracking code. There is no data to sell, because none is collected.' },
];

const specialties = [
  'General Physician', 'Internal Medicine', 'Cardiology', 'Dermatology', 'Psychiatry', 'Paediatrics',
  'Gynaecology', 'Orthopaedics', 'Pulmonology', 'Ophthalmology', 'ENT', 'General Surgery',
  'Endocrinology', 'Gastroenterology', 'Neurology', 'Nephrology',
];

const reportContents = [
  'Every reading with its normal range for your age and sex',
  'Plain-language explanation of what each number means',
  'Which kind of doctor to see, and how soon',
  'Tests worth asking that doctor about',
  'Matching doctors and hospitals near you',
  'A PDF you can share — photos never included',
];

export default function Home() {
  usePageMeta({
    title: 'BioVision — Face scan health check',
    description:
      'A 30-second face scan, two eye photos and a few questions give you a personal health report and the right doctor to see. Private, on-device, in English and Hindi.',
    path: '/',
  });

  return (
    <>
      {/* Hero ------------------------------------------------------------ */}
      <div className="hero-shell">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-glow hero-glow-2" aria-hidden="true" />
        <div className="wrap hero">
          <div>
            <Reveal>
              <h1>Your health check, <span className="grad">in your pocket.</span></h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="lead">
                A 30-second face scan, two eye photos and a few questions give you a clear health
                report — every reading against its normal range, the right doctor to see, and the
                tests worth asking about.
              </p>
            </Reveal>
            <Reveal delay={240} className="hero-cta">
              <a className="button primary" href={TESTFLIGHT_URL} target="_blank" rel="noreferrer">Join the iPhone beta</a>
              <a className="button secondary" href="#how">See how it works</a>
            </Reveal>
            <Reveal delay={320} className="hero-meta-row">
              <span className="hero-meta"><ClockIcon width="17" height="17" />About 3 minutes</span>
              <span className="hero-meta"><LockIcon width="17" height="17" />Nothing uploaded</span>
              <span className="hero-meta"><TranslateIcon width="17" height="17" />English &amp; Hindi</span>
            </Reveal>
          </div>
          <Reveal delay={200} className="hero-art">
            <div className="phone tilt-right">
              <img src="/assets/screens/home.png" alt="The BioVision home screen, offering to start a health scan." width="461" height="1000" />
            </div>
            <div className="float-card float-hr">
              <div className="float-icon"><HeartPulseIcon width="18" height="18" /></div>
              <div>
                <strong>72 <small>bpm</small></strong>
                <span>HRV 42 ms</span>
              </div>
            </div>
            <div className="float-card float-hb">
              <div className="float-icon"><DropIcon width="18" height="18" /></div>
              <div>
                <strong>13.4 <small>g/dL</small></strong>
                <span>Within WHO range</span>
              </div>
            </div>
            <div className="float-card float-signal">
              <span className="live-dot" />Signal 86%
            </div>
          </Reveal>
        </div>
        <PulseWave className="hero-pulse" />
      </div>

      {/* Stat band ------------------------------------------------------- */}
      <section className="section stat-section">
        <div className="wrap">
          <div className="stat-grid">
            {stats.map(({ value, suffix, label, detail }, index) => (
              <Reveal className="stat" key={label} delay={index * 70}>
                <div className="stat-value"><Counter value={value} suffix={suffix ?? ''} /></div>
                <div className="stat-label">{label}</div>
                <div className="stat-detail">{detail}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Measures -------------------------------------------------------- */}
      <section className="section" id="measures">
        <div className="wrap measure-split">
          <Reveal className="hero-art sticky-art">
            <div className="phone tilt-left">
              <img src="/assets/screens/measures.png" alt="A list of the health signals BioVision measures." width="461" height="1000" loading="lazy" />
            </div>
          </Reveal>
          <div>
            <Reveal><p className="eyebrow">What BioVision measures</p></Reveal>
            <Reveal delay={60}><h2>Six groups of signals from one short scan</h2></Reveal>
            <Reveal delay={120}>
              <p className="section-lead">
                Your camera picks up colour changes your eyes cannot see — the flush of blood through
                your face with every heartbeat, and the shade of the tissue inside your lower eyelid.
                BioVision turns both into readings you can act on.
              </p>
            </Reveal>
            <div className="measure-grid">
              {measures.map(({ icon: Icon, title, body, detail }, index) => (
                <Reveal className="card hover-lift" key={title} delay={index * 60}>
                  <div className="card-icon"><Icon /></div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  <p className="card-detail">{detail}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Steps ----------------------------------------------------------- */}
      <section className="section band-section" id="how">
        <div className="wrap">
          <Reveal><p className="eyebrow">How it works</p></Reveal>
          <Reveal delay={60}><h2>Five steps, about three minutes</h2></Reveal>
          <Reveal delay={120}>
            <p className="section-lead">
              No clinic visit, no wearable, no blood test. Just your iPhone and somewhere with
              reasonably even light.
            </p>
          </Reveal>
          <ol className="timeline">
            {steps.map(({ title, body }, index) => (
              <Reveal as="li" className="timeline-item" key={title} delay={index * 90}>
                <div className="timeline-marker">{index + 1}</div>
                <div className="timeline-body">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Face scan ------------------------------------------------------- */}
      <section className="section" id="scan">
        <div className="wrap split">
          <div>
            <Reveal><p className="eyebrow">The face scan</p></Reveal>
            <Reveal delay={60}><h2>A live mesh guides you into frame</h2></Reveal>
            <Reveal delay={120}>
              <p className="section-lead">
                Most phone health tools fail quietly and hand you a number anyway. BioVision checks
                the capture as it happens and tells you what to fix before it starts counting.
              </p>
            </Reveal>
            <div className="meter-list">
              {[
                { label: 'Face framing', value: 96 },
                { label: 'Lighting evenness', value: 88 },
                { label: 'Stillness', value: 92 },
                { label: 'Pulse signal quality', value: 86 },
              ].map(({ label, value }, index) => (
                <Reveal className="meter" key={label} delay={index * 80}>
                  <div className="meter-head"><span>{label}</span><b>{value}%</b></div>
                  <div className="meter-track"><div className="meter-fill" style={{ '--target': `${value}%` }} /></div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <ul className="tick-list">
                <li><CheckIcon /><span><b>It abstains rather than guess</b> — a weak signal returns no reading instead of a wrong one.</span></li>
                <li><CheckIcon /><span><b>Nothing is recorded</b> — frames are measured in memory and discarded.</span></li>
              </ul>
            </Reveal>
          </div>
          <Reveal delay={100} className="split-art">
            <div className="phone tilt-right">
              <img src="/assets/screens/face-scan.png" alt="The face scan screen with a live mesh tracking a face." width="461" height="1000" loading="lazy" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Technology ------------------------------------------------------ */}
      <section className="section dark-section" id="technology">
        <div className="wrap">
          <Reveal><p className="eyebrow on-dark">Under the hood</p></Reveal>
          <Reveal delay={60}><h2 className="on-dark-h2">Four engines, all running on the phone</h2></Reveal>
          <Reveal delay={120}>
            <p className="section-lead on-dark-lead">
              No inference server, no API key, no round trip. Every model ships inside the binary and
              executes on your device's own neural engine.
            </p>
          </Reveal>
          <div className="tech-grid">
            {technology.map(({ icon: Icon, title, body, tag }, index) => (
              <Reveal className="tech-card" key={title} delay={index * 80}>
                <div className="tech-icon"><Icon /></div>
                <h3>{title}</h3>
                <p>{body}</p>
                <span className="tech-tag">{tag}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Science --------------------------------------------------------- */}
      <section className="section" id="science">
        <div className="wrap">
          <Reveal><p className="eyebrow">The evidence</p></Reveal>
          <Reveal delay={60}><h2>What the numbers rest on</h2></Reveal>
          <Reveal delay={120}>
            <p className="section-lead">
              A health app that will not show its working is asking for blind trust. Here is what
              each part is built from, including what it cannot do.
            </p>
          </Reveal>
          <div className="science-grid">
            {science.map(({ icon: Icon, title, body }, index) => (
              <Reveal className="science-card" key={title} delay={index * 80}>
                <div className="card-icon"><Icon /></div>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Care ------------------------------------------------------------ */}
      <section className="section">
        <div className="wrap">
          <Reveal className="band">
            <div>
              <p className="eyebrow on-dark">Care navigation</p>
              <h2>A result is useless without a next step</h2>
              <p>
                Your scan and answers are matched to the speciality that fits, then to real doctors
                and hospitals you can actually reach today.
              </p>
              <ul>
                <li><b>217 verified listings</b> in Dehradun, each traced to the hospital's own website</li>
                <li><b>20 specialties</b>, from general medicine to cardiology and psychiatry</li>
                <li>Filter to <b>government facilities</b> when cost matters</li>
                <li>Map view, directions and a call button on every listing</li>
              </ul>
            </div>
            <div className="band-art">
              <div className="phone">
                <img src="/assets/screens/nearby-care.png" alt="The nearby care screen listing doctors and hospitals in Dehradun." width="461" height="1000" loading="lazy" />
              </div>
            </div>
          </Reveal>
        </div>
        <Marquee items={specialties} />
      </section>

      {/* Wellbeing ------------------------------------------------------- */}
      <section className="section" id="wellbeing">
        <div className="wrap split reverse">
          <div>
            <Reveal><p className="eyebrow">Mental wellbeing</p></Reveal>
            <Reveal delay={60}><h2>A short, private check-in</h2></Reveal>
            <Reveal delay={120}>
              <p className="section-lead">
                Four questions about the last 14 days, with more asked only if your answers suggest a
                closer look would help. The questions come from the PHQ and GAD screeners used in
                clinics, and your face is never used to infer mental health.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <ul className="tick-list">
                <li><CheckIcon /><span><b>Stepped, not exhausting</b> — most people answer four questions and are done.</span></li>
                <li><CheckIcon /><span><b>Safety first</b> — Tele-MANAS on 14416 is surfaced the moment an answer calls for it.</span></li>
                <li><CheckIcon /><span><b>Not a diagnosis</b> — it screens for symptoms and suggests a next step. Only a clinician can diagnose.</span></li>
              </ul>
            </Reveal>
          </div>
          <Reveal delay={100} className="split-art">
            <div className="phone tilt-left">
              <img src="/assets/screens/wellbeing.png" alt="The wellbeing screen explaining a short, private mental-health check-in." width="461" height="1000" loading="lazy" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Report ---------------------------------------------------------- */}
      <section className="section">
        <div className="wrap split">
          <Reveal className="split-art">
            <div className="report-card">
              <div className="report-head">
                <div className="card-icon"><DocumentIcon /></div>
                <div>
                  <strong>Your health report</strong>
                  <span>Generated on device · shareable as PDF</span>
                </div>
              </div>
              <ul className="report-list">
                {reportContents.map((item) => (
                  <li key={item}><CheckIcon width="18" height="18" />{item}</li>
                ))}
              </ul>
            </div>
          </Reveal>
          <div>
            <Reveal><p className="eyebrow">The report</p></Reveal>
            <Reveal delay={60}><h2>Written to be taken to a doctor</h2></Reveal>
            <Reveal delay={120}>
              <p className="section-lead">
                Numbers without context are noise. Every reading arrives with the range it is judged
                against, what it suggests, and what to do next — in a form a clinician can read in
                seconds.
              </p>
            </Reveal>
            <Reveal delay={180} className="hero-cta">
              <Link className="button secondary" to="/support">Common questions</Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Privacy --------------------------------------------------------- */}
      <section className="section" id="privacy">
        <div className="wrap measure-split">
          <div>
            <Reveal><p className="eyebrow">Private by design</p></Reveal>
            <Reveal delay={60}><h2>Nothing leaves your phone</h2></Reveal>
            <Reveal delay={120}>
              <p className="section-lead">
                Health data is the most sensitive data there is, so BioVision was built to never hold
                any. Only your language choice and that you accepted the terms are saved on the device.
              </p>
            </Reveal>
            <div className="measure-grid">
              {privacy.map(({ icon: Icon, title, body }, index) => (
                <Reveal className="card hover-lift" key={title} delay={index * 70}>
                  <div className="card-icon"><Icon /></div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={260} className="hero-cta">
              <Link className="button secondary" to="/privacy">Read the Privacy Policy</Link>
            </Reveal>
          </div>
          <Reveal delay={120} className="hero-art">
            <div className="phone tilt-right">
              <img src="/assets/screens/language.png" alt="The language screen, noting that only the language preference is saved on the device." width="461" height="1000" loading="lazy" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Languages ------------------------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <Reveal className="lang-band">
            <div className="lang-copy">
              <p className="eyebrow">Built for where it is used</p>
              <h2>Every screen, in English and हिन्दी</h2>
              <p>
                Not machine-translated at request time. Every question, result and explanation was
                written and reviewed in both languages, offline, before shipping — including the
                clinical wording that decides what you are told to do next.
              </p>
            </div>
            <div className="lang-cards">
              <div className="lang-card"><GlobeIcon width="20" height="20" /><b>English</b><span>Understand your health. Know your next step.</span></div>
              <div className="lang-card alt"><TranslateIcon width="20" height="20" /><b>हिन्दी</b><span>अपनी सेहत को समझें। अगला कदम जानें।</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA ------------------------------------------------------------- */}
      <section className="section">
        <div className="wrap">
          <Reveal className="cta-panel">
            <p className="eyebrow">Now in beta</p>
            <h2>Try BioVision on your iPhone</h2>
            <p>
              BioVision is in TestFlight beta for iPhone running iOS 16.4 or later. Ask the team for
              an invitation and you can run your first scan in about three minutes.
            </p>
            <div className="hero-cta">
              <a className="button primary" href={TESTFLIGHT_URL} target="_blank" rel="noreferrer">Join the iPhone beta</a>
              <Link className="button secondary" to="/support">Read the FAQ</Link>
            </div>
            <PulseWave className="cta-pulse" />
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p className="notice">
            BioVision provides health information and is not a medical device. It does not diagnose,
            treat or prevent any disease. Always confirm results with a doctor. In an emergency,
            call 112. For mental-health support, call Tele-MANAS on 14416.
          </p>
        </div>
      </section>
    </>
  );
}
