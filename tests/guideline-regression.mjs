import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];

if (!script) {
  throw new Error('Could not find inline app script in index.html');
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);

class FakeClassList {
  constructor(){
    this.classes = new Set();
  }
  toggle(name){
    if (this.classes.has(name)) {
      this.classes.delete(name);
      return false;
    }
    this.classes.add(name);
    return true;
  }
}

class FakeElement {
  constructor(id){
    this.id = id;
    this.value = '';
    this.checked = false;
    this.style = {};
    this.listeners = {};
    this.attributes = {};
    this.className = '';
    this.classList = new FakeClassList();
    this.textContent = '';
    this.innerHTML = '';
  }
  addEventListener(type, handler){
    this.listeners[type] ||= [];
    this.listeners[type].push(handler);
  }
  setAttribute(name, value){
    this.attributes[name] = value;
  }
  setCustomValidity(message){
    this.validationMessage = message;
  }
  reportValidity(){
    return !this.validationMessage;
  }
}

function createApp(){
  const elements = new Map(ids.map(id => [id, new FakeElement(id)]));
  const document = {
    getElementById(id){
      if (!elements.has(id)) elements.set(id, new FakeElement(id));
      return elements.get(id);
    }
  };

  const context = {
    console,
    document,
    navigator: {},
    window: {
      location: {
        reload(){ /* no-op in tests */ }
      }
    }
  };

  vm.createContext(context);

  const defaults = {
    assay: 'alinity',
    sex: 'female',
    onsetMode: 'since',
    onsetHours: '',
    onsetMins: '',
    onsetAt: '',
    t0: '',
    t1: '',
    t3: '',
    t0Time: '',
    t1Time: '',
    t3Time: '',
    heart: '',
    heartHistory: '0',
    heartECG: '0',
    heartAge: '0',
    heartRisk: '0',
    heartTrop: '0'
  };

  for (const [id, value] of Object.entries(defaults)) {
    document.getElementById(id).value = value;
  }

  vm.runInContext(`${script}
globalThis.__testApi = { computeAdvice, updateAssayUI, updateOnsetModeUI, setTropSectionVisibility };`, context);

  function set(values){
    for (const [id, value] of Object.entries(values)) {
      const el = document.getElementById(id);
      if (typeof value === 'boolean') {
        el.checked = value;
      } else {
        el.value = String(value);
      }
    }
    context.__testApi.updateAssayUI();
    context.__testApi.setTropSectionVisibility();
    context.__testApi.computeAdvice();
  }

  function text(id){
    return document.getElementById(id).innerHTML
      .replace(/<[^>]*>/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function output(){
    return text('output');
  }

  function element(id){
    return document.getElementById(id);
  }

  return { set, output, text, element };
}

const cases = [
  {
    name: 'Alinity 0h <4 and onset >2h -> single-sample low risk',
    values: { assay: 'alinity', sex: 'female', onsetHours: 3, t0: 3 },
    expect: [
      'Low risk - single-sample rule-out',
      '0h troponin 3 < 4 ng/L',
      'Action:',
      'HEART is recommended'
    ]
  },
  {
    name: 'Alinity 0h <5 with delta <2 -> low risk',
    values: { assay: 'alinity', sex: 'female', onsetHours: 2, t0: 4, t1: 5 },
    expect: [
      'Low risk',
      '0h troponin <5 ng/L and Δ 0→1 h = 1 < 2 ng/L',
      'Action:'
    ]
  },
  {
    name: 'POC 0h <5 with delta <3 -> low risk',
    values: { assay: 'poc', sex: 'female', onsetHours: 2, t0: 4, t1: 6 },
    expect: [
      'Low risk',
      '0h troponin <5 ng/L and Δ 0→1 h = 2 < 3 ng/L',
      'Action:'
    ]
  },
  {
    name: 'Alinity 0h >=64 -> rule-in',
    values: { assay: 'alinity', sex: 'female', onsetHours: 1, t0: 64 },
    expect: [
      'High risk - rule-in',
      '0h troponin ≥ 64 ng/L',
      'Refer for Cardiology admission'
    ]
  },
  {
    name: 'POC 0h >=60 -> rule-in',
    values: { assay: 'poc', sex: 'female', onsetHours: 1, t0: 60 },
    expect: [
      'High risk - rule-in',
      '0h troponin ≥ 60 ng/L',
      'Refer for Cardiology admission'
    ]
  },
  {
    name: 'Alinity delta >=6 -> rule-in',
    values: { assay: 'alinity', sex: 'female', onsetHours: 1, t0: 10, t1: 16 },
    expect: [
      'High risk - rule-in',
      'Δ 0→1 h ≥ 6 ng/L',
      'Refer for Cardiology admission'
    ]
  },
  {
    name: 'POC delta >=8 -> rule-in',
    values: { assay: 'poc', sex: 'female', onsetHours: 1, t0: 10, t1: 18 },
    expect: [
      'High risk - rule-in',
      'Δ 0→1 h ≥ 8 ng/L',
      'Refer for Cardiology admission'
    ]
  },
  {
    name: 'Intermediate with either value above sex-specific 99th -> Cardiology wording',
    values: { assay: 'alinity', sex: 'female', onsetHours: 1, t0: 14, t1: 16 },
    expect: [
      'Intermediate risk',
      '0→1 h delta is 2 ng/L, below the 6 ng/L rule-in threshold',
      'Either the 0h or 1 h value is above the sex-specific 99th percentile',
      'Refer to Cardiology'
    ]
  },
  {
    name: 'Intermediate without value above 99th -> ESSU / 3h / senior ED wording',
    values: { assay: 'alinity', sex: 'female', onsetHours: 1, t0: 10, t1: 12 },
    expect: [
      'Intermediate risk',
      '0→1 h delta is 2 ng/L, below the 6 ng/L rule-in threshold',
      'No value is above the sex-specific 99th percentile',
      'ESSU appropriate',
      'discuss with senior ED clinician'
    ]
  },
  {
    name: 'Intermediate wording reports actual delta when 0h is 6',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, t0: 6, t1: 3 },
    expect: [
      'Intermediate risk',
      '0→1 h delta is 3 ng/L, below the 6 ng/L rule-in threshold',
      'No value is above the sex-specific 99th percentile',
      'ESSU appropriate'
    ]
  },
  {
    name: 'Late 1h sample is framed as compliant with disposition-delay note',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, t0: 6, t1: 7, t3: 9, t0Time: '08:30', t1Time: '09:45' },
    expect: [
      'Actual 0→1 h interval = 75 min',
      '1 h sample met the required interval',
      'An on-target 1 h sample could have supported disposition 15 min earlier'
    ]
  },
  {
    name: 'Early 1h sample remains a warning',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, t0: 6, t1: 7, t3: 9, t0Time: '08:30', t1Time: '09:10' },
    expect: [
      'Actual 0→1 h interval = 40 min',
      '1 h sample was taken early at 40 min',
      'Do not apply interval-dependent rule-out until the 1 h window is reached'
    ]
  },
  {
    name: '3h rule-out does not require HEART',
    values: { assay: 'alinity', sex: 'female', onsetHours: 1, t0: 10, t1: 12, t3: 11 },
    expect: [
      'Low risk - rule-out at 3 h',
      '3 h troponin 11 < 15 ng/L',
      'HEART is recommended as an additional checkpoint'
    ]
  },
  {
    name: 'HEART >=4 prompts senior discussion but does not gate low-risk pathway',
    values: { assay: 'alinity', sex: 'female', onsetHours: 2, t0: 4, t1: 5, heart: 4 },
    expect: [
      'Low risk',
      'HEART ≥ 4',
      'discuss with a senior ED registrar or consultant'
    ]
  },
  {
    name: 'Early low-initial presentation requires 2h timing evidence',
    values: { assay: 'alinity', sex: 'female', onsetMins: 45, t0: 4, t1: 5 },
    expect: [
      'Repeat sample timing required',
      'requires a 2 h serial sample',
      'before applying the low-risk delta threshold'
    ]
  },
  {
    name: 'Unstable/crescendo angina reminder is present in discharge guidance',
    values: { assay: 'alinity', sex: 'female', onsetHours: 3, t0: 3 },
    expect: [
      'ongoing or crescendo typical cardiac pain',
      'senior clinician ± Cardiology',
      'regardless of troponin results'
    ]
  }
];

let passed = 0;

for (const testCase of cases) {
  const app = createApp();
  app.set(testCase.values);
  const result = app.output();
  try {
    for (const expected of testCase.expect) {
      assert.ok(
        result.includes(expected),
        `Missing expected text: ${expected}\nRendered output: ${result}`
      );
    }
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    console.error(`FAIL ${testCase.name}`);
    throw error;
  }
}

{
  const app = createApp();
  app.set({ assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t1Time: '09:10' });
  const check = app.text('t1TimingCheck');
  assert.equal(app.element('t1TimingCheck').hidden, false);
  assert.ok(check.includes('0→1 h interval is 40 min'), `Rendered timing check: ${check}`);
  assert.ok(check.includes('before the recommended 1 h from the 0h troponin'), `Rendered timing check: ${check}`);
  console.log('PASS inline timing check warns when 1h sample is early');
}

{
  const app = createApp();
  app.set({ assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t1Time: '11:20' });
  const check = app.text('t1TimingCheck');
  assert.equal(app.element('t1TimingCheck').hidden, false);
  assert.equal(app.element('t1TimingCheck').className, 'sample-timing-check ok');
  assert.ok(check.includes('0→1 h interval is 170 min'), `Rendered timing check: ${check}`);
  assert.ok(check.includes('Meets the required interval'), `Rendered timing check: ${check}`);
  assert.ok(check.includes('an on-target 1 h sample could have supported disposition 110 min earlier'), `Rendered timing check: ${check}`);
  console.log('PASS inline timing check treats late 1h sample as compliant');
}

{
  const app = createApp();
  app.set({ assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t3Time: '11:30' });
  const check = app.text('t3TimingCheck');
  assert.equal(app.element('t3TimingCheck').hidden, false);
  assert.ok(check.includes('0→3 h interval is 180 min'), `Rendered timing check: ${check}`);
  assert.ok(check.includes('Timing meets the recommended 3 h interval from the 0h troponin'), `Rendered timing check: ${check}`);
  console.log('PASS inline timing check confirms 3h timing against 0h sample');
}

const timingMatrix = [
  {
    name: '1h early sample warns',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t1Time: '09:20' },
    id: 't1TimingCheck',
    className: 'sample-timing-check warn',
    expect: ['0→1 h interval is 50 min', 'before the recommended 1 h from the 0h troponin']
  },
  {
    name: '1h on-target sample confirms timing',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t1Time: '09:30' },
    id: 't1TimingCheck',
    className: 'sample-timing-check ok',
    expect: ['0→1 h interval is 60 min', 'Timing meets the recommended 1 h interval from the 0h troponin']
  },
  {
    name: '1h late sample quantifies disposition delay',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t1Time: '12:30' },
    id: 't1TimingCheck',
    className: 'sample-timing-check ok',
    expect: ['0→1 h interval is 240 min', 'an on-target 1 h sample could have supported disposition 180 min earlier']
  },
  {
    name: '2h low-initial early-presenter sample warns against 1h interpretation',
    values: { assay: 'alinity', sex: 'female', onsetMins: 45, includeTimes: true, t0: 4, t0Time: '08:30', t1Time: '09:30' },
    id: 't1TimingCheck',
    className: 'sample-timing-check warn',
    expect: ['0→2 h interval is 60 min', 'before the recommended 2 h from the 0h troponin']
  },
  {
    name: '2h low-initial early-presenter on-target sample confirms timing',
    values: { assay: 'alinity', sex: 'female', onsetMins: 45, includeTimes: true, t0: 4, t0Time: '08:30', t1Time: '10:30' },
    id: 't1TimingCheck',
    className: 'sample-timing-check ok',
    expect: ['0→2 h interval is 120 min', 'Timing meets the recommended 2 h interval from the 0h troponin']
  },
  {
    name: '2h low-initial early-presenter late sample quantifies disposition delay',
    values: { assay: 'alinity', sex: 'female', onsetMins: 45, includeTimes: true, t0: 4, t0Time: '08:30', t1Time: '12:30' },
    id: 't1TimingCheck',
    className: 'sample-timing-check ok',
    expect: ['0→2 h interval is 240 min', 'an on-target 2 h sample could have supported disposition 120 min earlier']
  },
  {
    name: '3h early sample warns',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t3Time: '11:20' },
    id: 't3TimingCheck',
    className: 'sample-timing-check warn',
    expect: ['0→3 h interval is 170 min', 'before the recommended 3 h from the 0h troponin']
  },
  {
    name: '3h on-target sample confirms timing',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t3Time: '11:30' },
    id: 't3TimingCheck',
    className: 'sample-timing-check ok',
    expect: ['0→3 h interval is 180 min', 'Timing meets the recommended 3 h interval from the 0h troponin']
  },
  {
    name: '3h late sample quantifies disposition delay',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, includeTimes: true, t0: 6, t0Time: '08:30', t3Time: '12:30' },
    id: 't3TimingCheck',
    className: 'sample-timing-check ok',
    expect: ['0→3 h interval is 240 min', 'an on-target 3 h sample could have supported disposition 60 min earlier']
  }
];

for (const testCase of timingMatrix) {
  const app = createApp();
  app.set(testCase.values);
  const check = app.text(testCase.id);
  assert.equal(app.element(testCase.id).hidden, false, `${testCase.name}: timing check hidden`);
  assert.equal(app.element(testCase.id).className, testCase.className, `${testCase.name}: class mismatch`);
  for (const expected of testCase.expect) {
    assert.ok(check.includes(expected), `${testCase.name}: missing ${expected}\nRendered timing check: ${check}`);
  }
  console.log(`PASS ${testCase.name}`);
}

const followUpCases = [
  {
    name: 'follow-up section stays pending before serial sampling is complete',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, t0: 6 },
    expect: [
      'Follow-up pending final risk status',
      'Take the 1 h sample and assess delta before choosing follow-up or investigations'
    ]
  },
  {
    name: 'low-risk follow-up supports GP care',
    values: { assay: 'alinity', sex: 'female', onsetHours: 3, t0: 3, heart: 2 },
    expect: [
      'Low risk follow-up',
      'discharge/GP care',
      'HEART <4 supports discharge to GP care'
    ]
  },
  {
    name: 'low-risk follow-up with HEART >=4 does not show no-follow-up reassurance',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, t0: 10, t1: 11, t3: 10, heart: 4 },
    expect: [
      'Low risk follow-up',
      'HEART ≥4: discuss with a senior ED registrar or consultant before discharge',
      'If low risk was reached after intermediate observation with HEART ≥4',
      'cardiology discussion, admission, or early outpatient testing may be required'
    ],
    reject: [
      'If low risk was reached after intermediate observation and HEART ≤3, no further follow-up is usually required'
    ]
  },
  {
    name: 'intermediate follow-up includes early testing and cardiology registrar discussion',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, t0: 20, t1: 21, t3: 20 },
    expect: [
      'Intermediate risk follow-up',
      'Discuss Senior ED clinician; consider Cardiology discussion',
      'If discharging Early ischaemia testing within days plus cardiologist follow-up',
      'Before discharge Early outpatient testing requires cardiology registrar discussion',
      'Default route Chest Pain Nurse Provided Clinic',
      'Alternatives Private cardiologist with handover',
      'GP follow-up only exceptional',
      'Chest Pain Nurse Provided Clinic',
      'Outpatient testing decision',
      'Use the troponin pathway and HEART score to decide whether outpatient testing is appropriate',
      'choose CTCA, MPI, or stress echo with Cardiology or a senior ED clinician',
      'Investigation options reference',
      'CTCA',
      'Best used in younger patients',
      'heart-rate control to <60',
      'Myocardial perfusion scan',
      'patients unable to exercise',
      'Stress echo'
    ]
  },
  {
    name: 'high-risk follow-up points to cardiology admission or inpatient testing',
    values: { assay: 'alinity', sex: 'female', onsetHours: 4, t0: 64 },
    expect: [
      'High risk disposition',
      'Refer for Cardiology admission or inpatient testing',
      'Outpatient follow-up is not the usual pathway'
    ]
  }
];

for (const testCase of followUpCases) {
  const app = createApp();
  app.set(testCase.values);
  const result = app.text('followUpOutput');
  assert.equal(app.element('followUpSection').style.display, 'flex', `${testCase.name}: follow-up section hidden`);
  for (const expected of testCase.expect) {
    assert.ok(result.includes(expected), `${testCase.name}: missing ${expected}\nRendered follow-up: ${result}`);
  }
  for (const rejected of testCase.reject || []) {
    assert.ok(!result.includes(rejected), `${testCase.name}: should not include ${rejected}\nRendered follow-up: ${result}`);
  }
  console.log(`PASS ${testCase.name}`);
}

console.log(`\n${passed}/${cases.length} guideline regression cases passed.`);
