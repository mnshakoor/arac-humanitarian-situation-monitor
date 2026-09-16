# Quanta Analytica | ReliefWeb Network Intelligence

**AHSM v0.6.0-beta**

The Network Explorer is an information-relationship analysis workspace built from the synchronized ReliefWeb report corpus. It does not infer causality, coordination, intent, or independent corroboration from graph proximity alone.

## Network model

Each filtered ReliefWeb report becomes a report node. The explorer links that report to available country, source, and ReliefWeb theme nodes. Edge weight is the count of repeated report-to-entity co-occurrences inside the active filtered slice.

## Network intelligence metrics

### Degree

Degree is the number of unique nodes directly connected to a node. In AHSM it identifies entities with broad direct connectivity inside the current filtered ReliefWeb corpus.

### Weighted influence

Weighted influence is the sum of edge weights connected to a node. It emphasizes entities that recur frequently across linked reports, not just entities with many distinct neighbors.

### Betweenness centrality

Betweenness centrality estimates how often a node lies on shortest paths between other nodes. Higher values can identify bridge nodes connecting otherwise separated parts of the information network. This is a structural information-network measure and must not be interpreted as institutional influence or operational control.

### Communities

AHSM uses iterative weighted label propagation to identify dense clusters of co-occurring report, country, source, and theme nodes. Community membership describes the structure of the current filtered corpus only. It can change as filters or synchronized reports change.

## Weak-tie threshold

The weak-tie control visually suppresses graph edges below a selected co-occurrence weight. The underlying network data are not deleted. This feature helps analysts focus on repeated relationships while retaining the ability to restore the complete graph.

## Investigation pinboard

Analysts can pin selected nodes into a temporary investigation workspace. Pins are stored locally in the browser and may be exported as `quanta.reliefweb.network-investigation.v1` JSON containing the active filters and the pinned nodes with centrality/community metrics. No analyst notes or pins are uploaded to ARAC or ReliefWeb by this feature.

## Full-screen mode

The Network Explorer supports the browser Fullscreen API and a fallback pseudo-fullscreen mode. The **Full screen** control expands the Network Explorer into an investigation-focused workspace. Pressing **F** while the Network Explorer is active also toggles full screen unless the user is typing in a form field. Native browser Escape behavior exits Fullscreen API mode.

## Analytical boundary

A network connection means that entities co-occurred through synchronized ReliefWeb report metadata. It does not by itself establish:

- causal relationships;
- source independence;
- organizational coordination;
- common ownership or command;
- severity;
- actor intent;
- factual corroboration.

Analysts should inspect the underlying ReliefWeb reports and original sources before drawing substantive conclusions.
