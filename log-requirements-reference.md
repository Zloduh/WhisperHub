# Requirements Document

## Introduction

POE 2 Game Log Ingestion adds the first game-specific log source for GameScope Local. It lets a technical user explicitly point the project at a Path of Exile 2 log file and ingest it into local Loki through Grafana Alloy.

## Boundary Context

- **In scope**: manual POE 2 log path configuration, committed templates, local-only generated config, Alloy file-tail configuration, Loki label contract, validation, privacy docs, and UI query compatibility.
- **Out of scope**: automatic install discovery, Steam library parsing, registry discovery, running process discovery, automatic config apply, silent log collection, metrics, crash dumps, sensors, PresentMon, Sysmon, AI summaries, and product wizard.
- **Adjacent expectations**: `native-windows-backend-runtime` owns Loki; `windows-eventlog-collection` owns Windows Event Logs; `basic-local-query-ui` can later show game logs once API/UI support is extended.

## Requirements

### Requirement 1: Explicit Manual Log Path
**Objective:** As a technical gamer, I want to configure a POE 2 log path manually, so that game log ingestion starts from a safe and inspectable setup.

#### Acceptance Criteria
1. The POE 2 profile shall document candidate log paths without claiming unverified paths are guaranteed.
2. The implementation shall provide a local-only way to specify the actual POE 2 log file path.
3. The implementation shall keep machine-specific paths out of Git.
4. The implementation shall not attempt automatic Steam, registry, or process discovery in this feature.

### Requirement 2: Alloy Game Log Collection Config
**Objective:** As a contributor, I want a clear Alloy file-tail config pattern, so that POE 2 logs can be forwarded to local Loki.

#### Acceptance Criteria
1. The implementation shall provide a committed template or generated config pattern for POE 2 file log collection.
2. The config shall send logs only to local Loki at `http://127.0.0.1:3100/loki/api/v1/push`.
3. The config shall attach stable labels including `source="game_log"` and `game="poe2"`.
4. The config shall not include cloud endpoints, credentials, personal paths, or generated local state.
5. The config shall not enable collection silently; applying it remains an explicit user action.
6. The config shall drop common POE 2 player chat channel lines before Loki storage when they are identifiable without suppressing bracketed diagnostic categories.

### Requirement 3: Validation Workflow
**Objective:** As a future contributor, I want repeatable validation for POE 2 log ingestion, so that we can prove game logs arrive before building dashboards.

#### Acceptance Criteria
1. Validation shall check that local Loki is reachable through the repo-managed runtime.
2. Validation shall query Loki for the expected POE 2 game log labels.
3. Validation shall report missing runtime, missing Alloy, empty results, and query errors distinctly.
4. Validation shall not start Loki, restart Alloy, or modify collector config implicitly.

### Requirement 4: UI Query Readiness
**Objective:** As a user, I want the local query UI to be ready for game logs, so that POE 2 logs can be inspected alongside Windows events later.

#### Acceptance Criteria
1. The feature shall document the LogQL selector for POE 2 logs.
2. If UI changes are included, they shall read from local Loki only.
3. If UI changes are deferred, the docs shall clearly state how to query POE 2 logs manually.

### Requirement 5: Privacy and Safety
**Objective:** As project owner, I want game log ingestion to stay passive and opt-in, so that users are not exposed to avoidable privacy or anti-cheat risk.

#### Acceptance Criteria
1. The feature shall document that game logs can contain account names, character names, chat text, local paths, errors, and gameplay/session details.
2. The feature shall not add overlays, DLL injection, game hooks, packet capture, kernel drivers, or hidden persistence.
3. The feature shall not upload game logs to cloud services or AI providers.
4. The feature shall not modify game files, Steam files, registry entries, or launcher config.
5. The feature shall prefer ingestion-time privacy/noise filters for known chat lines instead of dashboard-only hiding.

### Requirement 6: Documentation and Capability Status
**Objective:** As a project owner, I want current docs to distinguish manual ingestion from future discovery, so that the roadmap remains honest.

#### Acceptance Criteria
1. Documentation shall state POE 2 manual log ingestion is implemented only after this spec completes.
2. Documentation shall state install/log discovery remains future work.
3. Capability inventory shall distinguish manual game log ingestion from future game profile discovery.
4. The high-level plan shall update MVP status only after validation passes.
