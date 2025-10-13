<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Troponin Algorithm</title>
  <style>
    .help { font-size: 0.9em; color: #555; margin-top: 0.5em; }
  </style>
</head>
<body>
  <div id="output"></div>

  <div>
    <label>Symptom timing input</label>
    <select id="onsetMode">
      <option value="since" selected>Enter time since onset</option>
      <option value="at">Enter time of onset</option>
    </select>
  </div>

  <div id="onsetSinceWrapper">
    <label>Time since symptom onset</label>
    <input type="number" id="onsetHours" min="0" placeholder="Hours" /> h
    <input type="number" id="onsetMins" min="0" max="59" placeholder="Minutes" /> min
    <div class="help">Add hours and/or minutes to continue. The app will then guide sampling times and rule‑out logic.</div>
  </div>

  <div id="onsetAtWrapper" style="display:none">
    <label>Time of symptom onset</label>
    <input type="time" id="onsetAt" />
    <div class="help">The app will calculate time since onset automatically.</div>
  </div>

  <section class="card col-12" id="tropSection" style="display:none">
    <!-- Existing inputs for T0, T1, T3, HEART score etc. remain unchanged here -->
  </section>

  <button id="compute" disabled>Compute pathway</button>

  <script>
    function $(id){ return document.getElementById(id); }
    function n(v){ return v === '' ? null : Number(v); }
    function line(html, type) {
      return `<div class="${type}">${html}</div>`;
    }

    function onsetMode(){
      return $('onsetMode').value;
    }

    function minutesSinceOnset(){
      if(onsetMode() === 'since'){
        const h = $('onsetHours').value;
        const m = $('onsetMins').value;
        if(h === '' && m === '') return null;
        return (Number(h) || 0)*60 + (Number(m) || 0);
      } else {
        const onsetTime = $('onsetAt').value;
        if(!onsetTime) return null;
        const now = new Date();
        const [onsetH, onsetM] = onsetTime.split(':').map(Number);
        let onsetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), onsetH, onsetM);
        if(onsetDate > now){
          // onset was on previous day
          onsetDate.setDate(onsetDate.getDate() - 1);
        }
        const diffMs = now - onsetDate;
        const diffMin = Math.floor(diffMs / 60000);
        return diffMin >= 0 ? diffMin : null;
      }
    }

    function hasOnset(){
      if(onsetMode() === 'since'){
        const h = $('onsetHours').value;
        const m = $('onsetMins').value;
        return (h !== '' || m !== '');
      } else {
        return $('onsetAt').value !== '';
      }
    }

    function updateOnsetModeUI(){
      if(onsetMode() === 'since'){
        $('onsetSinceWrapper').style.display = 'block';
        $('onsetAtWrapper').style.display = 'none';
      } else {
        $('onsetSinceWrapper').style.display = 'none';
        $('onsetAtWrapper').style.display = 'block';
      }
      setTropSectionVisibility();
    }

    function setTropSectionVisibility(){
      const show = hasOnset();
      $('tropSection').style.display = show ? 'block' : 'none';
      $('compute').disabled = !show;
      if (!show){
        // clear output prompt to nudge the user to enter onset first
        $('output').innerHTML = line(`<h3>Enter time since symptom onset</h3><div class="help">Add hours and/or minutes to continue. The app will then guide sampling times and rule‑out logic.</div>`, 'info');
      } else {
        // once onset is provided, show step‑wise guidance if T0 is not yet entered
        const t0 = n($('t0') ? $('t0').value : null);
        if (t0===null){
          // trigger the compute to show the “Step 1 — Take 0 h troponin now” panel
          document.getElementById('compute').click();
        }
      }
    }

    ['onsetHours','onsetMins'].forEach(id => $(id).addEventListener('input', setTropSectionVisibility));
    $('onsetMode').addEventListener('change', updateOnsetModeUI);
    $('onsetAt').addEventListener('input', setTropSectionVisibility);

    // run once on load
    updateOnsetModeUI();

    document.getElementById('compute').addEventListener('click', function() {
      if (!hasOnset()){
        $('output').innerHTML = line(`<h3>Enter time since symptom onset</h3><div class="help">Provide hours and/or minutes to begin.</div>`, 'info');
        return;
      }
      // rest of the algorithm logic unchanged
      function compute(t0, onsetMin) {
        let nextTimingMsg = "Next step message here"; // placeholder for actual logic
        if (t0 === null) {
          let singleRuleOutMsg = '';
          if (onsetMin >= 120) {
            singleRuleOutMsg = '<div class="help">If the 0 h troponin returns &lt; 4 ng/L, this patient will be cleared on a single troponin.</div>';
          }
          // show symptom onset elapsed time as X h Y min ago
          let h = Math.floor(onsetMin / 60);
          let m = onsetMin % 60;
          let onsetElapsed = `Symptom onset: ${h} h ${m} min ago`;
          return `
            <div>Step 1 — Take 0 h troponin now</div>
            <div class="help">${onsetElapsed}</div>
            <div class="help">${nextTimingMsg}</div>
            ${singleRuleOutMsg}
            <div class="help">Further instructions here.</div>
          `;
        }
        // rest of the algorithm logic unchanged
      }
    });
  </script>
</body>
</html>