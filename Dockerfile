FROM node:12-alpine

COPY . /hyperflow-autoscaler-plugin

WORKDIR /hyperflow-autoscaler-plugin

RUN mkdir -p /tmp/kubectl && cd /tmp/kubectl && apk add curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl


RUN npm --prefix /hyperflow-autoscaler-plugin run build && npm install -g /hyperflow-autoscaler-plugin
