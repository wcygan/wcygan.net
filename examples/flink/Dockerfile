FROM flink:2.3.0-scala_2.12-java17@sha256:49413f4ea849373e3448a879dd4bb65d54d2a7562a0f5bacce613a3c1fb840f5

USER root
RUN mkdir -p /lab/state/input /lab/state/output /lab/state/checkpoints \
    && chown -R flink:flink /lab
USER flink
