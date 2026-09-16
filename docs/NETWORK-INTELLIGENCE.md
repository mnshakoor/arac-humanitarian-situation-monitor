# Quanta Analytica | ReliefWeb Network Intelligence

**AHSM v0.7.0-beta**

The Network Explorer is an information-relationship analysis workspace built from the synchronized ReliefWeb report corpus. It does not infer causality, coordination, intent, or independent corroboration from graph proximity alone.

## Network model

The primary Explorer graph treats each filtered ReliefWeb report as a report node and links that report to available country, source, and ReliefWeb theme nodes. Edge weight is the count of repeated report-to-entity co-occurrences inside the active filtered slice.

For temporal comparison, AHSM uses an **entity-projection graph**. Country, source, and theme entities are linked when they co-occur in the same ReliefWeb report. This removes the instability created by one-time report nodes and makes equivalent time-window comparison more meaningful.

## Network intelligence metrics

### Degree

Degree is the number of unique nodes directly connected to a node. In AHSM it identifies entities with broad direct connectivity inside the current filtered ReliefWeb corpus.

### Weighted influence

Weighted influence is the sum of edge weights connected to a node. It emphasizes entities that recur frequently across linked reports, not just entities with many distinct neighbors.

### Betweenness centrality

Betweenness centrality estimates how often a node lies on shortest paths between other nodes. Higher values can identify bridge nodes connecting otherwise separated parts of the information network. This is a structural information-network measure and must not be interpreted as institutional influence or operational control.

### Communities

AHSM uses iterative weighted label propagation to identify dense clusters of co-occurring report, country, source, and theme nodes. Community membership describes the structure of the current filtered corpus only. It can change as filters or synchronized reports change.

## Temporal network intelligence

AHSM v0.7 compares the selected period with the immediately preceding equivalent period. Supported windows are:

- **24 hours** compared with the preceding 24 hours;
- **7 days** compared with the preceding 7 days;
- **30 days** compared with the preceding 30 days.

The comparison is anchored to the latest publication date available in the active synchronized ReliefWeb corpus. Existing Network Explorer filters for keyword, theme, source, country, and region are applied before the temporal slices are calculated.

### Rising and falling centrality

Temporal centrality change is measured as the change in weighted degree between the current and prior entity-projection graphs. A positive value means the entity participates in more or stronger co-occurrence relationships in the selected period. A negative value means its weighted connectivity declined.

### Emerging relationships

An emerging relationship is an entity pair present in the current comparison window but absent in the immediately preceding equivalent window.

### Disappearing relationships

A disappearing relationship is an entity pair present in the prior window but absent in the current window.

### Strengthening and weakening relationships

For relationships present in both windows, AHSM compares edge weight. A higher current weight is classified as strengthening; a lower current weight is classified as weakening.

### Cluster reassignment

AHSM runs weighted label propagation separately on the current and prior entity-projection graphs. Cluster reassignment is the share of entities present in both windows whose numerical community assignment differs between the two runs.

Because community labels are generated independently for each graph, this measure should be treated as a **structural-change indicator**, not a definitive statement that an entity changed real-world affiliation or operational grouping.

## Weak-tie threshold

The weak-tie control visually suppresses graph edges below a selected co-occurrence weight. The underlying network data are not deleted. This feature helps analysts focus on repeated relationships while retaining the ability to restore the complete graph.

## Investigation pinboard

Analysts can pin selected nodes into a temporary investigation workspace. Pins are stored locally in the browser and may be exported as `quanta.reliefweb.network-investigation.v1` JSON containing the active filters and the pinned nodes with centrality/community metrics. No analyst notes or pins are uploaded to ARAC or ReliefWeb by this feature.

## Full-screen mode

The Network Explorer supports the browser Fullscreen API and a fallback pseudo-fullscreen mode. The **Full screen** control expands the Network Explorer into an investigation-focused workspace. Pressing **F** while the Network Explorer is active also toggles full screen unless the user is typing in a form field. Native browser Escape behavior exits Fullscreen API mode.

The temporal intelligence panel is retained in full-screen mode so the analyst can move between the relationship graph, centrality/community analysis, temporal comparisons, and the investigation pinboard without leaving the workspace.

## Analytical boundary

A network connection means that entities co-occurred through synchronized ReliefWeb report metadata. A temporal network change means that this co-occurrence structure changed between equivalent time windows. Neither condition by itself establishes:

- causal relationships;
- worsening or improving humanitarian conditions;
- source independence;
- organizational coordination;
- common ownership or command;
- institutional influence;
- severity;
- actor intent;
- factual corroboration.

Changes may also reflect publication timing, source activity, metadata changes, assessment cycles, improved access, or the finite composition of the synchronized report corpus. Analysts should inspect the underlying ReliefWeb reports and original sources before drawing substantive conclusions.
