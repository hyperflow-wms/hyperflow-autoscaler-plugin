Autoscaler Change Log
=====================

0.13.0 under development
------------------------


0.12.0 November 25, 2020
------------------------

- Fix logic of filling empty values in demand baseline
- Add workaround for graph prediction: reset of running processes

0.11.0 November 14, 2020
------------------------

- Update default scaling probing to more reasonable value (10 seconds)
- Add missing verbose level in pino logger
- Skip provisioning time, when calculating result of down-scale
- Add missing delay for executing postponed actions
- Score calculation change: overprovision is ignored when other resource is underutilized

0.10.0 November 13, 2020
------------------------

- Replace winston logger with pino - console logging, without memory leaks
- Fix sendAllInputs (concat without effect)
- Improve very unefficient Plan.run - now it works in linear time
- Improve Plan.getDemandFrames (eg. memory for montage2-2mass_2.0 was reduced from 500 MB to 3 KB)

0.9.1 November 12, 2020
------------------------

- Fix getDemandFrames usage - sum resources before packing them into equal intervals
- Fix time passed to scalingOptimizer in predictPolicy (make sure no event is skipped)
- Fix scaling result calculation (fix equation + consider pending workload)

0.9.0 November 8, 2020
------------------------

- Add prices of n1_highmem machines
- Fix dummy provider - use base provider implementation instead of mock

0.8.0 November 5, 2020
------------------------

- Skip completed/failed pods when getting cluster state
- Fix GCP machines specification with allocatable values instead of capacity
- Add n1_highmem machines' specifications
- Allow to set optimizer probing time
- Improve scaling optimizer - look for same score with less machines/price
- Improve react policy - use longer analysis time to avoid 'in advance' paying in price calculation

0.7.0 November 4, 2020
------------------------

- Fix MaxListenersExceededWarning in logger
- Fix number of machines included in scaling loop, use '<= MAX'
- Allow to skip overprovision cost in calculating score
- Fix react policy, by skipping overprovision cost
- Adjust engine react time and precit policy cooldown
- Fill staticProcessEstimator with SoyKB, Montage, KINC and Ellipsoids estimations

0.6.0 October 28, 2020
------------------------

- Fix predict policy: do not mess original workflow tracker
- Fix missing provisioning time in predict policy
- Predict policy - use analyze time specified in HF_VAR_autoscalerPredictTime

0.5.0 October 27, 2020
------------------------

- Add configurable engine initial delay (HF_VAR_autoscalerInitialDelay)
- Fix policy initialization (after workflow was started)
- Add function for calulating billing in resize cases
- Fix scalingOptimizer price calucations (use new billing function)
- Change all Date objects with plain number (timestamp type)

0.4.1 October 23, 2020
------------------------

- Fix filtering pods and add custom setting HF_VAR_autoscalerJobLabel
- Fix missing intialization set in GCP provider
- Fix getDemand - nodeName is no longer required
- Fix scalingOptimizer - use correct demand frames before/after scaling

0.4.0 October 22, 2020
------------------------

- New estimator 'StaticWorkflow' for Token-like predictions
- Allow to choose estimator with HF_VAR_autoscalerEstimator
- Throw instead of returning errors to avoid hidden failures
- Allow to specify node pool name with HF_VAR_autoscalerGKEPool

0.3.0 October 21, 2020
-----------------------------

- Initial release
