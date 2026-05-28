# Suspected ACS Troponin App - Leadership Demo Script

Date: 28 May 2026  
App: Suspected ACS Troponin Workflow  
Reference: Alfred Health Chest Pain and Suspected ACS guideline v5, 2025  
Supporting document: `docs/pathway-regression-test-summary.md`

## 30-Second Opening

This is a bedside decision-support prototype for the Alfred suspected ACS troponin pathway.

It is not intended to replace clinical assessment, ECG interpretation, senior review, or Cardiology decision-making. Its purpose is narrower: to help clinicians apply the approved troponin pathway consistently, including assay-specific thresholds, timing rules, intermediate-risk prompts, HEART score as an additional checkpoint, and escalation reminders for unstable or crescendo angina.

The core pathway logic has a reproducible regression test set. The current local version passes 13 of 13 pathway regression cases.

## Core Message For Leadership

The app is best framed as:

> A guideline-concordant workflow aid that reduces cognitive load and variation when applying the approved Alfred hs-troponin pathway.

Avoid framing it as:

> An automated chest pain diagnostic tool.

That distinction matters. The app supports clinicians after assessment of the patient; it does not make the clinical diagnosis independently.

## What The App Does

- Applies the Alfred Alinity and POC hs-troponin thresholds.
- Handles time since symptom onset at presentation.
- Distinguishes 1 h, 2 h, and 3 h pathway timing.
- Separates low-risk, intermediate-risk, and high-risk pathway outputs.
- Prompts the correct intermediate-risk disposition language.
- Keeps HEART score optional as an additional discharge checkpoint.
- Highlights ongoing or crescendo typical cardiac pain as a reason for senior clinician +/- Cardiology discussion regardless of troponin results.
- Provides a visible recommendation with "Why" and "Action" sections.

## What The App Does Not Do

- It does not interpret ECGs.
- It does not replace the initial chest pain assessment.
- It does not decide whether symptoms are cardiac.
- It does not override senior clinician or Cardiology judgement.
- It does not replace local governance approval.
- It does not prove clinical safety by itself.

## Suggested Live Demo Flow

### 1. Start With The Guideline Anchor

Say:

> The first design principle was strict adherence to the approved Alfred guideline. The guideline PDF is stored locally with the app, and the app logic is tested against a small set of pathway regression cases.

Show:

- `references/alfred-health-chest-pain-suspected-acs-guideline-v5-2025.pdf`
- `docs/pathway-regression-test-summary.md`

Point out:

- The document reports 13 of 13 pathway regression cases passing.
- The test is reproducible with `node tests/guideline-regression.mjs`.

### 2. Demonstrate Low-Risk Rule-Out

Use case:

- Assay: Abbott Alinity
- Sex: Female
- Time since symptom onset at presentation: 3 hours
- 0 h troponin: 3 ng/L

Expected message:

- Low risk - single-sample rule-out
- Why: presentation >2 h and 0 h troponin <4 ng/L
- Action: discharge/GP care if ECG and clinical workflow are reassuring
- HEART remains an additional checkpoint, not a mandatory gate
- Unstable/crescendo angina reminder remains visible in discharge guidance

Say:

> This shows the app is not just producing a colour or score. It explains the pathway trigger and the recommended action.

### 3. Demonstrate Intermediate-Risk Pathway

Use case:

- Assay: Abbott Alinity
- Sex: Female
- Time since symptom onset at presentation: 1 hour
- 0 h troponin: 10 ng/L
- 1 h troponin: 12 ng/L

Expected message:

- Intermediate risk
- Why: delta is below rule-in threshold and no value is above the sex-specific 99th percentile
- Action: ESSU appropriate, measure further hs-troponin at 3 h, discuss with senior ED clinician, consider outpatient testing

Say:

> This is one of the key use cases: clinicians often need help remembering the intermediate branch and what follows from the sex-specific 99th percentile.

### 4. Demonstrate Intermediate-Risk With Cardiology Prompt

Use case:

- Assay: Abbott Alinity
- Sex: Female
- Time since symptom onset at presentation: 1 hour
- 0 h troponin: 14 ng/L
- 1 h troponin: 16 ng/L

Expected message:

- Intermediate risk
- Why: either the 0 h or 1 h value is above the sex-specific 99th percentile
- Action: refer to Cardiology; ESSU vs cubicles pending decision-making; measure further hs-troponin at 3 h

Say:

> This branch is a good example of the app supporting nuance rather than simply saying positive or negative.

### 5. Demonstrate High-Risk Rule-In

Use case:

- Assay: Abbott Alinity
- Sex: Female
- Time since symptom onset at presentation: 1 hour
- 0 h troponin: 64 ng/L

Expected message:

- High risk - rule-in
- Why: 0 h troponin >=64 ng/L
- Action: refer for Cardiology admission

Say:

> The high-risk branch is intentionally direct. The app does not encourage unnecessary additional pathway navigation once a rule-in threshold is met.

### 6. Demonstrate POC Threshold Difference

Use case:

- Assay: POC
- Sex: Female
- Time since symptom onset at presentation: 2 hours
- 0 h troponin: 4 ng/L
- 1 h troponin: 6 ng/L

Expected message:

- Low risk
- Why: 0 h troponin <5 ng/L and delta <3 ng/L

Say:

> This is where an app helps: POC and Alinity have different delta thresholds, and the app makes that distinction explicit.

### 7. Show The Clinical Safety Framing

Point to the amber reminder:

> Ongoing or crescendo typical cardiac pain can still represent unstable angina; discuss with a senior clinician +/- Cardiology regardless of troponin results.

Say:

> This is deliberately a reminder, not a forced checkbox. The app assumes the clinician has assessed the patient, but it keeps this important escalation point visible.

## Anticipated Questions

### Is this replacing clinician judgement?

No. It is decision support for applying the approved troponin pathway after clinical assessment. It does not replace ECG interpretation, assessment of instability, senior review, or Cardiology decision-making.

### Does HEART score determine whether the troponin pathway can be used?

No. HEART is included as an additional discharge checkpoint, particularly useful for junior staff, but it does not gate the hs-troponin algorithm.

### What happens with unstable or crescendo angina?

The app displays a reminder that ongoing or crescendo typical cardiac pain may represent unstable angina and should be discussed with a senior clinician +/- Cardiology regardless of troponin results.

### How do we know the thresholds have not drifted during development?

There is a local regression test set covering the key threshold and disposition branches. The current version passes 13 of 13 cases. The test can be rerun with:

```bash
node tests/guideline-regression.mjs
```

### Is this clinically validated?

Not yet. The regression test supports internal pathway consistency; it is not a clinical validation study. Next steps would include independent clinical review, governance review, and observed usability testing before operational use.

## Suggested Closing

> The value here is consistency and cognitive offload. The app does not create a new pathway; it makes the approved pathway easier to apply correctly at the bedside, while preserving clinical judgement and escalation points.

## Materials To Have Ready

- Live app at `http://127.0.0.1:4173/`
- Alfred guideline PDF in `references/`
- Regression summary in `docs/pathway-regression-test-summary.md`
- Test script in `tests/guideline-regression.mjs`

## One-Minute Backup Version

If time is short:

> This is a local prototype that operationalises the approved Alfred suspected ACS troponin pathway. It supports Alinity and POC thresholds, timing from symptom onset, 1 h/2 h/3 h sampling logic, intermediate-risk disposition, HEART as an optional checkpoint, and unstable/crescendo angina escalation reminders. It is not autonomous diagnosis and does not replace ECG or clinical judgement. We have added a reproducible regression test set, currently passing 13 of 13 pathway cases, to show that the core logic remains guideline-concordant as the prototype evolves.
