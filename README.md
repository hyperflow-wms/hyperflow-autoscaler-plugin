# Autoscaler

Alternative to [Kubernetes Autoscaler](https://github.com/kubernetes/autoscaler), that is focused on _Hyperflow_ engine. It is intended to provide better scaling results, by utilizing workflow details and predictions and taking proper action according to selected _scaling policy_.

Scaling kubernetes infrastructure is strictly related with provider, so there has to be implemented interface for it - currently _Google Cloud Platform_ is supported only.

## Installation

~~~
$ npm install -g hyperflow-autoscaler-plugin
~~~

## Usage

~~~
$ export HF_VAR_autoscalerProvider=gcp
$ hflow run ... -p hyperflow-autoscaler-plugin
~~~
