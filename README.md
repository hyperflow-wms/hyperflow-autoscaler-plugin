# Autoscaler

Alternative to [Kubernetes Autoscaler](https://github.com/kubernetes/autoscaler), that is focused on _Hyperflow_ engine. It is intended to provide better scaling results, by utilizing workflow details and predictions and taking proper action according to selected _scaling policy_.

Scaling kubernetes infrastructure is performed via custom providers.

## Installation

~~~
$ npm install -g hyperflow-autoscaler-plugin
~~~

## Configration

Plugin behavior is controlled via environmental variables.

### HF_VAR_autoscalerProvider

Provider for managing cluster infrastructure.

Possible values:
- gcp *-- Google Cloud Platform*
- kind *-- Kubernets in Docker, for development only*
- dummy *-- autoscaler will not perform any real cluster change*
- none *-- completety disables autoscaler functionality*

### HF_VAR_autoscalerMachineType

Name of worker instance type.

Possible values:
- n1_highcpu_4
- n1_highcpu_8
- *and so on*

### HF_VAR_autoscalerPolicy

"Rules" for scaling.

Possible values:
- react *-- scale in reactive way, by adjusting cluster to current demand*
- predict *-- scale cluster with workflow preditions*

### HF_VAR_autoscalerEstimator

This applies to *predict* policy; specifies estimator.

Possible values:
- process *-- per process estimations*
- workflow *-- per workflow estimations (Token-like method)*

### HF_VAR_autoscalerGKEPool

This applies to *gcp* provider only; specifies name of workers node pool.

Default value: "default-pool"

### HF_VAR_autoscalerJobLabel

This applies to *gcp* provider only; specifies the label of job pods. Might be used when they are pending pods that are not HyperFlow jobs.

Example value: "hyperflow"

### HF_VAR_autoscalerInitialDelay

This applies to *gcp* provider only; specifies the inital delay for engine, in seconds.

Default value: "30"

## Usage

~~~
$ hflow run /wf_dir -p hyperflow-autoscaler-plugin
~~~
