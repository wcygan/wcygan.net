---
title: Kubernetes in the Basement
date: May 23, 2025
description: Building a Kubernetes cluster in my basement
tags: [Kubernetes, Talos, Homelab]
---

Meet Anton - a Kubernetes cluster that runs in my basement. Built on the
foundation of
[onedr0p's cluster-template](https://github.com/onedr0p/cluster-template), Anton
represents my journey into self-hosted infrastructure.

<div class="flex justify-center my-6">
<img src="/anton.jpg" alt="Anton Cluster" width="200" />
</div>

## The Hardware

Anton consists of three identical
[MINISFORUM MS-01](https://www.minisforum.com/collections/station-mini-series/products/minisforum-ms-01)
mini PCs, each packing serious compute power into a compact form factor:

| Name  | Model | CPU       | Storage    | RAM  | OS    | Role          |
| ----- | ----- | --------- | ---------- | ---- | ----- | ------------- |
| k8s-1 | MS-01 | i9-13900H | 500GB NVMe | 96GB | Talos | Control Plane |
| k8s-2 | MS-01 | i9-13900H | 500GB NVMe | 96GB | Talos | Control Plane |
| k8s-3 | MS-01 | i9-13900H | 500GB NVMe | 96GB | Talos | Control Plane |

## The Software Stack

### Operating System: Talos Linux

Anton runs on [Talos Linux](https://github.com/siderolabs/talos), an immutable
Kubernetes-focused operating system. Unlike traditional Linux distributions,
Talos:

- Has no SSH access or package manager
- Is configured entirely through declarative YAML
- Provides atomic updates and rollbacks
- Offers enhanced security through immutability

This choice eliminated the operational overhead of managing traditional Linux
installations while providing a rock-solid foundation for Kubernetes.

### Kubernetes Distribution

The cluster runs vanilla Kubernetes deployed through Talos, giving me:

- **High Availability**: Three control-plane nodes ensure the cluster survives
  hardware failures
- **Workload Flexibility**: All nodes can run workloads, maximizing resource
  utilization
- **Latest Features**: Direct access to upstream Kubernetes releases

## Conclusion

Hosting your own hardware (and software) can be a great way to learn while
avoiding bills from cloud providers. For anyone considering a similar project,
the [cluster-template](https://github.com/onedr0p/cluster-template) provides an
excellent starting point.

---

_The complete Anton configuration is available on
[GitHub](https://github.com/wcygan/anton), showcasing real-world GitOps
practices and Kubernetes patterns._
