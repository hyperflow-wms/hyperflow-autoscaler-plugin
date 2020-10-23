Autoscaler Change Log
=====================

0.5.0 under development
------------------------

- Fix filtering pods and add custom setting HF_VAR_autoscalerJobLabel
- Fix missing intialization set in GCP provider

0.4.0 October 22, 2020
------------------------

- New estimator 'StaticWorkflow' for Token-like predictions
- Allow to choose estimator with HF_VAR_autoscalerEstimator
- Throw instead of returning errors to avoid hidden failures
- Allow to specify node pool name with HF_VAR_autoscalerGKEPool

0.3.0 October 21, 2020
-----------------------------

- Initial release
