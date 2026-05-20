(function attachAccelerometerWalkTest(global) {
  "use strict";

  const DEFAULT_SCOPE = "signal_accelerometrique_continu + intervalles_pas + intervalles_foulee";
  const DEFAULT_WARNING = "Analyse exploratoire. Les indices sur signal continu sont calcules sur les points accelerometriques filtres. Les indices sur intervalles de pas/foulee sont non robustes avec environ 50 pas.";

  function finiteNumber(value) {
    return Number.isFinite(value) ? value : null;
  }

  function safeValue(value) {
    return Number.isFinite(value) ? value : null;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mean(values) {
    const filtered = values.filter((value) => Number.isFinite(value));
    if (!filtered.length) return null;
    let sum = 0;
    for (let index = 0; index < filtered.length; index += 1) sum += filtered[index];
    return sum / filtered.length;
  }

  function variance(values) {
    const avg = mean(values);
    if (!Number.isFinite(avg)) return null;
    let sum = 0;
    let count = 0;
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (!Number.isFinite(value)) continue;
      const delta = value - avg;
      sum += delta * delta;
      count += 1;
    }
    if (count < 2) return null;
    return sum / (count - 1);
  }

  function std(values) {
    const value = variance(values);
    return Number.isFinite(value) ? Math.sqrt(value) : null;
  }

  function percentile(values, ratio) {
    const filtered = values.filter((value) => Number.isFinite(value)).slice().sort((left, right) => left - right);
    if (!filtered.length) return null;
    const rank = Math.max(0, Math.min(filtered.length - 1, Math.round((filtered.length - 1) * ratio)));
    return filtered[rank];
  }

  function movingAverage(values, windowSize) {
    const size = Math.max(1, Math.round(windowSize || 1));
    const result = new Array(values.length);
    let running = 0;
    for (let index = 0; index < values.length; index += 1) {
      const value = Number.isFinite(values[index]) ? values[index] : 0;
      running += value;
      if (index >= size) running -= Number.isFinite(values[index - size]) ? values[index - size] : 0;
      const denominator = Math.min(size, index + 1);
      result[index] = running / denominator;
    }
    return result;
  }

  function createEmptyState() {
    return {
      testId: "",
      dateHeure: "",
      distanceM: 20,
      targetHz: 100,
      phonePosition: "belt",
      instruction: "comfortable",
      comment: "",
      useFullRecording: false,
      rawSamples: [],
      liveStats: {
        durationS: 0,
        sampleCount: 0,
        estimatedHz: null,
      },
      analysis: null,
      status: "idle",
      lastError: "",
    };
  }

  function ensureState(candidate) {
    const next = Object.assign(createEmptyState(), candidate || {});
    if (!Array.isArray(next.rawSamples)) next.rawSamples = [];
    if (!next.liveStats || typeof next.liveStats !== "object") next.liveStats = createEmptyState().liveStats;
    return next;
  }

  function createRuntime() {
    return {
      permission: "idle",
      listening: false,
      recording: false,
      samples: [],
      startedAtPerf: 0,
      startedAtDateMs: 0,
      animationFrame: 0,
      onUpdate: null,
      lastMeta: null,
      lastError: "",
    };
  }

  function generateTestId() {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `ACC-${stamp}-${random}`;
  }

  function computeAccelerationNorm(ax, ay, az) {
    if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(az)) return null;
    return Math.sqrt((ax * ax) + (ay * ay) + (az * az));
  }

  function motionSupported() {
    return typeof global !== "undefined" && typeof global.DeviceMotionEvent !== "undefined";
  }

  async function requestMotionPermission(runtime) {
    if (!runtime) throw new Error("Runtime accelerometre introuvable.");
    if (!motionSupported()) {
      runtime.permission = "unsupported";
      runtime.lastError = "Accelorometre non disponible sur cet appareil.";
      return runtime.permission;
    }
    try {
      if (typeof global.DeviceMotionEvent.requestPermission === "function") {
        const permission = await global.DeviceMotionEvent.requestPermission();
        runtime.permission = permission === "granted" ? "granted" : "denied";
      } else {
        runtime.permission = "granted";
      }
    } catch (error) {
      runtime.permission = "denied";
      runtime.lastError = error && error.message ? error.message : "Autorisation refusee.";
    }
    return runtime.permission;
  }

  function buildSampleFromMotionEvent(event, startedAtPerf, startedAtDateMs) {
    const perfNow = typeof performance !== "undefined" ? performance.now() : Date.now();
    const acceleration = event.acceleration && Number.isFinite(event.acceleration.x) ? event.acceleration : (event.accelerationIncludingGravity || {});
    const rotationRate = event.rotationRate || {};
    const timeS = Math.max(0, (perfNow - startedAtPerf) / 1000);
    const ax = safeValue(acceleration.x);
    const ay = safeValue(acceleration.y);
    const az = safeValue(acceleration.z);
    const gx = safeValue(rotationRate.alpha);
    const gy = safeValue(rotationRate.beta);
    const gz = safeValue(rotationRate.gamma);
    return {
      timestampMs: Math.round(startedAtDateMs + (perfNow - startedAtPerf)),
      timeS,
      ax,
      ay,
      az,
      gx,
      gy,
      gz,
      rotationAlpha: gx,
      rotationBeta: gy,
      rotationGamma: gz,
      accNorm: computeAccelerationNorm(ax, ay, az),
    };
  }

  function attachListener(runtime) {
    if (runtime.listening) return;
    runtime._listener = function onDeviceMotion(event) {
      if (!runtime.recording) return;
      runtime.samples.push(buildSampleFromMotionEvent(event, runtime.startedAtPerf, runtime.startedAtDateMs));
    };
    global.addEventListener("devicemotion", runtime._listener);
    runtime.listening = true;
  }

  function detachListener(runtime) {
    if (!runtime.listening || !runtime._listener) return;
    global.removeEventListener("devicemotion", runtime._listener);
    runtime.listening = false;
    runtime._listener = null;
  }

  function getLiveStats(runtime) {
    const nowPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationS = runtime.recording ? Math.max(0, (nowPerf - runtime.startedAtPerf) / 1000) : (runtime.samples.length ? runtime.samples[runtime.samples.length - 1].timeS : 0);
    const sampleCount = runtime.samples.length;
    const estimatedHz = durationS > 0 ? sampleCount / durationS : null;
    return {
      durationS,
      sampleCount,
      estimatedHz,
    };
  }

  function startRecording(runtime, meta, onUpdate) {
    if (!runtime) throw new Error("Runtime accelerometre introuvable.");
    if (runtime.permission !== "granted") throw new Error("Autoriser l'accelerometre avant l'enregistrement.");
    runtime.samples = [];
    runtime.recording = true;
    runtime.startedAtPerf = typeof performance !== "undefined" ? performance.now() : Date.now();
    runtime.startedAtDateMs = Date.now();
    runtime.onUpdate = typeof onUpdate === "function" ? onUpdate : null;
    runtime.lastMeta = clone(meta || {});
    attachListener(runtime);

    const tick = function tick() {
      if (!runtime.recording) return;
      if (runtime.onUpdate) runtime.onUpdate(getLiveStats(runtime));
      runtime.animationFrame = global.requestAnimationFrame(tick);
    };
    runtime.animationFrame = global.requestAnimationFrame(tick);
    return getLiveStats(runtime);
  }

  function stopRecording(runtime) {
    if (!runtime) throw new Error("Runtime accelerometre introuvable.");
    runtime.recording = false;
    if (runtime.animationFrame) global.cancelAnimationFrame(runtime.animationFrame);
    runtime.animationFrame = 0;
    if (runtime.onUpdate) runtime.onUpdate(getLiveStats(runtime));
    return clone(runtime.samples);
  }

  function resetRecording(runtime) {
    if (!runtime) return;
    runtime.recording = false;
    if (runtime.animationFrame) global.cancelAnimationFrame(runtime.animationFrame);
    runtime.animationFrame = 0;
    runtime.samples = [];
    runtime.startedAtPerf = 0;
    runtime.startedAtDateMs = 0;
    runtime.onUpdate = null;
    runtime.lastMeta = null;
    runtime.lastError = "";
  }

  function detectTapMarkers(samples, centeredNorm, fs) {
    const absoluteSignal = centeredNorm.map((value) => Math.abs(value));
    const signalStd = std(absoluteSignal) || 0;
    const signalP98 = percentile(absoluteSignal, 0.98) || 0;
    const threshold = Math.max(signalStd * 4.5, signalP98 * 0.85, 1.2);
    const minDistance = Math.max(1, Math.round((fs || 50) * 0.75));
    const peaks = [];

    for (let index = 1; index < absoluteSignal.length - 1; index += 1) {
      const value = absoluteSignal[index];
      if (!(value >= threshold && value >= absoluteSignal[index - 1] && value > absoluteSignal[index + 1])) continue;
      const left = Math.max(0, index - minDistance);
      const right = Math.min(absoluteSignal.length - 1, index + minDistance);
      let localMin = value;
      for (let cursor = left; cursor <= right; cursor += 1) {
        if (absoluteSignal[cursor] < localMin) localMin = absoluteSignal[cursor];
      }
      const prominence = value - localMin;
      if (prominence < Math.max(signalStd * 1.5, 0.8)) continue;
      if (peaks.length && (index - peaks[peaks.length - 1].index) < minDistance) {
        if (value > peaks[peaks.length - 1].value) peaks[peaks.length - 1] = { index, value };
      } else {
        peaks.push({ index, value });
      }
    }

    if (peaks.length < 2) {
      return {
        detectionOk: false,
        reason: "Pichenettes non detectees de facon fiable.",
        candidateIndices: peaks.map((peak) => peak.index),
        startIndex: null,
        endIndex: null,
      };
    }

    let startPeak = peaks[0];
    let endPeak = peaks[peaks.length - 1];
    const minimumGap = Math.max(1, Math.round((fs || 50) * 2));
    if ((endPeak.index - startPeak.index) < minimumGap) {
      return {
        detectionOk: false,
        reason: "Pichenettes trop proches pour segmenter la marche.",
        candidateIndices: peaks.map((peak) => peak.index),
        startIndex: null,
        endIndex: null,
      };
    }

    for (let index = 0; index < peaks.length - 1; index += 1) {
      if ((peaks[peaks.length - 1].index - peaks[index].index) >= minimumGap) {
        startPeak = peaks[index];
        break;
      }
    }

    for (let index = peaks.length - 1; index >= 1; index -= 1) {
      if ((peaks[index].index - startPeak.index) >= minimumGap) {
        endPeak = peaks[index];
        break;
      }
    }

    return {
      detectionOk: true,
      candidateIndices: peaks.map((peak) => peak.index),
      startIndex: startPeak.index,
      endIndex: endPeak.index,
      startTimeS: samples[startPeak.index] ? samples[startPeak.index].timeS : null,
      endTimeS: samples[endPeak.index] ? samples[endPeak.index].timeS : null,
    };
  }

  function segmentWalkingSignal(samples, markers, fs, useFullRecording) {
    if (!samples.length) {
      return {
        startIndex: 0,
        endIndex: 0,
        detectionOk: false,
        usedFullSignal: true,
        warning: "Signal vide.",
      };
    }

    if (useFullRecording || !markers || !markers.detectionOk) {
      return {
        startIndex: 0,
        endIndex: samples.length - 1,
        detectionOk: false,
        usedFullSignal: true,
        warning: useFullRecording ? "Analyse forcee sur l'ensemble de l'enregistrement." : "Pichenettes de debut/fin non detectees de facon fiable : analyse realisee sur l'ensemble du signal.",
      };
    }

    const margin = Math.max(1, Math.round((fs || 50) * 0.35));
    const startIndex = Math.min(samples.length - 2, markers.startIndex + margin);
    const endIndex = Math.max(startIndex + 1, markers.endIndex - margin);
    return {
      startIndex,
      endIndex,
      detectionOk: true,
      usedFullSignal: false,
      warning: "",
    };
  }

  function filterSignal(values, fs) {
    if (!Array.isArray(values) || !values.length) return [];
    const avg = mean(values) || 0;
    const centered = values.map((value) => (Number.isFinite(value) ? value - avg : 0));
    const trend = movingAverage(centered, Math.max(3, Math.round((fs || 50) * 0.6)));
    const detrended = centered.map((value, index) => value - trend[index]);
    return movingAverage(detrended, Math.max(3, Math.round((fs || 50) * 0.08)));
  }

  function detectSteps(signal, samples, fs, options) {
    const minStepIntervalS = options && Number.isFinite(options.minStepIntervalS) ? options.minStepIntervalS : 0.30;
    const maxStepIntervalS = options && Number.isFinite(options.maxStepIntervalS) ? options.maxStepIntervalS : 1.50;
    const peakProminenceFactor = options && Number.isFinite(options.peakProminenceFactor) ? options.peakProminenceFactor : 0.35;
    const sampleStd = std(signal) || 0;
    const sampleMean = mean(signal) || 0;
    const threshold = sampleMean + (sampleStd * 0.2);
    const minDistance = Math.max(1, Math.round((fs || 50) * minStepIntervalS));
    const stepPeaks = [];

    for (let index = 1; index < signal.length - 1; index += 1) {
      const value = signal[index];
      if (!(value >= threshold && value >= signal[index - 1] && value > signal[index + 1])) continue;
      const left = Math.max(0, index - minDistance);
      const right = Math.min(signal.length - 1, index + minDistance);
      let localMin = value;
      for (let cursor = left; cursor <= right; cursor += 1) {
        if (signal[cursor] < localMin) localMin = signal[cursor];
      }
      const prominence = value - localMin;
      if (prominence < Math.max(sampleStd * peakProminenceFactor, 0.05)) continue;
      if (stepPeaks.length && (index - stepPeaks[stepPeaks.length - 1].index) < minDistance) {
        if (value > stepPeaks[stepPeaks.length - 1].value) stepPeaks[stepPeaks.length - 1] = { index, value };
      } else {
        stepPeaks.push({ index, value });
      }
    }

    const stepTimes = [];
    const intervals = [];
    const aberrantIntervals = [];
    for (let index = 0; index < stepPeaks.length; index += 1) {
      const peak = stepPeaks[index];
      const sample = samples[peak.index];
      if (!sample) continue;
      stepTimes.push(sample.timeS);
      if (index === 0) continue;
      const interval = sample.timeS - stepTimes[index - 1];
      const isAberrant = interval < minStepIntervalS || interval > maxStepIntervalS;
      const intervalRecord = { index: index - 1, value: interval, excluded: isAberrant };
      intervals.push(intervalRecord);
      if (isAberrant) aberrantIntervals.push(intervalRecord);
    }

    return {
      peaks: stepPeaks,
      stepTimes,
      intervals,
      validIntervals: intervals.filter((item) => !item.excluded).map((item) => item.value),
      aberrantIntervals,
      minStepIntervalS,
      maxStepIntervalS,
      threshold,
    };
  }

  function computeStepMetrics(stepDetection, analyzedDurationS, distanceM) {
    const stepCount = stepDetection.peaks.length;
    const validIntervals = stepDetection.validIntervals;
    const intervalMean = mean(validIntervals);
    const intervalSd = std(validIntervals);
    const cadence = analyzedDurationS > 0 ? stepCount / (analyzedDurationS / 60) : null;
    const stepLength = stepCount > 0 ? distanceM / stepCount : null;
    return {
      nbPasDetectes: stepCount,
      cadencePasMin: cadence,
      longueurPasMoyenneM: stepLength,
      intervallePasMoyenS: intervalMean,
      intervallePasSdS: intervalSd,
      intervallePasCvPourcent: Number.isFinite(intervalMean) && intervalMean > 0 && Number.isFinite(intervalSd) ? (intervalSd / intervalMean) * 100 : null,
      nbIntervallesPas: stepDetection.intervals.length,
      nbIntervallesAberrants: stepDetection.aberrantIntervals.length,
      intervallesExclus: stepDetection.aberrantIntervals.map((item) => item.value),
      validIntervals,
    };
  }

  function sampleEntropy(signal, m, r) {
    const series = signal.filter((value) => Number.isFinite(value));
    const order = Number.isFinite(m) ? Math.max(1, Math.round(m)) : 2;
    if (series.length <= order + 1) return null;
    const tolerance = Number.isFinite(r) ? r : ((std(series) || 0) * 0.2);
    if (!(tolerance > 0)) return null;

    let countM = 0;
    let countM1 = 0;
    const upper = series.length - order;
    for (let left = 0; left < upper; left += 1) {
      for (let right = left + 1; right < upper; right += 1) {
        let match = true;
        for (let depth = 0; depth < order; depth += 1) {
          if (Math.abs(series[left + depth] - series[right + depth]) > tolerance) {
            match = false;
            break;
          }
        }
        if (!match) continue;
        countM += 1;
        if (Math.abs(series[left + order] - series[right + order]) <= tolerance) countM1 += 1;
      }
    }

    if (!countM || !countM1) return null;
    return -Math.log(countM1 / countM);
  }

  function linearRegression(points) {
    if (points.length < 2) return null;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
      sumYY += point.y * point.y;
    }
    const count = points.length;
    const numerator = (count * sumXY) - (sumX * sumY);
    const denominator = (count * sumXX) - (sumX * sumX);
    if (!denominator) return null;
    const slope = numerator / denominator;
    const intercept = (sumY - (slope * sumX)) / count;
    const denominatorY = Math.sqrt(((count * sumXX) - (sumX * sumX)) * ((count * sumYY) - (sumY * sumY)));
    const correlation = denominatorY ? numerator / denominatorY : 0;
    return {
      slope,
      intercept,
      r2: correlation * correlation,
    };
  }

  function computeDFA(signal, options) {
    const series = signal.filter((value) => Number.isFinite(value));
    if (series.length < 20) return null;
    const sampleRate = options && Number.isFinite(options.sampleRate) ? options.sampleRate : 1;
    const signalMean = mean(series) || 0;
    const integrated = [];
    let cumulative = 0;
    for (let index = 0; index < series.length; index += 1) {
      cumulative += series[index] - signalMean;
      integrated.push(cumulative);
    }

    const minWindow = options && Number.isFinite(options.minWindowSamples) ? Math.max(4, Math.round(options.minWindowSamples)) : 4;
    const maxWindow = options && Number.isFinite(options.maxWindowSamples) ? Math.min(series.length / 2, Math.round(options.maxWindowSamples)) : Math.max(minWindow + 1, Math.floor(series.length / 4));
    if (maxWindow <= minWindow) return null;

    const scales = [];
    const targetCount = 10;
    const logMin = Math.log(minWindow);
    const logMax = Math.log(maxWindow);
    for (let index = 0; index < targetCount; index += 1) {
      const windowSize = Math.round(Math.exp(logMin + (((logMax - logMin) * index) / (targetCount - 1))));
      if (windowSize >= minWindow && windowSize <= maxWindow && scales.indexOf(windowSize) === -1) scales.push(windowSize);
    }

    const fluctuationPoints = [];
    for (let scaleIndex = 0; scaleIndex < scales.length; scaleIndex += 1) {
      const windowSize = scales[scaleIndex];
      const segmentCount = Math.floor(integrated.length / windowSize);
      if (segmentCount < 2) continue;
      let squareSum = 0;
      let observed = 0;

      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const start = segmentIndex * windowSize;
        const segment = integrated.slice(start, start + windowSize);
        const regressionPoints = [];
        for (let pointIndex = 0; pointIndex < segment.length; pointIndex += 1) regressionPoints.push({ x: pointIndex, y: segment[pointIndex] });
        const regression = linearRegression(regressionPoints);
        if (!regression) continue;
        for (let pointIndex = 0; pointIndex < segment.length; pointIndex += 1) {
          const trend = (regression.slope * pointIndex) + regression.intercept;
          const delta = segment[pointIndex] - trend;
          squareSum += delta * delta;
          observed += 1;
        }
      }

      if (!observed) continue;
      const rms = Math.sqrt(squareSum / observed);
      if (rms > 0) {
        fluctuationPoints.push({
          x: Math.log(windowSize / sampleRate),
          y: Math.log(rms),
          windowSize,
          fluctuation: rms,
        });
      }
    }

    const regression = linearRegression(fluctuationPoints);
    if (!regression) return null;
    return {
      alpha: regression.slope,
      r2: regression.r2,
      nbPoints: series.length,
      nbWindows: fluctuationPoints.length,
      windowMinS: fluctuationPoints.length ? fluctuationPoints[0].windowSize / sampleRate : null,
      windowMaxS: fluctuationPoints.length ? fluctuationPoints[fluctuationPoints.length - 1].windowSize / sampleRate : null,
      points: fluctuationPoints,
    };
  }

  function computeContinuousNonlinearMetrics(analysisSignal, axisSignals, fs) {
    const result = {
      sampleEntropyNorm: null,
      sampleEntropyAx: null,
      sampleEntropyAy: null,
      sampleEntropyAz: null,
      dfaAlphaNorm: null,
      dfaR2Norm: null,
      dfaNbPoints: null,
      dfaNbWindows: null,
      dfaWindowMinS: null,
      dfaWindowMaxS: null,
      dfaInterpretationPrudence: "",
      dfaPlot: [],
      warnings: [],
    };
    if (analysisSignal.length < 1000) {
      result.warnings.push("Sample entropy signal continu non calculee : signal trop court.");
      result.warnings.push("DFA signal continu non calculee : signal trop court.");
      return result;
    }

    result.sampleEntropyNorm = sampleEntropy(analysisSignal, 2, (std(analysisSignal) || 0) * 0.2);
    if (axisSignals.ax.length >= 1000) result.sampleEntropyAx = sampleEntropy(axisSignals.ax, 2, (std(axisSignals.ax) || 0) * 0.2);
    if (axisSignals.ay.length >= 1000) result.sampleEntropyAy = sampleEntropy(axisSignals.ay, 2, (std(axisSignals.ay) || 0) * 0.2);
    if (axisSignals.az.length >= 1000) result.sampleEntropyAz = sampleEntropy(axisSignals.az, 2, (std(axisSignals.az) || 0) * 0.2);

    const dfa = computeDFA(analysisSignal, {
      sampleRate: fs,
      minWindowSamples: Math.max(4, Math.round(fs * 0.5)),
      maxWindowSamples: Math.max(8, Math.round(fs * 5)),
    });
    if (!dfa) {
      result.warnings.push("DFA signal continu non calculee : signal trop court.");
      return result;
    }

    result.dfaAlphaNorm = dfa.alpha;
    result.dfaR2Norm = dfa.r2;
    result.dfaNbPoints = dfa.nbPoints;
    result.dfaNbWindows = dfa.nbWindows;
    result.dfaWindowMinS = dfa.windowMinS;
    result.dfaWindowMaxS = dfa.windowMaxS;
    result.dfaInterpretationPrudence = "La DFA est calculee ici sur le signal accelerometrique continu, et non sur une longue serie de temps de foulee. Elle doit etre consideree comme un indicateur exploratoire de structure temporelle du signal, et non comme une mesure robuste des correlations stride-to-stride.";
    result.dfaPlot = dfa.points;
    return result;
  }

  function computeStepIntervalNonlinearMetrics(stepIntervals) {
    const validIntervals = stepIntervals.filter((value) => Number.isFinite(value));
    const result = {
      sampleEntropyStepIntervals: sampleEntropy(validIntervals, 2, (std(validIntervals) || 0) * 0.2),
      nbStepIntervalsForEntropy: validIntervals.length,
      interpretationSampleEntropyStepIntervals: "",
      dfaAlphaStepIntervals: null,
      dfaR2StepIntervals: null,
      nbStepIntervalsForDfa: validIntervals.length,
      interpretationDfaStepIntervals: "",
    };

    if (validIntervals.length < 50) {
      result.interpretationSampleEntropyStepIntervals = "Non interpretable : nombre d'intervalles de pas tres insuffisant.";
      result.interpretationDfaStepIntervals = "DFA des intervalles non interpretable : serie trop courte.";
    } else if (validIntervals.length < 100) {
      result.interpretationSampleEntropyStepIntervals = "Tres exploratoire : nombre d'intervalles faible pour une entropie fiable.";
      result.interpretationDfaStepIntervals = "DFA des intervalles tres exploratoire.";
    } else {
      result.interpretationSampleEntropyStepIntervals = "Interpretation possible avec prudence.";
      result.interpretationDfaStepIntervals = "DFA des intervalles interpretable avec prudence.";
    }

    const dfa = computeDFA(validIntervals, {
      sampleRate: 1,
      minWindowSamples: 4,
      maxWindowSamples: Math.max(8, Math.floor(validIntervals.length / 2)),
    });
    if (dfa) {
      result.dfaAlphaStepIntervals = dfa.alpha;
      result.dfaR2StepIntervals = dfa.r2;
    }
    return result;
  }

  function computeStrideIntervalMetrics(stepIntervals) {
    const strideIntervals = [];
    for (let index = 0; index < stepIntervals.length - 1; index += 1) {
      const current = stepIntervals[index];
      const next = stepIntervals[index + 1];
      if (Number.isFinite(current) && Number.isFinite(next)) strideIntervals.push(current + next);
    }

    const strideMean = mean(strideIntervals);
    const strideSd = std(strideIntervals);
    const result = {
      nbStrideIntervals: strideIntervals.length,
      strideIntervalMeanS: strideMean,
      strideIntervalSdS: strideSd,
      strideIntervalCvPercent: Number.isFinite(strideMean) && strideMean > 0 && Number.isFinite(strideSd) ? (strideSd / strideMean) * 100 : null,
      sampleEntropyStrideIntervals: sampleEntropy(strideIntervals, 2, (std(strideIntervals) || 0) * 0.2),
      dfaAlphaStrideIntervals: null,
      dfaR2StrideIntervals: null,
      interpretationStrideNonlinear: "",
      strideIntervals,
    };

    if (strideIntervals.length < 50) {
      result.interpretationStrideNonlinear = "Non interpretable : nombre de foulees insuffisant.";
    } else if (strideIntervals.length < 100) {
      result.interpretationStrideNonlinear = "Tres exploratoire.";
    } else {
      result.interpretationStrideNonlinear = "Interpretation possible avec prudence.";
    }

    const dfa = computeDFA(strideIntervals, {
      sampleRate: 1,
      minWindowSamples: 4,
      maxWindowSamples: Math.max(8, Math.floor(strideIntervals.length / 2)),
    });
    if (dfa) {
      result.dfaAlphaStrideIntervals = dfa.alpha;
      result.dfaR2StrideIntervals = dfa.r2;
    }

    return result;
  }

  function buildSamplingQuality(samples, durationS, fs) {
    const intervalsMs = [];
    for (let index = 1; index < samples.length; index += 1) intervalsMs.push(samples[index].timestampMs - samples[index - 1].timestampMs);
    const meanIntervalMs = mean(intervalsMs);
    const sdIntervalMs = std(intervalsMs);
    let irregularCount = 0;
    for (let index = 0; index < intervalsMs.length; index += 1) {
      const delta = intervalsMs[index];
      if (!Number.isFinite(meanIntervalMs) || !meanIntervalMs) break;
      if (Math.abs(delta - meanIntervalMs) > (meanIntervalMs * 0.2)) irregularCount += 1;
    }
    return {
      fsReelleHz: fs,
      meanIntervalMs,
      sdIntervalMs,
      irregularPct: intervalsMs.length ? (irregularCount / intervalsMs.length) * 100 : null,
      durationS,
      sampleCount: samples.length,
    };
  }

  function buildAutomaticComments(stepCount, warnings) {
    const comments = [];
    if (stepCount < 40) comments.push("Nombre de pas inferieur a l'objectif attendu ; interpretation prudente.");
    else if (stepCount <= 60) comments.push("Nombre de pas compatible avec l'objectif d'environ 50 pas.");
    else comments.push("Nombre de pas superieur a l'objectif attendu ; verifier la segmentation ou la detection.");
    comments.push("La sample entropy du signal continu est exploratoire. Elle decrit la regularite du signal accelerometrique pendant la marche, mais ne permet pas a elle seule de conclure sur le risque de chute.");
    comments.push("La DFA du signal continu est exploratoire. Elle ne doit pas etre confondue avec une DFA stride-to-stride robuste, qui necessite une serie de foulees plus longue.");
    comments.push("Avec environ 50 pas, les analyses non lineaires appliquees aux intervalles de pas ou de foulee sont calculables mais non robustes. Elles sont fournies a titre exploratoire.");
    comments.push("Ces resultats completent l'evaluation clinique et doivent etre interpretes avec les tests fonctionnels, l'observation clinique, les antecedents de chute, la douleur, la cognition, l'aide technique et le contexte de marche.");
    for (let index = 0; index < warnings.length; index += 1) comments.push(warnings[index]);
    return comments.join(" ");
  }

  function analyseRecording(testState) {
    const test = ensureState(testState);
    const warnings = [];
    const errors = [];
    const samples = clone(test.rawSamples || []);
    if (!samples.length) {
      return {
        processedSamples: [],
        results: null,
        warnings,
        errors: ["Aucun echantillon enregistre."],
      };
    }

    const durationS = Math.max(0, (samples[samples.length - 1].timeS || 0) - (samples[0].timeS || 0));
    const fs = durationS > 0 ? samples.length / durationS : null;
    const sampling = buildSamplingQuality(samples, durationS, fs);
    if (Number.isFinite(fs) && fs < 40) warnings.push("Frequence reelle basse : l'analyse des pas et des indices non lineaires est a interpreter avec prudence.");
    if (durationS < 4) warnings.push("Signal tres court : interpretation prudente.");

    const normValues = samples.map((sample) => Number.isFinite(sample.accNorm) ? sample.accNorm : computeAccelerationNorm(sample.ax, sample.ay, sample.az));
    const normMean = mean(normValues) || 0;
    const centeredNorm = normValues.map((value) => Number.isFinite(value) ? value - normMean : 0);
    const filteredNorm = filterSignal(centeredNorm, fs || test.targetHz || 100);
    const filteredAx = filterSignal(samples.map((sample) => Number.isFinite(sample.ax) ? sample.ax : 0), fs || test.targetHz || 100);
    const filteredAy = filterSignal(samples.map((sample) => Number.isFinite(sample.ay) ? sample.ay : 0), fs || test.targetHz || 100);
    const filteredAz = filterSignal(samples.map((sample) => Number.isFinite(sample.az) ? sample.az : 0), fs || test.targetHz || 100);

    const tapMarkers = detectTapMarkers(samples, centeredNorm, fs || test.targetHz || 100);
    if (!tapMarkers.detectionOk && tapMarkers.reason) warnings.push(tapMarkers.reason);
    const segment = segmentWalkingSignal(samples, tapMarkers, fs || test.targetHz || 100, test.useFullRecording);
    if (segment.warning) warnings.push(segment.warning);

    const segmentSamples = samples.slice(segment.startIndex, segment.endIndex + 1);
    const segmentFilteredNorm = filteredNorm.slice(segment.startIndex, segment.endIndex + 1);
    const segmentFilteredAx = filteredAx.slice(segment.startIndex, segment.endIndex + 1);
    const segmentFilteredAy = filteredAy.slice(segment.startIndex, segment.endIndex + 1);
    const segmentFilteredAz = filteredAz.slice(segment.startIndex, segment.endIndex + 1);

    const stepDetection = detectSteps(segmentFilteredNorm, segmentSamples, fs || test.targetHz || 100, {
      minStepIntervalS: 0.30,
      maxStepIntervalS: 1.50,
      peakProminenceFactor: 0.35,
    });
    const analyzedDurationS = segmentSamples.length > 1 ? (segmentSamples[segmentSamples.length - 1].timeS - segmentSamples[0].timeS) : 0;
    const stepMetrics = computeStepMetrics(stepDetection, analyzedDurationS, Number(test.distanceM) || 20);
    if (stepMetrics.nbPasDetectes < 40) warnings.push("Nombre de pas inferieur a l'objectif attendu ; interpretation prudente.");
    else if (stepMetrics.nbPasDetectes <= 60) warnings.push("Nombre de pas compatible avec l'objectif d'environ 50 pas.");
    else warnings.push("Nombre de pas superieur a l'objectif attendu ; verifier la segmentation ou la detection des pics.");
    if (!stepMetrics.nbPasDetectes) warnings.push("Pas non detectes ou signal insuffisant pour une detection fiable.");

    const continuousNonlinear = computeContinuousNonlinearMetrics(segmentFilteredNorm, {
      ax: segmentFilteredAx,
      ay: segmentFilteredAy,
      az: segmentFilteredAz,
    }, fs || test.targetHz || 100);
    const stepIntervalNonlinear = computeStepIntervalNonlinearMetrics(stepMetrics.validIntervals);
    const strideMetrics = computeStrideIntervalMetrics(stepMetrics.validIntervals);
    warnings.push.apply(warnings, continuousNonlinear.warnings);

    const stepPeakSampleIndexes = new Set(stepDetection.peaks.map((peak) => segment.startIndex + peak.index));
    const candidateTapIndexes = new Set(tapMarkers.candidateIndices || []);

    const processedSamples = samples.map((sample, index) => ({
      patientId: test.patientId || "",
      dateHeure: test.dateHeure || "",
      testId: test.testId || "",
      timestampMs: sample.timestampMs,
      timeS: sample.timeS,
      ax: sample.ax,
      ay: sample.ay,
      az: sample.az,
      gx: sample.gx,
      gy: sample.gy,
      gz: sample.gz,
      rotationAlpha: sample.rotationAlpha,
      rotationBeta: sample.rotationBeta,
      rotationGamma: sample.rotationGamma,
      accNorm: normValues[index],
      accNormCentered: centeredNorm[index],
      accNormFiltered: filteredNorm[index],
      axFiltered: filteredAx[index],
      ayFiltered: filteredAy[index],
      azFiltered: filteredAz[index],
      segmentAnalyse: index >= segment.startIndex && index <= segment.endIndex,
      picPasDetecte: stepPeakSampleIndexes.has(index),
      markerPichenette: tapMarkers.detectionOk && index === tapMarkers.startIndex ? "start" : tapMarkers.detectionOk && index === tapMarkers.endIndex ? "end" : candidateTapIndexes.has(index) ? "candidate" : "none",
    }));

    const results = {
      patientId: test.patientId || "",
      dateHeure: test.dateHeure || "",
      testId: test.testId || "",
      distanceM: Number(test.distanceM) || 20,
      consigne: test.instruction || "",
      positionTelephone: test.phonePosition || "",
      commentaireLibre: test.comment || "",
      frequenceCibleHz: Number(test.targetHz) || 100,
      frequenceReelleHz: sampling.fsReelleHz,
      dureeTotaleS: durationS,
      dureeAnalyseeS: analyzedDurationS,
      nbEchantillonsTotal: samples.length,
      nbEchantillonsAnalyse: segmentSamples.length,
      detectionPichenettesOk: tapMarkers.detectionOk,
      pichenetteStartTimeS: tapMarkers.startTimeS || null,
      pichenetteEndTimeS: tapMarkers.endTimeS || null,
      nbPasDetectes: stepMetrics.nbPasDetectes,
      cadencePasMin: stepMetrics.cadencePasMin,
      longueurPasMoyenneM: stepMetrics.longueurPasMoyenneM,
      intervallePasMoyenS: stepMetrics.intervallePasMoyenS,
      intervallePasSdS: stepMetrics.intervallePasSdS,
      intervallePasCvPourcent: stepMetrics.intervallePasCvPourcent,
      nbIntervallesPas: stepMetrics.nbIntervallesPas,
      nbIntervallesAberrants: stepMetrics.nbIntervallesAberrants,
      sampleEntropyNorm: continuousNonlinear.sampleEntropyNorm,
      sampleEntropyAx: continuousNonlinear.sampleEntropyAx,
      sampleEntropyAy: continuousNonlinear.sampleEntropyAy,
      sampleEntropyAz: continuousNonlinear.sampleEntropyAz,
      dfaAlphaNorm: continuousNonlinear.dfaAlphaNorm,
      dfaR2Norm: continuousNonlinear.dfaR2Norm,
      dfaNbPoints: continuousNonlinear.dfaNbPoints,
      dfaNbWindows: continuousNonlinear.dfaNbWindows,
      dfaWindowMinS: continuousNonlinear.dfaWindowMinS,
      dfaWindowMaxS: continuousNonlinear.dfaWindowMaxS,
      sampleEntropyStepIntervals: stepIntervalNonlinear.sampleEntropyStepIntervals,
      nbStepIntervalsForEntropy: stepIntervalNonlinear.nbStepIntervalsForEntropy,
      interpretationSampleEntropyStepIntervals: stepIntervalNonlinear.interpretationSampleEntropyStepIntervals,
      dfaAlphaStepIntervals: stepIntervalNonlinear.dfaAlphaStepIntervals,
      dfaR2StepIntervals: stepIntervalNonlinear.dfaR2StepIntervals,
      nbStepIntervalsForDfa: stepIntervalNonlinear.nbStepIntervalsForDfa,
      interpretationDfaStepIntervals: stepIntervalNonlinear.interpretationDfaStepIntervals,
      nbStrideIntervals: strideMetrics.nbStrideIntervals,
      strideIntervalMeanS: strideMetrics.strideIntervalMeanS,
      strideIntervalSdS: strideMetrics.strideIntervalSdS,
      strideIntervalCvPercent: strideMetrics.strideIntervalCvPercent,
      sampleEntropyStrideIntervals: strideMetrics.sampleEntropyStrideIntervals,
      dfaAlphaStrideIntervals: strideMetrics.dfaAlphaStrideIntervals,
      dfaR2StrideIntervals: strideMetrics.dfaR2StrideIntervals,
      interpretationStrideNonlinear: strideMetrics.interpretationStrideNonlinear,
      nonlinearAnalysisScope: DEFAULT_SCOPE,
      nonlinearAnalysisWarning: DEFAULT_WARNING,
      avertissements: warnings.join(" | "),
      commentaireAuto: buildAutomaticComments(stepMetrics.nbPasDetectes, warnings),
      signalStats: {
        meanIntervalMs: sampling.meanIntervalMs,
        sdIntervalMs: sampling.sdIntervalMs,
        irregularPct: sampling.irregularPct,
      },
      graphData: {
        raw: processedSamples.map((sample) => ({ x: sample.timeS, y: sample.accNorm })),
        filtered: processedSamples.map((sample) => ({ x: sample.timeS, y: sample.accNormFiltered })),
        filteredSegment: processedSamples.filter((sample) => sample.segmentAnalyse).map((sample) => ({ x: sample.timeS, y: sample.accNormFiltered })),
        stepTimes: stepDetection.stepTimes,
        stepIntervals: stepMetrics.validIntervals,
        strideIntervals: strideMetrics.strideIntervals,
        dfa: continuousNonlinear.dfaPlot,
      },
    };

    return {
      processedSamples,
      results,
      warnings,
      errors,
    };
  }

  function buildRawExportRows(testState) {
    const test = ensureState(testState);
    const rows = [];
    const samples = Array.isArray(test.rawSamples) ? test.rawSamples : [];
    const fsValue = test.analysis && test.analysis.results ? test.analysis.results.frequenceReelleHz : null;
    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      rows.push({
        patient_id: test.patientId || "",
        date_heure: test.dateHeure || "",
        test_id: test.testId || "",
        timestamp_ms: sample.timestampMs,
        time_s: sample.timeS,
        ax: sample.ax,
        ay: sample.ay,
        az: sample.az,
        gx: sample.gx,
        gy: sample.gy,
        gz: sample.gz,
        rotation_alpha: sample.rotationAlpha,
        rotation_beta: sample.rotationBeta,
        rotation_gamma: sample.rotationGamma,
        acc_norm: sample.accNorm,
        acc_norm_centered: sample.accNormCentered,
        acc_norm_filtered: sample.accNormFiltered,
        segment_analyse: sample.segmentAnalyse ? true : false,
        pic_pas_detecte: sample.picPasDetecte ? true : false,
        marker_pichenette: sample.markerPichenette || "none",
        fs_reelle_hz: fsValue,
        position_telephone: test.phonePosition || "",
        consigne: test.instruction || "",
        distance_m: Number(test.distanceM) || 20,
      });
    }
    return rows;
  }

  function buildResultsExportRow(testState) {
    const test = ensureState(testState);
    const results = test.analysis && test.analysis.results ? test.analysis.results : {};
    return {
      patient_id: test.patientId || "",
      date_heure: test.dateHeure || "",
      test_id: test.testId || "",
      distance_m: Number(test.distanceM) || 20,
      consigne: test.instruction || "",
      position_telephone: test.phonePosition || "",
      commentaire_libre: test.comment || "",
      frequence_cible_hz: Number(test.targetHz) || 100,
      frequence_reelle_hz: results.frequenceReelleHz,
      duree_totale_s: results.dureeTotaleS,
      duree_analysee_s: results.dureeAnalyseeS,
      nb_echantillons_total: results.nbEchantillonsTotal,
      nb_echantillons_analyse: results.nbEchantillonsAnalyse,
      detection_pichenettes_ok: results.detectionPichenettesOk,
      pichenette_start_time_s: results.pichenetteStartTimeS,
      pichenette_end_time_s: results.pichenetteEndTimeS,
      nb_pas_detectes: results.nbPasDetectes,
      cadence_pas_min: results.cadencePasMin,
      longueur_pas_moyenne_m: results.longueurPasMoyenneM,
      intervalle_pas_moyen_s: results.intervallePasMoyenS,
      intervalle_pas_sd_s: results.intervallePasSdS,
      intervalle_pas_cv_pourcent: results.intervallePasCvPourcent,
      nb_intervalles_pas: results.nbIntervallesPas,
      nb_intervalles_aberrants: results.nbIntervallesAberrants,
      sample_entropy_norm: results.sampleEntropyNorm,
      sample_entropy_ax: results.sampleEntropyAx,
      sample_entropy_ay: results.sampleEntropyAy,
      sample_entropy_az: results.sampleEntropyAz,
      dfa_alpha_norm: results.dfaAlphaNorm,
      dfa_r2_norm: results.dfaR2Norm,
      dfa_nb_points: results.dfaNbPoints,
      dfa_nb_windows: results.dfaNbWindows,
      dfa_window_min_s: results.dfaWindowMinS,
      dfa_window_max_s: results.dfaWindowMaxS,
      sample_entropy_step_intervals: results.sampleEntropyStepIntervals,
      nb_step_intervals_for_entropy: results.nbStepIntervalsForEntropy,
      interpretation_sample_entropy_step_intervals: results.interpretationSampleEntropyStepIntervals,
      dfa_alpha_step_intervals: results.dfaAlphaStepIntervals,
      dfa_r2_step_intervals: results.dfaR2StepIntervals,
      nb_step_intervals_for_dfa: results.nbStepIntervalsForDfa,
      interpretation_dfa_step_intervals: results.interpretationDfaStepIntervals,
      nb_stride_intervals: results.nbStrideIntervals,
      stride_interval_mean_s: results.strideIntervalMeanS,
      stride_interval_sd_s: results.strideIntervalSdS,
      stride_interval_cv_percent: results.strideIntervalCvPercent,
      sample_entropy_stride_intervals: results.sampleEntropyStrideIntervals,
      dfa_alpha_stride_intervals: results.dfaAlphaStrideIntervals,
      dfa_r2_stride_intervals: results.dfaR2StrideIntervals,
      interpretation_stride_nonlinear: results.interpretationStrideNonlinear,
      nonlinear_analysis_scope: DEFAULT_SCOPE,
      nonlinear_analysis_warning: DEFAULT_WARNING,
      avertissements: results.avertissements || "",
      commentaire_auto: results.commentaireAuto || "",
    };
  }

  function removeSheetIfPresent(workbook, sheetName) {
    if (!workbook || !workbook.Sheets || !workbook.SheetNames) return;
    if (!workbook.Sheets[sheetName]) return;
    delete workbook.Sheets[sheetName];
    workbook.SheetNames = workbook.SheetNames.filter((name) => name !== sheetName);
  }

  function appendAccelerometerSheetsToWorkbook(workbook, testState) {
    if (typeof XLSX === "undefined") return workbook;
    const rawRows = buildRawExportRows(testState);
    const resultsRow = buildResultsExportRow(testState);
    removeSheetIfPresent(workbook, "ACC_BRUT");
    removeSheetIfPresent(workbook, "ACC_RESULTATS");

    const rawHeaders = [
      "patient_id", "date_heure", "test_id", "timestamp_ms", "time_s", "ax", "ay", "az",
      "gx", "gy", "gz", "rotation_alpha", "rotation_beta", "rotation_gamma",
      "acc_norm", "acc_norm_centered", "acc_norm_filtered", "segment_analyse",
      "pic_pas_detecte", "marker_pichenette", "fs_reelle_hz", "position_telephone",
      "consigne", "distance_m",
    ];
    const resultsHeaders = [
      "patient_id", "date_heure", "test_id", "distance_m", "consigne", "position_telephone",
      "commentaire_libre", "frequence_cible_hz", "frequence_reelle_hz", "duree_totale_s",
      "duree_analysee_s", "nb_echantillons_total", "nb_echantillons_analyse",
      "detection_pichenettes_ok", "pichenette_start_time_s", "pichenette_end_time_s",
      "nb_pas_detectes", "cadence_pas_min", "longueur_pas_moyenne_m",
      "intervalle_pas_moyen_s", "intervalle_pas_sd_s", "intervalle_pas_cv_pourcent",
      "nb_intervalles_pas", "nb_intervalles_aberrants", "sample_entropy_norm",
      "sample_entropy_ax", "sample_entropy_ay", "sample_entropy_az", "dfa_alpha_norm",
      "dfa_r2_norm", "dfa_nb_points", "dfa_nb_windows", "dfa_window_min_s",
      "dfa_window_max_s", "sample_entropy_step_intervals", "nb_step_intervals_for_entropy",
      "interpretation_sample_entropy_step_intervals", "dfa_alpha_step_intervals",
      "dfa_r2_step_intervals", "nb_step_intervals_for_dfa", "interpretation_dfa_step_intervals",
      "nb_stride_intervals", "stride_interval_mean_s", "stride_interval_sd_s",
      "stride_interval_cv_percent", "sample_entropy_stride_intervals",
      "dfa_alpha_stride_intervals", "dfa_r2_stride_intervals", "interpretation_stride_nonlinear",
      "nonlinear_analysis_scope", "nonlinear_analysis_warning", "avertissements", "commentaire_auto",
    ];

    const rawSheet = XLSX.utils.json_to_sheet(rawRows, { header: rawHeaders });
    const resultsSheet = XLSX.utils.json_to_sheet([resultsRow], { header: resultsHeaders });
    rawSheet["!cols"] = rawHeaders.map((header) => ({ wch: Math.min(22, Math.max(10, header.length + 2)) }));
    resultsSheet["!cols"] = resultsHeaders.map((header) => ({ wch: Math.min(32, Math.max(11, header.length + 2)) }));
    XLSX.utils.book_append_sheet(workbook, rawSheet, "ACC_BRUT");
    XLSX.utils.book_append_sheet(workbook, resultsSheet, "ACC_RESULTATS");
    return workbook;
  }

  global.AccelerometerWalkTest = {
    DEFAULT_SCOPE,
    DEFAULT_WARNING,
    createEmptyState,
    ensureState,
    createRuntime,
    generateTestId,
    requestMotionPermission,
    startRecording,
    stopRecording,
    resetRecording,
    getLiveStats,
    computeAccelerationNorm,
    detectTapMarkers,
    segmentWalkingSignal,
    filterSignal,
    detectSteps,
    computeStepMetrics,
    sampleEntropy,
    computeDFA,
    computeContinuousNonlinearMetrics,
    computeStepIntervalNonlinearMetrics,
    computeStrideIntervalMetrics,
    analyseRecording,
    buildRawExportRows,
    buildResultsExportRow,
    appendAccelerometerSheetsToWorkbook,
    detachListener,
  };
}(window));
