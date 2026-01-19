# Onset Detection Training Tips

## The Problem You're Experiencing

Your training ended prematurely because of **too much empty/silent space** in your recordings. Here's what was happening:

### Issues:

1. **Empty frames dominating the data**: Many frames with all zeros (amplitude=0, flux=0, etc.)
2. **Low positive ratio**: Only 15% onset frames (need 20%+)
3. **Model learned to always say "no onset"**: Because that's correct 85% of the time!
4. **Deceptive metrics**:
   - High recall (93%) = catches most onsets
   - Low precision (40%) = lots of false positives
   - This means: model predicts onset too often to compensate for poor learning

### What I Fixed:

1. **Added silence filtering** in `preprocess.py`:
   - Automatically removes frames where amplitude < 0.001
   - Keeps frames with any spectral activity
   - Always preserves onset-marked frames
2. **Increased training patience**:
   - Early stopping patience: 15 → 25 epochs
   - Learning rate reduction patience: 5 → 8 epochs
   - Added minimum delta threshold (0.001)
3. **Added data quality warnings**:
   - Warns if < 1000 samples total
   - Warns if < 100 onset samples

## How to Record Better Training Data

### ✅ DO:

1. **Start recording just before you play**
   - Don't record 30 seconds of silence first
   - Click record, wait 1-2 seconds, then play
2. **Stop recording soon after you finish**
   - Don't leave it running for long periods
   - Get tight recordings: 5-30 seconds of actual playing
3. **Mark onsets accurately**
   - Click exactly where each note starts on the timeline
   - You can drag markers to fine-tune position
   - Remove accidental markers by clicking them again
4. **Focus on onset-rich recordings**
   - Short musical phrases with clear note attacks
   - Scales, arpeggios, simple melodies
   - Each note should be distinct
5. **Record multiple short files**
   - Better to have 10 files of 10 seconds each
   - Than 1 file of 100 seconds
   - Easier to label accurately

### ❌ DON'T:

1. **Don't record long periods of silence**
   - Dilutes your onset data
   - Makes model learn "always say no"
2. **Don't record continuously for minutes**
   - Hard to mark all onsets accurately
   - More likely to have labeling errors
3. **Don't forget to mark onsets**
   - Empty recordings are useless
   - Need at least 20-30 onset markers per file
4. **Don't rush the marking process**
   - Take time to mark each onset accurately
   - Listen back and verify your markers

## Recommended Recording Session

1. **Plan your phrase** (e.g., C major scale, simple melody)
2. **Click record**
3. **Wait 1 second** (optional: play a reference note)
4. **Play your phrase** (5-15 seconds)
5. **Stop recording immediately**
6. **Mark each onset on the timeline** (click to add, drag to adjust)
7. **Verify**: Should see green lines at each note start
8. **Select instrument** from dropdown
9. **Export** → saves to training/data/raw/

### Target Stats Per File:

- Duration: 5-30 seconds
- Onsets: 20-50+ marked
- Onset density: 2-4 onsets per second
- Silence: < 10% of recording

## What Good Training Data Looks Like

After preprocessing, you should see:

```
Found 10 JSON files
Processing onset-training-violin-1.json...
  Filtered 500 -> 450 frames (90.0%)  ← Good! Only 10% silence removed
  - Extracted 445 samples, 45 onsets (10.11%)  ← Need more onsets

Before balancing:
  Total samples: 4500
  Total onsets: 450 (10.00%)  ← Too low, need 20%+

⚠️  WARNING: Only 450 onset samples - need more onsets!
   Recommendation: Add more onset markers when recording
```

### Goals:

- **Minimum 2000 samples** after filtering
- **Minimum 400 onset samples** (20%+)
- **Less than 30% filtered** (shows good signal, not silence)

## Next Steps

1. **Delete or re-record files with lots of silence**
   - Check `onset-detection/training/data/raw/`
   - Remove files with < 20 onsets
2. **Record 5-10 new files** following the tips above

3. **Run training again**: `./train.sh`

4. **Check the output**:
   - Should train for 30+ epochs
   - Validation loss should decrease steadily
   - Precision should improve (target: > 60%)

## Understanding the Metrics

- **Accuracy**: Overall correctness (can be misleading with imbalanced data)
- **Precision**: When model says "onset", how often is it right? (Want > 60%)
- **Recall**: Of all real onsets, how many did we catch? (Want > 85%)
- **AUC**: Overall model quality (Want > 0.90)

Good model stats:

- Precision: 60-80%
- Recall: 85-95%
- AUC: > 0.90
- Training: 40-80 epochs before early stopping
