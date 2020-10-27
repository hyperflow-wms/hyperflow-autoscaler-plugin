Autoscaler Change Log
=====================

0.6.0 under development
------------------------

- Fix predict policy: do not mess original workflow tracker

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
