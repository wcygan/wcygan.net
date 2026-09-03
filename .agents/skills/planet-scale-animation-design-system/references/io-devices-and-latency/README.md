# IO Devices and Latency: Visualizations and Architecture

This reference describes how the animations, diagrams, and interactive simulations in PlanetScale's **"IO Devices and Latency"** blog post are constructed, styled, and vendored.

- **Blog post**: `https://planetscale.com/blog/io-devices-and-latency`
- **Vendored bundle location**: `.agents/skills/planet-scale-animation-design-system/assets/io-devices-and-latency/`
- **Served public path**: `/vendor/planetscale/io-devices-and-latency/`
- **Bundle entrypoint**: `iframe-DCKehAfE.js` (with preloaded `modulepreload-polyfill-B5Qt9EMX.js`, `timer-DWAvo6M8.js`, `transform-tHp9KnZo.js`, `quad-DIO_O7IL.js`, and stylesheets `iframe-o_NRU1Sr.css`, `styles-CWGXrFsx.css`)

---

## 1. Overview and Topics Covered

The article explores physical hardware storage devices across computer architecture history and their latency profiles:

1. **Magnetic Tape Storage**: Sequential access physical tape reels, linear tape movement, seek penalty, and read/write heads.
2. **Hard Disk Drives (HDD)**: Rotating magnetic platters, spindle motor, actuator arm, cylinder/track/sector layout, rotational latency, and head seek time.
3. **Solid State Drives (SSD)**: NAND flash memory cells, floating gate transistors, flash blocks vs pages, erase-before-write limitations, and garbage collection (write amplification).
4. **Relative Latency Scaling**: Human-scale conversions (e.g. if CPU cycle = 1 second, how long do tape, HDD, SSD, and network IO take?).
5. **IOPS & Throughput**: Random IOPS vs sequential throughput trade-offs across storage types.
6. **Network & Cloud Storage**: Local NVMe vs AWS EBS volumes vs Google Cloud Persistent Disks.

---

## 2. Interactive Demonstrations & Fragment Hash Routing

The bundle mounts within the `#app` shell. It parses `document.URL.split("#")[1]` and matches the target element via `data-id`.

| Fragment Hash                       | Section / Title     | Visual Type    | Renderer & Description                                                              |
| :---------------------------------- | :------------------ | :------------- | :---------------------------------------------------------------------------------- |
| `#io-latency-local-ebs-pd`          | Cloud latency       | Horizontal Bar | Visual comparison: Local NVMe SSD vs AWS EBS (gp3/io2) vs Google Cloud PD           |
| `#io-tape`                          | Magnetic tape       | Animated SVG   | Mechanical tape reel mechanism showing supply reel, take-up reel, and tape guide    |
| `#io-tape-read-write`               | Tape mechanics      | Animated SVG   | Tape head reading and writing magnetic magnetic flux transitions on moving ribbon   |
| `#io-tape-fast`                     | Tape sequential     | Dynamic SVG    | Fast forward / rewind sequential search demonstrating mechanical transport speed    |
| `#io-tape-slow`                     | Tape random seek    | Dynamic SVG    | Random seek penalties on tape, showing multi-second seek times                      |
| `#io-hdd`                           | Hard Disk Drive     | Animated SVG   | Dual-platter HDD showing rotating disk, spindle axis, actuator arm, and slider head |
| `#io-hdd-read-write`                | HDD sector read     | Dynamic SVG    | Read/write arm positioning over concentric tracks and rotating sector access        |
| `#io-hdd-io-fast`                   | HDD sequential IO   | Dynamic SVG    | Sequential track reading taking advantage of continuous platter rotation            |
| `#io-hdd-io-slow`                   | HDD random IO       | Dynamic SVG    | Random seek thrashing: actuator arm swinging across tracks with rotational latency  |
| `#io-latency-tape-hdd`              | Tape vs HDD         | Comparison Bar | Relative latency chart comparing tape search times against HDD milliseconds         |
| `#io-ssd`                           | Solid State Drive   | Schematic SVG  | Silicon architecture showing NAND flash controller, DRAM cache, and flash packages  |
| `#io-latency-hdd-ssd`               | HDD vs SSD          | Comparison Bar | Microsecond SSD access vs millisecond HDD access on a human-scaled timeline         |
| `#io-ssd-lines-fast`                | SSD Page Read       | Animated SVG   | Nanosecond electronic word line charging and parallel page reads                    |
| `#io-ssd-lines-slow`                | SSD Block Erase     | Animated SVG   | Block-level high-voltage erase cycles required prior to reprogramming               |
| `#io-ssd-gc-fast`                   | SSD Clean Write     | Animated SVG   | Direct page write into an already-erased clean NAND flash block                     |
| `#io-ssd-gc-slow`                   | SSD Garbage Coll.   | Flow Animation | Write amplification: reading valid pages, copying to new block, erasing stale block |
| `#io-latency-memory-local-ssd`      | RAM vs SSD          | Comparison Bar | Relative latency comparing DDR4/DDR5 DRAM (100ns) vs NVMe flash (10–100μs)          |
| `#io-latency-local-ssd-network-ssd` | NVMe vs Network     | Comparison Bar | Local PCIe bus latency vs network-attached storage latency (EBS / Ceph / SAN)       |
| `#io-iops`                          | IOPS comparison     | Bar Chart      | IOPS comparison across tape, 7.2k HDD, 15k SAS HDD, SATA SSD, and NVMe SSD          |
| `#io-replication`                   | Network replication | Animated Flow  | Database WAL sync across network storage vs asynchronous replication                |

---

## 3. Implementation Details

- **Rendering**: Dynamic vector SVG driven by D3 transformation modules (`transform-tHp9KnZo.js`) and high-precision timing (`timer-DWAvo6M8.js`).
- **Physical Simulation**: Realistic physical motion for spinning reels, rotational disk platters, and mechanical head movement with realistic deceleration curves.
- **Dark/Light Theme**: Integrates with `--diagram-*` token variables and includes custom typography matching JetBrains Mono.
- **Replication**: Use `VendoredDemoFigure` with `/vendor/planetscale/io-devices-and-latency/index.html#<hash>`.
