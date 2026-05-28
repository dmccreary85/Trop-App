# Suspected ACS Troponin App - Pathway Regression Test Summary

Date: 28 May 2026  
App folder: `/Users/Dave/Desktop/Python/Trop-App/Trop-App-v2`  
Reference pathway: Alfred Health Chest Pain and Suspected ACS guideline v5, 2025  
Test command: `node tests/guideline-regression.mjs`

## Executive Summary

The app has been checked against a focused regression test set covering the key Alfred hs-troponin pathway decisions implemented in this local version.

Result: **13 of 13 regression cases passed**.

The test set confirms that the app currently applies the expected Alinity and POC troponin thresholds, delta thresholds, intermediate-risk disposition prompts, 3-hour rule-out behaviour, HEART score handling, early low-initial timing logic, and unstable/crescendo angina reminder wording.

## What This Test Is For

This regression test is designed to provide reassurance that the app's core decision-support logic matches the approved pathway scenarios we have implemented.

It is particularly intended to guard against accidental drift while the app is being iterated, for example:

- changing POC thresholds while editing Alinity logic
- making HEART score mandatory when it should remain an additional checkpoint
- losing the 3-hour rule-out pathway
- weakening the unstable/crescendo angina reminder
- accidentally changing the intermediate-risk Cardiology/ESSU wording

## Pathway Areas Tested

| Area | Expected behaviour | Result |
|---|---|---|
| Alinity single-sample low risk | Onset >2 h and 0 h troponin <4 ng/L gives low-risk single-sample rule-out wording | Pass |
| Alinity low-initial serial pathway | 0 h troponin <5 ng/L and delta <2 ng/L gives low-risk wording | Pass |
| POC low-initial serial pathway | 0 h troponin <5 ng/L and delta <3 ng/L gives low-risk wording | Pass |
| Alinity absolute rule-in | 0 h troponin >=64 ng/L gives high-risk Cardiology admission wording | Pass |
| POC absolute rule-in | 0 h troponin >=60 ng/L gives high-risk Cardiology admission wording | Pass |
| Alinity delta rule-in | Delta >=6 ng/L gives high-risk Cardiology admission wording | Pass |
| POC delta rule-in | Delta >=8 ng/L gives high-risk Cardiology admission wording | Pass |
| Intermediate risk above sex-specific 99th percentile | Prompts Cardiology referral and 3 h troponin | Pass |
| Intermediate risk not above sex-specific 99th percentile | Prompts ESSU, 3 h troponin, senior ED discussion, and outpatient testing consideration | Pass |
| 3 h rule-out | Allows low-risk 3 h rule-out without requiring HEART score | Pass |
| HEART score handling | HEART >=4 prompts senior discussion but does not gate the troponin algorithm | Pass |
| Early low-initial timing | Early presentation with 0 h troponin <5 requires 2 h timing evidence before low-risk delta interpretation | Pass |
| Unstable/crescendo angina reminder | Discharge guidance includes senior clinician ± Cardiology discussion regardless of troponin results | Pass |

## Test Run Output

```text
PASS Alinity 0h <4 and onset >2h -> single-sample low risk
PASS Alinity 0h <5 with delta <2 -> low risk
PASS POC 0h <5 with delta <3 -> low risk
PASS Alinity 0h >=64 -> rule-in
PASS POC 0h >=60 -> rule-in
PASS Alinity delta >=6 -> rule-in
PASS POC delta >=8 -> rule-in
PASS Intermediate with either value above sex-specific 99th -> Cardiology wording
PASS Intermediate without value above 99th -> ESSU / 3h / senior ED wording
PASS 3h rule-out does not require HEART
PASS HEART >=4 prompts senior discussion but does not gate low-risk pathway
PASS Early low-initial presentation requires 2h timing evidence
PASS Unstable/crescendo angina reminder is present in discharge guidance

13/13 guideline regression cases passed.
```

## Interpretation

The passing result supports that the current local app logic is internally consistent with the selected Alfred pathway scenarios.

The most important reassurance points are:

- The app distinguishes Alinity and POC thresholds correctly.
- The app distinguishes low-risk, intermediate-risk, and high-risk outputs.
- The app does not require a HEART score to run the hs-troponin pathway.
- HEART score remains visible as an additional discharge checkpoint.
- Ongoing or crescendo typical cardiac pain is highlighted as a clinical reason for senior clinician ± Cardiology discussion regardless of troponin results.
- Early low-initial presentations are protected from premature low-risk interpretation.

## Important Limitations

This is a pathway regression test, not a clinical validation study.

It does not prove clinical safety by itself, and it does not replace:

- clinician assessment
- ECG interpretation
- review of atypical or high-risk presentations
- governance approval
- prospective usability testing
- independent clinical review of the final app wording

The app should continue to be presented as decision support for clinicians using the Alfred guideline, not as an autonomous diagnostic tool.

## How To Re-Run

From the app folder:

```bash
node tests/guideline-regression.mjs
```

A successful run should end with:

```text
13/13 guideline regression cases passed.
```

## Suggested Governance Use

This document can be used to show that the current prototype has a reproducible test set for its core pathway logic. It may be useful as supporting evidence during leadership, governance, or clinical stakeholder review, alongside direct review of the Alfred guideline and live demonstration of the app.
