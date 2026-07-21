# Metanet Apps Overlay

Thin CARS deployment wrapper for the canonical Metanet Apps topic and lookup service.

Protocol and storage behavior come exclusively from the pinned npm release of
`@bsv/overlay-topics`. This repository contains no independent Apps admission
or lookup implementation.

## Commands

```sh
npm ci
npm ci --prefix backend
npm test
npm run build
```

The production CARS configuration retains project
`c7350da1b9bf4738a4fa7646eef8285f` so releases update the existing canonical
backend and its existing databases.

